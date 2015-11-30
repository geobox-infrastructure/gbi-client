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

import json

from flask import (
    Blueprint, render_template, abort, g, url_for, redirect, request,
    flash, current_app, jsonify,
)
from flaskext.babel import _
from sqlalchemy import func
import shapely.geometry

from mapproxy.srs import SRS
from mapproxy.grid import tile_grid

from geobox.lib.tiles import estimate_tiles
from geobox.lib.coverage import coverage_from_feature_collection, coverage_from_geojson, geometry_from_feature_collection
from geobox.lib.coverage import coverage as make_coverage
from geobox.lib.couchdb import CouchDB, vector_layers_metadata
from geobox.lib.fs import diskspace_available_in_mb
from geobox.lib.mapproxy import write_mapproxy_config
from geobox.lib import context

from geobox import model
from geobox.web import forms
from geobox.web.helper import redirect_back, get_external_couch_url
from geobox.lib.server_logging import send_task_logging

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


@project.route('/import/new', methods=['GET', 'POST'])
@project.route('/import/<int:id>', methods=['GET', 'POST'])
def import_edit(id=None):
    sources = g.db.query(model.ExternalWMTSSource).all()
    if id is None:
        proj = model.ImportProject()
    else:
        proj = g.db.query(model.ImportProject).get(id)

    if not proj:
        abort(404)

    coverage_form = forms.SelectCoverage()

    form = forms.ImportProjectEdit(request.form)
    form.start_level.choices = get_levels(model.ExternalWMTSSource)
    form.end_level.choices = get_levels(model.ExternalWMTSSource)
    form.update_tiles.checked = proj.update_tiles

    if form.validate_on_submit() and validate_max_tiles(form):
        redirect_url = url_for('.import_list', id=id)
        proj.title = form.data['title']
        proj.import_raster_layers = []
        if form.coverage.data != 'false':
            proj.coverage = prepare_feature_collection_coverage(form.coverage.data)
        else:
            proj.coverage = ''
            coverage = None

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
            redirect_url = url_for('project.start_raster_import', id=proj.id)
        return redirect(redirect_url)
    elif request.method == 'POST':
        flash(_('form error'), 'error')

    form.title.data = proj.title
    if proj.import_raster_layers:
        form.raster_source.data = proj.import_raster_layers[0].source
        if not request.form.get('start_level'):
            form.start_level.data = proj.import_raster_layers[0].start_level
        if not request.form.get('end_level'):
            form.end_level.data = proj.import_raster_layers[0].end_level

    coverage = proj.coverage if proj.coverage else 'null'
    if form.coverage.data:
        coverage = form.coverage.data

    base_layer = g.db.query(model.ExternalWMTSSource).filter_by(
        background_layer=True).first()
    base_layer.bbox = base_layer.bbox_from_view_coverage()

    free_disk_space = diskspace_available_in_mb(
        current_app.config.geobox_state.user_data_path())

    couch_url = 'http://%s:%s' % (
        '127.0.0.1',
        current_app.config.geobox_state.config.get('couchdb', 'port')
    )
    couch_layers = list(vector_layers_metadata(couch_url))

    couchlayers_form = forms.SelectCouchLayers()
    couch_titles = []
    for key, couch in enumerate(couch_layers):
        couch_titles.append((key, couch['title']))
    couchlayers_form.select_couch.choices = couch_titles

    return render_template('projects/import_edit.html', proj=proj, form=form,
                           sources=sources, couch_layers=couch_layers,
                           base_layer=base_layer, coverage_form=coverage_form,
                           couchlayers_form=couchlayers_form,
                           coverage=coverage, free_disk_space=free_disk_space,
                           with_server=True)


def validate_max_tiles(form):
    feature_collection = json.loads(form.coverage.data)
    if not feature_collection:
        flash(_("no coverage"))
        return False

    coverage = coverage_from_feature_collection(feature_collection)
    levels = range(int(form.start_level.data), int(form.end_level.data) + 1)
    wmts_source = form.raster_source.data
    tiles = estimate_project_tiles(coverage, wmts_source, levels)
    if not tiles:
        flash(_("no tiles"))
        return False

    max_tiles = wmts_source.max_tiles
    if not max_tiles:
        return True

    if tiles <= max_tiles:
        return True
    else:
        flash(_("to many tiles"))
        return False

