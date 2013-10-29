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

from urlparse import urlparse, urlunparse, urljoin, ParseResult
from flask import request, url_for, redirect, current_app

__all__ = ['css_alert_category']

def css_alert_category(cat):
    if cat == 'notice':
        cat = 'info'

    return 'alert-' + cat

def is_safe_url(target):
    ref_url = urlparse(request.host_url)
    test_url = urlparse(urljoin(request.host_url, target))
    return test_url.scheme in ('http', 'https') and \
           ref_url.netloc == test_url.netloc

def get_redirect_target():
    for target in request.values.get('next'), request.referrer:
        if not target:
            continue
        if is_safe_url(target):
            return target

def redirect_back(endpoint, **values):
    target = get_redirect_target()
    if not target or not is_safe_url(target):
        target = url_for(endpoint, **values)
    return redirect(target)

def request_for_static():
    if request.endpoint == 'static' or request.endpoint == 'favicon':
        return True
    else:
        return False

def add_auth_to_url(url, username, password):
    if url and username and password:
        parse_result = urlparse(url)
        url = urlunparse(ParseResult(
            scheme=parse_result.scheme,
            netloc='%s:%s@%s' % (username, password, parse_result.netloc),
            path=parse_result.path,
            params=parse_result.params,
            query=parse_result.query,
            fragment=parse_result.fragment))
    return url

def get_external_couch_url(request):
    host = request.host.split(":")
    map_host = host[0]
    return 'http://%s:%s/' % (map_host, current_app.config.geobox_state.config.get('couchdb', 'port'))

