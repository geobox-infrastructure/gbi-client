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

import os
import glob
import gdal

try:
    from PIL import Image; Image
except ImportError:
    import Image
from cStringIO import StringIO
from mapproxy.grid import tile_grid, bbox_width, bbox_height
from osgeo.osr import SpatialReference
from tempfile import mkstemp
from subprocess import Popen, PIPE, STDOUT
from shutil import move
from os.path import basename, dirname, splitext, join, isfile, abspath

from geobox.lib.gdal_merge import file_info

import logging
log = logging.getLogger(__name__)

class TilemergeError(Exception):
    pass

def create_target_image(x_size, y_size, bbox, res, bands=3, band_type=1, t_name='out.tif', t_format='GTiff'):
    srs = SpatialReference()
    srs.ImportFromEPSG(3857)
    left, bottom, right, top = bbox
    #XXX kai: fetch AttributeError when unsupported format
    driver = gdal.GetDriverByName(t_format)
    dest = driver.Create(t_name, x_size, y_size, bands, band_type, [])

    dest.SetGeoTransform([left, res, 0, top, 0, -res])
    dest.SetProjection(srs.ExportToWkt())
    return dest

def copy_into_wrapper(dest, gdal_file_info, geotransform):
    srs = SpatialReference()
    srs.ImportFromEPSG(3857)
    gdal_file_info.projection = srs.ExportToWkt()
    gdal_file_info.geotransform = geotransform

    gdal_file_info.ulx = geotransform[0]
    gdal_file_info.uly = geotransform[3]
    gdal_file_info.lrx = gdal_file_info.ulx + geotransform[1] * gdal_file_info.xsize
    gdal_file_info.lry = gdal_file_info.uly + geotransform[5] * gdal_file_info.ysize
    for band in range(1, gdal_file_info.bands+1):
        gdal_file_info.copy_into( dest, band, band)

def convert_to_bands(in_buf, mode='RGB'):
    img = Image.open(in_buf)
    img = img.convert(mode)
    out_buf = StringIO()
    img.save(out_buf, 'Tiff')
    out_buf.seek(0)
    return out_buf

def _merge_tiles(tile_iter, bbox, size, resolution, t_srs='EPSG:3857', t_format='GTiff', t_name='out.tif', mode='RGB', gdal_translate_bin='/usr/bin/gdal_translate', gdalwarp_bin='/usr/bin/gdalwarp'):
    """merges tiles given by tile_iter.

       tile_iter: generator returning dict: {'data': ..., 'geotransform': ...}
       bbox: bbox of all tiles delivered by tile_iter
       size: size of output image. must be tuple of 2
       t_srs: srs of output image
       t_format: GDAL Raster Format descriptor
       t_name: name of output image
    """
    input_mem_buffer = '/vsimem/temp'
    mode = 'RGB' if t_format=='JPEG' else mode
    gdal.AllRegister()

    gdal_file_info = file_info()

    fh, result_filename = mkstemp(suffix='.tif')
    os.close(fh)
    log.info('Created %s' % result_filename)

    # find first tile to determine number of bands
    first_tile = tile_iter.next()

    gdal.FileFromMemBuffer(input_mem_buffer, convert_to_bands(first_tile['data'], mode).read())

    if gdal_file_info.init_from_name(input_mem_buffer) == 1: # add else for error
        dest = create_target_image(size[0], size[1], bbox, resolution, bands=gdal_file_info.bands, band_type=gdal_file_info.band_type, t_name=result_filename)
        log.info(
            'Created destination image %s. Size: %s x %s; Resolution: %s; Bands: %s, BoundingBox: %s'
            % (result_filename, size[0], size[1], resolution, gdal_file_info.bands, str(bbox)))
        copy_into_wrapper(dest, gdal_file_info, first_tile['geotransform'])
        gdal.Unlink(input_mem_buffer)
        for tile in tile_iter:
            gdal.FileFromMemBuffer(input_mem_buffer, convert_to_bands(tile['data'], mode).read())

            if gdal_file_info.init_from_name(input_mem_buffer) == 1: # add else for error
                copy_into_wrapper(dest, gdal_file_info, tile['geotransform'])
            gdal.Unlink(input_mem_buffer)
        #close created image otherwise gdalwarp/gdal_translate produce black images
        del dest

        if t_srs != 'EPSG:3857':
            fh, reproject_filename = mkstemp(suffix='.tif')
            os.close(fh)
            log.info('Created %s' % reproject_filename)
            reproject_image(gdalwarp_bin, result_filename, 'EPSG:3857', reproject_filename, t_srs)
            # os.remove(result_filename)
            log.info('Removed %s' % result_filename)
            result_filename = reproject_filename

        if t_format != 'GTiff':
            fh, convert_filename = mkstemp(suffix=splitext(t_name)[1])
            os.close(fh)
            log.info('Created %s' % convert_filename)
            convert_image(gdal_translate_bin, result_filename, convert_filename, t_format)
            # os.remove(result_filename)
            log.info('Removed %s' % result_filename)
            result_filename = convert_filename
        copy_files(result_filename, t_name)

