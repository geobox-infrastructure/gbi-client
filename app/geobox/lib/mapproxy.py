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

import yaml
import os

from mapproxy.grid import TileGrid
from mapproxy.srs import SRS

from geobox.model import LocalWMTSSource
from geobox.lib.coverage import coverage_from_geojson

import logging
log = logging.getLogger(__name__)

class MapProxyConfiguration(object):
    def __init__(self, db_session, srs, target_dir, couchdb_url, template_dir):
        self.db_session = db_session
        self.couchdb_url = couchdb_url
        self.service_srs = srs
        self.template_dir = template_dir
        self.sources = {}
        self.caches = {}
        self.layers = []
        self.yaml_file = os.path.join(target_dir, 'mapproxy.yaml')
        self.grid = TileGrid(SRS(3857))

    def _load_sources(self):
        local_sources = self.db_session.query(LocalWMTSSource).all()
        for local_source in local_sources:
            wmts_source = local_source.wmts_source
            self.sources[wmts_source.name + '_source'] = {
                'type': 'wms',
                'req': {
                    'url': 'http://dummy.example.org/service?'
                },
                'seed_only': True,
                'coverage': {
                    'srs': 'EPSG:3857',
                    'bbox': list(coverage_from_geojson(wmts_source.download_coverage).bbox)
                }

            }
            self.caches[wmts_source.name + '_cache'] = {
                'sources': [wmts_source.name + '_source'],
                'grids': [wmts_source.matrix_set],
                'cache': {
                    'type': 'couchdb',
                    'url': '%s' % self.couchdb_url,
                    'db_name': wmts_source.name,
                    'tile_metadata': {
                        'tile_col': '{{x}}',
                        'tile_row': '{{y}}',
                        'tile_level': '{{z}}',
                        'created_ts': '{{timestamp}}',
                        'created': '{{utc_iso}}',
                        'center': '{{wgs_tile_centroid}}'
                    }
                }
            }
            self.layers.append({
                'name': wmts_source.name + '_layer',
                'title': wmts_source.title,
                'sources': [wmts_source.name + '_cache'],
                'min_res': self.grid.resolution(local_source.download_level_start),
                # increase max_res to allow a bit of oversampling
                'max_res': self.grid.resolution(local_source.download_level_end) / 2,
            })

    def _write_mapproxy_yaml(self):
        grids = {
            'GoogleMapsCompatible': {
                'base': 'GLOBAL_MERCATOR',
                'srs': 'EPSG:3857',
                'num_levels': 19,
                'origin': 'nw'
            }
        }

        services = {
            'demo': None,
            'wmts': None,
            'wms': {
                'srs': self.service_srs,
                'md': {'title': 'Geobox WMS'}
            },
        }

        globals_ = {
            'image': {
                'paletted': True,
            },
            'cache': {
                'meta_size': [8, 8],
                'meta_buffer': 50,
            },
            'http': {
                'client_timeout': 120,
            },
        }
        if self.template_dir:
            globals_['template_dir'] = self.template_dir

        config = {}

        if globals_: config['globals'] = globals_
        if grids: config['grids'] = grids
        if self.layers:
            config['layers'] = self.layers
            config['services'] = services
        if self.caches: config['caches'] = self.caches
        if self.sources: config['sources'] = self.sources


        # safe_dump does not output !!python/unicode, etc.
        mapproxy_yaml = yaml.safe_dump(config, default_flow_style=False)
        f = open(self.yaml_file, 'w')
        f.write(mapproxy_yaml)
        f.close()
        log.info('Mapproxy configuration written to %s', self.yaml_file)

def write_mapproxy_config(app_state):
    mpc = MapProxyConfiguration(
        db_session=app_state.user_db_session(),
        srs=app_state.config.get('web', 'available_srs'),
        target_dir=app_state.user_data_path(),
        couchdb_url='http://127.0.0.1:%d' % app_state.config.get('couchdb', 'port'),
        template_dir=app_state.data_path('mapproxy_templates'),
        )
    mpc._load_sources()
    mpc._write_mapproxy_yaml()