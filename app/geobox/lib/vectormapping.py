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

from __future__ import absolute_import
from copy import copy
from shapely.geometry import mapping, asShape
from mapproxy.util.geom import transform_geometry
from mapproxy.srs import SRS

class MappingError(Exception):
    pass

class Mapping(object):
    couchdb = None
    fields = ()
    field_filter = ()

    def __init__(self, name, couchdb, geom_type, fields=None, field_filter=None,
        json_defaults=None, shp_defaults=None, other_srs='EPSG:3857',
        shp_encoding='latin1'):
        self.name = name
        self.srs = SRS('EPSG:3857')
        self.couchdb = couchdb
        self.geom_type = geom_type
        self.fields = fields or tuple(self.fields)
        self.field_filter = field_filter or tuple(self.field_filter)
        self.json_defaults = json_defaults or {}
        self.shp_defaults = shp_defaults or {}
        self.other_srs = SRS(other_srs)
        self.shp_encoding = shp_encoding

    def copy(self):
        return copy(self)

    def as_json_record(self, record):
        data = self.json_defaults.copy()
        if not self.fields:
            data['properties'] = record.get('properties', None)
            data['type'] = 'Feature'
        else:
            for json, shp, _type in self.fields:
                if record.get('properties', False).get(shp, False):
                    val = record['properties'].get(shp, None)
                    if isinstance(val, str):
                        val = val.decode(self.shp_encoding)
                    data[json] = val
        if self.other_srs != self.srs:
            data['geometry'] = mapping(transform_geometry(self.other_srs, self.srs, asShape(record.get('geometry', None))))
        else:
            data['geometry'] = record.get('geometry', None)

        return data

    def as_shape_record(self, record):
        data = self.shp_defaults.copy()
        # if record has filter values or filter is not set then continue
        if self.filter_json(record):
            if self.other_srs != self.srs:
                data['geometry'] = mapping(transform_geometry(self.srs, self.other_srs, asShape(record['geometry'])))
            else:
                data['geometry'] = record['geometry']
            if data['geometry']['type'] == 'Polygon':
                # pass Polygons as Multipolygon , Fiona only supports same type for all records
                data['geometry']['type'] = 'MultiPolygon'
                data['geometry']['coordinates'] = (data['geometry']['coordinates'], )
            data['properties'] = {}
            for json, shp, _type in self.fields:
                if record['properties'].get(json, False):
                    val = record['properties'].get(json)
                    if isinstance(val, basestring):
                        val = val.encode(self.shp_encoding)
                    data['properties'][shp] = val

            return data

    def create_schema(self):
        # create a schema from the mapping
        schema = {}
        if self.geom_type.startswith('Multi'):
            schema['geometry'] = self.geom_type
        else:
            # force schema to be Multi* to allow storage of multigeometries
            schema['geometry'] = 'Multi' + self.geom_type
        schema['properties'] = {}
        for json, shp, _type in self.fields:
            schema['properties'][shp] = _type

        return schema

    def filter_json(self, record):
        if self.field_filter:
            filters = self.field_filter
            if not isinstance(filters, list):
                filters = [filters]

            for key, value in filters:
                if record.get(key, False):
                    if record[key] == value:
                        return True
            return False
        return True