def reproject_image(bin, src, src_srs, dest, dest_srs):
    p = Popen(['gdalwarp', '-s_srs', src_srs, '-t_srs', dest_srs, src, dest], stdout=PIPE, stderr=STDOUT)
    if p.wait() != 0:
        msg = 'Failed reprojecting image'
        out_stream = p.communicate()
        log.error(msg)
        log.error(''.join(map(str, out_stream)))
        raise TilemergeError(msg)

def convert_image(bin, src, dest, format='JPEG'):
    p = Popen(['gdal_translate', '-of', format, '-co', 'worldfile=yes', src, dest], stdout=PIPE, stderr=STDOUT)
    if p.wait() != 0:
        msg = 'Failed converting image'
        out_stream = p.communicate()
        log.error(msg)
        log.error(''.join(map(str, out_stream)))
        raise TilemergeError(msg)

def copy_files(src, dest):
    src_basename  = splitext(basename(src))[0]
    dest_basename = splitext(basename(dest))[0]
    dest_dirname  = dirname(abspath(dest))
    for file_name in glob.glob(join(dirname(src), src_basename + '.*')):
        full_file_name = join(dirname(src), file_name)
        dest = join(dest_dirname, basename(file_name).replace(src_basename, dest_basename))
        if (isfile(full_file_name)):
            move(full_file_name, dest)
            log.info('Moved %s to %s' % (full_file_name, dest))


def merge_tiles(couchdb, destination, level, bbox, matrix_set='GoogleMapsCompatible', origin='nw', overlay=False, format='GTiff', srs='EPSG:3857', gdal_translate_bin='/usr/bin/gdal_translate', gdalwarp_bin='/usr/bin/gdalwarp'):
    grid = tile_grid(3857, origin=origin, name=matrix_set)
    res = grid.resolution(level)
    ll_ur, xy_res, tiles = grid.get_affected_level_tiles(bbox, level)
    width = int(abs(bbox_width(bbox)) / res) or 1
    height = int(abs(bbox_height(bbox)) / res) or 1

    mode = 'RGBA' if overlay else 'RGB'

    _merge_tiles(
        load_tiles_from_couchdb(couchdb, tiles, grid, matrix_set),
        bbox, (width, height), res, mode=mode, t_format=format, t_name=destination, t_srs=srs,
        gdal_translate_bin=gdal_translate_bin, gdalwarp_bin=gdalwarp_bin)

def load_tiles_from_couchdb(couchdb, tiles, grid, matrix_set):
    for tile in tiles:
        x, y, z = tile
        tile_image = couchdb.get_tile(matrix_set, x, y, z)
        if tile_image:
            left, bottom, right, top = grid.tile_bbox(tile)
            res = grid.resolution(z)
            data_buf = StringIO(tile_image)
            data = {'data': data_buf, 'geotransform': (left, res, 0.0, top, 0.0, -res)}
            yield data
        else:
            continue
