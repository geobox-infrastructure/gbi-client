gbi.Controls.ToolbarItem = function(options) {
    var defaults = {
        toolbar: true
    };
    this.options = $.extend({}, defaults, options);
    this.toolbar = this.options.toolbar;
    delete this.options.toolbar;
};
gbi.Controls.ToolbarItem.prototype = {
    CLASS_NAME: 'gbi.Controls.ToolbarItem',
    createControl: function() {
        if(this.layer) {
            this.olControl = this._createControl();
            this.noControl = false;
        } else {
            this.olControl = new OpenLayers.Control(this.options);
            this.olControl.activate = function() {};
            this.noControl = true;
        }
    },
    replaceToolbarControl: function(layer) {
        this.layer = layer;
        OpenLayers.Util.removeItem(this.olToolbar.controls, this.olControl);
        this.createControl();
        this.olToolbar.addControls([this.olControl]);
    },
    active: function() {
        return this.olControl.active;
    },
    activate: function() {
        this.olControl.activate();
    },
    deactivate: function() {
        this.olControl.deactivate();
    },
    registerEvent: function(type, obj, func) {
        this.olControl.events.register(type, obj, func);
    },
    unregisterEvent: function(type, obj, func) {
        this.olControl.events.unregister(type, obj, func);
    }
};

gbi.Controls.MultiLayerControl = function(options) {
    gbi.Controls.ToolbarItem.call(this, options);
};
gbi.Controls.MultiLayerControl.prototype =  new gbi.Controls.ToolbarItem();
$.extend(gbi.Controls.MultiLayerControl.prototype, {
    CLASS_NAME: 'gbi.Controls.MultiLayerControl'
})

gbi.Controls.Draw = function(layer, options) {
    var defaults = {
        title: "Draw Polygon",
        displayClass: "olControlDrawFeaturePolygon"
    };
    gbi.Controls.ToolbarItem.call(this, $.extend({}, defaults, options));
    this.layer = layer;

    this.options.drawType = this.options.drawType || '';
    this.drawHandler;
    switch(this.options.drawType.toLowerCase()) {
        case gbi.Controls.Draw.TYPE_POINT:
            this.drawHandler = OpenLayers.Handler.Point;
            this.options.displayClass = "olControlDrawFeaturePoint";
            this.options.title = "Draw Point";
            break;
        case gbi.Controls.Draw.TYPE_LINE:
            this.drawHandler = OpenLayers.Handler.Path;
            this.options.displayClass = "olControlDrawFeatureLine";
            this.options.title = "Draw Line";
            break;
        case gbi.Controls.Draw.TYPE_RECT:
            this.drawHandler = OpenLayers.Handler.RegularPolygon;
            this.options.displayClass = "olControlDrawFeatureRect";
            this.options.title = "Draw Rect";
            this.options.handlerOptions = $.extend({}, {
                    sides: 4,
                    irregular: true
                }, this.options.handlerOptions);
            break;
        case gbi.Controls.Draw.TYPE_POLYGON:
        default:
            this.drawHandler = OpenLayers.Handler.Polygon;
            break;
    };
    this.createControl();
};
gbi.Controls.Draw.prototype = new gbi.Controls.ToolbarItem();
$.extend(gbi.Controls.Draw.prototype, {
    CLASS_NAME: 'gbi.Controls.Draw',
    changeLayer: function(layer) {
        if(this.noControl || layer === undefined) {
            this.replaceToolbarControl(layer);
        } else {
            this.layer.olLayer.events.unregister('featureadded', this, this._featureAdded);
            this.olControl.layer = layer.olLayer;
        }
    },
    _createControl: function() {
        var self = this;
        var olControl = new OpenLayers.Control.DrawFeature(this.layer.olLayer, this.drawHandler, this.options)
        olControl.activate = function() {self._activateExtension()};
        olControl.deactivate = function() {self._deactivateExtension()};
        return olControl;
    },
    _featureAdded: function(f) {
        f.feature._drawType = this.options.drawType.toLowerCase();
    },
    _activateExtension: function() {
        this.layer.olLayer.events.register('featureadded', this, this._featureAdded);
        OpenLayers.Control.DrawFeature.prototype.activate.apply(this.olControl, arguments)
    },
    _deactivateExtension: function () {
        this.layer.olLayer.events.unregister('featureadded', this, this._featureAdded);
        OpenLayers.Control.DrawFeature.prototype.deactivate.apply(this.olControl, arguments)
    }
});
gbi.Controls.Draw.TYPE_POLYGON = 'polygon';
gbi.Controls.Draw.TYPE_RECT = 'rect';
gbi.Controls.Draw.TYPE_LINE = 'line';
gbi.Controls.Draw.TYPE_POINT = 'point';

