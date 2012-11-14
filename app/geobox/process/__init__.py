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

from geobox.process.vector import VectorExportProcess, VectorImportProcess
from geobox.process.raster import RasterImportProcess, RasterExportProcess
from geobox.process.replication import ReplicationProcess

from geobox.model.tasks import (
    RasterImportTask,
    VectorExportTask, VectorImportTask, ReplicationTask, RasterExportTask,
)


task_class_mapping = {
    'vector_export': VectorExportTask,
    'vector_import': VectorImportTask,
    'replication': ReplicationTask,
    'raster_import': RasterImportTask,
    'raster_export': RasterExportTask,
}
task_process_mapping = {
    'vector_export': VectorExportProcess,
    'vector_import': VectorImportProcess,
    'replication': ReplicationProcess,
    'raster_import': RasterImportProcess,
    'raster_export': RasterExportProcess,
}
