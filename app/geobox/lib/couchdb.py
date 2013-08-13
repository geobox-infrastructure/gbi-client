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

from __future__ import with_statement

import sys
import os
import threading
import tempfile
import time
import subprocess
import shlex
from contextlib import contextmanager
from ConfigParser import ConfigParser

try:
    import requests; requests
except ImportError:
    requests = None

try:
    import simplejson as json; json
except ImportError:
    try:
        import json; json
    except ImportError:
        json = None

from . log import LineLoggerThread

from geobox.utils import wait_for_http_server

import logging
log = logging.getLogger(__name__)


class CouchDBProcess(object):
    """
    Starts and manages a CouchDB process running at `port` and with
    all data stored at `data_dir`.
    """
    def __init__(self, host, port, data_dir, erl_cmd, bin_dir):
        self.host = host
        self.port = port
        self.data_dir = data_dir
        self.erl_cmd = erl_cmd
        self.bin_dir = bin_dir
        self._local_ini = None
        self._process = None
        self.log = logging.getLogger(__name__ + '_%d' % port)

    def __enter__(self):
        fd, self._local_ini = tempfile.mkstemp('.ini', 'couchdb_local')
        os.close(fd)
        self.write_config()
        self.log.info('Starting CouchDB at port %d, data dir %s', self.port, self.data_dir)

        erl_cmd = shlex.split(self.erl_cmd)
        erl_cmd[0] = os.path.join(self.bin_dir, erl_cmd[0])
        couch_db_configs = [
            "../etc/couchdb/default.ini",
            "../etc/couchdb/local.ini",
            "../etc/couchdb/default.d/geocouch.ini",
            self._local_ini,
        ]
        for p in couch_db_configs:
            p = os.path.join(self.bin_dir, p)
            if os.path.exists(p):
                erl_cmd.append(p)
        erl_cmd.extend(['-s', 'couch'])
        self.log.debug("Calling '%s' in %s", ' '.join(erl_cmd), self.bin_dir)
        close_fds = True
        startupinfo = None
        if sys.platform == 'win32':
            close_fds = False
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags = subprocess.CREATE_NEW_CONSOLE | subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = subprocess.SW_HIDE

        self._process = subprocess.Popen(erl_cmd, cwd=self.bin_dir, startupinfo=startupinfo,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, close_fds=close_fds)

        # log process output, handle blocking stdout|stderr.readline() calls in thread
        LineLoggerThread(self.log, logging.INFO, self._process.stdout).start()
        LineLoggerThread(self.log, logging.WARN, self._process.stderr).start()

    def __exit__(self, type, value, traceback):
        if self._process:
            if self._process.poll() == None:
                self._process.terminate()
            self._process = None
        if self._local_ini:
            try:
                os.remove(self._local_ini)
            except Exception, ex:
                log.exception(ex)
            self._local_ini = None

    def is_alive(self):
        if self._process and self._process.poll() == None:
            return True
        return False

    def write_config(self):
        parser = ConfigParser()
        parser.add_section('couchdb')
        parser.set('couchdb', 'database_dir', self.data_dir)
        parser.set('couchdb', 'view_index_dir', self.data_dir)
        parser.add_section('httpd')
        parser.set('httpd', 'bind_address', self.host)
        parser.set('httpd', 'port', self.port)

        parser.add_section('log')
        parser.set('log', 'level', 'error')

        with open(self._local_ini, 'w') as fp:
            parser.write(fp)

class CouchDBServerThread(threading.Thread):
    def __init__(self, app_state, host, port, data_dir, erl_cmd, bin_dir, terminate_event=None):
        threading.Thread.__init__(self)
        self.app_state = app_state
        self.host = host
        self.port = port
        self.data_dir = data_dir
        self.bin_dir = bin_dir
        self.terminate_event = terminate_event or threading.Event()
        self.db = CouchDBProcess(host, port, data_dir, erl_cmd, bin_dir)

    def run(self):
        with self.db:
            while True:
                if self.app_state.wait_for_app_shutdown(timeout=5):
                    break
                if self.terminate_event and self.terminate_event.is_set():
                    break

    def shutdown(self):
        if self.terminate_event:
            self.terminate_event.set()

    def is_alive(self):
        return self.db.is_alive()

class TempCouchDB(object):
    def __init__(self, app_state, db_path):
        self.app_state = app_state
        self.db_path = db_path
        self.port = self.app_state.temp_port()

    @contextmanager
    def run(self):
        erl_cmd = self.app_state.config.get('couchdb', 'erl_cmd')
        bin_dir = self.app_state.config.get('couchdb', 'bin_dir')
        self.db = CouchDBProcess('127.0.0.1', self.port, self.db_path, erl_cmd, bin_dir)
        with self.db:
            wait_for_http_server('127.0.0.1', self.port)
            time.sleep(3)
            yield


