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

import json
from flask import Blueprint, request, current_app

from geobox.lib.proxy import proxy_couchdb_request
from geobox.lib.couchdb import VectorCouchDB
from geobox.model.sources import ExternalWMTSSource

proxy = Blueprint('proxy', __name__)


@proxy.route('/proxy/<path:url>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@proxy.route('/proxy/', build_only=True)
def proxy_request(url):
    response = proxy_couchdb_request(request, url)
    if '201' in response.status:
        app_state = current_app.config.geobox_state
        if app_state.config.get('web', 'authorization_layer_name') in url:
            couch_url = 'http://%s:%s' % (
                '127.0.0.1',
                app_state.config.get('couchdb', 'port')
            )
            db_name = '%s_%s' % (
                app_state.home_server.prefix,
                app_state.config.get('web', 'authorization_layer_name')
            )
            couch = VectorCouchDB(couch_url, db_name)
            download_coverage = couch.coverage()

            db_session = app_state.user_db_session()
            sources = db_session.query(ExternalWMTSSource).filter_by(is_public=False).all()
            for source in sources:
                source.download_coverage = json.dumps(download_coverage)
            db_session.commit()
    return response
