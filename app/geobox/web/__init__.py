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
import sys

from flask import Flask, g, request, make_response, jsonify, render_template, flash, redirect, url_for, session, abort

# XXX olt: do not import from flask.ext, makes trouble with pyinstaller
from flaskext.babel import Babel

import logging
log = logging.getLogger(__name__)

def create_app(app_state):
    app = Flask(__name__)
    app.debug = True

    if getattr(sys, 'frozen', None):
        # set root_path to data dir from PyInstaller
        basedir = sys._MEIPASS
        app.root_path = os.path.join(basedir, os.path.join(*__name__.split('.')))

    app.config.geobox_state = app_state

    app.config['SECRET_KEY'] = app_state.config.get('web', 'secret_key')

    from . import views
    app.register_blueprint(views.main)
    app.register_blueprint(views.editor)
    app.register_blueprint(views.tasks)
    app.register_blueprint(views.project)
    app.register_blueprint(views.user)
    app.register_blueprint(views.admin)
    app.register_blueprint(views.vector)
    app.register_blueprint(views.downloads)
    app.register_blueprint(views.proxy)
    app.register_blueprint(views.boxes)
    app.register_blueprint(views.raster)

    @app.before_request
    def before_request():
        from helper import request_for_static

        g.db = app_state.user_db_session()
        if request_for_static():
            return

        username = session.get('username', False)
        if not username and request.endpoint != 'user_view.login':
             abort(403)

    @app.teardown_request
    def teardown_request(exception):
        """Closes the database again at the end of the request."""
        if hasattr(g, 'db'):
            g.db.close()

    from .helper import css_alert_category, add_auth_to_url
    import geobox.app
    app.jinja_env.globals.update(
        css_alert_category=css_alert_category,
        add_auth_to_url=add_auth_to_url,
        app_state=app_state,
        geobox_client_version=geobox.app.version,
    )

    configure_i18n(app, app_state.locale())
    configure_errorhandlers(app)
    return app

def configure_i18n(app, locale):
    babel = Babel(app)

    @babel.localeselector
    def get_locale():
        return locale

def configure_errorhandlers(app):

    if app.testing:
        return

    from flaskext.babel import _
    @app.errorhandler(405)
    def not_allowed(error):
        if request.is_xhr:
            return jsonify(error=_('Sorry, method not allowed'))
        return make_response(render_template("errors/405.html", error=error), 405)

    @app.errorhandler(404)
    def page_not_found(error):
        if request.is_xhr:
            return jsonify(error=_('Sorry, page not found'))
        return make_response(render_template("errors/404.html", error=error), 404)

    @app.errorhandler(403)
    def forbidden(error):
        if request.is_xhr:
            return jsonify(error=_('Sorry, not allowed'))
        flash(_('Please log in first...'), 'error')
        login_url = '%s?next=%s' % (url_for('user_view.login'), request.url)
        return redirect(login_url)

    @app.errorhandler(500)
    def server_error(error):
        if request.is_xhr:
            return jsonify(error=_('Sorry, an error has occurred'))
        return make_response(render_template("errors/500.html", error=error), 500)

    @app.errorhandler(401)
    def unauthorized(error):
        if request.is_xhr:
            return jsonify(error=_("Login required"))
        flash(_("Please login to see this page"), "error")
        return redirect(url_for("user.login", next=request.url))