@project.route('/export/new', methods=['GET', 'POST'])
@project.route('/export/<int:id>', methods=['GET', 'POST'])
def export_edit(id=None):
    if id is None:
        proj = model.ExportProject()
    else:
        proj = g.db.query(model.ExportProject).get(id)

    if not proj:
        abort(404)

    raster_sources = g.db.query(model.LocalWMTSSource).order_by(model.LocalWMTSSource.id).all()
    coverage_form = forms.SelectCoverage()
    form = forms.ExportProjectEdit(request.form)
    form.end_level.choices = form.start_level.choices = get_levels(model.LocalWMTSSource)

    form.srs.choices = list(current_app.config.geobox_state.config.get('web', 'available_srs'))
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
        g.db.commit()

        if form.start.data == 'start':
            create_export_tasks(proj)
            redirect_url = url_for('tasks.list')

        return redirect(redirect_url)

    elif request.method == 'POST':
        flash(_('form error'), 'error')

    form.title.data = proj.title
    form.format.data = proj.export_format
    form.srs.data = proj.export_srs

    coverage = proj.coverage if proj.coverage else 'null'
    if form.coverage.data:
        coverage = form.coverage.data

    base_layer = g.db.query(model.ExternalWMTSSource).filter_by(background_layer=True).first()
    base_layer.bbox = base_layer.bbox_from_view_coverage()

    free_disk_space = diskspace_available_in_mb(current_app.config.geobox_state.user_data_path())
    cache_url = get_external_couch_url(request)

    couch_url = 'http://%s:%s' % ('127.0.0.1', current_app.config.geobox_state.config.get('couchdb', 'port'))
    couch_layers = list(vector_layers_metadata(couch_url))

    couchlayers_form = forms.SelectCouchLayers()
    couch_titles = []
    for key, couch in enumerate(couch_layers):
        couch_titles.append((key, couch['title']))
    couchlayers_form.select_couch.choices = couch_titles

    return render_template('projects/export_edit.html', proj=proj, form=form,
        raster_sources=raster_sources,couch_layers=couch_layers,
        layers=proj.export_raster_layers, base_layer=base_layer, coverage=coverage,
        free_disk_space=free_disk_space,coverage_form=coverage_form, couchlayers_form=couchlayers_form,
        cache_url=cache_url)

@project.route('/project/remove/<int:id>', methods=['POST'])
def remove(id):
    project = g.db.query(model.Project).with_polymorphic('*').filter_by(id = id).first()

    if not project:
        abort(404)

    g.db.delete(project)
    g.db.commit()

    return redirect_back('.export_list')


@project.route('/import/<int:id>/start', methods=['GET', 'POST'])
def start_raster_import(id):
    proj = g.db.query(model.ImportProject).get(id)
    if not proj:
        abort(404)
    form = forms.SetGBIServerForm(request.form)
    del form.url
    gbi_server = proj.import_raster_layers[0].source.gbi_server
    if not gbi_server.auth:
        create_raster_import_task(proj)
        return redirect(url_for('tasks.list'))

    if form.validate_on_submit():
        try:
            context.load_context_document(gbi_server, g.db,
                                          form.username.data,
                                          form.password.data)
        except context.AuthenticationError:
            flash(_('username or password not correct'), 'error')
        except ValueError:
            flash(_('unable to fetch context document'), 'error')
        else:
            create_raster_import_task(proj)
            return redirect(url_for('tasks.list'))

    return render_template('projects/verify_import_auth.html', form=form,
                           server_title=gbi_server.title)


@project.route('/export/<int:id>/start', methods=['POST'])
def start_export(id):
    proj = g.db.query(model.ExportProject).get(id)
    if not proj:
        abort(404)
    create_export_tasks(proj)
    return redirect_back('.export_list')


@project.route('/project/load_coverage', methods=['POST'])
def load_coverage():
    project_id = request.form.get('id', False)
    couchdb_coverage = request.form.get('couchdb_coverage', False)
    if couchdb_coverage == 'true':
        couch = CouchDB('http://%s:%s' % ('127.0.0.1',
            current_app.config.geobox_state.config.get('couchdb', 'port')),
            current_app.config.geobox_state.config.get('web', 'coverages_from_couchdb'))

        records = couch.load_records()
        coverage = []
        for record in records:
            geometry = record.get('geometry')
            # load only poylgons or mulitpolygons for coverages
            if geometry and isinstance(geometry, dict) and geometry.get('type') in ('Polygon', 'MultiPolygon'):
                coverage.append(record)

    else:
        project = g.db.query(model.Project).with_polymorphic('*').filter_by(id = project_id).first()
        if not project:
            abort(404)
        coverage = project.coverage

    if not coverage:
        return jsonify(coverage=False)
    else:
        return jsonify(coverage=coverage)

