function initProjectEditor(options) {
    var editor = new gbi.Editor({
       map: {
            element: 'map',
            numZoomLevels : numZoomLevels,
            theme: OpenlayersThemeURL
        },
        imgPath: OpenlayersImageURL
    });
    editor.addLayer(backgroundLayer)

    var layermanager = new gbi.widgets.LayerManager(editor, {
        tiny: true,
        showActiveLayer: false
    });
    editor.widgets = {
        'layermanager': layermanager
    };

    if (options.toolbar) {
        new gbi.Toolbar(editor, {
            element: 'toolbar',
            tools: {
                'drawPolygon': true,
                'drawRect': true,
                'edit': true,
                'delete': true
            }
        });
    }

    // vectorlayer for drawing
    var drawLayer = new gbi.Layers.Vector({
        name: 'Draw Layer',
        styleMap: styleMap,
        displayInLayerSwitcher: false,
        eventListeners: {
            featuresadded: function(f) {
                getDataVolume(editor)
                toggleStartButton(editor);
            },
            featuresremoved: function(f) {
                getDataVolume(editor)
                toggleStartButton(editor);
            },
            afterfeaturemodified: function(feature) {
                if (feature.modified) {
                    getDataVolume(editor)
                }
            }
        }
    });
    editor.addLayer(drawLayer);
    editor.layerManager.active(drawLayer);
    editor.map.olMap.addControl(new OpenLayers.Control.ZoomStatus({
        prefix: '<div id="show_zoomlevel">Level: ',
        suffix: '</div>'
    }));
    editor.map.center();

    return editor;
}

function deleteAllFeatures(editor) {
    var drawLayer = editor.layerManager.active();
    drawLayer.olLayer.removeAllFeatures();
    drawLayer.features = [];
    getDataVolume(editor);
    return false;
}

function loadFeatures(editor, data, complete) {
    var drawLayer = editor.layerManager.active();
    var parser = new OpenLayers.Format.GeoJSON();
    var toAdd = false;

    if (jQuery.isArray(data) && complete == true) {
        toAdd = data;
    } else if (jQuery.isArray(data)) {
        toAdd = [];
        $.each(data, function(index, geom) {
            // check if data is geojson or openlayers.features e.g. from couch layer
            if (geom.CLASS_NAME && geom.CLASS_NAME == 'OpenLayers.Feature.Vector') {
                toAdd.push(geom);
            } else {
                toAdd.push(parser.read(geom.geometry));
            }
        });
    } else {
        featureCollection = parser.read(data);
        if (featureCollection) {
            toAdd = featureCollection;
        }
    }

    if(toAdd !== false) {
        drawLayer.addFeatures(toAdd);
    }

    if (drawLayer.olLayer.features.length > 0) {
        editor.map.olMap.zoomToExtent(drawLayer.olLayer.getDataExtent());
    }
    getDataVolume(editor);
}
