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

from flask import Blueprint, render_template, request, g, current_app, Response, abort, flash, redirect, url_for
from flaskext.babel import _

import json

from geobox.model import ExternalWMTSSource, ExternalWFSSource, User
from geobox.lib import offline
from geobox.lib.couchdb import CouchFileBox, all_layers, replication_status, CouchDBBase, CouchDB
from geobox.lib.tabular import geojson_to_rows, csv_export, ods_export
from geobox.web.forms import ExportVectorForm, WFSSearchForm, CreateCouchAppForm
from geobox.web.helper import get_external_couch_url
from .boxes import get_couch_box_db

editor_view = Blueprint('editor_view', __name__)

@editor_view.route('/editor')
def editor():
    export_form = ExportVectorForm(request.form)
    export_form.srs.choices = [(srs, srs) for srs in current_app.config.geobox_state.config.get('web', 'available_srs')]

    user = User(current_app.config.geobox_state.config.get('user', 'type'))

    target_box_name = 'file_box' if user.is_consultant else 'upload_box'
    target_box_label = _('filebox') if user.is_consultant else _('upload_box')
    target_box = current_app.config.geobox_state.config.get('couchdb', target_box_name)
    export_form.destination.choices = [('file', _('Filesystem')), (target_box, target_box_label)]

    # load preview layer
    preview_features = False
    preview_layername = False

    box_name = request.args.get('box_name', False)
    filename = request.args.get('filename', False)
    if box_name and filename:
        couchbox = get_couch_box_db(box_name)
        couch_src = CouchFileBox('http://%s:%s' % ('127.0.0.1', current_app.config.geobox_state.config.get('couchdb', 'port')), couchbox)
        preview_features = couch_src.get_attachment(filename)
        preview_layername = "%s (%s)" % (filename, _('Temporary'))

    base_layer = g.db.query(ExternalWMTSSource).filter_by(background_layer=True).first()
    base_layer.bbox = base_layer.bbox_from_view_coverage()

    wfs_search_sources = g.db.query(ExternalWFSSource).filter_by(active=True).all()
    if not wfs_search_sources:
        wfs_search_sources = False
    wfs_search_form = WFSSearchForm(request.form)

    return render_template('editor.html',
        base_layer=base_layer,
        export_form=export_form,
        preview_layername=preview_layername,
        preview_features=preview_features,
        wfs_search_sources=wfs_search_sources,
        wfs_search_form=wfs_search_form,
        with_server=True,
        wms_search_url=current_app.config.geobox_state.config.get('web', 'wms_search_url')
    )

@editor_view.route('/editor/export/<export_type>', methods=['POST'])
def export_list(export_type='csv'):
    geojson =  request.form.get('data', False)
    headers = request.form.get('headers', False)

    if headers:
        headers = headers.split(',')
    if not geojson:
        abort(404)

    doc = json.loads(geojson)
    rows = geojson_to_rows(doc, headers=headers)

    if export_type == 'csv':
        filedata = csv_export(rows)
    else:
        filedata = ods_export(rows, with_headers=True)

    filename = "list.%s" % (export_type)

    return Response(filedata,
        headers={
            'Content-type': 'application/octet-stream',
            'Content-disposition': 'attachment; filename=%s' % filename
        }
    )


@editor_view.route('/editor-offline')
def editor_offline():

    return render_template('editor.html', with_server=False, wms_cors_proxy_url=current_app.config.geobox_state.config.get('web', 'wms_cors_proxy_url'))

@editor_view.route('/editor/couch_app/create', methods=["GET", "POST"])
def create_couch_app():
    form = CreateCouchAppForm(request.form)

    if form.validate_on_submit():
        form_data = dict(request.form)
        form_data.pop('csrf_token')

        target_couch_url = form_data.pop('couch_url')[0].rstrip('/')

        if offline.create_offline_editor(current_app, target_couch_url, 'geobox_couchapp', 'GeoBoxCouchApp'):
            replication_layers = [layer[0] for layer in form_data.values()]
            target_couchdb = CouchDBBase(target_couch_url, '_replicator')
            source_couch_url = get_external_couch_url(request)
            for layer in replication_layers:
                target_couchdb.replication(layer,
                    '%s/%s' % (source_couch_url, layer),
                    layer, create_target=True)

            flash(_('creating couch app') )
            if replication_layers:
                return redirect(url_for('.create_couch_app_status', couch_url=target_couch_url, layers=','.join(replication_layers) ))
            else:
                return redirect(url_for('.create_couch_app_status', couch_url=target_couch_url))
        else:
            flash(_('Error creating couchapp. Check url and given target couchdb.'), 'error')

    raster_layers = []
    vector_layers = []

    for layer in all_layers('http://127.0.0.1:%s' % (current_app.config.geobox_state.config.get('couchdb', 'port'), )):
        if layer['type'] == 'GeoJSON':
            vector_layers.append(layer)
        elif layer['type'] == 'tiles':
            raster_layers.append(layer)

    return render_template('create_couch_app.html', form=form, raster_layers=raster_layers, vector_layers=vector_layers)

@editor_view.route('/editor/couch_app/status/<path:couch_url>/with_layers/<layers>')
@editor_view.route('/editor/couch_app/status/<path:couch_url>')
def create_couch_app_status(couch_url, layers=None):
    couchapp_ready = True
    if layers:
        _layers = layers.split(',')
        layers = {}

        for layer in _layers:
            couchdb = CouchDB('http://127.0.0.1:%s' % (current_app.config.geobox_state.config.get('couchdb', 'port')), layer)
            metadata = couchdb.get('metadata')
            status = replication_status(couch_url, layer)
            if status != 'completed':
                couchapp_ready = False
            layers[metadata['title']] = status
    else:
        layers = {}

    if couchapp_ready:
        couchapp_url = '%s/geobox_couchapp/_design/GeoBoxCouchApp/_rewrite' % couch_url
        flash(_('couchapp ready %(couchapp_url)s', couchapp_url=couchapp_url), 'success')

    return render_template('create_couch_app_status.html', layers=layers, ready=couchapp_ready)
