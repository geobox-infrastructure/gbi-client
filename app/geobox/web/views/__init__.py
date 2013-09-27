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

__all__ = [
    'main', 'tasks', 'project', 'user',
    'admin', 'vector', 'downloads',
    'proxy', 'boxes', 'raster', 'editor',
]


from .main import main
from .tasks import tasks_view as tasks
from .project import project
from .user import user_view as user
from .admin import admin_view as admin
from .vector import vector
from .downloads import download_view as downloads
from .proxy import proxy
from .boxes import boxes
from .raster import raster
from .editor import editor_view as editor
