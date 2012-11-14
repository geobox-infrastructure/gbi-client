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

import math

def _area_from_bbox(bbox):
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    return width * height

def grid_coverage_ratio(bbox, srs, coverage):
    coverage = coverage.transform_to(srs)
    grid_area = _area_from_bbox(bbox)

    if coverage.geom:
        coverage_area = coverage.geom.area
    else:
        coverage_area = _area_from_bbox(coverage.bbox)

    return coverage_area / grid_area

def estimate_tiles(grid, levels, coverage=None):
    if coverage:
        ratio = grid_coverage_ratio(grid.bbox, grid.srs, coverage)
    else:
        ratio = 1

    tiles = 0
    for level in levels:
        grid_size = grid.grid_sizes[level]
        level_tiles = grid_size[0] * grid_size[1]
        level_tiles = int(math.ceil(level_tiles * ratio))

        if level_tiles < 16:
        # improve estimation for small exports/imports
        # by size of a meta tile
            level_tiles = 16
        tiles += level_tiles

    return tiles


if __name__ == '__main__':
    from mapproxy.srs import SRS
    from mapproxy.grid import tile_grid
    from mapproxy.util.coverage import BBOXCoverage

    print estimate_tiles(tile_grid(3857), levels=range(12), coverage=BBOXCoverage([5, 50, 10, 60], SRS(4326)))