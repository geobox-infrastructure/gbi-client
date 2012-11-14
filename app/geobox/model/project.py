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

import datetime
import sqlalchemy as sa
from sqlalchemy import orm
from flaskext.babel import lazy_gettext
from . meta import Base

__all__ = ['Project', 'ExportProject', 'ImportProject']


class Project(Base):
    __tablename__ = 'projects'

    id = sa.Column(sa.Integer, primary_key=True)
    title = sa.Column(sa.String, nullable=False)

    time_created = sa.Column(sa.DateTime(), default=datetime.datetime.utcnow)
    time_updated = sa.Column(sa.DateTime(), default=datetime.datetime.utcnow)

    def in_progress(self):
        for task in self.tasks:
            if task.is_running:
                return True
        return False

    def progress(self):
        progress = 0
        for task in self.tasks:
            if task.progress:
                progress += task.progress
            else:
                return None
        return progress / len(self.tasks)

    coverage = sa.Column(sa.String())
    download_size = sa.Column(sa.Float())
    type = sa.Column('type', sa.String(50))
    __mapper_args__ = {'polymorphic_on': type}

    tasks = orm.relationship('Task', backref="project")

class ExportProject(Project):
    __tablename__ = 'projects_export'
    __mapper_args__ = {'polymorphic_identity': 'export_project'}
    project_type = task_type = lazy_gettext('project export')
    id = sa.Column(sa.Integer, sa.ForeignKey('projects.id'), primary_key=True)
    export_raster_layers = orm.relationship('ExportRasterLayer', backref='project', cascade="all, delete, delete-orphan")
    export_vector_layers = orm.relationship('ExportVectorLayer', backref='project', cascade="all, delete, delete-orphan")
    export_format = sa.Column(sa.String)
    export_srs = sa.Column(sa.String)


class ImportProject(Project):
    __tablename__ = 'projects_import'
    __mapper_args__ = {'polymorphic_identity': 'import_project'}
    task_type = lazy_gettext('project import')
    id = sa.Column(sa.Integer, sa.ForeignKey('projects.id'), primary_key=True)
    import_raster_layers = orm.relationship('ImportRasterLayer', backref='project', cascade="all, delete, delete-orphan")
    update_tiles = sa.Column(sa.Boolean(), default=False)