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

import json

from mapproxy.srs import SRS
from mapproxy.util.coverage import coverage
from shapely.geometry import asShape, MultiPolygon

def geometry_from_feature_collection(feature_collection):
    polygons = []
    for feature in feature_collection['features']:
        geometry = feature['geometry']
        if geometry['type'] == 'Polygon':
            polygons.append(asShape(geometry))

    if polygons:
        mp = MultiPolygon(polygons)
        if not mp.is_valid:
            mp = mp.buffer(0)
        return mp

def coverage_from_geojson(geojson):
    if not geojson:
        return None
    geojson_obj = json.loads(geojson)
    if geojson_obj['type'] == 'FeatureCollection':
        return coverage_from_feature_collection(geojson_obj)
    else:
        return coverage_from_geojson_object(geojson_obj)

def coverage_from_geojson_object(geojson):
    if not geojson:
        return

    geom = asShape(geojson)
    return coverage(geom, SRS(3857))

def coverage_from_feature_collection(feature_collection):
    geom = geometry_from_feature_collection(feature_collection)
    if geom:
        return coverage(geom, SRS(3857))

def coverage_intersection(a, b):
    if a and not b:
        return a
    if b and not a:
        return b
    geom = a.geom.intersection(b.geom)
    return coverage(geom, SRS(3857))