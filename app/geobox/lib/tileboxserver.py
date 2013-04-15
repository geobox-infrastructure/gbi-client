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

import time

import logging
log = logging.getLogger(__name__)

class TileBoxServer(object):
    def __init__(self, app_state):
        self.server = None
        self.app_state = app_state

    def is_running(self):
        return self.server and self.server.is_alive()

    def restart(self):
        if self.server:
            self.server.shutdown()
            if self.server:
                while self.server.is_alive():
                    self.server.shutdown()
                    time.sleep(1)
            self.server = None

        if self.app_state.config.get('tilebox', 'path'):
            from geobox.lib.couchdb import CouchDBServerThread

            port = self.app_state.config.get_int('tilebox', 'port')
            erl_cmd = self.app_state.config.get('couchdb', 'erl_cmd')
            bin_dir = self.app_state.config.get('couchdb', 'bin_dir')
            data_dir = self.app_state.config.get('tilebox', 'path')
            self.server = CouchDBServerThread(self.app_state, host='127.0.0.1', port=port,
                erl_cmd=erl_cmd, bin_dir=bin_dir, data_dir=data_dir)

            self.server.start()
