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
from sqlalchemy.exc import IntegrityError
from werkzeug.exceptions import NotFound
from requests.exceptions import MissingSchema

from geobox.model.sources import LocalWMTSSource, ExternalWMTSSource
from geobox.model.server import GBIServer

from geobox.web.utils import request_is_local
from geobox.web.helper import redirect_back

from geobox.lib import context
from geobox.lib.fs import open_file_explorer
from geobox.lib.couchdb import CouchDB, VectorCouchDB
from geobox.lib.context import ContextError
from geobox.lib.mapproxy import write_mapproxy_config
from geobox.web import forms

from geobox.lib.vectormapping import Mapping
from geobox.lib.vectorconvert import load_json_from_gml

admin_view = Blueprint('admin', __name__)


@admin_view.before_request
def restrict_to_local():
    if not request_is_local():
        abort(403)


def prepare_set_server(url_valid=False):
    server_list = current_app.config.geobox_state.unused_server_list
    form = forms.SetGBIServerForm(request.form)
    form.url.choices = [(s['url'], s['title']) for s in server_list]
    # replace url choices when sure url is correct
    if url_valid:
        form.url.choices = [(form.url.data, '')]

    add_server_form = forms.AddGBIServerForm()

    auth_server = [s['url'] for s in server_list if s['auth']]
    return form, add_server_form, auth_server


@admin_view.route('/admin')
def admin():
    form, add_server_form, auth_server = prepare_set_server()
    form.next.data = 'admin.admin'
    add_server_form.next.data = 'admin.admin'

    tilebox_form = forms.TileBoxPathForm()
    tilebox_form.path.data = current_app.config.geobox_state.config.get(
        'tilebox', 'path'
    )
    return render_template('admin.html', localnet=get_localnet_status(),
                           form=form, tilebox_form=tilebox_form,
                           add_server_form=add_server_form,
                           auth_server=json.dumps(auth_server))


def gbi_server_from_list(app_state, url):
    server_list = app_state.unused_server_list
    server = [s for s in server_list if s['url'] == url]

    if len(server) == 0:
        return None

    server = server[0]
    return GBIServer(title=server['title'], url=server['url'],
                     auth=server['auth'])


def load_context(gbi_server, db_session, form, app_state):
    try:
        context.load_context_document(gbi_server, db_session,
                                      form.username.data,
                                      form.password.data)
    except context.AuthenticationError:
        flash(_('username or password not correct'), 'error')
        return False
    except (ValueError, NotFound):
        flash(_('unable to fetch context document'), 'error')
        return False
    else:
        flash(_('load context document successful'), 'sucess')
        context.update_raster_sources(gbi_server, db_session)
        context.update_wfs_sources(gbi_server, db_session)

        db_session.commit()

        if gbi_server.home_server and app_state.home_server is None:
            app_state.new_home_server = gbi_server
        elif gbi_server.home_server and gbi_server.active_home_server:
            context.update_couchdb_sources(gbi_server, app_state)
        return True


def _set_gbi_server(form):
    app_state = current_app.config.geobox_state
    db_session = app_state.user_db_session()

    gbi_server = GBIServer.by_url(db_session, form.url.data)
    if gbi_server is None:
        gbi_server = gbi_server_from_list(app_state, form.url.data)
        if gbi_server is None:
            flash(_('unable to determine selected server'))
            return redirect(url_for(form.next.data))
        db_session.add(gbi_server)

    return load_context(gbi_server, db_session, form, app_state)


@admin_view.route('/admin/initial_set_server', methods=['GET', 'POST'])
def initial_set_server():
    form, add_server_form, auth_server = prepare_set_server()
    add_server_form.next.data = 'admin.initial_set_server'

    return render_template('admin/initial_set_server.html', form=form,
                           add_server_form=add_server_form,
                           auth_server=json.dumps(auth_server),
                           disable_menu=True)


@admin_view.route('/admin/server_list', methods=['GET'])
def server_list():
    app_state = current_app.config.geobox_state
    db_session = app_state.user_db_session()
    query = db_session.query(GBIServer)
    query = query.filter(GBIServer.last_update != None)
    gbi_servers = query.all()
    form, add_server_form, auth_server = prepare_set_server()
    return render_template('admin/server_list.html', servers=gbi_servers, form=form)


@admin_view.route('/admin/set_server', methods=['POST'])
def set_server():
    form, add_server_form, auth_server = prepare_set_server(url_valid=True)
    if form.validate_on_submit():
        if _set_gbi_server(form):
            return redirect(url_for(form.next.data))
        return redirect(request.referrer)
    flash(_('username or password not correct'), 'error')
    return redirect(request.referrer)


