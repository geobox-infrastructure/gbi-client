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

from os import listdir
from os.path import isdir, join

from flask import Blueprint, render_template, g, current_app, Response

from geobox import model
from geobox.lib.vectorconvert import zip_shapefiles
from geobox.lib.fs import open_file_explorer

from ..helper import redirect_back
from ..utils import request_is_local

download_view = Blueprint('downloads', __name__)

@download_view.route('/downloads')
def download_list():
    export_path = current_app.config.geobox_state.user_data_path('export')

    export_projects = g.db.query(model.ExportProject).all()
    exports_overview = []

    if isdir(export_path):
        for export_dirname in listdir(export_path):
            export_dir = join(export_path, export_dirname)
            if not isdir(export_dir):
                continue

            export = {}
            export['name'] = export_dirname

            extensions = ('.shp', '.mbtiles', '.jpeg', '.tiff', '.couchdb')

            export['files'] = [files for files in listdir(export_dir)
                if files.lower().endswith(extensions)]

            for project in export_projects:
                if export_dirname == project.title:
                    export['title'] = project.title
                    export['id'] = project.id
                    export['updated'] = project.time_updated.strftime('%d.%m.%Y')

            exports_overview.append(export)

    file_browser = request_is_local()

    return render_template('downloads.html', exports_overview=exports_overview,
        export_projects=export_projects, file_browser=file_browser)


@download_view.route('/file_browser/<export_dir>')
def export_file_browser(export_dir):
    open_file_explorer(join(current_app.config.geobox_state.user_data_path('export'), export_dir))
    return redirect_back('.download_list')

@download_view.route('/download/<export_dir>/<filename>')
def download_file(export_dir, filename):
    export_path = current_app.config.geobox_state.user_data_path('export')
    download_path =  join(export_path, export_dir) +"/"+filename

    if '.shp' in filename:
        download_path =  join(export_path, export_dir) +"/"+filename
        zip_file = zip_shapefiles(download_path)
        download_file = zip_file.getvalue()
        filename = filename.replace('.shp', '.zip')
    else:
        download_file = open(download_path, 'rb')

    return Response(download_file, direct_passthrough=True,
        headers={'Content-disposition': 'attachment; filename=%s' % (filename)})