@project.route('/data_volume', methods=['POST'])
def data_volume():
    project_coverage = coverage_from_feature_collection(json.loads(request.form['coverage']))

    total_tiles = 0
    volume = 0
    max_tiles = None
    if project_coverage:
        for raster_source in json.loads(request.form['raster_data']):
            end_level = raster_source['end_level']
            if end_level:
                levels = range(raster_source['start_level'], end_level + 1)
            else:
                levels = [raster_source['start_level']]
            wmts_source = None
            if request.args.get('export', 'false').lower() == 'true':
                local_source = g.db.query(model.LocalWMTSSource).get(raster_source['source_id'])
                if local_source:
                    wmts_source = local_source.wmts_source
            else:
                wmts_source = g.db.query(model.ExternalWMTSSource).get(raster_source['source_id'])
                max_tiles = wmts_source.max_tiles

            source_tiles = estimate_project_tiles(project_coverage, wmts_source, levels)
            volume += source_tiles * 15
            total_tiles += source_tiles

    return jsonify(total_tiles=total_tiles, volume_mb=volume / 1024.0, max_tiles=max_tiles)

def estimate_project_tiles(coverage, wmts_source, levels):
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
    coverage_intersection = wmts_source_coverage.geom.intersection(coverage.geom)
    if not coverage_intersection:
        return 0
    intersection = make_coverage(coverage_intersection, SRS(3857))

    tiles = estimate_tiles(tile_grid(3857), levels, intersection)
    return tiles

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
    feature_collection = json.loads(feature_collection)
    if not feature_collection:
        return None
    if feature_collection['type'] == 'Polygon':
        feature_collection = {
            "type": "FeatureCollection",
            "features": [{
                "geometry": feature_collection,
                "type": "Feature",
                "properties": {}
            }]
        }
    task_coverage_geometry = geometry_from_feature_collection(feature_collection)
    if not task_coverage_geometry:
        return None
    return json.dumps(shapely.geometry.mapping(task_coverage_geometry))


def create_export_tasks(proj):
    for raster_layer in proj.export_raster_layers:
        raster_source = g.db.query(model.LocalWMTSSource).get(raster_layer.source_id)
        start_level = raster_layer.start_level
        end_level = raster_layer.end_level or raster_layer.start_level

        if not proj.coverage:
            raster_coverage = raster_source.wmts_source.download_coverage
            proj.coverage = raster_coverage
        else:
            raster_coverage = proj.coverage

        task = model.RasterExportTask(
            layer=raster_source,
            export_format=proj.export_format,
            export_srs=proj.export_srs,
            zoom_level_start=start_level,
            zoom_level_end=end_level,
            coverage=prepare_task_coverage(raster_coverage),
            project=proj
        )
        g.db.add(task)

        logging_server = raster_source.wmts_source.gbi_server.logging_url
        user = raster_source.wmts_source.gbi_server.username
        send_task_logging(
            logging_server, user, current_app.config.geobox_state, task
        )

    g.db.commit()
    return True


def create_raster_import_task(proj):
    raster_source = proj.import_raster_layers[0].source
    start_level = proj.import_raster_layers[0].start_level
    end_level = proj.import_raster_layers[0].end_level

    local_raster_source = g.db.query(model.LocalWMTSSource).filter_by(
        wmts_source=raster_source).first()

    if local_raster_source:
        local_raster_source.download_level_start = min(
            local_raster_source.download_level_start, start_level)
        local_raster_source.download_level_end = max(
            local_raster_source.download_level_end, end_level)
    else:
        gbi_server = raster_source.gbi_server
        name = gbi_server.raster_prefix + raster_source.name
        local_raster_source = model.LocalWMTSSource(
            download_level_start=start_level,
            download_level_end=end_level,
            wmts_source_id=raster_source.id,
            name=name,
        )

    task = model.RasterImportTask(
        source=raster_source,
        zoom_level_start=start_level,
        zoom_level_end=end_level,
        layer=local_raster_source,
        coverage=prepare_task_coverage(proj.coverage),
        update_tiles=proj.update_tiles,
        project=proj
    )

    logging_server = raster_source.gbi_server.logging_url
    user = raster_source.gbi_server.username
    send_task_logging(logging_server, user, current_app.config.geobox_state,
                      task)

    g.db.add(task)
    g.db.commit()
    write_mapproxy_config(current_app.config.geobox_state)
    return True
