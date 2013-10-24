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
import datetime

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

class CouchDBError(Exception):
    pass

class CouchDBProcess(object):
    """
    Starts and manages a CouchDB process running at `port` and with
    all data stored at `data_dir`.
    """
    def __init__(self, host, port, data_dir, erl_cmd, bin_dir, log_file):
        self.host = host
        self.port = port
        self.data_dir = data_dir
        self.erl_cmd = erl_cmd
        self.bin_dir = bin_dir
        self.log_file = log_file
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
            "/etc/couchdb/default.ini",
            "/etc/couchdb/local.ini",
            "/etc/couchdb/default.d/geocouch.ini",
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
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, close_fds=close_fds,
            env=os.environ)

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
        parser.set('couchdb', 'uri_file', os.path.join(self.data_dir, '.couch_uri'))
        parser.add_section('httpd')
        parser.set('httpd', 'bind_address', self.host)
        parser.set('httpd', 'port', self.port)

        parser.add_section('log')
        parser.set('log', 'level', 'error')
        parser.set('log', 'file', self.log_file)

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
        log_file = os.path.join(
            app_state.user_data_path('log', make_dirs=True),
            'couchdb.log')
        self.terminate_event = terminate_event or threading.Event()
        self.db = CouchDBProcess(host, port, data_dir, erl_cmd, bin_dir, log_file)

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
        log_file = os.path.join(
            self.app_state.user_data_path('log', make_dirs=True),
            'couchdb_tmp.log'
        )
        self.db = CouchDBProcess('127.0.0.1', self.port, self.db_path, erl_cmd, bin_dir, log_file)
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

    def get(self, doc_id):
        doc_url = self.couch_db_url + '/' + doc_id
        resp = self.req_session.get(doc_url)
        if resp.ok:
            return resp.json()
        elif resp.status_code != 404:
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, doc_url, resp.content)
            )

    def put(self, doc_id, doc):
        doc_url = self.couch_db_url + '/' + doc_id
        resp = self.req_session.put(doc_url,
            headers={'Accept': 'application/json'},
            data=json.dumps(doc),
        )
        if resp.status_code != 201:
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, doc_url, resp.content)
            )

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

    def replication(self, repl_id, source, target, continuous=False, create_target=False):
        repl_doc = {
            "_id": repl_id,
            "source":  source,
            "target":  target,
            "continuous": continuous,
            "create_target": create_target,
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
    for doc in all_layers(couchdb_url):
        if doc.get('type') == 'GeoJSON':
            yield doc

def all_layers(couchdb_url):
    couchdb_url = couchdb_url.rstrip('/')
    sess = requests.Session()
    resp = sess.get(couchdb_url + '/_all_dbs')
    for dbname in resp.json():
        metadata = sess.get(couchdb_url + '/' + dbname + '/metadata')
        if metadata.status_code == 200:
            doc = metadata.json()
            doc['dbname'] = dbname
            if doc.get('type', None):
                yield doc

def replication_status(couch_url, task_name):
    couch_url = couch_url.rstrip('/')
    sess = requests.Session()
    resp = sess.get(couch_url + '/_replicator/' + task_name)
    doc = resp.json()

    if not doc.has_key('_replication_state'):
        return False
    elif doc['_replication_state'] == 'triggered':
        resp = sess.get(couch_url + '/_active_tasks')
        for active_task in resp.json():
            if active_task['target'] == task_name:
                return active_task['progress']

    return doc['_replication_state']

class VectorCouchDB(CouchDBBase):
    def __init__(self, url, db_name, title=None):
        CouchDBBase.__init__(self, url, db_name)
        self.db_name = db_name
        self.title = title or db_name
        self.init_layer()

    def init_db(self, couch_db_url=None):
        self.req_session.put(couch_db_url if couch_db_url else self.couch_db_url)

    def init_layer(self):
        metadata = self.get('metadata')

        if not metadata:
            metadata = {
                'name': self.db_name,
                'title': self.title,
            }

        metadata['type'] = 'GeoJSON'

        self.init_db()
        self.update_or_create_features_view_doc()
        self.update_or_create_savepoints_view_doc()
        self.update_or_create_odata_doc()
        self.update_or_create_doc('metadata', metadata)

    def update_or_create_features_view_doc(self):
        feature_view_doc = {
            "_id":"_design/features",
            "language": "javascript",
            "views":
            {
                "all": {
                    "map": "function(doc) { if (doc.type == 'Feature') {emit(doc.type, doc.drawType); } }"
                },
            }
        }
        existing_features_doc = self.get('_design/features')
        if existing_features_doc:
            feature_view_doc['_rev'] = existing_features_doc['_rev']
        self.put('_design/features', feature_view_doc)

    def update_or_create_savepoints_view_doc(self):
        savepoints_view_doc = {
            "_id":"_design/savepoints",
            "language": "javascript",
            "views":
            {
                "all": {
                    "map": "function(doc) { if (doc.type == 'savepoint') {emit(doc.title, doc._rev) } }"
                },
            }
        }
        existing_savepoints_doc = self.get('_design/savepoints')
        if existing_savepoints_doc:
            savepoints_view_doc['_rev'] = existing_savepoints_doc['_rev']
        self.put('_design/savepoints', savepoints_view_doc)

    def update_or_create_odata_doc(self):
        odata_doc = {
            "_id": "_design/odata",
            "language": "javascript",
            'views': {
                    'odata_view': {
                        'map': 'function(doc) {emit(doc._id, doc.properties)}'
                    }
                },
                'lists': {
                    'odata_convert': """
                        function(head, req) {
                            var dt = new Date(Date.now());
                            var month = ("0" + (dt.getUTCMonth() + 1)).slice(-2);
                            var day = ("0" + dt.getUTCDate()).slice(-2);
                            var hour = ("0" + dt.getUTCHours()).slice(-2);
                            var minute = ("0" + dt.getUTCMinutes()).slice(-2);
                            var second = ("0" + dt.getUTCSeconds()).slice(-2);
                            var now = dt.getUTCFullYear() + "-" + month + "-" + day + "T" + hour + ":" + minute + ":" + second + "Z";
                            var host = req.headers.Host;
                            var path = req.path;
                            var pathurl = "";
                            for(var b in path) {
                                if (b < path.length-1) {
                                    pathurl = pathurl+"/"+path[b];
                                }
                            }
                            var baseUrl = "http://"+host+pathurl;
                            start({
                                "headers": {
                                    "Content-Type": "application/atom+xml;type=feed;charset=utf-8"
                                }
                            });
                            send('<?xml version="1.0" encoding="utf-8"?>');
                            send('<feed xml:base="'+baseUrl+'" xmlns:d="http://schemas.microsoft.com/ado/2007/08/dataservices" xmlns:m="http://schemas.microsoft.com/ado/2007/08/dataservices/metadata" xmlns="http://www.w3.org/2005/Atom">');
                            send('<title type="text">'+path[path.length-1]+'</title>');
                            send('<id>'+baseUrl+'</id>');
                            send('<link rel="self" title="odata" href="odata" />');
                            send('<updated>'+now+'</updated>');
                            var row;
                            while(row = getRow()) {
                                if(row.key != "metadata") {
                                    send('<entry>');
                                    send('<id>'+baseUrl+'</id>');
                                    send('<title type="text">'+row.key+'</title>');
                                    send('<author><name /></author>');
                                    send('<updated>'+now+'</updated>');
                                    send('<content type="application/xml">');
                                    send('<m:properties>');
                                    for(var prop in row.value) {
                                        if(row.value.hasOwnProperty(prop)){
                                            if(typeof(row.value[prop]) === "number") {
                                                send('<d:'+prop+' m:type="Edm.Double">'+row.value[prop]+'</d:'+prop+'>');
                                            } else if (!isNaN(Date.parse(row.value[prop]))) {
                                                var d = Date.parse(row.value[prop]);
                                                var date = new Date(d).toUTCString();
                                                send('<d:'+prop+' m:type="Edm.DateTime">'+date+'</d:'+prop+'>');
                                            } else {
                                                send('<d:'+prop+' m:type="Edm.String">'+row.value[prop]+'</d:'+prop+'>');
                                            }
                                        }
                                    }
                                    send('</m:properties>');
                                    send('</content>');
                                    send('</entry>');
                                }
                            }
                            send('</feed>');
                        }"""
                },
                'shows': {
                    'odata_service': """
                        function(doc, req) {
                            var host = req.headers.Host;
                            var path = req.path;
                            var pathurl = "";
                            for(var b in path) {
                                if (b < 3) {
                                    pathurl = pathurl+'/'+path[b];
                                }
                            }
                            var baseUrl = "http://"+host+pathurl+"/_list/odata_convert/";
                            var returnBody = '<service xmlns:atom="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app" xmlns="http://www.w3.org/2007/app" xml:base="'+baseUrl+'">';
                            returnBody += '<workspace><atom:title>'+path[path.length-1]+'</atom:title>';
                            if(doc){
                                if (doc.views){
                                    for(var prop in doc.views) {
                                        if(doc.views.hasOwnProperty(prop)){
                                            returnBody = returnBody+'<collection href="'+prop+'">';
                                            returnBody = returnBody+'<atom:title>'+prop+'</atom:title></collection>';
                                        }
                                    }
                                }
                            }
                            returnBody = returnBody+'</workspace></service>';
                            return {
                                headers : {
                                    "Content-Type" : "application/xml"
                                },
                                body : returnBody
                            };
                        }"""
                }
        }
        existing_odata_doc = self.get('_design/odata')
        if existing_odata_doc:
            odata_doc['_rev'] = existing_odata_doc['_rev']
        self.put('_design/odata', odata_doc)

    def metadata(self):
        resp = self.req_session.get(self.couch_db_url + '/metadata')
        if resp.status_code == 200:
            return resp.json()

    def load_features(self):
        resp = self.req_session.get(self.couch_db_url + '/_design/features/_view/all?include_docs=true', headers={'Accept': 'application/json'})
        if resp.status_code == 200:
            doc = json.loads(resp.content)
            return self._load_records(doc.get('rows', []))
        return []

    def load_savepoints(self):
        resp = self.req_session.get(self.couch_db_url + '/_design/savepoints/_view/all?include_docs=true', headers={'Accept': 'application/json'})
        if resp.status_code == 200:
            doc = json.loads(resp.content)
            return self._load_records(doc.get('rows', []))
        return []

class CouchFileBox(CouchDBBase):
    def __init__(self, url, db_name):
        CouchDBBase.__init__(self, url, db_name)
        self.couch_url = url + '/' + db_name
        self.init_db()


    def init_db(self, couch_db_url=None):
        self.req_session.put(couch_db_url if couch_db_url else self.couch_db_url)

    def _file_doc(self, data):
        file_id = data['filename']
        file_doc = {}
        file_doc['_id'] = file_id
        file_doc['datetime'] = datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S ')
        file_doc['_attachments'] = {
            'file': {
                'content_type': data['content-type'],
                'data':  data['file'].encode('base64').replace('\n', ''),
            }
        }
        return file_id, file_doc

    def _store_bulk(self, files, overwrite=False):
        file_docs = {}
        for file in files:
            file_id, file_doc = self._file_doc(file)
            file_docs[file_id] = file_doc

            existing_doc = self.get(file_id)
            if existing_doc:
                file_docs[file_id]['_rev'] = existing_doc['_rev']

            self.put(file_id, file_doc)
        return True

    def store_file(self, file, overwrite=False):
        return self._store_bulk([file], overwrite)

    def store_files(self, files, overwrite=False):
        files = [f for f in files]
        return self._store_bulk(files, overwrite)

    def all_files(self):
        resp = self.req_session.get(self.file_url(include_docs=True))
        data = resp.json()
        files = []
        for row in data.get('rows', []):
            if row['id'] and '_attachments' in row['doc']:
                files.append({
                    'id': row['id'],
                    'rev': row['value']['rev'],
                    'size':  row['doc']['_attachments']['file']['length'],
                    'date': row['doc']['datetime'],
                    'content_type': row['doc']['_attachments']['file']['content_type'],
                })
        return files

    def file_url(self, include_docs=False):
        url = self.couch_url + '/_all_docs?'
        if include_docs:
            url += '&include_docs=true'
        return url

    def delete(self, doc_id, rev):
        doc_url = self.couch_url + '/' + doc_id
        resp = self.req_session.delete(doc_url, params={'rev': rev})
        if resp.status_code not in (200, 404):
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, doc_url, resp.content)
            )

    def get(self, doc_id):
        doc_url = self.couch_url + '/' + doc_id
        resp = self.req_session.get(doc_url)

        if resp.ok:
            return resp.json()
        elif resp.status_code != 404:
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, doc_url, resp.content)
            )

    def get_attachment(self, doc_id):
        doc_url = self.couch_url + '/' + doc_id + '/file'
        resp = self.req_session.get(doc_url)

        if resp.ok:
            return resp.json()
        elif resp.status_code != 404:
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, doc_url, resp.content)
            )

    def put(self, doc_id, doc):
        doc_url = self.couch_url + '/' + doc_id
        resp = self.req_session.put(doc_url,
            headers={'Accept': 'application/json'},
            data=json.dumps(doc),
        )
        if resp.status_code != 201:
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, doc_url, resp.content)
            )

    def put_bulk(self, docs):
        doc = {'docs': docs}
        data = json.dumps(doc)
        resp = self.req_session.post(self.couch_url + '/_bulk_docs',
            data=data, headers={'Content-type': 'application/json'}
        )
        if resp.status_code != 201:
            raise CouchDBError(
                'got unexpected resp (%d) from CouchDB for %s: %s'
                % (resp.status_code, self.couch_url + '/_bulk_docs', resp.content)
            )

        errors = {}
        for row in resp.json():
            if 'error' in row:
                errors[row['id']] = row['error']
        return errors
