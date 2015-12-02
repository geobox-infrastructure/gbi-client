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
import tempfile

from zipfile import ZipFile
from xml.etree import ElementTree as etree
from fiona import collection

try:
    from cStringIO import StringIO; StringIO
except ImportError:
    from StringIO import StringIO

from flaskext.babel import _

import logging
import re

from fiona import supported_drivers
supported_drivers['GML'] = 'r'

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

def load_json_from_gml(gml_file, mapping):
    fd, fixed_gmlfile = tempfile.mkstemp(".xml")
    try:
        with os.fdopen(fd, 'w') as f:
            remove_xml_schemalocations(gml_file, f)
        with collection(fixed_gmlfile, 'r') as source:
            if not source.schema['geometry'] == mapping.geom_type and mapping.geom_type != '*':
                raise ConvertError(_('invalid mapping'))
            for record in source:
                record = mapping.as_json_record(record)
                yield record
    except OSError, e:
        logging.error(e)
    finally:
        os.unlink(fixed_gmlfile)

def remove_xml_schemalocations(document, dest):
    """
    Remove xsi:schemaLocation from XML.

    OGR/Fiona reads schemas to get feature metadata.
    FloRLP GML (and possible other GML) contains URLs
    that are not accessible. This triggers long timeouts.
    OGR will parse the whole GML to get the feature metadata,
    which should not be an issue for our smaller GMLs.
    """
    if isinstance(document, basestring):
        with open(document) as f:
            tree = etree.parse(f)
    else:
        tree = etree.parse(document)
    root = tree.getroot()
    root.attrib['{http://www.w3.org/2001/XMLSchema-instance}:schemaLocation'] = ''
    tree.write(dest)

def fields_from_properties(records):
    columns = {}

    for record in records:
        for header in record['properties']:
            if header not in columns:
                columns[header] = {}
                columns[header]['name'] = header
                title = re.sub(r'[^a-z0-9]*', '', header.lower())
                columns[header]['title'] = title[:10]
                columns[header]['type'] = 'int'

            prop = record['properties'][header]
            if isinstance(prop, float) and columns[header]['type'] != 'str':
                columns[header]['type'] = 'float'
            if isinstance(prop, basestring):
                columns[header]['type'] = 'str'


    fields = ([(x[1]['name'], x[1]['title'], x[1]['type']) for x in columns.items()])
    return tuple(fields)


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

def create_feature_collection(records):
    feature_collection = {"type": "FeatureCollection"}
    feature_collection["features"] = list(records)
    return feature_collection

def write_json_to_file(feature_collection, filename='default.json'):
    with open(filename, 'w') as outfile:
        json.dump(feature_collection, outfile)
