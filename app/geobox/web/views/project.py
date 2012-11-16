# This file is part of the GBI project.
# Copyright (C) 2012 Omniscale GmbH & Co. KG <http://omniscale.com>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import uuid
import json

from flask import (
    Blueprint, render_template, abort, g, url_for, redirect, request,
    flash, current_app, jsonify,
)
from flaskext.babel import _
from sqlalchemy import func
import shapely.geometry

from mapproxy.srs import SRS
from mapproxy.util.coverage import coverage as make_coverage
from mapproxy.grid import tile_grid

from geobox.lib.tiles import estimate_tiles
from geobox.lib.coverage import coverage_from_feature_collection, coverage_from_geojson, geometry_from_feature_collection
from geobox.lib.fs import diskspace_available_in_mb
from geobox.lib.mapproxy import write_mapproxy_config
from geobox import model
from geobox.web import forms
from geobox.web.helper import redirect_back, get_local_cache_url

project = Blueprint('project', __name__)

@project.route('/exports')
def export_list():
    query = g.db.query(model.ExportProject)
    export_projects = query.all()
    return render_template('projects/exports.html', export_projects=export_projects)

@project.route('/imports')
def import_list():
    query = g.db.query(model.ImportProject)
    import_projects = query.all()
    return render_template('projects/imports.html', import_projects=import_projects)


@project.route('/import/new', methods=['POST'])
def import_new():
    proj = model.ImportProject(title=uuid.uuid4().get_hex())
    g.db.add(proj)
    g.db.commit()
    proj.title = 'Import %d' % proj.id
    g.db.commit()

    flash(_('added new project'), 'success')

    return redirect(url_for('.import_edit', id=proj.id))

@project.route('/import/<int:id>', methods=['GET', 'POST'])
def import_edit(id):
    proj = g.db.query(model.ImportProject).get(id)

    sources = g.db.query(model.ExternalWMTSSource).all()
    if not proj:
        abort(404)

    coverage_form = forms.SelectCoverage()

    form = forms.ImportProjectEdit(request.form)
    form.start_level.choices = get_levels(model.ExternalWMTSSource)
    form.end_level.choices = get_levels(model.ExternalWMTSSource)
    form.update_tiles.checked = proj.update_tiles

    if form.validate_on_submit():
        redirect_url = url_for('.import_list', id=id)
        proj.title = form.data['title']
        proj.import_raster_layers = []
        if form.coverage.data != 'false':
            proj.coverage = prepare_feature_collection_coverage(form.coverage.data)
        else:
            proj.coverage = ''

        proj.download_size = float(form.data.get('download_size', 0.0))
        proj.update_tiles = form.data.get('update_tiles', False)

        g.db.add(model.ImportRasterLayer(
            source=form.raster_source.data,
            start_level=int(form.start_level.data),
            end_level=int(form.end_level.data),
            project=proj
        ))
        g.db.commit()
        if form.start.data == 'start':
            local_raster_source = g.db.query(model.LocalWMTSSource).filter_by(wmts_source=form.raster_source.data).first()
            if local_raster_source:
                local_raster_source.download_level_start = min(local_raster_source.download_level_start, int(form.start_level.data))
                local_raster_source.download_level_end = max(local_raster_source.download_level_end, int(form.end_level.data))
            else:
                local_raster_source = model.LocalWMTSSource(
                    download_level_start=int(form.start_level.data),
                    download_level_end=int(form.end_level.data),
                    wmts_source_id=form.raster_source.data.id
                )
            g.db.add(model.RasterImportTask(
                source=form.raster_source.data,
                zoom_level_start=int(form.start_level.data),
                zoom_level_end=int(form.end_level.data),
                layer=local_raster_source,
                coverage=prepare_task_coverage(form.coverage.data),
                update_tiles=form.update_tiles.data,
                project=proj
            ))
            redirect_url = url_for('tasks.list')
            g.db.commit()
            write_mapproxy_config(current_app.config.geobox_state)
        return redirect(redirect_url)
    elif request.method == 'POST':
        flash(_('form error'), 'error')

    form.title.data = proj.title
    has_zoom_level = 'false'
    if proj.import_raster_layers:
        form.raster_source.data = proj.import_raster_layers[0].source
        form.start_level.data = proj.import_raster_layers[0].start_level
        form.end_level.data = proj.import_raster_layers[0].end_level
        has_zoom_level = 'true'

    coverage = proj.coverage if proj.coverage else 'null'
    base_layer = g.db.query(model.ExternalWMTSSource).filter_by(background_layer=True).first()
    base_layer.bbox = base_layer.bbox_from_view_coverage()

    free_disk_space = diskspace_available_in_mb(current_app.config.geobox_state.user_data_path())



    return render_template('projects/import_edit.html',
        proj=proj, form=form, sources=sources, has_zoom_level=has_zoom_level,
        base_layer=base_layer,coverage_form=coverage_form,
        coverage=coverage, free_disk_space=free_disk_space)

