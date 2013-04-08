// OpenLayers.Tile.Image.prototype.onImageError = function() {
//         var img = this.imgDiv;
//         if (img.src != null) {
//             this.imageReloadAttempts++;
//             if (this.imageReloadAttempts <= OpenLayers.IMAGE_RELOAD_ATTEMPTS) {
//                 this.setImgSrc(this.layer.getURL(this.bounds));
//             } else {
//                 OpenLayers.Element.addClass(img, "olImageLoadError");
//                 this.events.triggerEvent("loaderror");
//                 img.src = OpenlayersImageURL+"/blank.gif";
//                 this.onImageLoad();
//             }
//         }
// }

/**
 * style for the vector elemenets
 **/


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
        new gbi.Toolbar(editor, {element: 'toolbar'});
    }

    // vectorlayer for drawing
    var drawLayer = new gbi.Layers.Vector({
        name: 'Draw Layer',
        styleMap: styleMap,
        displayInLayerSwitcher: false,
        eventListeners: {
            featureadded: function(f) {
                // if(!drawLayer.load_active) {
                    // f.feature.attributes['type'] = $('.draw_control_element.active')[0].id;
                    toggle_start_button();
                // }
                // if (!drawLayer.load_active) {
                    get_data_volume();
                // }
            },
            featuresadded: function() {
                toggle_start_button();
            },
            featureremoved: function(f) {
                toggle_start_button();
            },
            featuresremoved: function() {
                get_data_volume();
                toggle_start_button();
            },
            afterfeaturemodified: function() {
                get_data_volume()
            }
        }

    });
    editor.addLayer(drawLayer);
    draw_layer = drawLayer.olLayer; // TODO dodo
    editor.layerManager.active(drawLayer);

    // OpenLayers.ImgPath = openlayers_image_path;

    // var extent = new OpenLayers.Bounds(-20037508.34, -20037508.34,
    //                                      20037508.34, 20037508.34);
    // var numZoomLevels = view_zoom_level_end;

    // if (base_layer.restrictedExtent) {
    //     extent = base_layer.restrictedExtent;
    // } else if (base_layer.getMaxExtent()) {
    //     extent = base_layer.getMaxExtent();
    // }

    // var options = {
    //     projection: new OpenLayers.Projection("EPSG:3857"),
    //     units: "m",
    //     maxResolution: 156543.0339,
    //     maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34,
    //                                      20037508.34, 20037508.34),
    //     numZoomLevels: numZoomLevels,
    //     controls: [],
    //     theme: openlayers_theme_url,
    //     restrictedExtent: extent
    // };

    // var map = new OpenLayers.Map( 'map', options );

    // map.addLayer(basic);
    // map.addLayer(base_layer);

    // map.addControl(
    //     new OpenLayers.Control.TouchNavigation({
    //         dragPanOptions: {
    //             enableKinetic: true
    //         }
    //     })
    // );
    // var layerswitcher = new OpenLayers.Control.LayerSwitcher({
    //     roundedCorner: true
    // });
    // map.addControl(layerswitcher)
    // layerswitcher.maximizeControl();

    // map.addControl(new OpenLayers.Control.PanZoomBar());
    // map.addControl(new OpenLayers.Control.Navigation());
    // map.addControl(new OpenLayers.Control.ZoomStatus({
    //     prefix: '<div id="show_zoomlevel">Level: ',
    //     suffix: '</div>'
    //  })
    // );
    // map.zoomToMaxExtent();
    editor.map.center();
    return editor;
}

