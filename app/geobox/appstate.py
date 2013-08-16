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

import os
import sys
import uuid
import threading
import tempfile
import shutil
from contextlib import contextmanager

import babel.support

import sqlalchemy.exc
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from geobox.model.meta import Base

from geobox.utils import port_used

import logging
log = logging.getLogger(__name__)

from geobox.lib.tileboxserver import TileBoxServer
from geobox.defaults import GeoBoxConfig

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
        self.migrate_db(self.engine)
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

    def migrate_db(self, engine):
        """
        Migrate user db to new version.
        """
        with self._migrate_step(engine) as con:
            con.execute("ALTER TABLE external_wmts_sources ADD COLUMN max_tiles INTEGER;")

        with self._migrate_step(engine) as con:
            con.execute("ALTER TABLE tasks_vector_import ADD COLUMN srs VARCHAR(64);")

        with self._migrate_step(engine) as con:
            con.execute("ALTER TABLE external_wmts_sources ADD COLUMN prefix VARCHAR(64);")

        with self._migrate_step(engine) as con:
            con.execute("ALTER TABLE external_wmts_sources ADD COLUMN source_type VARCHAR;")
            con.execute("UPDATE external_wmts_sources SET source_type='wmts';")

    @contextmanager
    def _migrate_step(self, engine):
        con = engine.connect()
        try:
            yield con
        except sqlalchemy.exc.OperationalError:
            # already there
            pass
        finally:
            con.close()

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

    def data_path(self, name):
        if name == 'mapproxy_templates':
            if getattr(sys, 'frozen', None):
                # running from pyinstaller .exe
                basedir = sys._MEIPASS
                # for testing the .exe from packaging/dist
                testing_dir = os.path.join(basedir, '..', '..', 'build', 'mapproxy_templates')
                if os.path.exists(testing_dir):
                    return testing_dir

                # for deployed .exe inside the inno setup destination
                deploy_dir = os.path.join(basedir, 'mapproxy_templates')
                if os.path.exists(deploy_dir):
                    return deploy_dir
        else:
            raise ValueError('unknown data_path name "%s"' % name)
        return None
