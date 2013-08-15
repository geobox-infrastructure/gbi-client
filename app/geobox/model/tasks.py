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


class TaskStatus(object):
    STOPPING = 'STOPPING'
    RUNNING = 'RUNNING'
    PAUSED = 'PAUSED'
    DONE = 'DONE'
    STOPPED = 'STOPPED'
    QUEUED = 'QUEUED'

class Task(Base):
    __tablename__ = 'tasks'

    id = sa.Column(sa.Integer, primary_key=True)
    time_created = sa.Column(sa.DateTime(), default=datetime.datetime.utcnow)
    time_updated = sa.Column(sa.DateTime(), default=datetime.datetime.utcnow)
    is_active = sa.Column(sa.Boolean(), default=True)
    is_running = sa.Column(sa.Boolean(), default=False)
    is_paused = sa.Column(sa.Boolean(), default=False)
    error = sa.Column(sa.String)
    progress = sa.Column(sa.Float)

    project_id = sa.Column(sa.Integer, sa.ForeignKey('projects.id'))


    type = sa.Column('type', sa.String(50))
    __mapper_args__ = {'polymorphic_on': type}

    def refresh_time_updated(self):
        self.time_updated = datetime.datetime.utcnow()

    def __repr__(self):
        return "<%s is_active=%r, is_running=%r, progress=%r>" % (
            self.__class__.__name__,
            self.is_active,
            self.is_running,
            self.progress,
        )

    @property
    def status(self):
        if self.is_active:
            if self.is_running and self.is_paused:
                return TaskStatus.STOPPING
            if self.is_running:
                return TaskStatus.RUNNING
            if self.is_paused:
                return TaskStatus.PAUSED
            return TaskStatus.QUEUED
        else:
            if self.progress >= 1.0:
                return TaskStatus.DONE
            return TaskStatus.STOPPED


class VectorImportTask(Task):
    task_type = lazy_gettext('vector import')
    __tablename__ = 'tasks_vector_import'
    __mapper_args__ = {'polymorphic_identity': 'vector_import'}
    id = sa.Column(sa.Integer, sa.ForeignKey('tasks.id'), primary_key=True)
    db_name = sa.Column(sa.String())
    file_name = sa.Column(sa.String())
    mapping_name = sa.Column(sa.String())
    srs = sa.Column(sa.String(64), default="EPSG:3857")
    type_ = sa.Column(sa.String(64), default="shp")
    source = sa.Column(sa.String(64), default="file")

class VectorExportTask(Task):
    task_type = lazy_gettext('vector export')
    __tablename__ = 'tasks_vector_export'
    __mapper_args__ = {'polymorphic_identity': 'vector_export'}
    id = sa.Column(sa.Integer, sa.ForeignKey('tasks.id'), primary_key=True)
    db_name = sa.Column(sa.String())
    file_name = sa.Column(sa.String())
    mapping_name = sa.Column(sa.String())
    srs = sa.Column(sa.String(64), default="EPSG:3857")
    type_ = sa.Column(sa.String(64), default="shp")
    destination = sa.Column(sa.String(64), default="file")

class ReplicationTask(Task):
    task_type = lazy_gettext('replication')

    __tablename__ = 'tasks_replication'
    __mapper_args__ = {'polymorphic_identity': 'replication'}
    id = sa.Column(sa.Integer, sa.ForeignKey('tasks.id'), primary_key=True)
    db_name = sa.Column(sa.String())
    remote_db_url = sa.Column(sa.String())
    remote_db_name = sa.Column(sa.String())
    push = sa.Column(sa.Boolean(), default=False)
    pull = sa.Column(sa.Boolean(), default=False)


class RasterImportTask(Task):
    task_type = lazy_gettext('raster import')
    __tablename__ = 'tasks_raster_import'
    __mapper_args__ = {'polymorphic_identity': 'raster_import'}
    id = sa.Column(sa.Integer, sa.ForeignKey('tasks.id'), primary_key=True)
    source_id = sa.Column(sa.Integer, sa.ForeignKey('external_wmts_sources.id'), nullable=False)
    source = orm.relationship('ExternalWMTSSource', backref='import_tasks')

    layer_id = sa.Column(sa.Integer, sa.ForeignKey('local_wmts_sources.id'))
    layer = orm.relationship('LocalWMTSSource', backref='layers')

    tiles = sa.Column(sa.Integer)
    seed_progress = sa.Column(sa.String)
    update_tiles = sa.Column(sa.Boolean(), default=False)

    zoom_level_start = sa.Column(sa.Integer)
    zoom_level_end = sa.Column(sa.Integer)
    coverage = sa.Column(sa.String())

class RasterExportTask(Task):
    task_type = lazy_gettext('raster export')

    __tablename__ = 'tasks_raster_export'
    __mapper_args__ = {'polymorphic_identity': 'raster_export'}
    id = sa.Column(sa.Integer, sa.ForeignKey('tasks.id'), primary_key=True)

    layer_id = sa.Column(sa.Integer, sa.ForeignKey('local_wmts_sources.id'), nullable=False)
    layer = orm.relationship('LocalWMTSSource', backref=orm.backref('export_tasks', cascade="all, delete, delete-orphan"))

    export_format = sa.Column(sa.String, nullable=False)
    export_srs = sa.Column(sa.String)
    export_destination = sa.Column(sa.String)

    tiles = sa.Column(sa.Integer)
    seed_progress = sa.Column(sa.String)

    zoom_level_start = sa.Column(sa.Integer)
    zoom_level_end = sa.Column(sa.Integer)
    coverage = sa.Column(sa.String())