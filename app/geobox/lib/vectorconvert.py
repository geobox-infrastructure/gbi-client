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
import glob
import json

from zipfile import ZipFile

from fiona import collection

try:
    from cStringIO import StringIO; StringIO
except ImportError:
    from StringIO import StringIO

from flaskext.babel import _

import logging

logging.basicConfig(level=logging.INFO)

class ConvertError(Exception):
    pass

def is_valid_shapefile(shape_file, mapping):
    with collection(shape_file, 'r') as source:
        if source.schema['geometry'] not in ('Polygon', 'MultiPolygon'):
            raise ConvertError(_('invalid geometry type') + ': ' + source.schema['geometry'])
        elif source.schema['geometry'] != mapping.geom_type and mapping.geom_type != '*':
            raise ConvertError(_('invalid mapping'))
    return True

def load_json_from_shape(shape_file, mapping):
    try:
        with collection(shape_file, 'r') as source:
            if not source.schema['geometry'] == mapping.geom_type and mapping.geom_type != '*':
                raise ConvertError(_('invalid mapping'))
            for record in source:
                record = mapping.as_json_record(record)
                yield record
    except OSError, e:
        logging.error(e)

def write_json_to_shape(records, mapping, filename='default.shp'):
    schema = mapping.create_schema()
    # Open a new shapefile for features
    try:
        with collection(
              filename, "w", driver="ESRI Shapefile",
              schema=schema) as shapefile:
            for record in records:
                if 'geometry' not in record:
                    continue
                if 'type' not in record['geometry']:
                    continue
                if record['geometry']['type'] == schema['geometry'] or 'Multi' + record['geometry']['type'] == schema['geometry']:
                    # if a filter is set, write only data and not None
                    shape_val = mapping.as_shape_record(record)
                    if shape_val:
                        shapefile.write(shape_val)

    except OSError, e:
        logging.error(e)

def zip_shapefiles(filename):
    if not os.path.exists(os.path.abspath(filename)):
        raise IOError
    # split directories and filename
    head, filename = os.path.split(filename)
    # get all files with the same basename
    basename = filename.rsplit('.', 1)[0]
    files_to_zip = glob.glob('%s/%s.*' % (head, basename))

    zipped_file = StringIO()
    with ZipFile(zipped_file, 'a') as zipper:
        for file_to_zip in files_to_zip:
            # generate appropriate archive_name
            head, filename = os.path.split(file_to_zip)
            archive_name = '%s/%s' % (basename, filename)
            zipper.write(file_to_zip, arcname=archive_name)

    return zipped_file


def write_json_to_file(records, filename='default.json'):
    feature_collection = {"type": "FeatureCollection"}
    feature_collection["features"] = list(records)

    with open(filename, 'w') as outfile:
        json.dump(feature_collection, outfile)
