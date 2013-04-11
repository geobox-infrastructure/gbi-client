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

from flask import Blueprint, request

from geobox.lib.proxy import proxy_couchdb_request

proxy = Blueprint('proxy', __name__)

@proxy.route('/proxy/<path:url>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@proxy.route('/proxy/', build_only=True)
def proxy_request(url):
    return proxy_couchdb_request(request, url)