gbi.Controls.Edit = function(layer, options) {
    var defaults = {
        mode: OpenLayers.Control.ModifyFeature.RESHAPE,
        standalone: false,
        displayClass: "olControlModifyFeature",
        title: "Edit Feature"
    };
    gbi.Controls.ToolbarItem.call(this, $.extend({}, defaults, options));
    this.layer = layer;
    this.createControl();
};
gbi.Controls.Edit.prototype = new gbi.Controls.ToolbarItem();
$.extend(gbi.Controls.Edit.prototype, {
    CLASS_NAME: 'gbi.Controls.Edit',
    changeLayer: function(layer) {
        if(this.noControl || layer === undefined) {
            this.replaceToolbarControl(layer);
        } else {
            this.layer.olLayer.events.unregister('beforefeaturemodified', this, this._beforeModified);
            this.olControl.layer = layer.olLayer;
            this.olControl.dragControl.layer = layer.olLayer;
            this.olControl.dragControl.handlers.feature.layer = layer.olLayer;
            if(this.olControl.standalone === false) {
                this.olControl.selectControl.setLayer(layer.olLayer);
            }
        }
    },
    _createControl: function() {
        var self = this;
        var olControl = new OpenLayers.Control.ModifyFeature(this.layer.olLayer, this.options);
        olControl.activate = function() {self._activateExtension()};
        olControl.deactivate = function() {self._deactivateExtension()};
        return olControl;
    },
    _beforeModified: function(f) {
        if(f.feature._drawType == gbi.Controls.Draw.TYPE_RECT) {
            this.olControl.mode = OpenLayers.Control.ModifyFeature.RESHAPE | OpenLayers.Control.ModifyFeature.RESIZE;
        } else {
            this.olControl.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
        }
    },
    _activateExtension: function() {
        this.layer.olLayer.events.register('beforefeaturemodified', this, this._beforeModified);
        OpenLayers.Control.ModifyFeature.prototype.activate.apply(this.olControl, arguments)
    },
    _deactivateExtension: function () {
        this.layer.olLayer.events.unregister('beforefeaturemodified', this, this._beforeModified);
        OpenLayers.Control.ModifyFeature.prototype.deactivate.apply(this.olControl, arguments)
    }
});

gbi.Controls.Delete = function(layer, options) {
    var defaults = {
        displayClass: "olControlDeleteFeature",
        title: "Delete Feature"
    };
    gbi.Controls.ToolbarItem.call(this, $.extend({}, defaults, options));

    this.layer = layer;
    this.createControl();
};
gbi.Controls.Delete.prototype = new gbi.Controls.ToolbarItem();
$.extend(gbi.Controls.Delete.prototype, {
    CLASS_NAME: 'gbi.Controls.Delete',
    changeLayer: function(layer) {
        if(this.noControl || layer === undefined) {
            this.replaceToolbarControl(layer);
        } else {
            this.olControl.setLayer(layer.olLayer);
        }
    },
    _createControl: function() {
        return new OpenLayers.Control.DeleteFeature(this.layer.olLayer, this.options);
    }
});

