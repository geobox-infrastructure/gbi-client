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

from __future__ import absolute_import
import time
import threading
import Queue
from functools import partial
from mapproxy.seed.seeder import TileWorker, SourceError, LockTimeout, TileWorkerPool, TileWalker

from geobox.process.base import ProcessBase
from geobox.lib.mapproxyseed import (
    ProgressLog, create_import_seed_task, parse_progress_identifier,
    SeedProgress, create_mbtiles_export_seed_task,
    create_couchdb_export_seed_task,
)
from geobox.lib.couchdb import CouchDB, TempCouchDB
from geobox.lib.tilemerge import merge_tiles
from geobox.model.tasks import (
    RasterImportTask, RasterExportTask,
)
from geobox.lib.coverage import coverage_from_geojson

import requests

import logging
log = logging.getLogger(__name__)

class TileSeedWorker(TileWorker):
    def __init__(self, terminate_event, *args, **kw):
        TileWorker.__init__(self, *args, **kw)
        self.terminate_event = terminate_event

    def work_loop(self):
        while not self.terminate_event.is_set():
            try:
                tiles = self.tiles_queue.get(timeout=0.5)
            except Queue.Empty:
                continue

            if tiles is None:
                return
            with self.tile_mgr.session():
                n = 0
                while not self.terminate_event.is_set():
                    try:
                        self.tile_mgr.load_tile_coords(tiles)
                    except LockTimeout:
                        log.warn("Lock timeout")
                        time.sleep(0.01)
                    except requests.exceptions.RequestException, ex:
                        log.warn("An error occured. Retry in 5 seconds: %r" %
                            (ex))
                        time.sleep(5)
                    except (SourceError, IOError), ex:
                        if (n+1) >= 10:
                            raise
                        wait_for = 1 * 2**n
                        log.warn("An error occured. Retry in %d seconds: %r" %
                            (wait_for, ex))
                        time.sleep(wait_for)
                        n += 1
                    except Exception, ex:
                        log.warn("An error unhandled error occured. %r" % ex)
                        log.exception(ex)
                        raise
                    else:
                        break

        if self.terminate_event.is_set():
            # if we are terminating, clear tiles_queue in case the
            # tilewalker is blocking on tiles_queue.put so that it
            # is able to terminate too
            try:
                while True:
                    self.tiles_queue.get(timeout=0.5)
            except Queue.Empty:
                pass

class RasterProcess(ProcessBase):
    terminate_event = None

    def process(self):
        log.debug('Start raster import process. Task %d' % self.task_id)
        try:
            with self.task() as task:
                seed_task = self.create_seed_task(task)
                # seed_task is None when there is no coverage intersection
                if not seed_task:
                    self.task_done()
                    return
                progress_logger = self.create_progress_logger(task)
                start_progress = parse_progress_identifier(task.seed_progress)
                self.terminate_event = threading.Event()
                seed_progress = SeedProgress(self.terminate_event, start_progress)
                if seed_task.refresh_timestamp is not None:
                    seed_task.tile_manager._expire_timestamp = seed_task.refresh_timestamp
                seed_worker_factory = partial(TileSeedWorker, self.terminate_event)
                self.tile_worker_pool = TileWorkerPool(seed_task, seed_worker_factory,
                    size=4, progress_logger=progress_logger)
                tile_walker = TileWalker(seed_task, self.tile_worker_pool, handle_uncached=True,
                    progress_logger=progress_logger,
                    seed_progress=seed_progress)
                tile_walker.walk()

                if not self.terminate_event.is_set():
                    self.tile_worker_pool.stop()

            if not self.terminate_event.is_set():
                self.task_done()
        except Exception, e:
            self.task_failed(e)

    def terminate(self):
        if self.terminate_event:
            self.terminate_event.set()
            # self.tile_worker_pool.stop()


class RasterImportProcess(RasterProcess):

    def create_seed_task(self, task):
        return create_import_seed_task(task, self.app_state)

    def create_progress_logger(self, task):
        return ProgressLog(task, self.app_state, RasterImportTask)

class RasterExportMBTileProcess(RasterProcess):

    def create_seed_task(self, task):
        return create_mbtiles_export_seed_task(task, self.app_state)

    def create_progress_logger(self, task):
        return ProgressLog(task, self.app_state, RasterExportTask)

class RasterExportCouchDBProcess(RasterProcess):

    def create_seed_task(self, task):
        return create_couchdb_export_seed_task(task, self.app_state, self.couchdb_port)

    def create_progress_logger(self, task):
        return ProgressLog(task, self.app_state, RasterExportTask)

    def process(self):
        try:
            with self.task() as task:
                export_path = self.app_state.user_data_path('export', task.project.title, 'couchdb', make_dirs=True)
                export_name = task.layer.wmts_source.name
            couchdb = TempCouchDB(self.app_state, export_path)
            self.couchdb_port = couchdb.port
            with couchdb.run():
                RasterProcess.process(self)
                couchdb_client = CouchDB(
                    url='http://127.0.0.1:%d' % couchdb.port,
                    db_name=export_name,
                )
                couchdb_client.update_or_create_doc('geobox_info',
                    {'type': 'raster'}
                )
        except Exception, e:
            self.task_failed(e)

class RasterExportImageProcess(RasterProcess):

    def process(self):
        log.debug('Start tile merge process. Task %d' % self.task_id)
        try:
            with self.task() as task:
                file_extension = '.tiff' if task.export_format == 'GTiff' else '.jpeg'
                wmts_source = task.layer.wmts_source
                export_filename = self.app_state.user_data_path('export', task.project.title, wmts_source.name + file_extension, make_dirs=True)
                couch = CouchDB('http://%s:%s' % ('127.0.0.1', self.app_state.config.get('couchdb', 'port')), wmts_source.name)
                coverage = coverage_from_geojson(task.coverage).bbox
                if coverage:
                    merge_tiles(couch, export_filename,
                        task.zoom_level_start, coverage, wmts_source.matrix_set,
                        overlay=wmts_source.is_overlay, format=task.export_format, srs=task.export_srs)

            self.task_done()
        except Exception, e:
            self.task_failed(e)


def RasterExportProcess(app_state, task):
    """
    Delegetes to format-depended RasterExportProcesses.
    """
    if task.export_format == 'MBTiles':
        return RasterExportMBTileProcess(app_state, task)
    if task.export_format in ('GTiff', 'JPEG'):
        return RasterExportImageProcess(app_state, task)
    if task.export_format == 'CouchDB':
        return RasterExportCouchDBProcess(app_state, task)
