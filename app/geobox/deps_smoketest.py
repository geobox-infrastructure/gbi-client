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
    import Image

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
    import Image
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
    for test in [test_shapely, test_fiona, test_pil, test_gdal]:
        try:
            test()
        except Exception, ex:
            all_tests_ok = False
            log.error(test.__doc__ + '\t FAILED')
            log.exception(ex)
        else:
            log.info(test.__doc__ + '\t OK')

    return all_tests_ok