gbi.Controls.Select = function(layers, options) {
    var self = this;
    var defaults = {
        displayClass: "olControlSelectFeature",
        title: "Select Feature",
        multiple: false,
        toggleKey: "shiftKey",
        multipleKey: "shiftKey"
    };
    gbi.Controls.MultiLayerControl.call(this, $.extend({}, defaults, options));
    this.layers = {};
    if(layers) {
        if(!$.isArray(layers) && layers instanceof gbi.Layers.Layer) {
            //it's only one layer
            this.layers[layers.id] = layer;
        } else {
            $.each(layers, function(idx, layer) {
                self.layers[layer.id] = layer;
            });
        }
    }
    this.createControl();
};
gbi.Controls.Select.prototype = new gbi.Controls.MultiLayerControl();
$.extend(gbi.Controls.Select.prototype, {
    CLASS_NAME: 'gbi.Controls.Select',
    addLayer: function(layer) {
        if(this.noControl) {
            this.replaceToolbarControl(layer);
        } else {
            this.layers[layer.id] = layer;
            this.olControl.setLayer(this.olLayers());
        }
    },
    removeLayer: function(layer) {
        delete this.layers[layer.id];
        this.olControl.setLayer(this.olLayers());
    },
    createControl: function() {
        //some controls need a layer
        //if no layer is present, use baseclass
        if(this.layers) {
            this.olControl = this._createControl();
            this.noControl = false;
        } else {
            this.olControl = new OpenLayers.Control(this.options);
            this.olControl.activate = function() {};
            this.noControl = true;
        }
    },
    _createControl: function() {
        return new OpenLayers.Control.SelectFeature(this.olLayers(), this.options);
    },
    olLayers: function() {
        var self = this;
        var olLayers = [];
        $.each(this.layers, function(idx, layer) {
            olLayers.push(layer.olLayer);
        });
        return olLayers;
    }
});

gbi.Controls.Split = function(layer, options) {
    var defaults = {
        displayClass: "olControlSplitFeature",
        title: "Split Feature"
    };
    gbi.Controls.ToolbarItem.call(this, $.extend({}, defaults, options));
    this.layer = layer;

    this.createControl();
};
gbi.Controls.Split.prototype = new gbi.Controls.ToolbarItem();
$.extend(gbi.Controls.Split.prototype, {
    CLASS_NAME: 'gbi.Controls.Split',
    changeLayer: function(layer) {
        if(this.noControl || layer === undefined) {
            this.replaceToolbarControl(layer);
        } else {
            this.olControl.setLayer(layer.olLayer);
        }
    },
    _createControl: function() {
        return new OpenLayers.Control.SplitFeature(this.layer.olLayer, this.options);
    }
});

gbi.Controls.Merge = function(layer, options) {
    var defaults = {
        displayClass: "olControlMergeFeature",
        title: "Merge Features"
    };
    gbi.Controls.ToolbarItem.call(this, $.extend({}, defaults, options));
    this.layer = layer;

    this.createControl();
};
gbi.Controls.Merge.prototype = new gbi.Controls.ToolbarItem();
$.extend(gbi.Controls.Merge.prototype, {
    CLASS_NAME: 'gbi.Controls.Merge',
    changeLayer: function(layer) {
        if(this.noControl || layer === undefined) {
            this.replaceToolbarControl(layer);
        } else {
            this.olControl.setLayer(layer.olLayer);
        }
    },
    _createControl: function() {
        return new OpenLayers.Control.MergeFeatures(this.layer.olLayer, this.options);
    }
});

gbi.Controls.Snap = function(layer, layers, options) {
    var defaults = {
        toolbar: false,
        displayClass: "olControlSnapp",
        title: "Snapp Features",
        type: OpenLayers.Control.TYPE_TOGGLE
    };
    gbi.Controls.Select.call(this, layers, $.extend({}, defaults, options));

    this.layer = layer;
    if(this.layer) {
        this.options.layer = this.layer.olLayer;
    }
    if(this.layers) {
        this.options.targets = this.olLayers();
    }

    this.createControl();
};
gbi.Controls.Snap.prototype = new gbi.Controls.Select();
$.extend(gbi.Controls.Snap.prototype, {
    CLASS_NAME: 'gbi.Controls.Snap',
    changeLayer: function(layer) {
        this.layer = layer;
        if(this.noControl || layer === undefined) {
            if(this.options.toolbar) {
                this.replaceToolbarControl(layer);
            } else {
                this.createControl();
            }
        } else {
            this.olControl.setLayer(layer.olLayer);
        }
    },
    addLayer: function(layer) {
        if(this.noControl) {
            if(this.options.toolbar) {
                this.replaceToolbarControl(layer);
            } else {
                this.options.layer = layer.olLayer;
                this.createControl();
            }
        } else {
            if(!this.olControl.layer) {
                this.olControl.setLayer(layer.olLayer);
            }
            this.layers[layer.id] = layer;
            this.olControl.setTargets(this.olLayers());
        }
    },
    _createControl: function() {
        return new OpenLayers.Control.Snapping(this.options);
    }
});

