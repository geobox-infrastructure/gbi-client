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

import os
import time
import logging.config
import threading
from geobox.config import path

def init_logging(app_state):
    user_log_dir = app_state.user_data_path('log', make_dirs=True)

    user_log_file = app_state.user_data_path('log.ini')
    if os.path.exists(user_log_file):
        logging.config.fileConfig(user_log_file,
            defaults={'user_log_dir': user_log_dir})
    else:
        logging.config.fileConfig(path(['geobox/lib/default_log.ini']),
            defaults={'user_log_dir': user_log_dir})


class LineLoggerThread(threading.Thread):
    def __init__(self, logger, log_level, fileobj):
        threading.Thread.__init__(self)
        self.daemon = True
        self.logger = logger
        self.log_level = log_level
        self.fileobj = fileobj

    def run(self):
        while True:
            line = self.fileobj.readline().strip()
            if line:
                self.logger.log(self.log_level, line)
            else:
                # in case .readline() did not block
                time.sleep(1)
