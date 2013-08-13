Building and Packaging GBI Client
=================================

This documents the build process of the GBI client .exe and installer for Windows.

Getting started
---------------

You should have the GeoBox source package (from GitHub/.tar.gz) with an `app` and `packaging` directory.
You need to fill ``packaging\pkgs`` with the pre-build packages from http://download.omniscale.de/geobox/pkgs/.

See below on how to build these packages on your own.


Installation Build System
-------------------------

Download and install Python 2.7.3 to `c:\\Python27`.
Unselect TK/TKinter packages during installation. They are not needed but added to the PyInstaller .exe by default.

Download `http://python-distribute.org/distribute_setup.py`
Start `cmd.exe` and install distribute by calling the `.py` file.

::

    set PATH=%PATH%;c:\Python27;c:\Python27\scripts
    python distribute_setup.py


Dependencies
~~~~~~~~~~~~

The application requires::

    python c:\Python27\Scripts\easy_install-script.py https://github.com/olt/werkzeug/zipball/no-magic-import

And all packages in `pkgs//python`:

    python c:\Python27\Scripts\easy_install-script.py --no-deps pkgs/python/xxxxx

You also need to manually install PyWin32 from http://sourceforge.net/projects/pywin32/


For packaging, you also need Inno Setup and PyInstaller. Both are available as a `.zip` archive in the `pkgs` directory.
Unzip them into `packaging\\opt` so that you have `packaging\\opt\\inno5` and `packaging\\opt\\pyinstaller`.

Preparation
~~~~~~~~~~~

You can call the build script with `python build.py`.


To unpack binary packages and prepare them::

    python build.py unpack
    python build.py prepare

Build
~~~~~

To build the GeoBox executable::

    python build.py build-app


To build the GeoBox installer with the GeoBox application, CouchDB and all dependencies::

    python build.py build-installer

Or to build both:

    python build.py build

Cleanup
~~~~~~~

To remove the `build` files::

    python build.py clean


Binary dependencies
-------------------

The GBI Client depends on a few software packages that needs to be compiled.

You need a developer environment as described in the `CouchDB Glazier instructions <https://github.com/dch/glazier>`_.


CouchDB/GeoCouch
~~~~~~~~~~~~~~~~

CouchDB
^^^^^^^

Build CouchDB with the Glazier instructions.


GeoCouch
^^^^^^^^

Unpack GeoCouch source to `$RELAX/geocouch`

::

    export COUCH_SRC=`cygpath -m /cygdrive/c/relax/couchdb/src/couchdb/`
    make


Build packages
^^^^^^^^^^^^^^

The build script expects the compiled CouchDB/GeoCouch as `.tar.gz` archives.
You need to create archives for:

Erlang/CouchDB

::

    cd $ERL_TOP/release
    mv win32 otp_R14B04_win32
    tar czf $PKG_DEST/otp_R14B04_win32.tar.gz otp_R14B04_win32
    mv otp_R14B04_win32 win32

GeoCouch

::

    cd $RELAX
    tar czf $PKG_DEST/geocouch.tar.gz geocouch

OpenSSL

::

    cd $RELAX
    tar czf $PKG_DEST/openssl.tar.gz openssl


You also need to copy the `vcredist_x86.exe`::

    cp $RELAX/bits/vcredist_x86.exe $PKG_DEST


GDAL
~~~~

`Download SWIG <http://prdownloads.sourceforge.net/swig/swigwin-2.0.8.zip>`_ and unpack into `c:\\opt\\swig``.

`Download GDAL 1.9.1 <http://download.osgeo.org/gdal/gdal191.zip>`_ and unzip to `c:\\src\\gdal-1.9.1`.


- Start *SDK Command Prompt*
- `setenv /release /x86`
- Edit nmake.opt and change PYDIR to `c:\\Python27`, GDAL_HOME to `c:\\src\build` and SWIG to `c:\\opt\\swig\\swig.exe``.


::

    nmake -f makefile.vc
    nmake -f makefile.vc install
    nmake -f makefile.vc devinstall

Then create a `.tar.gz` of the build dir from a cygwin shell::

    cd /cygdrive/c/src
    mv build gdal
    tar czf gdal path_to/packaging/pkgs/gdal.tar.gz
    mv gdal build


To build the Python packages of GDAL call the following from the *SDK Command Prompt*
::

    cd c:\src\gdal-1.9.1\swig
    SET VS90COMNTOOLS=%VS100COMNTOOLS%
    nmake -f makefile.vc python
    cd python
    c:\python27\python setup.py bdist_egg
    copy dist\gdal-1.9.1-py2.7-win32.egg path_to\packaging\pkgs\


Fiona
~~~~~

Download and extract `Fiona <http://github.com/Toblerity/Fiona>`_ >=0.14.

Edit `setup.py` to point to the GDAL install location::

    include_dirs = [r'c:\src\gdal\include']
    library_dirs = [r'c:\src\gdal\lib']
    libraries = ['gdal_i']

In SDK shell (see GDAL instructions above)
::
    SET VS90COMNTOOLS=%VS100COMNTOOLS%
    c:\python27\python setup.py bdist_egg
    copy dist\Fiona-0.14-py2.7-win32.egg path_to\packaging\pkgs\


Shapely
~~~~~~~

Shapely is available at http://pypi.python.org/pypi/Shapely
We don't need a binary version since we ship our own version of GEOS (which Shapely will use at runtime).


GEOS
~~~~

`Download GEOS 3.2.3 <http://download.osgeo.org/geos/geos-3.2.3.tar.bz2>`_ and untar to `c:\\src\\geos-3.3.5`.

GEOS 3.3.0 and newer has a bug that returns wrong ``intersects`` results on Windows XP: See http://trac.osgeo.org/geos/ticket/603

- Start *SDK Command Prompt*
- `setenv /release /x86`

::

    cd \src\geos-3.2.3
    nmake /f makefile.vc
    copy geos*.dll path_to\packaging\pkgs\geos\

Proj 4
~~~~~~

Download libproj 4.8.0

- Start *SDK Command Prompt*
- `setenv /release /x86`

::

    cd \src\proj-4.8.0
    nmake /f makefile.vc
    copy src\proj.dll path_to\packaging\pkgs\proj4\


Troubleshooting
---------------

The application does not start and reports "ImportError: No module named werkzeug.exceptions":
Werkzeug uses some import magic in werkzeug/__init__.py which confuses PyInstaller. You need to remove these lines or use https://github.com/olt/werkzeug/zipball/no-magic-import . Make sure previous versions from Werkzeug are removed from the site-packages directory before re-installing.

