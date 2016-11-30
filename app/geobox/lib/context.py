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

import json
from shapely.geometry import asShape
import requests
import datetime
from geobox import model
from geobox.lib.couchdb import CouchDB
from werkzeug.exceptions import NotFound


class ContextError(Exception):
    pass


class Context(object):
    def __init__(self, doc):
        self.doc = doc

    def wmts_sources(self):
        for lyr in self.doc.get('wmts_sources', []):
            yield lyr

    def wms_sources(self):
        for lyr in self.doc.get('wms_sources', []):
            yield lyr

    def wfs_sources(self):
        for lyr in self.doc.get('wfs_sources', []):
            yield lyr

    def logging_server(self):
        return self.doc.get('logging', {}).get('url')

    def update_coverage_url(self):
        return self.doc.get('update_coverage', {}).get('url')

    def couchdb_sources(self):
        return self.doc.get('couchdb_sources', [])

    def has_couchdb_sources(self):
        return len(self.couchdb_sources()) > 0

    def user(self):
        return self.doc.get('user', {})

    def prefix(self):
        return self.doc.get('portal', {}).get('prefix').lower()

    def version(self):
        return self.doc.get('version')

    def parcel_search_url(self):
        return self.doc.get('parcel_search_url')


class ContextModelUpdater(object):
    """
    Update the internal source/layer models from a new context.
    """
    def __init__(self, session, version):
        self.session = session
        self.version = version

    def sources_from_context(self, context):
        prefix = context.doc.get('portal', {}).get('prefix').lower()
        for source in context.wmts_sources():
            yield self.source_for_conf(source, prefix, source_type='wmts')

        for source in context.wms_sources():
            yield self.source_for_conf(source, prefix, source_type='wms')

    def source_for_conf(self, layer, prefix, source_type):
        query = self.session.query(model.ExternalWMTSSource).filter_by(name=layer['name'])
        query = query.filter_by(source_type=source_type)
        if prefix:
            query = query.filter_by(prefix=prefix)

        source = query.all()
        if source:
            source = source[0]
        else:
            source = model.ExternalWMTSSource()

        source.name = layer['name']
        source.prefix = prefix
        source.title = layer['title']
        source.url = layer['url']
        source.is_protected = layer.get('is_protected')
        source.is_public = layer.get('is_public')

        if source_type == 'wmts' and self.version == '0.1':
            source.url = source.url + layer['layer'] + '/GoogleMapsCompatible-{TileMatrix}-{TileCol}-{TileRow}/tile'

        if not source.is_protected:
            source.username = layer.get('username')
            source.password = layer.get('password')

        source.format = layer['format']
        source.is_overlay = layer['overlay']
        source.background_layer = layer.get('is_background_layer', False)

        source.max_tiles = layer.get('max_tiles')

        if source_type == 'wms':
            source.srs = layer['srs']
            source.layer = layer['layer']

        assert source_type in ('wmts', 'wms')
        source.source_type = source_type

        if 'view_restriction' in layer:
            source.view_coverage = self.coverage_from_restriction(layer['view_restriction'])
            source.view_level_start = layer['view_restriction'].get('zoom_level_start')
            source.view_level_end = layer['view_restriction'].get('zoom_level_end')
        else:
            source.view_coverage = None
            source.view_level_start = None
            source.view_level_end = None

        source.download_coverage = None
        source.download_level_start = layer['download_restriction'].get('zoom_level_start')
        source.download_level_end = layer['download_restriction'].get('zoom_level_end')

        source.active = True
        return source

    def coverage_from_restriction(self, restriction):
        geom = asShape(restriction['geometry'])
        if geom.type not in ('Polygon', 'MultiPolygon'):
            raise ContextError('unsupported geometry type %s' % geom.type)

        return json.dumps(restriction['geometry'])


class AuthenticationError(Exception):
    pass


def wfs_source_for_conf(session, layer, prefix):
    query = session.query(model.ExternalWFSSource).filter_by(name=layer['name'])

    if prefix:
        query = query.filter_by(prefix=prefix)

    source = query.all()
    if source:
        source = source[0]
    else:
        source = model.ExternalWFSSource()

    source.prefix = prefix
    source.id = layer['id']
    source.name = layer['name']
    source.layer = layer['layer']
    source.host = layer['host']
    source.url = layer['url']
    source.srs = layer['srs']
    source.geometry_field = layer['geometry_field']
    source.feature_ns = layer['feature_ns']
    source.typename = layer['typename']
    source.search_property = layer.get('search_property')

    source.is_protected = layer.get('is_protected')
    if not source.is_protected:
        source.username = layer.get('username')
        source.password = layer.get('password')

    source.active = True
    return source


