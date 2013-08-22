CouchDB Metadata
================

Each vector layer gets stored in a separate CouchDB database.

Metadata
--------

Each layer contains a ``metadata`` document.

::

    {
        "title": "Title of layer",
        "type": "GeoJSON",
    }


Style
-----

Each layer may also contain a ``style`` document.

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

GBI Editor
----------

Each layer may also contain a ``gbi_editor`` document.

::

    {
        "thematical": {
            "type": "exact",
            "attribute": "foo",
            "filterOptions": [
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
        },
        "popupAttributes": ['foo', 'bar'],
        "shortListAttributes": ['foo', 'foobar'],
        "fullListAttributes": ['foo', 'bar', 'foobar']
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
        "min_level": 0,
        "max_level": 10,
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
        "min_level": 0,
        "max_level": 10,
        "coverage": {
            // GeoJSON
            type: "Polygon",
            coordinates: [...]
        }
    }