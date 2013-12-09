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

import os
import glob
import re

from flask import Blueprint, render_template, g, url_for, redirect, request, flash, current_app, abort, jsonify

from flaskext.babel import _

from geobox.lib.server_logging import send_task_logging
from geobox.lib.vectorconvert import is_valid_shapefile, ConvertError
from geobox.lib.fs import open_file_explorer
from geobox.lib.couchdb import vector_layers_metadata
from geobox.model import VectorImportTask, User
from geobox.web import forms
from geobox.model.tasks import VectorExportTask

from geobox.lib.couchdb import CouchFileBox

from ..utils import request_is_local
from ..helper import redirect_back

import logging
log = logging.getLogger(__name__)

vector = Blueprint('vector', __name__)

@vector.before_request
def only_if_enabled():
    if not current_app.config.geobox_state.config.get('app', 'vector_import'):
        abort(404)

def prepare_geojson_form(form):
    geojson_files = get_geojson_list()
    form.file_name.choices = [(name, name) for name in geojson_files]
    form.file_name.choices.insert(0, ('', _('-- select a geojson --')))

    couch_url = 'http://%s:%s' % ('127.0.0.1', current_app.config.geobox_state.config.get('couchdb', 'port'))
    form.layers.choices = [(item['dbname'], item['title']) for item in vector_layers_metadata(couch_url)]
    form.layers.choices.insert(0, ('', _('-- select layer or add new --')))
    return form

@vector.route('/vector/import_geojson', methods=['GET', 'POST'])
def import_geojson():
    # upload geojson
    for upload_file in request.files.getlist('file_upload'):
        import_dir = current_app.config.geobox_state.user_data_path('import')
        target = os.path.join(import_dir, upload_file.filename)
        if os.path.splitext(target)[1].lower() in ('.json'):
            try:
                if not os.path.isdir(import_dir):
                    os.mkdir(import_dir)
                f = open(target, 'wb')
                f.write(upload_file.stream.read())
                f.close()
            except IOError:
                flash(_('failed to upload %(name)s', name=upload_file.filename), 'error')

            flash(_('file %(name)s uploaded', name=upload_file.filename), 'info')
        else:
            flash(_('filetype of %(name)s not allowed', name=upload_file.filename), 'error')

    form = forms.ImportGeoJSONEdit(request.form)
    form = prepare_geojson_form(form)

    if not len(request.files):
        if form.validate_on_submit():
            if (form.layers.data and form.name.data) or (not form.layers.data and not form.name.data):
                flash(_('please select new layer or current layer to import'), 'error')
                return redirect(url_for('.import_geojson'))

            title = None
            if form.layers.data:
                layer = form.layers.data
            else:
                title = form.name.data
                layer = 'local_vector_' + re.sub(r'[^a-z0-9]*', '',  title.lower())
                if layer == 'local_vector_':
                    flash(_('None of the characters used for the layer is allowed'))
                    return redirect(url_for('.import_geojson'))

            task = VectorImportTask(
                db_name=layer,
                title=title,
                file_name=form.file_name.data,
                type_ = 'geojson'
            )
            send_task_logging(current_app.config.geobox_state, task)
            g.db.add(task)
            g.db.commit()
            return redirect(url_for('tasks.list'))

        elif request.method == 'POST':
            flash(_('form error'), 'error')

    file_browser = request_is_local()
    return render_template('vector/geojson.html', form=form, file_browser=file_browser)

