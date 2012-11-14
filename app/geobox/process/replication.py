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

from geobox.process.base import ProcessBase
from geobox.lib.couchdb import CouchDB, UnexpectedResponse

import logging
log = logging.getLogger(__name__)


class ReplicationProcess(ProcessBase):
    def process(self):
        log.debug('Start replication process. Task %d' % self.task_id)
        try:
            with self.task() as task:
                couch = CouchDB('http://%s:%s' % ('127.0.0.1', self.app_state.config.get('couchdb', 'port')), task.db_name)
                if task.pull:
                    couch.replicate_pull(task.remote_db_url, task.remote_db_name)
                if task.push:
                    couch.replicate_push(task.remote_db_url, task.remote_db_name)
            self.task_done()
        except UnexpectedResponse, e:
            self.task_failed(e)
