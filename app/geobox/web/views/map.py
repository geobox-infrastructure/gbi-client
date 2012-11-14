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

from flask import Blueprint, render_template, request, g

from ..helper import get_local_cache_url
from geobox.model import LocalWMTSSource, ExternalWMTSSource

map_view = Blueprint('map_view', __name__)

@map_view.route('/map')
def map():
    raster_sources = g.db.query(LocalWMTSSource).all()
    base_layer = g.db.query(ExternalWMTSSource).filter_by(background_layer=True).first()
    base_layer.bbox = base_layer.bbox_from_view_coverage()
    cache_url = get_local_cache_url(request)

    return render_template('map.html',
        cache_url=cache_url,
        base_layer=base_layer,
        sources=raster_sources
    )