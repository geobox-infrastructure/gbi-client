CouchDB Metadata
================

Vector layer
------------

Each vector layer gets stored in a separate CouchDB database.

Metadata
''''''''

Each layer contains a ``metadata`` document.

::

    {
        "name": "layername"
        "title": "Title of layer",
        "type": "GeoJSON",
        "appOptions": {
            "jsonSchema": {
                "url": {},
                "schema": {}
            },
            "olDefaultStyle": {
                [...]
            },
            "gbiThematicalMap": {
                [...]
            },
            "gbiAttributeLists": {
                "popup": [],
                "shortList": [],
                "fullList": [],
            }
        }
    }


Style
"""""

Metadata document may also contain a style stored in ``appOptions.olDefaultStyle``.

::

    {
        "Point": {
            "pointRadius": 4,
            "graphicName": "square",
            "fillColor": "white",
            "fillOpacity": 1,
            "strokeWidth": 1,
            "strokeOpacity": 1,
            "strokeColor": "#333333"
        },
        "Line": {
            "strokeWidth": 3,
            "strokeOpacity": 1,
            "strokeColor": "#666666",
            "strokeDashstyle": "dash"
        },
        "Polygon": {
            "strokeWidth": 2,
            "strokeOpacity": 1,
            "strokeColor": "#666666",
            "fillColor": "white",
            "fillOpacity": 0.3
        }
    }

Thematical map
""""""""""""""

Metadata document may also contain a thematical map definition stored in ``appOptions.gbiThematicalMap``.

::

    {
        "filterType": "exact",
        "filterAttribute": "foo",
        "filters": [
            {
                "value": "bar",
                "symbolizer": {
                    'fillColor': '#aaa',
                    'strokeColor': '#aaa'
                },
                "min": 0,
                "max": 1
            }, {
                "value": "foobar",
                "symbolizer": {
                    'fillColor': '#bbb',
                    'strokeColor': '#bbb'
                },
                "min": 1,
                "max": 2
            }
        ]
    }

Attribute lists
"""""""""""""""

Metadata document may also contain attribute lists stored in ``appOptions.gbiAttributeLists``.

::
    {
        "popupAttributes": ['foo', 'bar'],
        "shortListAttributes": ['foo', 'foobar'],
        "fullListAttributes": ['foo', 'bar', 'foobar']
    }

JSON Schema
"""""""""""

Metadata document may also contain a JSON Schema stored in ``appOptions.jsonSchema``.

::

    {
        "url": "",
        "schema": {}
    }

Savepoints
''''''''''

Each vector layer may contain ``savepoint`` documents.

::

    {
        "title": "date",
        "type": "savepoint",
        "rows": []
    }


Raster layers
-------------

::

    {
        "title": "Title of Layer",
        "type": "tiles"
    }



::

    {
        "title": "Title of Layer",
        "type": "tiles",
        "source": {
            "type": "wms",
            "url": "http://osm.omniscale.net/proxy/service?",
            "format": "image/png",
            "srs": "EPSG:3857",
            "layers": "osm"
        },
        "levelMin": 0,
        "levelMax": 10,
        "coverage": {
            // GeoJSON
            type: "Polygon",
            coordinates: [...]
        }
    }


::
    {
        "title": "Title of Layer",
        "type": "tiles",
        "source": {
            "type": "wmts",
            "url": "http://example.org/{tile_matrix}/{tile_row}/{tile_col}.png",
            "format": "png",
            "layer": "osm",
        },
        "levelMin": 0,
        "levelMax": 10,
        "coverage": {
            // GeoJSON
            type: "Polygon",
            coordinates: [...]
        }
    }