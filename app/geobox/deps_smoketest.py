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
import tempfile
import shutil

import logging
log = logging.getLogger(__name__)

def test_shapely():
    """Testing Shapely: GEOS bindings for working with polygons, etc."""
    import shapely.wkt

    assert abs(shapely.wkt.loads('POINT(0 0)').buffer(1, 32).area - 3.1415) < 0.01


def test_shapely_intersection():
    """Testing Shapely: Test against prepared geometry intersection bug #603"""
    # http://trac.osgeo.org/geos/ticket/603
    from shapely.geometry import MultiPolygon, box
    from shapely.prepared import prep
    from shapely import wkt

    assert MultiPolygon([box(0, 0, 1, 10), box(40, 0, 41, 10)]).intersects(box(20, 0, 21, 10)) == False
    assert prep(MultiPolygon([box(0, 0, 1, 10), box(40, 0, 41, 10)])).intersects(box(20, 0, 21, 10)) == False

    # tile_grid(3857, origin='nw').tile_bbox((536, 339, 10))
    tile = box(939258.2035682462, 6731350.458905761, 978393.9620502564, 6770486.217387771)
    tile = box(978393.9620502554, 6770486.217387772, 1017529.7205322656, 6809621.975869782)
    # "{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"type":"box_control"},"geometry":{"type":"Polygon","coordinates":[[[1449611.9686912997,6878109.5532215],[1449611.9686912997,6909907.3569881],[1476517.8026477,6909907.3569881],[1476517.8026477,6878109.5532215],[1449611.9686912997,6878109.5532215]]]}},{"type":"Feature","properties":{"type":"box_control"},"geometry":{"type":"Polygon","coordinates":[[[909049.30465869,6435386.285393901],[909049.30465869,6457400.14954],[943293.0933304401,6457400.14954],[943293.0933304401,6435386.285393901],[909049.30465869,6435386.285393901]]]}}]}"
    coverage = wkt.loads(
        "MULTIPOLYGON ("
            "((1449611.9686912996694446 6878109.5532214995473623, "
              "1449611.9686912996694446 6909907.3569881003350019, "
              "1476517.8026477000676095 6909907.3569881003350019, "
              "1476517.8026477000676095 6878109.5532214995473623, "
              "1449611.9686912996694446 6878109.5532214995473623)), "
            "((909049.3046586900018156 6435386.2853939011693001, "
              "909049.3046586900018156 6457400.1495399996638298, "
              "943293.0933304401114583 6457400.1495399996638298, "
              "943293.0933304401114583 6435386.2853939011693001, "
              "909049.3046586900018156 6435386.2853939011693001)))"
    )
    assert prep(coverage).contains(tile) == False
    assert prep(coverage).intersects(tile) == False

    # # 3.2.3 fails with repeated calls
    # tile = box(939258.2035682462, 6731350.458905761, 978393.9620502564, 6770486.217387771)
    # # "{"type":"FeatureCollection","features":[{"type":"Feature","properties":{"type":"box_control"},"geometry":{"type":"Polygon","coordinates":[[[1449611.9686912997,6878109.5532215],[1449611.9686912997,6909907.3569881],[1476517.8026477,6909907.3569881],[1476517.8026477,6878109.5532215],[1449611.9686912997,6878109.5532215]]]}},{"type":"Feature","properties":{"type":"box_control"},"geometry":{"type":"Polygon","coordinates":[[[909049.30465869,6435386.285393901],[909049.30465869,6457400.14954],[943293.0933304401,6457400.14954],[943293.0933304401,6435386.285393901],[909049.30465869,6435386.285393901]]]}}]}"
    # coverage = prep(wkt.loads(
    #     """MULTIPOLYGON (((1480951.1129604001000000 6884836.0117156999000000, 1480951.1129604001000000 6901346.4098252999000000, 1494404.0299386000000000 6901346.4098252999000000, 1494404.0299386000000000 6884836.0117156999000000, 1480951.1129604001000000 6884836.0117156999000000)), ((952006.8772271201000000 6459234.6382239014000000, 952006.8772271201000000 6472687.5552021004000000, 967294.2828841500400000 6472687.5552021004000000, 967294.2828841500400000 6459234.6382239014000000, 952006.8772271201000000 6459234.6382239014000000)))"""
    # ))

    # assert (coverage).contains(tile) == False
    # assert (coverage).intersects(tile) == False
    # assert (coverage).contains(tile) == False
    # assert (coverage).intersects(tile) == False

def test_fiona():
    """Testing Fiona: OGR bindings for reading/writing Shapefiles, etc."""
    import fiona
    tempdir = tempfile.mkdtemp()
    shp_file = os.path.join(tempdir, 'test.shp')
    schema = {'properties': {}, 'geometry': 'Point'}
    driver = 'ESRI Shapefile'
    try:
        with fiona.collection(shp_file, 'w', schema=schema, driver=driver) as sink:
            sink.write({'properties': {}, 'geometry': {'type': 'Point', 'coordinates': [0, 0]}})
        with fiona.collection(shp_file, 'r') as source:
            records = list(source)
            assert len(records) == 1
            assert records[0]['geometry']['type'] == 'Point'

    finally:
        shutil.rmtree(tempdir)

def test_pil():
    """Testing PIL: Python Image Library."""
    from PIL import Image

    tempdir = tempfile.mkdtemp()
    tempimgfile = os.path.join(tempdir, 'test.png')
    try:
        img = Image.new('RGB', (100, 100), (250, 120, 200))
        img.save(tempimgfile)
        img = Image.open(tempimgfile)
        assert img.getcolors() == [(100*100, (250, 120, 200))]
    finally:
        shutil.rmtree(tempdir)

def test_gdal():
    """Testing GDAL: Python bindings to GDAL for GeoTIFF/JPEG export."""
    from PIL import Image
    import gdal
    import gdalconst

    tempdir = tempfile.mkdtemp()
    tempimgfile = os.path.join(tempdir, 'test.png')
    try:
        img = Image.new('RGB', (100, 100), (250, 120, 200))
        img.save(tempimgfile)

        dataset = gdal.Open(tempimgfile, gdalconst.GA_ReadOnly)
        assert dataset
        assert dataset.RasterXSize == 100
        assert dataset.RasterYSize == 100
        assert dataset.RasterCount == 3
        del dataset # to close file
    finally:
        shutil.rmtree(tempdir)


def all_deps_working():
    log.info('Checking dependencies')
    all_tests_ok = True
    for test in [test_shapely, test_shapely_intersection, test_fiona, test_pil, test_gdal]:
        try:
            test()
        except Exception, ex:
            all_tests_ok = False
            log.error(test.__doc__ + '\t FAILED')
            log.exception(ex)
        else:
            log.info(test.__doc__ + '\t OK')

    return all_tests_ok