@vector.route('/vector/import', methods=['GET', 'POST'])
def import_vector():
    from ...lib.vectormapping import Mapping

    uploaded_shapes=[]
    upload_failures=[]
    not_allowed_files=[]

    for upload_file in request.files.getlist('file_upload'):
        import_dir = current_app.config.geobox_state.user_data_path('import')
        target = os.path.join(import_dir, upload_file.filename)
        if os.path.splitext(target)[1].lower() in ('.shp', '.shx', '.dbf'):
            try:
                if not os.path.isdir(import_dir):
                    os.mkdir(import_dir)

                f = open(target, 'wb')
                f.write(upload_file.stream.read())
                f.close()
            except IOError:
                upload_failures.append(upload_file.filename)

            uploaded_shapes.append(upload_file.filename)
        else:
            not_allowed_files.append(upload_file.filename)

    form = forms.ImportVectorEdit(request.form)
    form.srs.choices = [(srs, srs) for srs in current_app.config.geobox_state.config.get('web', 'available_srs')]

    couch_url = 'http://%s:%s' % ('127.0.0.1', current_app.config.geobox_state.config.get('couchdb', 'port'))
    form.layers.choices = [(item['dbname'], item['title']) for item in vector_layers_metadata(couch_url)]
    form.layers.choices.insert(0, ('', _('-- select layer or add new --')))

    shape_files, missing_files = get_shapefile_list()
    form.file_name.choices = [(name, name) for name in shape_files]
    form.file_name.choices.insert(0, ('', _('-- select a shapefile --')))

    if not len(request.files):
        if form.validate_on_submit():
            try:
                is_valid_shapefile(current_app.config.geobox_state.user_data_path('import', form.file_name.data), Mapping(None, None, '*'))
            except ConvertError as e:
                flash(e, 'error')
                return render_template('vector/import.html', form=form)
            except OSError:
                flash(_('invalid shapefile'), 'error')
                return render_template('vector/import.html', form=form)

            if (form.layers.data and form.name.data) or (not form.layers.data and not form.name.data):
                flash(_('please select new layer or current layer to import'), 'error')
                return redirect(url_for('.import_vector'))

            title = None
            if form.layers.data:
                layer = form.layers.data
            else:
                title = form.name.data
                layer = 'local_vector_' + re.sub(r'[^a-z0-9]*', '',  title.lower())
                if layer == 'local_vector_':
                    flash(_('None of the characters used for the layer is allowed'))
                    return redirect(url_for('.import_vector'))

            task = VectorImportTask(
                db_name=layer,
                title=title,
                file_name=form.file_name.data,
                srs=form.srs.data,
                type_ = 'shp',
            )
            send_task_logging(current_app.config.geobox_state, task)
            g.db.add(task)
            g.db.commit()
            return redirect(url_for('tasks.list'))
        elif request.method == 'POST':
            flash(_('form error'), 'error')

    for missing_file in missing_files:
        flash(_('file %(name)s missing', name=missing_file), 'error')
    for upload_failure in upload_failures:
        flash(_('failed to upload %(name)s', name=upload_failure), 'error')
    for not_allowed_file in not_allowed_files:
        flash(_('filetype of %(name)s not allowed', name=not_allowed_file), 'error')
    for uploaded_shape in uploaded_shapes:
        flash(_('file %(name)s uploaded', name=uploaded_shape), 'info')

    file_browser = request_is_local()
    return render_template('vector/import.html', form=form, file_browser=file_browser)

def get_geojson_list():
    file_list = []

    import_dir = current_app.config.geobox_state.user_data_path('import')
    files = set((glob.glob(os.path.join(import_dir, '*.json')) + glob.glob(os.path.join(import_dir, '*.JSON'))))
    for geojson_file in files:
        s_path, s_name = os.path.split(geojson_file)
        name, ext = os.path.splitext(s_name)
        file_list.append((s_name))
    return file_list


def get_shapefile_list():
    shape_import_dir = current_app.config.geobox_state.user_data_path('import')
    shape_file_list = []
    missing_file_list = []

    shp_files = set((glob.glob(os.path.join(shape_import_dir, '*.shp')) + glob.glob(os.path.join(shape_import_dir, '*.SHP'))))
    for shape_file in shp_files:
        missing = False
        s_path, s_name = os.path.split(shape_file)
        name, ext = os.path.splitext(s_name)
        if not os.path.exists(os.path.join(s_path, name +'.shx')):
            missing = True
            missing_file_list.append(name + '.shx')
        if not os.path.exists(os.path.join(s_path, name + '.dbf')):
            missing = True
            missing_file_list.append(name + '.dbf')
        if not missing:
            shape_file_list.append((s_name))
    return (shape_file_list, missing_file_list)

@vector.route('/file_browser/import_dir')
def import_file_browser():
    open_file_explorer(current_app.config.geobox_state.user_data_path('import', make_dirs=True))
    return redirect_back('.import_vector')

@vector.route('/vector/export', methods=['POST'])
def export_vector():
    return create_export_task(
        proj = request.form.get('srs', False),
        layername = request.form.get('name', False),
        export_type = request.form.get('export_type', False),
        destination = request.form.get('destination', False),
        filename = request.form.get('filename', False),
        geojson = request.form.get('geojson', '')
    )

@vector.route('/vector/export/selected', methods=['POST'])
def export_selected_geometries():
    user = User(current_app.config.geobox_state.config.get('user', 'type'))
    target_box_name = 'file_box' if user.is_consultant else 'upload_box'
    target_box = current_app.config.geobox_state.config.get('couchdb', target_box_name)

    filename = request.form.get('filename', False)
    data = request.form.get('geojson', False)

    file_obj = {'content-type': 'application/json' , 'file': data, 'filename': filename + '.json' }

    couch = CouchFileBox('http://%s:%s' % ('127.0.0.1', current_app.config.geobox_state.config.get('couchdb', 'port')), target_box)

    try:
        couch.store_file(file_obj, overwrite=True)
    except Exception, e:
        log.exception(e)
        abort(500)
    return jsonify({'status': 'success'})

def create_export_task(proj, layername, export_type, destination, filename, geojson):
    task = VectorExportTask(
       db_name=layername,
       srs=proj,
       type_=export_type,
       destination=destination,
       file_name=filename,
       geojson=geojson,
    )

    g.db.add(task)
    send_task_logging(current_app.config.geobox_state, task)
    g.db.commit()
    return redirect(url_for('tasks.list'))