class UnexpectedResponse(Exception):
    pass


class CouchDBBase(object):
    def __init__(self, url, db_name, auth=None):
        if requests is None:
            raise ImportError("CouchDB backend requires 'requests' package.")

        if json is None:
            raise ImportError("CouchDB backend requires 'simplejson' package or Python 2.6+.")
        self.couch_url = url.rstrip('/')
        self.db_name = db_name.lower()
        self.couch_db_url = '%s/%s' % (self.couch_url, self.db_name)
        self.req_session = requests.Session()
        if auth:
            self.req_session.auth = auth

    def _store_bulk(self, records):
        doc = {'docs': list(records)}
        data = json.dumps(doc)
        resp = self.req_session.post(self.couch_db_url + '/_bulk_docs', data=data, headers={'Content-type': 'application/json'})
        if resp.status_code != 201:
            raise UnexpectedResponse('got unexpected resp (%d) from CouchDB: %s' % (resp.status_code, resp.content))

    def store_records(self, records):
        return self._store_bulk(records)

    def _load_records(self, rows):
        for record in rows:
            if 'doc' in record:
                yield record['doc']

    def load_records(self):
        resp = self.req_session.get(self.couch_db_url + '/_all_docs?include_docs=true', headers={'Accept': 'application/json'})
        if resp.status_code == 200:
            doc = json.loads(resp.content)
            return self._load_records(doc.get('rows', []))
        return []

    def load_record(self, doc_id):
        doc_url = self.couch_db_url + '/' + doc_id
        resp = self.req_session.get(doc_url)
        if resp.status_code == 200:
            return resp.json()

    def update_or_create_doc(self, doc_id, doc):
        doc_url = self.couch_db_url + '/' + doc_id
        resp = self.req_session.get(doc_url)
        if resp.status_code == 200:
            rev = resp.json()['_rev']
            doc['_rev'] = rev
        elif resp.status_code != 404:
            raise UnexpectedResponse('got unexpected resp (%d) from CouchDB: %s' % (resp.status_code, resp.content))

        resp = self.req_session.put(doc_url,
            headers={'Accept': 'application/json'},
            data=json.dumps(doc),
        )
        if resp.status_code != 201:
            raise UnexpectedResponse('got unexpected resp (%d) from CouchDB: %s' % (resp.status_code, resp.content))

    def replication(self, repl_id, source, target, continuous=False):
        repl_doc = {
            "_id": repl_id,
            "source":  source,
            "target":  target,
            "continuous": continuous,
            "worker_processes": 1,
            "user_ctx": {
                "roles": ["_admin"],
            }
        }

        doc_url = self.couch_db_url + '/' + repl_id
        resp = requests.get(doc_url)
        if resp.status_code == 200:
            requests.delete(doc_url, params={'rev': resp.json()['_rev']})

        self.update_or_create_doc(repl_id, repl_doc)

    def delete_db(self):
        resp = self.req_session.delete(self.couch_db_url)
        if resp.status_code == 200:
            return True
        return False

    def clear_db(self):
        self.delete_db()
        self.init_db()

class CouchDB(CouchDBBase):
    def __init__(self, url, db_name):
        CouchDBBase.__init__(self, url, db_name)
        self.init_db()

    def init_db(self, couch_db_url=None):
        self.req_session.put(couch_db_url if couch_db_url else self.couch_db_url)

    def get_tile(self, matrix_set, x, y, z):
        tile_url = self.couch_db_url + '/%s-%s-%s-%s/tile' % (matrix_set, z, x, y)
        resp = self.req_session.get(tile_url)
        if resp.status_code != 200:
            log.error('Tile %s not found', tile_url)
            return False
        return resp.content

def vector_layers_metadata(couchdb_url):
    couchdb_url = couchdb_url.rstrip('/')
    sess = requests.Session()
    resp = sess.get(couchdb_url + '/_all_dbs')
    for dbname in resp.json():
        metadata = sess.get(couchdb_url + '/' + dbname + '/metadata')
        if metadata.status_code == 200:
            doc = metadata.json()
            doc['dbname'] = dbname
            if doc.get('type') == 'GeoJSON':
                yield doc

class VectorCouchDB(CouchDBBase):
    def __init__(self, url, layername):
        self.layername = layername
        CouchDB.__init__(self, url, dbname=layername)

    def init_layer(self, metadata=None):
        if metadata is None:
            metadata = {'title': self.db_name}
        metadata['type'] = 'GeoJSON'
        CouchDB.init_db()
        self.update_or_create_doc('metadata', metadata)

    def metadata(self):
        resp = self.req_session.get(self.couch_url + '/metadata')
        if resp.status_code == 200:
            return resp.json()
