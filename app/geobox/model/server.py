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

from . meta import Base

__all__ = ['GBIServer']


class GBIServer(Base):
    __tablename__ = 'servers'

    id = sa.Column(sa.Integer, primary_key=True)
    url = sa.Column(sa.String(), nullable=False)
    prefix = sa.Column(sa.String())
    title = sa.Column(sa.String())
    username = sa.Column(sa.String())
    last_update = sa.Column(sa.DateTime())