@admin_view.route('/admin/add_server', methods=['GET', 'POST'])
def add_server():
    form, add_server_form, auth_server = prepare_set_server()
    if request.method == 'GET':
        add_server_form.next.data = 'admin.add_server'
        form.next.data = 'admin.server_list'

    app_state = current_app.config.geobox_state

    if add_server_form.validate_on_submit():
        auth = False
        try:
            context.test_context_document(add_server_form.url.data)
        except (NotFound, MissingSchema, ContextError):
            flash(_('unable to fetch context document'), 'error')
            return redirect(url_for(add_server_form.next.data))
        except context.AuthenticationError:
            auth = True

        gbi_server = GBIServer(title=add_server_form.title.data,
                               url=add_server_form.url.data,
                               auth=auth)
        db_session = app_state.user_db_session()
        db_session.add(gbi_server)
        try:
            db_session.commit()
        except IntegrityError:
            flash(_('server already exists'), 'error')
        else:
            flash(_('server added'), 'info')
        return redirect(url_for(add_server_form.next.data))
    elif request.method == 'POST':
        flash(_('server could not added'), 'error')
        return redirect(request.referrer)
    return render_template('admin/add_server.html', form=form,
                           add_server_form=add_server_form,
                           auth_server=json.dumps(auth_server))


@admin_view.route('/admin/set_home_server', methods=['GET'])
def set_home_server():
    app_state = current_app.config.geobox_state
    if app_state.new_home_server is None:
        flash(_('unable to set homeserver'), 'error')

    db_session = app_state.user_db_session()
    gbi_server = db_session.query(GBIServer).filter_by(
        id=app_state.new_home_server.id).first()

    if gbi_server is None:
        flash(_('unable to set homeserver'), 'error')
    gbi_server.context = app_state.new_home_server.context

    gbi_server.active_home_server = True
    db_session.commit()

    context.update_couchdb_sources(gbi_server, app_state)

    context_user = gbi_server.context.user()
    if context_user:
        app_state.config.set('user', 'type', str(context_user['type']))
    else:
        app_state.config.set('user', 'type', '0')  # set default to 0

    app_state.config.write()

    flash(_('assigned %(homeserver)s as homeserver',
            homeserver=gbi_server.title))
    app_state.new_home_server = None

    if app_state.user.is_customer:
        return redirect(url_for('admin.upload_gml'))
    return redirect(url_for('main.index'))


@admin_view.route('/admin/reject_home_server', methods=['GET'])
def reject_home_server():
    current_app.config.geobox_state.new_home_server = None
    return redirect_back(url_for('main.index'))


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

@admin_view.route('/file_browser', methods=['GET'])
def file_browser():
    open_file_explorer(current_app.config.geobox_state.user_data_path())
    return redirect_back('.admin')


@admin_view.route('/localnet_access', methods=['POST'])
def localnet_access():
    localnet_status = get_localnet_status()
    if localnet_status:
        current_app.config.geobox_state.config.set('app', 'host', '127.0.0.1')
    else:
        current_app.config.geobox_state.config.set('app', 'host', '0.0.0.0')
    current_app.config.geobox_state.config.write()
    flash(_('settings changed. restart required'), 'error')
    return redirect(url_for('admin.network'))


def get_localnet_status():
    host = current_app.config.geobox_state.config.get('app', 'host')
    return False if host == '127.0.0.1' else True


@admin_view.route('/admin/network', methods=['GET'])
def network():
    return render_template('admin/network.html',
                           localnet=get_localnet_status())


@admin_view.route('/admin/log_view', methods=['GET'])
def log_view():
    log_file = current_app.config.geobox_state.user_data_path('log',
                                                              'geobox.log')
    log = codecs.open(log_file, "r", "utf-8").read()
    return render_template('admin/log_view.html', log=log)


@admin_view.route('/admin/files', methods=['GET'])
def files():
    tilebox_form = forms.TileBoxPathForm()
    tilebox_form.path.data = current_app.config.geobox_state.config.get(
        'tilebox', 'path'
    )
    return render_template('admin/files.html', tilebox_form=tilebox_form)


@admin_view.route('/admin/upload_gml', methods=['GET', 'POST'])
def upload_gml():
    app_state = current_app.config.geobox_state

    form = forms.GMLUploadForm()
    form.srs.choices = list(app_state.config.get('web', 'available_srs'))

    if form.validate_on_submit():
        upload_file = request.files['upload_file']
        if upload_file:
            mapping = Mapping(None, None, '*', other_srs=form.srs.data)
            couch_url = 'http://%s:%s' % (
                '127.0.0.1',
                app_state.config.get('couchdb', 'port')
            )
            db_name = '%s_%s' % (
                app_state.home_server.prefix,
                app_state.config.get('web', 'authorization_layer_name')
            )
            couch = VectorCouchDB(
                couch_url,
                db_name,
                app_state.config.get('web', 'authorization_layer_title')
            )
            couch.remove_all_features()
            couch.store_records(load_json_from_gml(
                upload_file, mapping
            ))

            download_coverage = couch.coverage()

            db_session = app_state.user_db_session()
            sources = db_session.query(ExternalWMTSSource).filter_by(is_public=False).all()
            for source in sources:
                source.download_coverage = json.dumps(download_coverage)
            db_session.commit()

            flash(_('gml file %(name)s successfully uploaded and geometries added to %(auth_layer_title)s', name=upload_file.filename, auth_layer_title=app_state.config.get('web', 'authorization_layer_title')),
                  'info')
            return redirect(url_for('main.index'))

    return render_template('admin/upload_gml.html', form=form)
