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

from datetime import datetime

from geobox.process.base import ProcessBase
from geobox.lib.couchdb import CouchDB, VectorCouchDB, CouchFileBox
from geobox.lib.vectormapping import default_mappings as mappings, Mapping
from geobox.lib.vectorconvert import load_json_from_shape, write_json_to_shape, write_json_to_file, create_feature_collection, ConvertError


import logging
log = logging.getLogger(__name__)

class VectorExportProcess(ProcessBase):
    def process(self):
        log.debug('Start vector export process. Task %d' % self.task_id)
        try:
            with self.task() as task:
                couch = CouchDB('http://%s:%s' % ('127.0.0.1', self.app_state.config.get('couchdb', 'port')), task.db_name)
                if task.type_ == 'geojson':
                    if task.destination != 'file':
                        dest_couch = CouchFileBox('http://%s:%s' % ('127.0.0.1', self.app_state.config.get('couchdb', 'port')), task.destination)
                        data = json.dumps(create_feature_collection(couch.load_records()))
                        file_obj = {'content-type': 'application/json' , 'file': data, 'filename': task.db_name + '.json' }
                        dest_couch.store_file(file_obj, overwrite=True)
                    else:
                        output_file = self.app_state.user_data_path('export', task.db_name + '.json', make_dirs=True)
                        write_json_to_file(couch.load_records(), output_file)
                elif task.type_ == 'shp':
                    output_file = self.app_state.user_data_path('export', task.db_name + '.shp', make_dirs=True)
                    mapping = Mapping(None, None, 'Polygon', other_srs=task.srs)
                    write_json_to_shape(couch.load_records(), mapping, output_file)

            self.task_done()
        except ConvertError, e:
            self.task_failed(e)
        except AssertionError, e:
            # fiona uses assertions without error messages
            if not str(e):
                self.task_failed(ConvertError('unable to write shapefile'))
            else:
                self.task_failed(e)
        except KeyError, e:
            # mapping not exists
            self.task_failed(e)
        except Exception, e:
            self.task_failed(e)


class VectorImportProcess(ProcessBase):
    def process(self):
        log.debug('Start vector import process. Task %d' % self.task_id)
        try:
            with self.task() as task:
                if task.mapping_name:
                    mapping = mappings[task.mapping_name].copy()
                    mapping.json_defaults = mapping.json_defaults.copy()
                    mapping.json_defaults['import_timestamp'] = datetime.now().isoformat();
                    mapping.json_defaults['import_file'] = task.file_name;
                else:
                    mapping = Mapping(None, None, '*', other_srs=task.srs)

                input_file = self.app_state.user_data_path('import', task.file_name)
                couch = VectorCouchDB('http://%s:%s' % ('127.0.0.1', self.app_state.config.get('couchdb', 'port')), task.db_name)

                if task.type_ == 'geojson':
                    records = json.loads(open(input_file).read())
                    couch.store_records(
                        records['features']
                    )
                elif task.type_ == 'shp':
                    couch.store_records(
                        load_json_from_shape(input_file, mapping)
                    )

            self.task_done()
        except ConvertError, e:
            self.task_failed(e)
        except AssertionError, e:
            # fiona uses assertions without error messages
            if not str(e):
                self.task_failed(ConvertError('unable to read shapefile'))
            else:
                self.task_failed(e)
        except KeyError, e:
            # mapping not exists
            self.task_failed(e)
        except Exception, e:
            self.task_failed(e)