def load_context_document(gbi_server, db_session, user, password):
    try:
        result = requests.get(gbi_server.url, auth=(user, password))
    except requests.exceptions.ConnectionError:
        raise NotFound()

    if result.status_code in (401, 403):
        raise AuthenticationError()

    context_doc = result.json()
    context = Context(context_doc)
    gbi_server.context = context
    gbi_server.logging_url = context.logging_server()
    gbi_server.update_coverage_url = context.update_coverage_url()
    gbi_server.prefix = context.prefix()
    gbi_server.home_server = context.has_couchdb_sources()
    gbi_server.last_update = datetime.datetime.now()
    if user is not None and user != '':
        gbi_server.username = user
    db_session.commit()


def test_context_document(url, user=None, password=None):
    auth = (user, password)
    auth = None if None in auth else auth
    try:
        result = requests.get(url, auth=(user, password))
    except requests.exceptions.ConnectionError:
        raise NotFound()

    if result.status_code in (401, 403):
        raise AuthenticationError()

    # check if we can load context document
    try:
        context_doc = result.json()
        Context(context_doc)
    except (ValueError, ContextError):
        raise ContextError()

    return True


def update_raster_sources(gbi_server, db_session):
    updater = ContextModelUpdater(db_session, gbi_server.context.version())

    for source in updater.sources_from_context(gbi_server.context):
        source.gbi_server = gbi_server
        db_session.add(source)


def update_wfs_sources(gbi_server, db_session):
    for source in gbi_server.context.wfs_sources():
        wfs_source = wfs_source_for_conf(db_session, source, gbi_server.prefix)
        wfs_source.gbi_server = gbi_server
        db_session.add(wfs_source)


def update_parcel_search_source(gbi_server, db_session):
    parcel_search_url = gbi_server.context.parcel_search_url()
    if gbi_server.parcel_search_source: # existing source
        if parcel_search_url:
            gbi_server.parcel_search_source.url = parcel_search_url
            gbi_server.parcel_search_source.active = True
        else:
            gbi_server.parcel_search_source.active = False
    else:
        if parcel_search_url:
            parcel_search_source = model.ParcelSearchSource(
                url=parcel_search_url,
                active=True,
                gbi_server=gbi_server
            )
            db_session.add(parcel_search_source)


def update_couchdb_sources(gbi_server, app_state):
    couchdb_port = app_state.config.get_int('couchdb', 'port')
    couchdb = CouchDB('http://127.0.0.1:%d' % couchdb_port, '_replicator')
    couchdb_sources = gbi_server.context.couchdb_sources()

    for couchdb_source in couchdb_sources:
        replicate_database(couchdb, couchdb_source, app_state,
                           gbi_server.prefix)


def source_couchdb_url(couchdb_source):
    dburl = couchdb_source['url'] + '/' + couchdb_source['dbname']

    if 'username' in couchdb_source:
        schema, dburl = dburl.split('://')
        dburl = '%s://%s:%s@%s' % (
            schema,
            couchdb_source['username'],
            couchdb_source['password'],
            dburl,
        )
    return dburl


def replicate_database(couchdb, couchdb_source, app_state, prefix=None):
    dbname_user = couchdb_source['dbname_user']
    if prefix is not None:
        dbname_user = '%s_%s' % (prefix, dbname_user)
    dburl = source_couchdb_url(couchdb_source)
    couch_url = 'http://127.0.0.1:%d' % app_state.config.get_int(
        'couchdb', 'port')
    target_couchdb = CouchDB(couch_url, dbname_user)
    target_couchdb.init_db()

    couchdb.replication(
        repl_id=couchdb_source['dbname'],
        source=dburl,
        target=dbname_user,
        continuous=True,
    )
    if couchdb_source['writable']:
        couchdb.replication(
            repl_id=couchdb_source['dbname'] + '_push',
            source=dbname_user,
            target=dburl,
            continuous=True,
        )
