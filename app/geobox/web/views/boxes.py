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

import urllib
from werkzeug.exceptions import NotFound
from flask import (render_template, Blueprint, flash,
    redirect, url_for, request, current_app, jsonify)

from flask.ext.babel import gettext as _

from geobox.lib.couchdb import CouchFileBox
from geobox.lib.file_validation import get_file_information
from geobox.web.forms import UploadForm

boxes = Blueprint('boxes', __name__)

@boxes.route("/box/<box_name>", methods=["GET", "POST"])
def files(box_name, user_id=None):
    form = UploadForm()
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

    return render_template("boxes/%s.html" % box_name, form=form, files=files, box_name=box_name)

def couchid_to_authproxy_url(filename, couch_box):
    if isinstance(filename, unicode):
        filename = filename.encode('utf-8')
    return url_for('authproxy.couchdb_proxy_file',
        url=couch_box + '/' + urllib.quote(filename),
    )

def get_couch_box_db(box_name):
    if box_name == 'download':
        return current_app.config.geobox_state.config.get('couchdb', 'download_box')
    elif box_name == 'upload':
        return current_app.config.geobox_state.config.get('couchdb', 'upload_box')
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

@boxes.route('/box/<box_name>/delete/<id>/<rev>', methods=["GET", "POST"])
def delete_file(box_name, id, rev):
    couch_box = get_couch_box_db(box_name)
    couch = CouchFileBox('http://127.0.0.1:%s' % current_app.config.geobox_state.config.get('couchdb', 'port'), couch_box)
    couch.delete(id, rev)
    flash(_("file deleted"), 'success')
    return redirect(url_for("boxes.files", box_name=box_name))
