GBI-Client
==========

This is a client for the GeoBox infrastructure (GBI). The GBI allows you to download, synchronize and use raster and vector data on remote/offline clients.

GBI-Client is a desktop application that allows you to download raster and vector data from a central server. You can then create smaller extracts of the local data for offline use or other purposes.

GBI-Client supports raster export as GeoTIFF, JPEG, MBTiles and CouchDB and vector exports as Shapefiles. It also offers all cached local raster data as a WMS. The GUI is web-based and can be used by other hosts in the same local network (like mobile clients via WLAN).

GBI-Client is platform-independent but it comes with Windows specific build instructions in ``packaging/README.rst`` (includes instructions for .exe and installer).

GBI-Client is written in Python, Apache 2.0 licensed and it build on a number of other open source packages, including: CouchDB, GeoCouch, MapProxy, libproj, GDAL/OGR, GEOS, ...

