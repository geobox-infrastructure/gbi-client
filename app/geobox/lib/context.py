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
from geobox import model
from geobox.lib.box import FeatureInserter
from geobox.lib.couchdb import CouchDB, CouchDBBase
from flask import session as user_session

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

    def couchdb_sources(self):
        return self.doc.get('couchdb_sources', [])

    def user(self):
        return self.doc.get('user', {})

class ContextModelUpdater(object):
    """
    Update the internal source/layer models from a new context.
    """
    def __init__(self, session):
        self.session = session

    def sources_from_context(self, context):
        first = True
        prefix = context.doc.get('portal', {}).get('prefix')
        for source in context.wmts_sources():
            yield self.source_for_conf(source, first, prefix, source_type='wmts')
            first = False

        for source in context.wms_sources():
            yield self.source_for_conf(source, first, prefix, source_type='wms')
            first = False

    def source_for_conf(self, layer, first, prefix, source_type):
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
        source.username = layer.get('username')
        source.password = layer.get('password')
        source.format = layer['format']
        source.is_baselayer = layer['baselayer']
        source.is_overlay = layer['overlay']
        source.layer = layer['layer']
        source.max_tiles = layer.get('max_tiles')
        if source_type == 'wmts':
            source.tile_matrix = layer['tile_matrix']

        if source_type == 'wms':
            source.srs = layer['srs']

        assert source_type in ('wmts', 'wms')
        source.source_type = source_type

        ### first source is background layer
        if first:
            source.background_layer = True
        else:
            source.background_layer = False

        if 'view_restriction' in layer:
            source.view_coverage = self.coverage_from_restriction(layer['view_restriction'])
            source.view_level_start = layer['view_restriction'].get('zoom_level_start')
            source.view_level_end = layer['view_restriction'].get('zoom_level_end')
        else:
            source.view_coverage = None
            source.view_level_start = None
            source.view_level_end  = None
        if 'download_restriction' in layer:
            source.download_coverage = self.coverage_from_restriction(layer['download_restriction'])
            source.download_level_start = layer['download_restriction'].get('zoom_level_start')
            source.download_level_end = layer['download_restriction'].get('zoom_level_end')
        else:
            source.download_coverage = None
            source.download_level_start = None
            source.download_level_end  = None

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

    source.username = layer.get('username')
    source.password = layer.get('password')

    source.active = True
    return source

def reload_context_document(context_document_url, app_state, user, password):
    session = app_state.user_db_session()
    result = requests.get(context_document_url, auth=(user, password))

    if result.status_code in (401, 403):
        raise AuthenticationError()

    context_doc = result.json()
    context = Context(context_doc)
    prefix = context.doc.get('portal', {}).get('prefix')
    all_active_sources = set(session.query(model.ExternalWMTSSource).filter_by(active=True).filter_by(is_user_defined=False).all())
    updater = ContextModelUpdater(session)

    first_source = None
    for source in updater.sources_from_context(context):
        if not first_source:
            first_source = source
        if source in all_active_sources:
            all_active_sources.remove(source)
        session.add(source)

    # set all sources that are not in the context as inactive
    for active_source in all_active_sources:
        active_source.active = False

    for source in session.query(model.ExternalWMTSSource):
        if source != first_source:
            source.background_layer = False

    # load WFS layer for search
    all_active_wfs_sources = set(session.query(model.ExternalWFSSource).filter_by(active=True).all())
    for source in context.wfs_sources():
        wfs_source = wfs_source_for_conf(session, source, prefix)
        if wfs_source in all_active_wfs_sources:
            all_active_wfs_sources.remove(wfs_source)
        session.add(wfs_source)

    # set all wfs sources that are not in the context as inactive
    for active_wfs_source in all_active_wfs_sources:
        active_wfs_source.active = False

    app_state.config.set('app', 'logging_server', context.logging_server())
    app_state.config.write()

    couchdb = CouchDB('http://127.0.0.1:%d' % app_state.config.get_int('couchdb', 'port'), '_replicator')
    coverage_box = app_state.config.get('web', 'coverages_from_couchdb')
    for couchdb_source in context.couchdb_sources():
        if couchdb_source['dbname_user'] == coverage_box:
            # insert features from area/coverage box into layers
            insert_database_features(couchdb.couch_url, couchdb_source)
        else:
            # replicate other couchdb sources
            replicate_database(couchdb, couchdb_source, app_state)


    context_user = context.user()
    if context_user:
        app_state.config.set('user', 'type', context_user['type'])
    else:
        app_state.config.set('user', 'type', 0) # set default to 0

    session.commit()

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

def insert_database_features(dst_dburl, src_conf):
    auth = None
    if 'username' in src_conf:
        auth = src_conf['username'], src_conf['password']
    source_couchdb = CouchDBBase(src_conf['url'],
        src_conf['dbname'],
        auth=auth,
    )
    inserter = FeatureInserter(dst_dburl)

    inserter.from_source(source_couchdb)

def replicate_database(couchdb, couchdb_source, app_state):
    dbname_user = couchdb_source['dbname_user']
    dburl = source_couchdb_url(couchdb_source)

    target_couchdb = CouchDB('http://127.0.0.1:%d' % app_state.config.get_int('couchdb', 'port'), dbname_user)
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
