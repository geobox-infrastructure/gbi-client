# -:- encoding: utf-8 -:-
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

import codecs
import json

from flask import (
    Blueprint, render_template, current_app, abort, flash, g, request,
    redirect, url_for
)
from flaskext.babel import _
from ...model.sources import LocalWMTSSource
from ...model.server import GBIServer

from ..utils import request_is_local
from ..helper import redirect_back

from geobox.lib import context
from geobox.lib.fs import open_file_explorer
from geobox.lib.couchdb import CouchDB
from geobox.lib.mapproxy import write_mapproxy_config
from geobox.web import forms

admin_view = Blueprint('admin', __name__)


@admin_view.before_request
def restrict_to_local():
    if not request_is_local():
        abort(403)


def prepare_set_server():
    server_list = current_app.config.geobox_state.server_list
    form = forms.SetGBIServerForm(request.form)
    form.url.choices = [(s['url'], s['title']) for s in server_list]

    auth_server = [s['url'] for s in server_list if s['auth']]
    return form, auth_server


@admin_view.route('/admin')
def admin():
    form, auth_server = prepare_set_server()
    form.next.data = 'admin.admin'

    tilebox_form = forms.TileBoxPathForm()
    tilebox_form.path.data = current_app.config.geobox_state.config.get(
        'tilebox', 'path'
    )

    return render_template('admin.html', localnet=get_localnet_status(),
                           form=form, tilebox_form=tilebox_form,
                           auth_server=json.dumps(auth_server))


@admin_view.route('/admin/set_gbi_server', methods=['GET', 'POST'])
def set_gbi_server():
    form, auth_server = prepare_set_server()

    if form.validate_on_submit():
        _refresh_context(form.url.data, form.username.data, form.password.data)
        return redirect(url_for(form.next.data))

    return render_template('admin/set_server.html', form=form,
                           auth_server=json.dumps(auth_server))


def _refresh_context(url, username=None, password=None):
    app_state = current_app.config.geobox_state
    try:
        context.reload_context_document(url, app_state,
                                        username, password)
    except context.AuthenticationError:
        flash(_('username or password not correct'), 'error')
    except ValueError:
        flash(_('unable to fetch context document'), 'error')
    else:
        flash(_('load context document successful'), 'sucess')


@admin_view.route('/admin/tilebox_restart', methods=['POST'])
def tilebox_restart():
    form = forms.TileBoxPathForm()
    if form.validate_on_submit():
        app_state = current_app.config.geobox_state

        if 'stop' in request.form:
            app_state.config.set('tilebox', 'path', '')
        else:
            app_state.config.set('tilebox', 'path', form.data['path'])
        app_state.config.write()
        app_state.tilebox.restart()
    return redirect_back(url_for('.admin'))


@admin_view.route('/admin/delete/<int:id>', methods=['POST'])
def remove_source(id):
    query = g.db.query(LocalWMTSSource).filter_by(id=id)
    source = query.first()

    if source:
        # delete from couch db
        couch = CouchDB('http://127.0.0.1:%s' %
            (current_app.config.geobox_state.config.get('couchdb', 'port'), ),
            source.wmts_source.name
        )
        # if delete from couch is successfull delete from db
        if couch.delete_db():
            g.db.delete(source)
            g.db.commit()
            write_mapproxy_config(current_app.config.geobox_state)
            flash(_('delete sucessful'))
        else:
            flash(_('delete not sucessful'))

    return redirect(url_for('.admin'))

@admin_view.route('/localnet_access', methods=['POST'])
def localnet_access():
    localnet_status = get_localnet_status()
    if localnet_status:
        current_app.config.geobox_state.config.set('app', 'host', '127.0.0.1')
    else:
        current_app.config.geobox_state.config.set('app', 'host', '0.0.0.0')
    current_app.config.geobox_state.config.write()
    flash(_('settings changed. restart required'), 'error')
    return redirect(url_for('.admin'))

@admin_view.route('/log_view', methods=['GET'])
def log_view():
    log = codecs.open(current_app.config.geobox_state.user_data_path('log', 'geobox.log'), "r", "utf-8").read()
    return render_template('log_view.html', log=log)

@admin_view.route('/file_browser', methods=['GET'])
def file_browser():
    open_file_explorer(current_app.config.geobox_state.user_data_path())
    return redirect_back('.admin')

def get_localnet_status():
    return False if current_app.config.geobox_state.config.get('app', 'host') == '127.0.0.1' else True