@project.route('/export/new', methods=['POST'])
def export_new():
    proj = model.ExportProject(title=uuid.uuid4().get_hex())
    g.db.add(proj)
    g.db.commit()
    proj.title = 'Export %d' % proj.id
    g.db.commit()

    flash(_('added new project'), 'success')

    return redirect(url_for('.export_edit', id=proj.id))

@project.route('/export/<int:id>', methods=['GET', 'POST'])
def export_edit(id):
    from ...lib.vectormapping import default_mappings as mappings

    proj = g.db.query(model.ExportProject).get(id)

    raster_sources = g.db.query(model.LocalWMTSSource).order_by(model.LocalWMTSSource.id).all()

    if not proj:
        abort(404)

    coverage_form = forms.SelectCoverage()
    form = forms.ExportProjectEdit(request.form)
    form.end_level.choices = form.start_level.choices = get_levels(model.LocalWMTSSource)
    form.mapping_name.choices = [
        (name, '%s (%s, %s)' % (mapping.name, mapping.geom_type, mapping.other_srs.srs_code))
        for name, mapping in mappings.items()
    ]
    form.srs.choices = [(srs, srs) for srs in current_app.config.geobox_state.config.get('web', 'available_srs')]
    if form.validate_on_submit():
        proj.title = form.data['title']
        proj.export_raster_layers = []
        proj.export_vector_layers = []
        if form.coverage.data != 'false':
            proj.coverage = prepare_feature_collection_coverage(form.coverage.data)
        else:
            proj.coverage = ''

        proj.export_srs = form.srs.data
        proj.export_format = form.format.data
        proj.download_size = float(form.data.get('download_size', 0.0))

        g.db.commit()
        redirect_url = url_for('.export_list', id=id)
        for raster_layer in json.loads(form.data['raster_layers']):
            raster_source = g.db.query(model.LocalWMTSSource).get(raster_layer['source_id'])
            start_level = int(raster_layer['start_level'])
            end_level = int(raster_layer.get('end_level') or raster_layer['start_level'])
            if not proj.coverage:
                raster_coverage = raster_source.wmts_source.download_coverage
                proj.coverage = raster_coverage
            else:
                raster_coverage = proj.coverage

            g.db.add(model.ExportRasterLayer(
                source=raster_source,
                start_level=start_level,
                end_level=end_level,
                project=proj
            ))

            if form.start.data == 'start':
                g.db.add(model.RasterExportTask(
                    layer=raster_source,
                    export_format=proj.export_format,
                    export_srs=proj.export_srs,
                    zoom_level_start=start_level,
                    zoom_level_end=end_level,
                    coverage=raster_coverage,
                    project=proj
                ))
                redirect_url = url_for('tasks.list')

        if form.data['mapping_name'] != 'None':
            g.db.add(model.ExportVectorLayer(
                mapping_name=form.data['mapping_name'],
                project=proj
            ))

            if form.start.data == 'start':
                g.db.add(model.VectorExportTask(
                    db_name=mappings[form.data['mapping_name']].couchdb,
                    mapping_name=form.data['mapping_name'],
                    project=proj,
                ))
                redirect_url = url_for('tasks.list')


        g.db.commit()

        return redirect(redirect_url)

    elif request.method == 'POST':
        flash(_('form error'), 'error')

    form.title.data = proj.title
    form.format.data = proj.export_format
    form.srs.data = proj.export_srs
    if proj.export_vector_layers:
        form.mapping_name.data = proj.export_vector_layers[0].mapping_name
    coverage = proj.coverage if proj.coverage else 'null'
    base_layer = g.db.query(model.ExternalWMTSSource).filter_by(background_layer=True).first()
    base_layer.bbox = base_layer.bbox_from_view_coverage()

    free_disk_space = diskspace_available_in_mb(current_app.config.geobox_state.user_data_path())
    cache_url = get_local_cache_url(request)

    return render_template('projects/export_edit.html', proj=proj, form=form, raster_sources=raster_sources,
        layers=proj.export_raster_layers, base_layer=base_layer, coverage=coverage,
        free_disk_space=free_disk_space,coverage_form=coverage_form,
        cache_url=cache_url)

