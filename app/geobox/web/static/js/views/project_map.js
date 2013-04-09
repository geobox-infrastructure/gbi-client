OpenLayers.Tile.Image.prototype.onImageError = function() {
        var img = this.imgDiv;
        if (img.src != null) {
            this.imageReloadAttempts++;
            if (this.imageReloadAttempts <= OpenLayers.IMAGE_RELOAD_ATTEMPTS) {
                this.setImgSrc(this.layer.getURL(this.bounds));
            } else {
                OpenLayers.Element.addClass(img, "olImageLoadError");
                this.events.triggerEvent("loaderror");
                img.src = OpenlayersImageURL+"/blank.gif";
                this.onImageLoad();
            }
        }
}

var test;

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

    // layerswitcher
    var layerSwitcher = new gbi.Controls.LayerSwitcher();
    editor.addControl(layerSwitcher);
    layerSwitcher.maximize();

    if (options.toolbar) {
        new gbi.Toolbar(editor, {
            element: 'toolbar',
            tools: {
                drawPolygon: true,
                drawRect: true,
                edit: true,
                delete: true
            }
        });
    }

    // vectorlayer for drawing
    var drawLayer = new gbi.Layers.Vector({
        name: 'Draw Layer',
        styleMap: styleMap,
        displayInLayerSwitcher: false,
        eventListeners: {
            featureadded: function(f) {
                if (!drawLayer.loading) {
                    toggleStartButton(editor);
                    getDataVolume(editor);
                }
            },
            featuresadded: function() {
                toggleStartButton(editor);
            },
            featureremoved: function(f) {
                toggleStartButton(editor);
            },
            featuresremoved: function() {
                getDataVolume(editor);
                toggleStartButton(editor);
            },
            afterfeaturemodified: function() {
                getDataVolume(editor)
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
    drawLayer.removeAllFeatures();
    getDataVolume(editor);
    return false;
}

function loadFeatures(editor, data) {
    var drawLayer = editor.layerManager.active();
    drawLayer.loading = true;

    var parser = new OpenLayers.Format.GeoJSON();
    if (jQuery.isArray(data)) {
       $.each(data, function(index, geom) {
            drawLayer.addFeatures(parser.read(geom.geometry));
       });
    } else {
        featureCollection = parser.read(data);
        if (featureCollection)
            drawLayer.addFeatures(featureCollection);
    }
    if (drawLayer.features.length > 0) {
        editor.map.olMap.zoomToExtent(drawLayer.olLayer.getDataExtent());
    }
    getDataVolume(editor);
    drawLayer.loading = false;
}