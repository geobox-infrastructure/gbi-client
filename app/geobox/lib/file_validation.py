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

import imghdr
import xml.sax
import json

def check_pdf(file):
    data = file.read(4)
    if data == '%PDF':
        file = file.seek(0) #move read pointer to the beginning
        return {'mimetype': 'application/pdf' }
    return False

def check_png(file):
    data = imghdr.what(file)
    if data == 'png':
        return {'mimetype': 'image/png' }
    return False

def check_jpeg(file):
    data = imghdr.what(file)
    if data == 'jpeg':
        return {'mimetype': 'image/jpeg' }
    return False

def check_tiff(file):
    data = imghdr.what(file)
    if data == 'tiff':
        return {'mimetype': 'image/tiff' }
    return False

def check_gif(file):
    data = imghdr.what(file)
    if data == 'gif':
        return {'mimetype': 'image/gif' }
    return False

def check_json(file):
    try:
        json.loads(file.read())
        file.seek(0)
        return {'mimetype': 'application/json'}
    except ValueError:
        return False

def check_xml(file):
    try:
        xml.sax.parse(file, xml.sax.ContentHandler())
        file.seek(0)
        return {'mimetype': 'text/xml' }
    except Exception:
        return False

def check_csv(file):
    return {'mimetype': 'text/comma-separated-values'}

extenions = {
    'pdf' : check_pdf,
    'png' : check_png,
    'jpe': check_jpeg,
    'jpg': check_jpeg,
    'jpeg': check_jpeg,
    'tiff': check_tiff,
    'tif': check_tiff,
    'gif' : check_gif,
    'json': check_json,
    'xml' : check_xml,
    'csv' : check_csv,
}

def check_format(file):
    filename = file.filename
    file_ext = filename.rsplit('.', 1)[1].lower()
    if file_ext in extenions:
        return extenions[file_ext](file)
    return False


def get_file_information(file):
    mimetype = check_format(file)
    if mimetype:
        filename = file.filename
        data = file.read()
        mimetype = mimetype['mimetype']
        return {'content-type': mimetype , 'file': data, 'filename': filename }
    return False

if __name__ == '__main__':
    file = open('/tmp/test.pdf', 'rw')
    print check_pdf(file)
    file = open('/tmp/test.png', 'rw')
    print check_png(file)
    file = open('/tmp/test.jpg', 'rw')
    print check_jpeg(file)
    file = open('/tmp/test.tif', 'rw')
    print check_tiff(file)
    file = open('/tmp/test.xml', 'rw')
    print check_xml(file)
    file = open('/tmp/test.csv', 'rw')
    print check_csv(file)
    file = open('/tmp/test.json', 'rw')
    print check_json(file)