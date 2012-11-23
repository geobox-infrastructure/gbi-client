function tileUrl(bounds) {
    var tileInfo = this.getTileInfo(bounds.getCenterLonLat());
    return this.url + this.layer + '/' + this.matrixSet + '-' + this.matrix.identifier + '-' 
        + tileInfo.col + '-'
        + tileInfo.row + '/tile';
}


OpenLayers.Tile.Image.prototype.onImageError = function() {
        var img = this.imgDiv;
        if (img.src != null) {
            this.imageReloadAttempts++;
            if (this.imageReloadAttempts <= OpenLayers.IMAGE_RELOAD_ATTEMPTS) {
                this.setImgSrc(this.layer.getURL(this.bounds));
            } else {
                OpenLayers.Element.addClass(img, "olImageLoadError");
                this.events.triggerEvent("loaderror");
                img.src = openlayers_blank_image;
                this.onImageLoad();
            }
        }
}


function init_map(background_layer) {
    OpenLayers.ImgPath = openlayers_image_path;

    var extent = new OpenLayers.Bounds(-20037508.34, -20037508.34,
                                         20037508.34, 20037508.34);
    var numZoomLevels = view_zoom_level_end;
   
    if (base_layer.getMaxExtent()) {
        extent = base_layer.getMaxExtent();
    }
    var options = {
        projection: new OpenLayers.Projection("EPSG:3857"),
        units: "m",
        maxResolution: 156543.0339,
        maxExtent: new OpenLayers.Bounds(-20037508.34, -20037508.34,
                                         20037508.34, 20037508.34),
        numZoomLevels: numZoomLevels,
        controls: [],
        theme: openlayers_theme_url,
        restrictedExtent: extent
    };

    var map = new OpenLayers.Map( 'map', options );

    if (background_layer) {
        map.addLayer(base_layer);
    }
    map.addLayer(basic);

    map.addControl(
        new OpenLayers.Control.TouchNavigation({
            dragPanOptions: {
                enableKinetic: true
            }
        })
    );

    map.addControl(new OpenLayers.Control.PanZoomBar());
    map.addControl(new OpenLayers.Control.Navigation());
    map.addControl(new OpenLayers.Control.ZoomStatus({
        prefix: '<div id="show_zoomlevel">Level: ',
        suffix: '</div>'
     })
    );
    map.zoomToMaxExtent();

    return map;
}

function activate_draw_controls(map) {
    var draw_type = null;

    var sketchSymbolizers = {
         "Point": {
            pointRadius: 10
        }
    };

    var style = new OpenLayers.Style();
        style.addRules([
        new OpenLayers.Rule({symbolizer: sketchSymbolizers})
    ]); 
    var styleMap = new OpenLayers.StyleMap({"default": style});


    selected_feature = null;
    var draw_layer = new OpenLayers.Layer.Vector("Draw Layer", {
        displayInLayerSwitcher: false,
        styleMap: styleMap,
        eventListeners: {
            featureadded: function(f) {
                if(!draw_layer.load_active) {
                    f.feature.attributes['type'] = $('.draw_control_element.active')[0].id;
                    toggle_start_button();
                }
            },
            featuresadded: function() {
                toggle_start_button();
            },
            featureremoved: function(f) {
                toggle_start_button();
            },
            featuresremoved: function() {
                toggle_start_button();
            },
            beforefeaturemodified: function(f) {
                if(f.feature.attributes['type'] == BOX_CONTROL) {
                    draw_controls[MODIFY_CONTROL].mode = OpenLayers.Control.ModifyFeature.DRAG | OpenLayers.Control.ModifyFeature.RESIZE;
                } else {
                    draw_controls[MODIFY_CONTROL].mode = OpenLayers.Control.ModifyFeature.DRAG | OpenLayers.Control.ModifyFeature.RESHAPE;
                }
            }
    }});
    draw_layer.load_active = false;
    draw_layer.events.on({
                'featureselected': function(feature) {
                    selected_feature = feature.feature;
                    $('#'+DELETE_FEATURE).removeAttr('disabled').toggleClass('active');
                },
                'featureunselected': function(feature) {
                    selected_feature = null;
                    $('#'+DELETE_FEATURE).attr('disabled', 'disabled').toggleClass('active');
                }
            });

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
    $('#'+DELETE_FEATURE).click(delete_feature);
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
        } else if (el_id == elem.id) {
            el.toggleClass('active');
            draw_controls[el_id].activate();
        }
    });
    return false;
}

function delete_feature() {
    if(selected_feature) {
        var to_delete = selected_feature;
        draw_controls[MODIFY_CONTROL].deactivate();
        draw_layer.removeFeatures(to_delete);
        $('#'+MODIFY_CONTROL).toggleClass('active');
    }
    return false;
}

function delete_all_features() {
    draw_layer.removeAllFeatures();
    return false;
}

function save_features(target_url) {
    var parser = new OpenLayers.Format.GeoJSON();
    geojson = parser.write(draw_layer.features);
    $.ajax({
        type: 'POST',
        url: target_url,
        data: {'feature_collection': geojson},
        success: function() {
            $('#output').text(geojson);
        },
        dataType: 'json'
    });
}

function load_features(data) {
    draw_layer.load_active = true;
    var parser = new OpenLayers.Format.GeoJSON();
    if (jQuery.isArray(data)) {
       $.each(data, function(index, geom) {
            draw_layer.addFeatures(parser.read(geom.geometry));
       });
    } else {
        feature_collection = parser.read(data);
        if (feature_collection)
            draw_layer.addFeatures(feature_collection);
    }
    if (draw_layer.features.length > 0) {
        draw_layer.map.zoomToExtent(draw_layer.getDataExtent());
    }
    draw_layer.load_active = false;
}