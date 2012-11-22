Configuration
=============

The application loads the configuration from the configuration file in the :doc:`appdata folder <appdata>` and from the default configuration. The default configration is loaced at the source code at ``geobox/config.py``

With the configuration file it is possible to overwrite the default configuration. To overwrite the values you have to add the group and the keyword::

    [app]
    locale = 'en_UK' # changes the default language

    [watermark]
    text = 'GBI- Client'