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
import glob

from flask import Blueprint, render_template, g, url_for, redirect, request, flash, current_app

from flaskext.babel import _

from geobox.lib.vectorconvert import is_valid_shapefile, ConvertError
from geobox.model import VectorImportTask
from geobox.web import forms

vector = Blueprint('vector', __name__)

@vector.route('/vector/import', methods=['GET', 'POST'])
def import_vector():
    from ...lib.vectormapping import default_mappings as mappings

    uploaded_shapes=[]
    upload_failures=[]
    not_allowed_files=[]

    for upload_file in request.files.getlist('file_upload'):
        import_dir = current_app.config.geobox_state.user_data_path('import')
        target = os.path.join(import_dir, upload_file.filename)
        if os.path.splitext(target)[1].lower() in ('.shp', '.shx', '.dbf'):
            try:
                if not os.path.isdir(import_dir):
                    os.mkdir(import_dir)

                f = open(target, 'w')
                f.write(upload_file.stream.read())
                f.close()
            except IOError:
                upload_failures.append(upload_file.filename)

            uploaded_shapes.append(upload_file.filename)
        else:
            not_allowed_files.append(upload_file.filename)

    form = forms.ImportVectorEdit(request.form)
    shape_files, missing_files = get_shapefile_list()
    form.file_name.choices = [(name, name) for name in shape_files]
    form.mapping_name.choices = [(name, '%s (%s, %s)' % (name, mapping.geom_type, mapping.other_srs.srs_code)) for name, mapping in mappings.items()]

    if not len(request.files):
        if form.validate_on_submit():
            try:
                is_valid_shapefile(current_app.config.geobox_state.user_data_path('import', form.file_name.data), mappings[form.mapping_name.data])
            except ConvertError:
                flash(_('invalid mapping'), 'error')
                return render_template('vector/import.html', form=form)
            except OSError:
                flash(_('invalid shapefile'), 'error')
                return render_template('vector/import.html', form=form)

            g.db.add(VectorImportTask(
                mapping_name=form.mapping_name.data,
                db_name=mappings[form.mapping_name.data].couchdb,
                file_name=form.file_name.data))
            g.db.commit()
            return redirect(url_for('tasks.list'))
        elif request.method == 'POST':
            flash(_('form error'), 'error')

    for missing_file in missing_files:
        flash(_('file %(name)s missing', name=missing_file), 'error')
    for upload_failure in upload_failures:
        flash(_('failed to upload %(name)s', name=upload_failure), 'error')
    for not_allowed_file in not_allowed_files:
        flash(_('filetype of %(name)s not allowed', name=not_allowed_file), 'error')
    for uploaded_shape in uploaded_shapes:
        flash(_('file %(name)s uploaded', name=uploaded_shape), 'info')
    return render_template('vector/import.html', form=form)

def get_shapefile_list():
    shape_import_dir = current_app.config.geobox_state.user_data_path('import')
    shape_file_list = []
    missing_file_list = []
    #XXX kai: also look for .shx and .dbf so .shp can be add to missing_files?
    for shape_file in (glob.glob(os.path.join(shape_import_dir, '*.shp')) + glob.glob(os.path.join(shape_import_dir, '*.SHP'))):
        missing = False
        s_path, s_name = os.path.split(shape_file)
        name, ext = os.path.splitext(s_name)
        #XXX kai: case insensitiv?
        if not os.path.exists(os.path.join(s_path, name +'.shx')):
            missing = True
            missing_file_list.append(name + '.shx')
        if not os.path.exists(os.path.join(s_path, name + '.dbf')):
            missing = True
            missing_file_list.append(name + '.dbf')
        if not missing:
            shape_file_list.append((s_name))
    return (shape_file_list, missing_file_list)