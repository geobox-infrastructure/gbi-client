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

from flaskext.babel import lazy_gettext as _

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
                'name': 'GeoBox-Client',
                'host': '127.0.0.1',
                'locale': 'de_DE', # 'en_UK'
                'logging_server': '',
                'vector_import': True,
                'vector_export': False,
                'raster_prefix': 'tiles',
                'vector_prefix': 'vector',
            },
            'web': {
                'port': 8090,
                'server_list': '/home/kai/dev/gbi-client/dev/server.csv',
                'available_srs': [
                    ('EPSG:4326', _('WGS 84 (EPSG:4326)'), _('EPSG:4326 help text')),
                    ('EPSG:3857', _('WGS 84 / Pseudo-Mercator (EPSG:3857)'), _('EPSG:3857 help text')),
                    ('EPSG:31467', _('Gauss-Kruger zone 3 (EPSG:31467)'), _('EPSG:31467 help text')),
                    ('EPSG:25832', _('UTM zone 32N (EPSG:25832)'), _('EPSG:25832 help text'))],
                'context_document_url': 'http://gbiserver.omniscale.net/context',
                'coverages_from_couchdb': 'flaechen-box',
                'wms_search_url': 'http://www.geoportal.rlp.de/mapbender/php/mod_callMetadata.php?',
                'wms_cors_proxy_url': 'http://www.geoportal.rlp.de/cors_proxy/'
            },
            'mapproxy': {
                'port': 8091,
            },
            'watermark': {
                'text': 'GeoBox',
            },
            'user': {
                'type': '0',
            },
            'couchdb': {
                # temp ports count backwards from this port -> leave room to other ports
                'port': 8099,
                # use installed path for couchdb since couchdb in packaging/build
                # is only usable after installation
                'bin_dir': path(
                    dev=['c:/Program Files/GeoBox-Client/couchdb/bin', 'c:/Programme/GeoBox-Client/couchdb/bin', '/usr/local/bin', '/usr/bin'],
                    frozen=['../couchdb/bin'],
                    test=['c:/Program Files/GeoBox-Client/couchdb/bin', 'c:/Programme/GeoBox-Client/couchdb/bin', '/usr/local/bin', '/usr/bin'],
                    cmd='erl',
                ),
                'erl_cmd': 'erl -noinput -noshell -sasl errlog_type error -couch_ini',
                'env': [
                    env("ERL_FLAGS", "-pa /usr/local/share/geocouch/ebin", platform='darwin'),
                    env("ERL_LIBS", "/usr/local/lib/couchdb/erlang/lib", platform='darwin'),
                    env("ERL_LIBS", "/usr/lib/couchdb/erlang/lib", platform='linux'),
                ],
                'download_box': 'download-box',
                'upload_box': 'upload-box',
                'file_box': 'filebox',
            },
            'tilebox': {
                'path': None,
                'port': 8092,
            }
        }