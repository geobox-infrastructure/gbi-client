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

try:
    # try to load app specific GeoBoxConfig at first
    from geobox.appconfig import GeoBoxConfig
    GeoBoxConfig
except ImportError:
    from geobox.lib.config import ConfigParser, path, env

    class GeoBoxConfig(ConfigParser):
        """
        Configuration parser for basic GeoBox configuration.
        """
        defaults = {
            'app': {
                'name': 'GeoBox',
                'host': '127.0.0.1',
                'locale': 'de_DE', # 'en_UK'
                'logging_server': '',
                'vector_import': True,
                'vector_export': False,
            },
            'web': {
                'port': 8090,
                'available_srs': ['EPSG:4326', 'EPSG:3857', 'EPSG:31467', 'EPSG:25832'],
                'context_document_url': 'http://gbiserver.omniscale.net/context',
                'coverages_from_couchdb': 'flaechen-box',
            },
            'mapproxy': {
                'port': 8091,
            },
            'watermark': {
                'text': 'GeoBox',
            },
            'user': {
            },
            'couchdb': {
                # temp ports count backwards from this port -> leave room to other ports
                'port': 8099,
                # use installed path for couchdb since couchdb in packaging/build
                # is only usable after installation
                'bin_dir': path(
                    dev=['c:/Program Files/GeoBox/couchdb/bin', 'c:/Programme/GeoBox/couchdb/bin', '/usr/local/bin'],
                    frozen=['../couchdb/bin'],
                    test=['c:/Program Files/GeoBox/couchdb/bin', 'c:/Programme/GeoBox/couchdb/bin', '/usr/local/bin'],
                ),
                'erl_cmd': 'erl -noinput -noshell -sasl errlog_type error -couch_ini',
                'env': [
                    env("ERL_FLAGS", "-pa /usr/local/share/geocouch/ebin", platform='darwin'),
                    env("ERL_LIBS", "/usr/local/lib/couchdb/erlang/lib", platform='darwin'),
                ]
            },
            'tilebox': {
                'path': None,
                'port': 8092,
            }
        }