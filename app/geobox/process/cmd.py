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

import sys

from geobox import model
from geobox.process import task_process_mapping, task_class_mapping

from geobox.model.tasks import Task, VectorImportTask, VectorExportTask, ReplicationTask, RasterImportTask, RasterExportTask
from geobox.model.project import ExportProject, ImportProject
from geobox.model.layer import RasterLayer
from scriptine import path
def server():
    import time
    from geobox.config import GeoBoxState

    app_state = GeoBoxState.initialize()

    from geobox.process.base import ProcessThread
    p = ProcessThread(app_state=app_state,
        task_class_mapping=task_class_mapping,
        task_process_mapping=task_process_mapping)
    p.start()

    while True:
        try:
            time.sleep(1)
        except KeyboardInterrupt:
            break
    app_state.shutdown_app()

def main():
    from geobox.config import GeoBoxConfig, GeoBoxState
    config = GeoBoxConfig.from_file('./geobox.ini')
    if not config:
        sys.exit(1)

    app_state = GeoBoxState(config)
    session = app_state.user_db_session()

    # create test tasks
    tasks = []
    # tasks.append(VectorImportTask(db_name='foobar', file_name=path('../example_data/points.shp'), mapping_name='Points'))
    # tasks.append(VectorImportTask(db_name='foobar', file_name=path('../example_data/lines.shp'), mapping_name='Lines'))

    # tasks.append(ReplicationTask(db_name='foobar', remote_db_url='http://127.0.0.1:5984', remote_db_name='foobar2', push=True))
    # tasks.append(ReplicationTask(db_name='foobar', remote_db_url='http://127.0.0.1:5984', remote_db_name='foobar2', pull=True))

    source = model.ExternalWMTSSource(name='test', url="http://a.tile.openstreetmap.org/%(z)s/%(x)s/%(y)s.png", format='png')
    layer = session.query(model.RasterLayer).filter_by(name='osm').all()
    if layer: layer = layer[0]
    else: layer = model.RasterLayer(name='osm')

    import_task = model.RasterImportTask(source=source, layer=layer, zoom_level_start=0, zoom_level_end=5)
    tasks.append(import_task)

    tasks.append(ExportProject(title="test project", download_level_start=2, download_level_end=10, raster_tasks=[
        RasterExportTask(layer=
            RasterLayer(name = 'test raster layer')
        , export_format='jpeg')
    ]))


    for t in tasks:
        session.add(t)
        session.commit()

    # list all tasks
    for t in session.query(model.Task).with_polymorphic('*'):
        print t

if __name__ == '__main__':
    main()