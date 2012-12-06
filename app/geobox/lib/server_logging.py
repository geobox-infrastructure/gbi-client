import requests
import json
import datetime

from geobox.model.tasks import *

import logging
log = logging.getLogger(__name__)

def send_task_logging(app_state, task):
    logging_server = app_state.config.get('app', 'logging_server')

    if not logging_server:
        return

    json_log = {
        'user': app_state.config.get('user', 'name'),
        'time': datetime.datetime.now().isoformat(),
    }

    if isinstance(task, VectorImportTask):
        json_log['action'] = 'vector_import'
        json_log['mapping'] = task.mapping_name
        json_log['source'] = task.file_name
        json_log['format'] = 'SHP'
    if isinstance(task, VectorExportTask):
        json_log['action'] = 'vector_export'
        json_log['mapping'] = task.mapping_name
        json_log['source'] = app_state.config.get('web', 'coverages_from_couchdb')
        json_log['format'] = 'SHP'
    if isinstance(task, RasterImportTask):
        json_log['action'] = 'raster_import'
        json_log['geometry'] = json.loads(task.coverage)
        json_log['source'] = task.source.url
        json_log['layer'] = task.source.layer
        json_log['zoom_level_start'] = task.zoom_level_start
        json_log['zoom_level_end'] = task.zoom_level_end
        json_log['refreshed'] = task.update_tiles
    if isinstance(task, RasterExportTask):
        json_log['action'] = 'raster_export'
        json_log['format'] = task.export_format
        if task.export_srs:
            json_log['srs'] = task.export_srs
        json_log['geometry'] = json.loads(task.coverage)
        json_log['source'] = task.layer.wmts_source.url
        json_log['layer'] = task.layer.wmts_source.layer
        json_log['zoom_level_start'] = task.zoom_level_start
        json_log['zoom_level_end'] = task.zoom_level_end
    try:
        r = requests.post(logging_server, data=json.dumps(json_log), headers={'content-type': 'application/json'})
        if r and r.status_code != 200:
            log.warn("Could not log to server. Server response status code %r" % (r.status_code))
    except requests.exceptions.RequestException, ex:
        log.warn("An error occured. Error was: %r" % (ex))