gbi.Controls.Measure = function(options, callback, symbolizers) {
    var self = this;
    var defaults = {
        displayClass: 'olControlMeasurePolygon',
        mapSRS: 'EPSG:3857',
        displaySRS: 'EPSG:3857'
    };
    gbi.Controls.MultiLayerControl.call(this, $.extend({}, defaults, options));

    symbolizers = symbolizers || {
        "Point": {
            pointRadius: 4,
            graphicName: "square",
            fillColor: "white",
            fillOpacity: 1,
            strokeWidth: 1,
            strokeOpacity: 1,
            strokeColor: "#333333"
        },
        "Line": {
            strokeWidth: 3,
            strokeOpacity: 1,
            strokeColor: "#666666",
            strokeDashstyle: "dash"
        },
        "Polygon": {
            strokeWidth: 2,
            strokeOpacity: 1,
            strokeColor: "#666666",
            fillColor: "white",
            fillOpacity: 0.3
        }
    };

    var style = new OpenLayers.Style();
    style.addRules([
        new OpenLayers.Rule({symbolizer: symbolizers})
    ]);
    this.styleMap = new OpenLayers.StyleMap({"default": style});

    this.options.measureType = this.options.measureType || gbi.Controls.Measure.TYPE_POLYGON;

    this.mapSRS = new OpenLayers.Projection(this.options.mapSRS);
    this.displaySRS = new OpenLayers.Projection(this.options.displaySRS);

    this.callback = callback;

    this.layer = true;

    this.drawHandler = null;
    switch(this.options.measureType.toLowerCase()) {
        case gbi.Controls.Measure.TYPE_POINT:
            this.drawHandler = OpenLayers.Handler.Point;
            this.options.displayClass = 'olControlMeasurePoint';
            break;
        case gbi.Controls.Measure.TYPE_LINE:
            this.drawHandler = OpenLayers.Handler.Path;
            this.options.displayClass = 'olControlMeasureLine';
            break;
        case gbi.Controls.Measure.TYPE_POLYGON:
        default:
            this.drawHandler = OpenLayers.Handler.Polygon;
            this.options.displayClass = 'olControlMeasurePolygon';
            break;
    };
    this.createControl();
};
gbi.Controls.Measure.prototype = new gbi.Controls.MultiLayerControl();
$.extend(gbi.Controls.Measure.prototype, {
    CLASS_NAME: 'gbi.Controls.Measure',
    measureHandler: function(event) {
        var self = this;
        self.lastMeasure = event;
        var result = null;
        switch(event.geometry.CLASS_NAME) {
            case OpenLayers.Geometry.Point.prototype.CLASS_NAME:
                var geometry = event.geometry.clone();
                geometry.transform(self.mapSRS, self.displaySRS);
                result = {
                    type: gbi.Controls.Measure.TYPE_POINT,
                    measure: [geometry.x, geometry.y]
                };
                break;
            case OpenLayers.Geometry.LineString.prototype.CLASS_NAME:
                result = {
                    type: gbi.Controls.Measure.TYPE_LINE,
                    measure: event.measure.toFixed(3),
                    units: event.units
                };
                break;
            case OpenLayers.Geometry.Polygon.prototype.CLASS_NAME:
                result = {
                    type: gbi.Controls.Measure.TYPE_POLYGON,
                    measure: event.measure.toFixed(3),
                    units: event.units
                };
                break;
            default:
                break;
        }
        self.callback.call(self, result);
    },
    updateSRS: function(srs) {
        this.displaySRS = new OpenLayers.Projection(srs);
        if(this.lastMeasure) {
            this.measureHandler(this.lastMeasure);
        }
    },
    _createControl: function() {
        var self = this;
        var olControl = new OpenLayers.Control.Measure(this.drawHandler, {
            persist: true,
            displayClass: this.options.displayClass,
            handlerOptions: {
                layerOptions: {
                    styleMap: this.styleMap
                }
            }
        });
        olControl.events.on({
            "measure": function(event) { self.measureHandler(event) },
            "measurepartial": function(event) { self.measureHandler(event) }
        });
        return olControl;
    }
});
gbi.Controls.Measure.TYPE_POINT = 'point'
gbi.Controls.Measure.TYPE_LINE = 'line';
gbi.Controls.Measure.TYPE_POLYGON = 'polygon';
