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

    def __init__(self, couchdb, geom_type, fields=None, field_filter=None, json_defaults=None, shp_defaults=None, other_srs='EPSG:3857'):
        self.srs = SRS('EPSG:3857')
        self.couchdb = couchdb
        self.geom_type = geom_type
        self.fields = fields or tuple(self.fields)
        self.field_filter = field_filter or tuple(self.field_filter)
        self.json_defaults = json_defaults or {}
        self.shp_defaults = shp_defaults or {}
        self.other_srs = SRS(other_srs)

    def copy(self):
        return copy(self)

    def as_json_record(self, record):
        data = self.json_defaults.copy()
        for json, shp, _type in self.fields:
            if record.get('properties', False).get(shp, False):
                data[json] = record['properties'].get(shp, None)
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
            data['properties'] = {}
            for json, shp, _type in self.fields:
                if record.get(json, False):
                    data['properties'][shp] = record.get(json)

            return data

    def create_schema(self):
        # create a schema from the mapping
        schema = {}
        schema['geometry'] = self.geom_type
        schema['properties'] = {}
        for json, shp, _type in self.fields:
            schema['properties'][shp] = _type

        return schema

    def filter_json(self, record):
        if self.field_filter:
            key, value = self.field_filter
            if record.get(key, False):
                return record[key] == value
            return False
        return True


default_mappings = {
    'Polygon': 
        Mapping(
            couchdb = 'polygons',
            geom_type = 'Polygon',
            fields = (
                    ('prop1', 'OBJART', 'str'),
                    ('prop2', 'OBJNR', 'str'),
                    ('prop3', 'RW', 'float'),
                    ('prop4', 'HW', 'float'),
                ),
            field_filter = ('prop1', '011/2723'),
        ),
    'Points':
        Mapping(
            couchdb = 'points',
            geom_type = 'Point',
            fields = (
                    ('foo', 'foo', 'str'),
                    ('bar', 'bar', 'float'),
                ),
            json_defaults = {
                'punktart': 'gute aussicht',
            }
        ),
    'Lines':
        Mapping(
            couchdb = 'lines',
            geom_type = 'LineString',
            fields = (
                    ('foo', 'foo', 'str'),
                    ('bar', 'bar', 'float'),
                ),
        ),
    'EPSG_test':
        Mapping(
            couchdb = 'foo_hro',
            geom_type = 'Polygon',
            fields = (
                    ('prop1', 'OBJART', 'str'),
                    ('prop2', 'OBJNR', 'str'),
                    ('prop3', 'RW', 'float'),
                    ('prop4', 'HW', 'float'),
                ),
            other_srs = 'EPSG:2398'
        ),
}