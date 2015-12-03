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

import sys
import os
import time

import socket
import requests

import logging
log = logging.getLogger(__name__)

def init_lib_paths():
    """
    Set PATH to include locations of our GDAL/GEOS .dlls.

    Only supports win32 for now. On Linux/Unix it should find system libs
    otherwise set LD_LIBRARY_PATH.
    """

    if sys.platform != 'win32':
        return

    locations = []

    # for testing from ./app
    gdal_dev_location = os.path.join(os.path.dirname(__file__), '..', '..', 'packaging', 'build', 'gdal', 'bin')
    geos_dev_location = os.path.join(os.path.dirname(__file__), '..', '..', 'packaging', 'build', 'geos')
    proj_dev_location = os.path.join(os.path.dirname(__file__), '..', '..', 'packaging', 'build', 'proj4', 'lib')
    locations = [gdal_dev_location, geos_dev_location, proj_dev_location]
    os.environ['PROJ_LIB'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'packaging', 'build', 'proj4', 'data'))
    os.environ['GDAL_DATA'] = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'packaging', 'build', 'gdal', 'data'))

    if getattr(sys, 'frozen', None):
        # running from pyinstaller .exe
        basedir = sys._MEIPASS

        # for testing the .exe from packaging/dist
        gdal_test_location = os.path.join(basedir, '..', '..', 'build', 'gdal', 'bin')
        geos_test_location = os.path.join(basedir, '..', '..', 'build', 'geos')
        proj_test_location = os.path.join(basedir, '..', '..', 'build', 'proj4', 'lib')
        os.environ['PROJ_LIB'] = os.path.join(basedir, '..', '..', 'build', 'proj4', 'data')
        os.environ['GDAL_DATA'] = os.path.join(basedir, '..', '..', 'build', 'gdal', 'data')

        # for deployed .exe inside the inno setup destination
        # ./osgeo/bin contains gdal and geos
        osgeo_deploy_location = os.path.join(basedir, '..', 'osgeo', 'bin')
        if not os.path.exists(os.environ['PROJ_LIB']):
            os.environ['PROJ_LIB'] = os.path.join(basedir, '..', 'osgeo', 'data')
        if not os.path.exists(os.environ['GDAL_DATA']):
            os.environ['GDAL_DATA'] = os.path.join(basedir, '..', 'osgeo', 'data')

        locations = [gdal_test_location, geos_test_location, proj_test_location, osgeo_deploy_location]

        os.environ['REQUESTS_CA_BUNDLE'] = os.path.join(sys._MEIPASS, 'requests', 'cacert.pem')

    path_found = False
    for loc in locations:
        if os.path.exists(loc):
            path_found = True
            os.environ['PATH'] = os.path.abspath(loc) + ';' + os.environ['PATH']
    log.info("GeoBox PATH environment: %s", os.environ['PATH'])
    assert path_found

def port_used(port):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(('127.0.0.1', port))
    except socket.error:
        return True
    finally:
        s.close()
    return False

def wait_for_http_server(host, port, max_wait=10):
    for _ in range(max_wait):
        try:
            if requests.get('http://%s:%d/' % (host, port)):
                break
        except requests.exceptions.RequestException:
            time.sleep(1)

def join_threads(threads, max_wait_time=10):
    shutdown_start = time.time()
    max_wait_time = 10 #sec
    while threads and (time.time() - shutdown_start) < max_wait_time:
        # try to join all threads, but only for up to max_wait_time seconds
        try:
            for t in threads:
                t.join(0.2)
                if not t.is_alive():
                    threads.remove(t)
        except KeyboardInterrupt:
            threads = []
