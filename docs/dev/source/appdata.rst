Appdata Folder
==============

The GeoBox-Client use the appdata folder from the operating system to save the application data. In this directory the application creates a ``GeoBox`` folder including folders for the logs, the import- and export-data and the CouchDB.

Locations
---------

Windows:
    ``%APPDATA%/GeoBox`` where ``%APPDATA%`` defaults to ``C:\Documents and Settings\<User Name>\Application Data\Roaming`` on Windows XP and ``C:\Users\AppData\Roaming`` on Vista and 7. The directory is hidden by default.

Linux:
    ``~/.config/geobox``

Mac OS X:
    ``~/Library/Application Support/GeoBox``

