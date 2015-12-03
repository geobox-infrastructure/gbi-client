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

import sys
import os
import logging
import threading
import webbrowser

version = '0.7.0'

def app_server_thread(app_state):
    """Webserver background thread"""
    from geobox.web import create_app
    from geobox.lib.webserver import WebServerThread

    host = app_state.config.get('app', 'host')
    port = app_state.config.get_int('web', 'port')
    app = create_app(app_state)
    return WebServerThread(host, port, app, logger_name='geobox.web.server')

def couchdb_server_thread(app_state):
    """CouchDB background thread"""
    from geobox.lib.couchdb import CouchDBServerThread

    host = app_state.config.get('app', 'host')
    port = app_state.config.get_int('couchdb', 'port')
    erl_cmd = app_state.config.get('couchdb', 'erl_cmd')
    bin_dir = app_state.config.get('couchdb', 'bin_dir')
    if app_state.config.has_option('couchdb', 'data_dir'):
        data_dir = app_state.config.get('couchdb', 'data_dir')
    else:
        data_dir = app_state.user_data_path('couchdb', make_dirs=True)
    return CouchDBServerThread(app_state, host=host, port=port, data_dir=data_dir, erl_cmd=erl_cmd, bin_dir=bin_dir)

def tray_icon_thread(app_state):
    """TrayIcon background thread"""
    from geobox.lib.trayicon import TrayIconThread
    return TrayIconThread(app_state, host='127.0.0.1', port=app_state.config.get_int('web', 'port'))

def mapproxy_thread(app_state):
    """Mapproxy background thread"""
    from mapproxy.wsgiapp import make_wsgi_app
    from geobox.lib.webserver import WebServerThread
    from geobox.utils import wait_for_http_server

    host = app_state.config.get('app', 'host')
    mapproxy_port = app_state.config.get('mapproxy', 'port')
    couch_port = app_state.config.get_int('couchdb', 'port')
    user_dir = app_state.user_data_path()

    # wait for up to ten seconds till couchdb is online
    wait_for_http_server('127.0.0.1', couch_port, max_wait=10)

    from geobox.lib.mapproxy import write_mapproxy_config
    write_mapproxy_config(app_state)

    app = make_wsgi_app(os.path.join(user_dir, 'mapproxy.yaml'), reloader=True)
    return WebServerThread(host, mapproxy_port, app, logger_name='geobox.mapproxy.server')

def background_process_thread(app_state):
    """Background process thread"""
    from geobox.process import task_class_mapping, task_process_mapping
    from geobox.process.base import ProcessThread

    return ProcessThread(app_state=app_state,
        task_class_mapping=task_class_mapping,
        task_process_mapping=task_process_mapping)

def open_webbrowser_in_background(host, port):
    from geobox.utils import wait_for_http_server

    def _open():
        wait_for_http_server(host, port)
        webbrowser.open('http://%s:%d' % (host, port))
    t = threading.Thread(target=_open)
    t.daemon = True
    t.start()

def main(config_filename, port_check=True, open_webbrowser=False):
    from .appstate import GeoBoxState
    from .defaults import GeoBoxConfig
    from .lib import log as liblog

    if config_filename:
        config = GeoBoxConfig.from_file(config_filename)
        if not config:
            sys.exit(1)
        app_state = GeoBoxState(config)
    else:
        app_state = GeoBoxState()

    liblog.init_logging(app_state)
    log = logging.getLogger('geobox.app')

    from .utils import port_used
    if port_used(app_state.config.get('web', 'port')):
        log.fatal('Web port %d in use', app_state.config.get('web', 'port'))
        sys.exit(1)
    if port_used(app_state.config.get('mapproxy', 'port')):
        log.fatal('Mapproxy port %d in use', app_state.config.get('mapproxy', 'port'))
        sys.exit(1)
    if port_used(app_state.config.get_int('couchdb', 'port')):
        log.fatal('CouchDB port %s in use', app_state.config.get('couchdb', 'port'))
        sys.exit(1)

    factories = [
        app_server_thread,
        couchdb_server_thread,
        background_process_thread,
        mapproxy_thread,
    ]

    if sys.platform == 'win32':
        factories.append(tray_icon_thread)

    background_threads = []
    for factory in factories:
        log.info('Starting: %s', factory.__doc__ or factory.__name__)
        t = factory(app_state)
        t.daemon = True
        # start as daemon thread so that we can terminate app when
        # we failed to join thread
        t.start()
        background_threads.append(t)

    # make sure the server for our external tilebox is running
    app_state.tilebox.restart()

    if open_webbrowser:
        open_webbrowser_in_background(
            '127.0.0.1', app_state.config.get('web', 'port'))

    try:
        # wait till someone calls app_state.shutdown_app()
        while not app_state.wait_for_app_shutdown(timeout=60):
            # waiting for event without timeout will intercept
            # KeyboardInterrupts
            pass
    except (KeyboardInterrupt, SystemExit):
        app_state.shutdown_app()

    log.info('Shutting down')
    for t in background_threads:
        t.shutdown()

    from geobox.utils import join_threads
    join_threads(background_threads, max_wait_time=10)
    app_state.cleanup()

    log.info('Terminating')
    # PyInstaller needs to clean up after exit. So it can apear that
    # it hangs here.

if __name__ == '__main__':

    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument('--smoketest', default=False, action='store_true',
        help="Check if installation is complete and dependencies are working.")
    parser.add_argument('--config', default=None,
        help="GeoBox client configuration.")
    parser.add_argument('--open-webbrowser', default=False, action='store_true',
        help="Open webbrowser after startup.")

    logging.basicConfig(level=logging.INFO)

    from .utils import init_lib_paths
    init_lib_paths()

    options = parser.parse_args()

    if options.smoketest:
        from . deps_smoketest import all_deps_working

        if not all_deps_working():
            sys.exit(1)
        else:
            sys.exit(0)

    main(options.config, open_webbrowser=options.open_webbrowser)


