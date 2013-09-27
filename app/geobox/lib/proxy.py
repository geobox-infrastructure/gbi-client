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

import requests

from flask import current_app, g
from werkzeug import exceptions
from werkzeug.wrappers import Response
from geobox.model import ExternalWFSSource

# headers to remove as of HTTP 1.1 RFC2616
# http://www.w3.org/Protocols/rfc2616/rfc2616-sec13.html
hop_by_hop_headers = set([
    'connection',
    'keep-alive',
    'proxy-authenticate',
    'proxy-authorization',
    'te',
    'trailers',
    'transfer-encoding',
    'upgrade',
])

def end_to_end_headers(headers, drop_headers=None):
    """
    Create a copy of `headers` while removing all
    hop-by-hop headers (see HTTP1.1 RFC2616).

    >>> end_to_end_headers({'CoNNecTION': 'close', 'X-Foo': 'bar'})
    [('X-Foo', 'bar')]
    """
    result = []
    for key, value in headers.iteritems():
        if key.lower() in hop_by_hop_headers:
            continue
        if drop_headers and key.lower() in drop_headers:
            continue
        if not value:
            continue
        result.append((key.title(), value))
    return result

def response_iterator(resp, chunk_size=16*1024):
    for chunk in resp.iter_content(chunk_size=chunk_size):
        yield chunk

def chunked_response_iterator(resp, native_chunk_support, line_based):
    """
    Return stream with chunked encoding if native_chunk_support is True.
    """
    if line_based:
        for chunk in resp.iter_lines(1):
            chunk += '\n'
            if native_chunk_support:
                yield chunk
            else:
                yield hex(len(chunk))[2:] + '\r\n' + chunk + '\r\n'
        if not native_chunk_support:
            yield '0\r\n\r\n'
    else:
        for chunk in resp.iter_content(16*1024):
            if native_chunk_support:
                yield chunk
            else:
                yield hex(len(chunk))[2:] + '\r\n' + chunk + '\r\n'
        if not native_chunk_support:
            yield '0\r\n\r\n'

class LimitedStream(object):
    """
    Wraps an existing ``werkzeug.wsgi.LimitedStream`` and adds
    __len__ method, required by requests.
    """
    def __init__(self, limited_stream, limit=None):
        self.limited_stream = limited_stream
        self.limit = limit

    def __getattr__(self, name):
        return getattr(self.limited_stream, name)

    def __len__(self):
        if self.limit is not None:
            return self.limit
        return self.limited_stream.limit

def proxy_couchdb_request(request, url):

    allowed_hosts = [
        'localhost:%s' % current_app.config.geobox_state.config.get('couchdb', 'port'),
        '127.0.0.1:%s' % current_app.config.geobox_state.config.get('couchdb', 'port'),
    ]
    wfs_search_layer = g.db.query(ExternalWFSSource).filter_by(active=True).all()
    for layer in wfs_search_layer:
        allowed_hosts.append(layer.host)

    found = False
    for allowed_host in allowed_hosts:
        if url.startswith('http://%s' % allowed_host) or url.startswith('https://%s' % allowed_host):
            found = True

    if not found:
        raise exceptions.Forbidden()
    headers = end_to_end_headers(request.headers)

    content_length = request.headers.get('content-length')
    if not content_length:
        data = None
    else:
        data = LimitedStream(request.stream)

    try:
        resp = requests.request(request.method, url,
            data=data, headers=headers,
            # auth=(
            #     current_app.config['COUCH_DB_ADMIN_USER'],
            #     current_app.config['COUCH_DB_ADMIN_PASSWORD']
            # ),
            params=request.args, stream=True)

        chunked_response = resp.headers.get('Transfer-Encoding') == 'chunked'
        line_based = resp.headers.get('Content-type', '').startswith(('text/plain', 'application/json'))

    except requests.exceptions.RequestException, ex:
        raise exceptions.BadGateway('source returned: %s' % ex)

    # requests handles content-encoding like gzip, drop this header as well
    headers = end_to_end_headers(resp.headers, ('content-encoding', ))

    if chunked_response:
        # gunicorn/werkzeug supports chunked encoding, no need to
        # encode it manually
        native_chunk_support = (
            'gunicorn' in request.environ['SERVER_SOFTWARE'] or
            'Werkzeug' in request.environ['SERVER_SOFTWARE']
        )
        if not native_chunk_support:
            headers.append(('Transfer-Encoding', 'chunked'))

        resp_iter = chunked_response_iterator(resp, native_chunk_support,
            line_based)
    else:
        resp_iter = response_iterator(resp)
    return Response(resp_iter, direct_passthrough=True,
        headers=headers, status=resp.status_code)
