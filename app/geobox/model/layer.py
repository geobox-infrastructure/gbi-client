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

import sqlalchemy as sa
from sqlalchemy import orm
from flaskext.babel import lazy_gettext

from . meta import Base

class ImportRasterLayer(Base):
    __tablename__ = 'layers_raster_import'
    layer_type = lazy_gettext('raster import')

    id = sa.Column(sa.Integer, primary_key=True)
    project_id = sa.Column(sa.Integer, sa.ForeignKey('projects.id'))
    source_id = sa.Column(sa.Integer, sa.ForeignKey('external_wmts_sources.id'), nullable=False)
    source = orm.relationship('ExternalWMTSSource', backref='import_layers')
    start_level = sa.Column(sa.Integer)
    end_level = sa.Column(sa.Integer)

class ExportRasterLayer(Base):
    __tablename__ = 'layers_raster_export'
    layer_type = lazy_gettext('raster export')

    id = sa.Column(sa.Integer, primary_key=True)
    project_id = sa.Column(sa.Integer, sa.ForeignKey('projects.id'))
    source_id = sa.Column(sa.Integer, sa.ForeignKey('local_wmts_sources.id'), nullable=False)
    source = orm.relationship('LocalWMTSSource', backref=orm.backref('export_layers', cascade="all, delete, delete-orphan"))
    file_name = sa.Column(sa.String())
    start_level = sa.Column(sa.Integer)
    end_level = sa.Column(sa.Integer)

class ExportVectorLayer(Base):
    __tablename__ = 'layers_vector_export'
    layer_type = lazy_gettext('vector export')

    id = sa.Column(sa.Integer, primary_key=True)
    project_id = sa.Column(sa.Integer, sa.ForeignKey('projects.id'))
    file_name = sa.Column(sa.String())
