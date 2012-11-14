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

import threading
import requests
import werkzeug.serving

import logging

# request handler that uses our logger
class WSGIRequestHandler(werkzeug.serving.WSGIRequestHandler):
    def log(self, type, message, *args):
        lvl = logging.getLevelName(type.upper())
        if not isinstance(lvl, int):
            lvl = logging.INFO
        self.server.logger.log(lvl, message, *args)

class WebServerThread(threading.Thread):
    """
    WSGI server that runs in a seperate thread and support graceful
    shutdown.
    """
    def __init__(self, host, port, app, logger_name=__name__):
        threading.Thread.__init__(self)
        self.app = app
        self.host = host
        self.port = port
        self.server = werkzeug.serving.ThreadedWSGIServer(self.host, self.port,
            self.app, handler=WSGIRequestHandler)
        self.server.logger = logging.getLogger(logger_name)

    def run(self):
        self.server.serve_forever()

    def shutdown(self):
        self.server.shutdown_signal = True
        # make request to server so that it can handle the shutdown_signal
        try:
            requests.get('http://%s:%d/__' % (self.host, self.port), timeout=1)
        except requests.exceptions.RequestException:
            pass