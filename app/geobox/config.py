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
import uuid
import threading
import tempfile
import shutil
import time
import ConfigParser as _ConfigParser

import babel.support

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from geobox.model.meta import Base

from geobox.utils import port_used

import logging
log = logging.getLogger(__name__)

class ConfigParser(object):
    """
    Utility class for parsing ini-style configurations with
    predefined default values..
    """

    """Default values, set by subclass"""
    defaults = {}

    def __init__(self, parser, fname):
        self.parser = parser
        self.fname = fname

    @classmethod
    def from_file(cls, fname):
        parser = _ConfigParser.ConfigParser()
        try:
            with open(fname) as fp:
                parser.readfp(fp)
        except Exception, ex:
            log.warn('Unable to read configuration: %s', ex)
        return cls(parser, fname)

    def has_option(self, section, name):
        if self.parser.has_option(section, name):
            return True
        return name in self.defaults.get(section, {})

    def get(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.get(section, name)
        else:
            return self.defaults[section][name]

    def get_bool(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.getboolean(section, name)
        else:
            return self.defaults[section][name]

    def get_int(self, section, name):
        if self.parser.has_option(section, name):
            return self.parser.getint(section, name)
        else:
            return self.defaults[section][name]

    def set(self, section, name, value):
        if not self.defaults.has_key(section):
            raise _ConfigParser.NoSectionError(section)
        if not self.parser.has_section(section):
            self.parser.add_section(section)
        self.parser.set(section, name, value)

    def write(self):
        self.parser.write(open(self.fname, 'w'))

def path(default=(), dev=(), test=(), frozen=()):
    """
    Get path depending on the runtime.

    When executed from PyInstaller .exe, return first
    existing path from the `frozen` list, then from the `test` list.

    Otherwise it returns the first path from the `dev` list.
    Returns ``None`` if no path was found.
    """
    if getattr(sys, 'frozen', None):
        basedir = sys._MEIPASS
        for p in frozen:
            p = os.path.join(basedir, p)
            if os.path.exists(p):
                return p
        for p in test:
            p = os.path.join(basedir, p)
            if os.path.exists(p):
                return p
        for p in default:
            p = os.path.join(basedir, p)
            if os.path.exists(p):
                return p
    else:
        for p in dev:
            if os.path.exists(p):
                return p
        for p in default:
            if os.path.exists(p):
                return p

def env(key, value, platform=None):
    if platform and not sys.platform.startswith(platform):
        return

    os.environ[key] = value

class GeoBoxState(object):
    """
    Contains state information about the complete GeoBox application.

    """
    def __init__(self, config=None):
        if config is None:
            appname = GeoBoxConfig.defaults['app']['name']
            config_fname = self.user_data_path(appname.lower() + '.ini',
                appname=appname, make_dirs=True)
            config = GeoBoxConfig.from_file(config_fname)
        self.config = config
        try:
            config.get('web', 'secret_key')
        except KeyError:
            config.set('web', 'secret_key', uuid.uuid4().get_hex())
            config.write()
        self.engine, self.db_filename = self._user_data_db_engine()
        Base.metadata.create_all(self.engine)
        self.user_db_session = sessionmaker(self.engine)
        self._should_terminate = threading.Event()
        self._temp_dir = None
        self._translations = None
        self._port_lock = threading.Lock()
        self._ports = set()
        self.tilebox = TileBoxServer(self)

    @classmethod
    def initialize(cls):
        # XXX olt: default .ini path
        config = GeoBoxConfig.from_file('./geobox.ini')
        return cls(config)

    def shutdown_app(self):
        """
        Shutdown GeoBox application and all sub threads/processes.
        """
        self._should_terminate.set()

    def wait_for_app_shutdown(self, timeout):
        """
        This method should be polled by sub threads/processes, so that
        they know when to shutdown.

        Returns ``True`` when app terminates, else ``False``.
        """
        if timeout is None:
            return self._should_terminate.is_set()
        return self._should_terminate.wait(timeout)

    def user_data_path(self, *parts, **kw):
        """
        Return path to application user data directory.

        Windows: %APPDATA%/GeoBox
        Linux: ~/.config/geobox and
        Mac OS X: ~/Library/Application Support/GeoBox

        Uses app.name from the config .ini as the application name.

        Additional `parts` will be ``os.path.join``ed to the directory.

        If the keyword `make_dirs` it True, then this method will create all
        directories of that path.
        """
        make_dirs = kw.get('make_dirs', False)
        appname = kw.get('appname', False) or self.config.get('app', 'name')

        if sys.platform.startswith("win"):
            path = os.path.join(os.environ['APPDATA'], appname)
        elif sys.platform == 'darwin':
            path = os.path.join(
                os.path.expanduser('~/Library/Application Support/'),
                appname)
        else:
            path = os.path.join(os.path.expanduser("~/.config"), appname.lower())
        if parts:
            path = os.path.join(path, *parts)
        if make_dirs:
            if '.' in os.path.basename(path):
                dirname = os.path.dirname(path)
            else:
                dirname = path
            if not os.path.exists(dirname):
                os.makedirs(dirname)
        return path

    def gettext(self, string, **kw):
        t = self.translations()
        return t.ugettext(string) % kw

    def translations(self):
        if not self._translations:
            if getattr(sys, 'frozen', None):
                # set root_path to data dir from PyInstaller
                basedir = sys._MEIPASS
                dirname = os.path.join(basedir, 'geobox', 'web', 'translations')
            else:
                dirname = os.path.join(os.path.dirname(__file__), 'web', 'translations')
            self._translations = babel.support.Translations.load(dirname, [self.locale()])
        return self._translations

    def locale(self):
        return self.config.get('app', 'locale')

    def user_temp_dir(self):
        if not self._temp_dir:
            self._temp_dir = tempfile.mkdtemp()
        return self._temp_dir

    def temp_port(self):
        with self._port_lock:
            port = self.config.get_int('couchdb', 'port') - 1
            while True:
                if port in self._ports or port_used(port):
                    port -= 1
                    continue
                self._ports.add(port)
                return port

    def _user_data_db_engine(self):
        filename = self.user_data_path('userdata.db', make_dirs=True)

        engine = create_engine('sqlite:///' + filename)
        return engine, filename

    def cleanup(self):
        if self._temp_dir:
            shutil.rmtree(self._temp_dir)
            self._temp_dir = None

class TileBoxServer(object):
    def __init__(self, app_state):
        self.server = None
        self.app_state = app_state

    def is_running(self):
        return self.server and self.server.is_alive()

    def restart(self):
        if self.server:
            self.server.shutdown()
            if self.server:
                while self.server.is_alive():
                    self.server.shutdown()
                    time.sleep(1)
            self.server = None

        if self.app_state.config.get('tilebox', 'path'):
            from geobox.lib.couchdb import CouchDBServerThread

            port = self.app_state.config.get_int('tilebox', 'port')
            erl_cmd = self.app_state.config.get('couchdb', 'erl_cmd')
            bin_dir = self.app_state.config.get('couchdb', 'bin_dir')
            data_dir = self.app_state.config.get('tilebox', 'path')
            self.server = CouchDBServerThread(self.app_state, host='127.0.0.1', port=port,
                erl_cmd=erl_cmd, bin_dir=bin_dir, data_dir=data_dir)

            self.server.start()


class GeoBoxConfig(ConfigParser):
    """
    Configuration parser for basic GeoBox configuration.
    """
    defaults = {
        'app': {
            'name': 'GeoBox',
            'host': '127.0.0.1',
            'locale': 'de_DE', # 'en_UK'
        },
        'web': {
            'port': 8090,
            'base_layer': {
                'title': 'OSM Omniscale',
                'url': 'http://x.osm.omniscale.net/proxy/service?',
                'layer': 'osm',
                'format': 'image/png',
                'srs': 'EPSG:3857',
            },
            'available_srs': ['EPSG:4326', 'EPSG:3857', 'EPSG 31467', 'EPSG 25832'],
            'context_document_url': 'http://igreendemo.omniscale.net/context',
            'coverages_from_couchdb': 'flaechen-box',
        },
        'mapproxy': {
            'port': 8091,
        },
        'watermark': {
            'text': 'GeoBox',
        },
        'user': {
        },
        'couchdb': {
            # temp ports count backwards from this port -> leave room to other ports
            'port': 8099,
            # use installed path for couchdb since couchdb in packaging/build
            # is only usable after installation
            'bin_dir': path(
                dev=['c:/Program Files/GeoBox/couchdb/bin', '/usr/local/bin'],
                frozen=['../couchdb/bin'],
                test=['c:/Program Files/GeoBox/couchdb/bin', '/usr/local/bin'],
            ),
            'erl_cmd': 'erl -noinput -noshell -sasl errlog_type error -couch_ini',
            'env': [
                env("ERL_FLAGS", "-pa /usr/local/share/geocouch/ebin", platform='darwin'),
                env("ERL_LIBS", "/usr/local/lib/couchdb/erlang/lib", platform='darwin'),
            ]
        },
        'tilebox': {
            'path': None,
            'port': 8092,
        }
    }