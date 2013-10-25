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

"""
Import features from GBI-Server coverage/area box into CouchDB layers.
"""

from collections import namedtuple
import json
import requests

from geobox.lib.couchdb import UnexpectedResponse, VectorCouchDB

feature = namedtuple('feature', ['id', 'rev', 'layer', 'properties', 'geometry'])

def feature_from_document(document):
    """
    Takes couchdb document and returns a feature if
    the document has a layer and geometry.
    """
    if 'geometry' not in document or 'layer' not in document:
        return None

    if document['_id'].startswith('schema_'):
        return None

    return feature(
        id=document['_id'],
        rev=document['_rev'],
        properties=document.get('properties', {}),
        geometry=document['geometry'],
        layer=document['layer'],
    )


class FeatureInserter(object):
    """
    Insert features into CouchDB at `url`. It inserts each feature
    into a database named after `feature.layer`. Existing features
    with the same `feature.id` are overwritten. Missing databases
    are created.
    """
    def __init__(self, url, prefix=None, auth=None):
        self.url = url
        self.prefix = prefix
        self.session = requests.Session()
        self.inserted_layers = set()
        if auth:
            self.session.auth = auth

    def from_source(self, source):
        for doc in source.load_records():
            f = feature_from_document(doc)
            if f:
                self.insert(f)

        for layer in self.inserted_layers:
            self._check_metadata_doc(layer, source)

    def insert(self, feature):
        couchdb_layer = '%s%s' % (self.prefix, feature.layer)
        couch = VectorCouchDB(self.url, couchdb_layer, couchdb_layer)
        feature_dict = {
            'geometry': feature.geometry,
            'properties': feature.properties,
            'type': 'Feature',
        }
        existing_feature = couch.get(feature.id)
        if existing_feature:
            feature_dict['_rev'] = existing_feature['_rev']

        couch.put(feature.id, feature_dict)

        self.inserted_layers.add(feature.layer)

    def _check_metadata_doc(self, layer, source):
        couchdb_layer = '%s%s' % (self.prefix, layer)
        couch = VectorCouchDB(self.url, couchdb_layer, couchdb_layer )

        source_md = source.load_record('schema_' + layer)
        md_doc = {
            'title': source_md.get('title', layer) if source_md else layer,
            'name': couchdb_layer,
            'layer': source_md.get('layer', layer) if source_md else layer,
            'type': 'GeoJSON',
        }
        couch.update_or_create_doc('metadata', md_doc)