/*
function activate_draw_controls(map) {
    var draw_type = null;

    var draw_layer = new OpenLayers.Layer.Vector("Draw Layer", {
        displayInLayerSwitcher: false,
        styleMap: styleMap,
        eventListeners: {
            featureadded: function(f) {
                if(!draw_layer.load_active) {
                    f.feature.attributes['type'] = $('.draw_control_element.active')[0].id;
                    toggle_start_button();
                }
                if (!draw_layer.load_active) {
                    get_data_volume();
                }
            },
            featuresadded: function() {
                toggle_start_button();
            },
            featureremoved: function(f) {
                toggle_start_button();
            },
            featuresremoved: function() {
                get_data_volume();
                toggle_start_button();
            },
            beforefeaturemodified: function(f) {
                if(f.feature.attributes['type'] == BOX_CONTROL) {
                    draw_controls[MODIFY_CONTROL].mode = OpenLayers.Control.ModifyFeature.DRAG;
                    draw_controls[MODIFY_CONTROL].mode |= OpenLayers.Control.ModifyFeature.RESIZE;
                    draw_controls[MODIFY_CONTROL].mode |= OpenLayers.Control.ModifyFeature.RESHAPE;
                } else {
                   draw_controls[MODIFY_CONTROL].mode = OpenLayers.Control.ModifyFeature.DRAG
                   draw_controls[MODIFY_CONTROL].mode |= OpenLayers.Control.ModifyFeature.RESHAPE;
                }
            },
            afterfeaturemodified: function() {
                get_data_volume()
            }

    }});

    draw_layer.load_active = false;
    map.addLayer(draw_layer);

    draw_controls = {};
    draw_controls[MULTIPOLYGON_CONTROL] = new OpenLayers.Control.DrawFeature(draw_layer, OpenLayers.Handler.Polygon, {
        handlerOptions: {
            layerOptions: {styleMap: styleMap},
            holeModifier: "altKey"
    }});

    draw_controls[BOX_CONTROL] = new OpenLayers.Control.DrawFeature(draw_layer, OpenLayers.Handler.RegularPolygon, {
        handlerOptions: {
            sides: 4,
            irregular: true
    }});

    draw_controls[MODIFY_CONTROL] = new OpenLayers.Control.ModifyFeature(draw_layer);

    $.each(draw_controls, function(name, control) {
        map.addControl(control);
    });
    $('.draw_control_element').click(toggle_draw_control);
    $('#'+DELETE_FEATURE).click(delete_selected_feature);
    $('#'+DELETE_ALL_FEATURES).click(delete_all_features);

    return draw_layer;
}

function toggle_draw_control() {
    if(!draw_controls) return false;
    elem = this;
    draw_control_elements = $('.draw_control_element');
    draw_control_elements.each(function(idx, el) {
        var el_id = el.id;
        el = $(el);
        if(el.hasClass('active')) {
            el.toggleClass('active');
            draw_controls[el_id].deactivate();
            if (el_id == MODIFY_CONTROL) {
                $('#'+DELETE_FEATURE).toggleClass('active').attr('disabled', 'disabled')
            }
        } else if (el_id == elem.id) {
            el.toggleClass('active');
            draw_controls[el_id].activate();
            if (el_id == MODIFY_CONTROL) {
                $('#'+DELETE_FEATURE).toggleClass('active').removeAttr('disabled')
            }
        }
    });
    return false;
}

function delete_selected_feature() {
    // save selecte features before modify control is deactive
    var selected_features = draw_layer.selectedFeatures[0];
    if (selected_features) {
        draw_controls[MODIFY_CONTROL].deactivate();
        draw_layer.removeFeatures(selected_features)
        draw_controls[MODIFY_CONTROL].activate();
    }
    return false;
}
*/
function delete_all_features() {
    draw_layer.removeAllFeatures();
    get_data_volume();
    return false;
}

function load_features(editor, data) {
    var layer = editor.layerManager.active();
    var drawLayer = layer.olLayer;
    drawLayer.load_active = true;

    var parser = new OpenLayers.Format.GeoJSON();
    if (jQuery.isArray(data)) {
       $.each(data, function(index, geom) {
            drawLayer.addFeatures(parser.read(geom.geometry));
       });
    } else {
        feature_collection = parser.read(data);
        if (feature_collection)
            drawLayer.addFeatures(feature_collection);
    }
    if (drawLayer.features.length > 0) {
        drawLayer.map.zoomToExtent(drawLayer.getDataExtent());
    }
    // get_data_volume();
    drawLayer.load_active = false;
}