@project.route('/project/remove/<int:id>', methods=['POST'])
def remove(id):
    project = g.db.query(model.Project).with_polymorphic('*').filter_by(id = id).first()

    if not project:
        abort(404)

    g.db.delete(project)
    g.db.commit()

    return redirect_back('.export_list')

@project.route('/project/load_coverage', methods=['POST'])
def load_coverage():
    project_id = request.form['id']
    project = g.db.query(model.Project).with_polymorphic('*').filter_by(id = project_id).first()
    if not project:
        return jsonify(coverage=False)
    else:
        return jsonify(coverage=project.coverage)

@project.route('/data_volume', methods=['POST'])
def data_volume():

    project_coverage = coverage_from_feature_collection(json.loads(request.form['coverage']))

    total_tiles = 0
    volume = 0
    if project_coverage:
        for raster_source in json.loads(request.form['raster_data']):
            wmts_source = None
            if request.args.get('export', 'false').lower() == 'true':
                local_source = g.db.query(model.LocalWMTSSource).get(raster_source['source_id'])
                if local_source:
                    wmts_source = local_source.wmts_source
            else:
                wmts_source = g.db.query(model.ExternalWMTSSource).get(raster_source['source_id'])

            if wmts_source.download_coverage:
                wmts_source_coverage = coverage_from_geojson(wmts_source.download_coverage)
            else:
                wmts_source_coverage = make_coverage(
                    shapely.geometry.Polygon([
                        (-20037508.34, -20037508.34),
                        (-20037508.34, 20037508.34),
                        (20037508.34, 20037508.34),
                        (20037508.34, -20037508.34)
                    ]), SRS(3857))
            coverage_intersection = wmts_source_coverage.geom.intersection(project_coverage.geom)
            if not coverage_intersection:
                continue
            intersection = make_coverage(coverage_intersection, SRS(3857))

            levels = range(raster_source['start_level'], raster_source['end_level'] + 1)
            source_tiles = estimate_tiles(tile_grid(3857), levels, intersection)
            volume += source_tiles * 15
            total_tiles += source_tiles

    return jsonify(total_tiles=total_tiles, volume_mb=volume / 1024.0)

def get_levels(source):
    start_level = g.db.query(func.min(source.download_level_start)).first()[0]
    end_level = g.db.query(func.max(source.download_level_end)).first()[0]
    if start_level is not None and end_level is not None:
        return [(level, level) for level in range(start_level, end_level + 1)]
    return []

def prepare_feature_collection_coverage(feature_collection):
    """
    Loads GeoJSON string of a FeatureCollection, validates and fixes
    all geometries and returns a GeoJSON string back.
    """
    feature_collection = json.loads(feature_collection)
    for feature in feature_collection['features']:
        geometry = shapely.geometry.asShape(feature['geometry'])
        if not geometry.is_valid:
            geometry = geometry.buffer(0)
            feature['geometry'] = shapely.geometry.mapping(geometry)
    return json.dumps(feature_collection)

def prepare_task_coverage(feature_collection):
    """
    Loads GeoJSON string of a FeatureCollection, validates and fixes
    all geometries and returns a single MultiPolygon GeoJSON string back.
    """
    task_coverage_geometry = geometry_from_feature_collection(json.loads(feature_collection))
    if not task_coverage_geometry:
        return None
    return json.dumps(shapely.geometry.mapping(task_coverage_geometry))