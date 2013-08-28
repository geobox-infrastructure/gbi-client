# This file is part of the GBI project.
# Copyright (C) 2013 Omniscale GmbH & Co. KG <http://omniscale.com>
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

import re
import urllib

from werkzeug.exceptions import NotFound, Forbidden
from flask import (render_template, Blueprint, flash,
    redirect, url_for, request, current_app, jsonify, g, session)

from flask.ext.babel import gettext as _

from geobox.lib.couchdb import CouchFileBox
from geobox.lib.file_validation import get_file_information
from geobox.web.forms import UploadForm, ImportGeoJSONEdit
from geobox.model import VectorImportTask
from geobox.lib.server_logging import send_task_logging
from .vector import prepare_geojson_form

boxes = Blueprint('boxes', __name__)

@boxes.route("/box/<box_name>", methods=["GET", "POST"])
def files(box_name, user_id=None):

    if (box_name == 'file' and not session['user_is_consultant']):
        raise NotFound()

    if ((box_name == 'download' or box_name == 'upload') and session['user_is_consultant']):
        raise NotFound()

    form = UploadForm()
    import_form = ImportGeoJSONEdit()
    import_form = prepare_geojson_form(import_form)

    couch_box = get_couch_box_db(box_name)
    couch = CouchFileBox('http://127.0.0.1:%s' % current_app.config.geobox_state.config.get('couchdb', 'port'), couch_box)
    if form.validate_on_submit():
        file = request.files['file']
        overwrite = True if request.form.get('overwrite') == 'true' else False
        if file:
            data = get_file_information(file)
            if data:
                couch.store_file(data, overwrite=overwrite)
                flash(_('upload success'), 'success')
            else:
                flash(_('file type not allowed'), 'error')

    files = couch.all_files()
    for f in files:
        f['download_link'] = couchid_to_link(f['id'], couch_url=couch.couch_url)
    return render_template("boxes/%s.html" % box_name, form=form, files=files, box_name=box_name, import_form=import_form)

def couchid_to_link(filename, couch_url):
    if isinstance(filename, unicode):
        filename = filename.encode('utf-8')
    return "%s/%s/file" % (couch_url, urllib.quote(filename))

def get_couch_box_db(box_name):
    if box_name == 'download':
        return current_app.config.geobox_state.config.get('couchdb', 'download_box')
    elif box_name == 'upload':
        return current_app.config.geobox_state.config.get('couchdb', 'upload_box')
    elif box_name == 'file':
        return current_app.config.geobox_state.config.get('couchdb', 'file_box')
    else:
        raise NotFound()

@boxes.route("/box/<box_name>/check_file", methods=["POST"])
def check_file_exists(box_name):

    couch_box = get_couch_box_db(box_name)
    couch = CouchFileBox('http://127.0.0.1:%s' % current_app.config.geobox_state.config.get('couchdb', 'port'), couch_box)
    existing_doc = couch.get(request.form['filename'])

    if existing_doc:
        return jsonify(existing=True)
    return jsonify(existing=False)

@boxes.route("/box/<box_name>/import/<id>", methods=["POST"])
def import_json(box_name, id):
    layer = request.form.get('layers', False)
    new_layer = request.form.get('name', False)
    file_name = request.form.get('file_name', False)

    if (layer and new_layer) or (not layer and not new_layer):
        flash(_('please select new layer or current layer to import'), 'error')
        return redirect(url_for('.files', box_name=box_name))

    layer = layer if layer else new_layer
    layer = re.sub(r'[^a-z0-9]*', '',  layer.lower())

    task = VectorImportTask(
        db_name=layer,
        file_name=file_name,
        type_ = 'geojson',
        source = get_couch_box_db(box_name)
    )
    send_task_logging(current_app.config.geobox_state, task)
    g.db.add(task)
    g.db.commit()
    flash(_("file will be imported"), 'success')
    return redirect(url_for('tasks.list'))

@boxes.route('/box/<box_name>/delete/<id>/<rev>', methods=["GET", "POST"])
def delete_file(box_name, id, rev):
    couch_box = get_couch_box_db(box_name)
    couch = CouchFileBox('http://127.0.0.1:%s' % current_app.config.geobox_state.config.get('couchdb', 'port'), couch_box)
    couch.delete(id, rev)
    flash(_("file deleted"), 'success')
    return redirect(url_for("boxes.files", box_name=box_name))
