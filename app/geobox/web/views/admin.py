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

from flask import Blueprint, render_template, current_app, abort, flash, g, request, redirect, url_for, session
from flaskext.babel import _
from ...model.sources import LocalWMTSSource

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

@admin_view.route('/admin')
def admin():
    form = forms.LoginForm(request.form)
    del(form.username)


    tilebox_form = forms.TileBoxPathForm()
    tilebox_form.path.data = current_app.config.geobox_state.config.get('tilebox', 'path')

    query = g.db.query(LocalWMTSSource)
    raster_sources = query.all()

    return render_template('admin.html', raster_sources=raster_sources, localnet=get_localnet_status(),
        form=form, tilebox_form=tilebox_form)


@admin_view.route('/admin/refresh_context', methods=['POST'])
def refresh_context():
    app_state = current_app.config.geobox_state
    context_document_url = app_state.config.get('web', 'context_document_url')
    try:
        context.reload_context_document(context_document_url, app_state, session['username'], request.form['password'])
    except context.AuthenticationError:
        flash(_('username or password not correct'), 'error')
    except ValueError:
        flash(_('unable to fetch context document'), 'error')
    else:
        flash(_('load context document successful'), 'sucess')

    return redirect(url_for('.admin'))


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