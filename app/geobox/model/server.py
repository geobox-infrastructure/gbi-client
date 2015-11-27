# This file is part of the GBI project.
# Copyright (C) 2015 Omniscale GmbH & Co. KG <http://omniscale.com>
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
# See the License for the specific language governing permissions and"
# limitations under the License.

import sqlalchemy as sa
from flask import current_app
from geobox.model.meta import Base

__all__ = ['GBIServer']


class GBIServer(Base):
    __tablename__ = 'servers'

    id = sa.Column(sa.Integer, primary_key=True)
    url = sa.Column(sa.String(), nullable=False, unique=True)
    username = sa.Column(sa.String())
    prefix = sa.Column(sa.String())
    title = sa.Column(sa.String())
    auth = sa.Column(sa.Boolean(), default=False)
    last_update = sa.Column(sa.DateTime())
    active_home_server = sa.Column(sa.Boolean(), default=False)
    home_server = sa.Column(sa.Boolean(), default=False)
    logging_url = sa.Column(sa.String())
    _context = None

    @property
    def vector_prefix(self):
        return "%s_%s_" % (
            self.prefix,
            current_app.config.geobox_state.config.get('app', 'vector_prefix')
        )

    @classmethod
    def by_url(cls, db_session, url):
        q = db_session.query(cls).filter_by(url=url)
        return q.first()

    @classmethod
    def current_home_server(cls, db_session):
        q = db_session.query(cls).filter_by(active_home_server=True)
        return q.first()

    def set_context(self, context):
        self._context = context

    def get_context(self):
        return self._context
    context = property(get_context, set_context)
