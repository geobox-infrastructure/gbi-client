Setup gbi-client on a Mac
===========================

This is based on the [README.md](README.md), but describes
the install steps for Macs.

The setup requires [homebrew](http://mxcl.github.com/homebrew/)


1. Install / Update python and dependencies
--------------------------------------------

```sh
$ brew update && brew install python
```

These will take ages ...

```sh
$ pip install numpy
$ brew install gdal
```

2. Clone GBI-client repo
--------------------------

```sh
$ git clone git://github.com/omniscale/gbi-client.git
$ cd gbi-client
```

3. Download omniscale packages
--------------------------------

```sh
$ mkdir packaging/pkgs
$ mkdir packaging/pkgs/python
$ wget -O packaging/pkgs/gdal-1.9.1.tar.gz http://download.omniscale.de/geobox/pkgs/gdal-1.9.1.tar.gz
$ wget -O packaging/pkgs/geocouch.tar.gz http://download.omniscale.de/geobox/pkgs/geocouch.tar.gz
$ wget -O packaging/pkgs/geos-3.2.3.tar.gz http://download.omniscale.de/geobox/pkgs/geos-3.2.3.tar.gz
$ wget -O packaging/pkgs/inno5.zip http://download.omniscale.de/geobox/pkgs/inno5.zip
$ wget -O packaging/pkgs/mapproxy_templates-1.5.0.tar.gz http://download.omniscale.de/geobox/pkgs/mapproxy_templates-1.5.0.tar.gz
$ wget -O packaging/pkgs/openssl.tar.gz http://download.omniscale.de/geobox/pkgs/openssl.tar.gz
$ wget -O packaging/pkgs/otp_R14B04_win32.tar.gz http://download.omniscale.de/geobox/pkgs/otp_R14B04_win32.tar.gz
$ wget -O packaging/pkgs/proj4.tar.gz http://download.omniscale.de/geobox/pkgs/proj4.tar.gz
$ wget -O packaging/pkgs/pyinstaller.zip http://download.omniscale.de/geobox/pkgs/pyinstaller.zip
$ wget -O packaging/pkgs/python/Babel-0.9.6-py2.7.egg http://download.omniscale.de/geobox/pkgs/python/Babel-0.9.6-py2.7.egg
$ wget -O packaging/pkgs/python/Fiona-0.7.tar.gz https://pypi.python.org/packages/source/F/Fiona/Fiona-0.7.tar.gz
$ wget -O packaging/pkgs/python/Flask-0.9.tar.gz http://download.omniscale.de/geobox/pkgs/python/Flask-0.9.tar.gz
$ wget -O packaging/pkgs/python/Flask-Babel-0.8.tar.gz http://download.omniscale.de/geobox/pkgs/python/Flask-Babel-0.8.tar.gz
$ wget -O packaging/pkgs/python/Flask-WTF-0.8.tar.gz http://download.omniscale.de/geobox/pkgs/python/Flask-WTF-0.8.tar.gz
$ wget -O packaging/pkgs/python/GDAL-1.9.1.tar.gz https://pypi.python.org/packages/source/G/GDAL/GDAL-1.9.1.tar.gz
$ wget -O packaging/pkgs/python/Jinja2-2.6.tar.gz http://download.omniscale.de/geobox/pkgs/python/Jinja2-2.6.tar.gz
$ wget -O packaging/pkgs/python/MapProxy-1.5.0a-20121121.tar.gz http://download.omniscale.de/geobox/pkgs/python/MapProxy-1.5.0a-20121121.tar.gz
$ wget -O packaging/pkgs/python/PIL-1.1.7-py2.7.tar.gz http://effbot.org/downloads/Imaging-1.1.7.tar.gz
$ wget -O packaging/pkgs/python/SQLAlchemy-0.7.8.tar.gz http://download.omniscale.de/geobox/pkgs/python/SQLAlchemy-0.7.8.tar.gz
$ wget -O packaging/pkgs/python/Shapely-1.2.4.tar.gz https://pypi.python.org/packages/source/S/Shapely/Shapely-1.2.4.tar.gz
$ wget -O packaging/pkgs/python/WTForms-1.0.2.zip http://download.omniscale.de/geobox/pkgs/python/WTForms-1.0.2.zip
$ wget -O packaging/pkgs/python/pytz-2012d-py2.7.egg http://download.omniscale.de/geobox/pkgs/python/pytz-2012d-py2.7.egg
$ wget -w packaging/pkgs/python/requests-0.14.0.tar.gz http://download.omniscale.de/geobox/pkgs/python/requests-0.14.0.tar.gz
$ wget -O packagwng/pkgs/python/speaklater-1.3.tar.gz http://download.omniscale.de/geobox/pkgs/python/speaklater-1.3.tar.gz
```

4. Install dependencies
-------------------------

```sh
$ easy_install http://bitbucket.org/olt/scriptine/get/default.zip
$ easy_install https://github.com/olt/werkzeug/zipball/no-magic-import
$ easy_install requests
$ easy_install --no-deps packaging/pkgs/python/Babel-0.9.6-py2.7.egg
$ easy_install --no-deps packaging/pkgs/python/Fiona-0.7.tar.gz
$ easy_install --no-deps packaging/pkgs/python/Flask-0.9.tar.gz
$ easy_install --no-deps packaging/pkgs/python/Flask-Babel-0.8.tar.gz
$ easy_install --no-deps packaging/pkgs/python/Flask-WTF-0.8.tar.gz
$ easy_install --no-deps packaging/pkgs/python/GDAL-1.9.1.tar.gz
$ easy_install --no-deps packaging/pkgs/python/Jinja2-2.6.tar.gz
$ easy_install --no-deps packaging/pkgs/python/MapProxy-1.5.0a-20121121.tar.gz
$ easy_install --no-deps packaging/pkgs/python/PIL-1.1.7-py2.7.tar.gz
$ easy_install --no-deps packaging/pkgs/python/pytz-2012d-py2.7.egg
$ easy_install --no-deps packaging/pkgs/python/Shapely-1.2.4.tar.gz
$ easy_install --no-deps packaging/pkgs/python/SQLAlchemy-0.7.8.tar.gz
$ easy_install --no-deps packaging/pkgs/python/WTForms-1.0.2.zip
```

5. Unzip Inno Setup and PyInstaller
-------------------------------------

```sh
$ mkdir packaging/opt
$ unzip packaging/pkgs/inno5.zip -d packaging/opt/
$ unzip packaging/pkgs/pyinstaller.zip -d packaging/opt/
```

6. Build
----------

```sh
$ cd packaging
/packaging$ python build.py unpack
/packaging$ python build.py prepare
/packaging$ cd ..
```

7. Start the app
------------------

```
$ cd app
/app$ python -m geobox.app
```

When the app is running, access it at:

1. http://127.0.0.1:8090 (web)
1. http://127.0.0.1:8091 (mapproxy)
1. http://127.0.0.1:8099 (couchdb)