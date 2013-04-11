gbi.Layers = gbi.Layers || {};

gbi.Layers.Layer = function(options) {
    var defaults = {
        isBaseLayer: false,
        displayInLayerSwitcher: true,
        visibility: true
    }
    this.options = $.extend({}, defaults, options);
    this.isRaster = true;
    this.isBackground = this.options.background || false;
};
gbi.Layers.Layer.prototype = {
    CLASS_NAME: 'gbi.Layers.Layer',
    visible: function(visibility) {
        if(arguments.length == 0) {
            return this.olLayer.getVisibility();
        }
        this.olLayer.setVisibility(visibility);
    },
    destroy: function() {
        this.olLayer.destroy();
    },
    type: function() {
        if(this.isBackground)
            return 'background';
        else if (this.isVector)
            return 'vector';
        else
            return 'raster';
    }
};

gbi.Layers.OSM = function(options) {
    gbi.Layers.Layer.call(this, options);
    this.olLayer = new OpenLayers.Layer.OSM(this.options.name, undefined, this.options);
};
gbi.Layers.OSM.prototype = new gbi.Layers.Layer();
$.extend(gbi.Layers.OSM.prototype, {
    CLASS_NAME: 'gbi.Layers.OSM'
});

gbi.Layers.WMS = function(options) {
    var defaults = {
        params: {
            srs: 'EPSG:3857'
        },
        ratio: 1,
        singleTile: true
    };
    gbi.Layers.Layer.call(this, $.extend({}, defaults, options));
    var params = this.options.params
    delete this.options.params
    this.olLayer = new OpenLayers.Layer.WMS(this.options.name, this.options.url, params, this.options)
};
gbi.Layers.WMS.prototype = new gbi.Layers.Layer();
$.extend(gbi.Layers.WMS.prototype, {
    CLASS_NAME: 'gbi.Layers.WMS'
});

gbi.Layers.WMTS = function(options) {
    var defaults = {
        getURL: this.tileURL,
        matrixSet: 'GoogleMapsCompatible',
        style: 'default'
    };
    gbi.Layers.Layer.call(this, $.extend({}, defaults, options));
    this.olLayer = this.options.clone ? null : new OpenLayers.Layer.WMTS(this.options);
};
gbi.Layers.WMTS.prototype = new gbi.Layers.Layer();
$.extend(gbi.Layers.WMTS.prototype, {
    CLASS_NAME: 'gbi.Layers.WMTS',
    tileURL: function(bounds) {
        var tileInfo = this.getTileInfo(bounds.getCenterLonLat());
        return this.url
            + this.layer + '/'
            + this.matrixSet + '-'
            + this.matrix.identifier + '-'
            + tileInfo.col + '-'
            + tileInfo.row + '/tile';
    },
    clone: function() {
        var clone_options = $.extend({}, this.options, {clone: true});
        var clone = new gbi.Layers.WMTS(clone_options);
        clone.olLayer = this.olLayer.clone();
        return clone;
    }
});

gbi.Layers.Vector = function(options) {
    var defaults = {
        editable: true
    };
    var default_symbolizers = {
      "Point": {
        pointRadius: 6,
        fillColor: "#ee9900",
        fillOpacity: 0.4,
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeColor: "#ee9900"
      },
      "Line": {
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeColor: "#ee9900"
       },
       "Polygon": {
        strokeWidth: 1,
        strokeOpacity: 1,
        strokeColor: "#ee9900",
        fillColor: "#ee9900",
        fillOpacity: 0.4
       }
    };

    this.callbacks = {};
    if(options && options.callbacks) {
        var self = this;
        $.each(options.callbacks, function(key, callbacks) {
            if(!$.isArray(callbacks)) {
                callbacks = [callbacks];
            }
            self._addCallbacks(key, callbacks);
        });
        delete options.callbacks;
    }

    gbi.Layers.Layer.call(this, $.extend({}, defaults, options));

    this.olLayer = new OpenLayers.Layer.Vector(this.options.name, this.options);
    this.olLayer.events.register('featureselected', this, this._select);
    this.olLayer.events.register('featureunselected', this, this._unselect);

    this.isVector = this.olLayer.isVector = true;
    this.isRaster = false;
    this.isBackground = false;
    this.isActive = false;
    this.isEditable = this.options.editable;

    this.features = this.olLayer.features;
    if(!this.options.styleMap) {
        this.symbolizers = $.extend({}, default_symbolizers, this.options.symbolizers);
        this.setStyle(this.symbolizers);
    } else {
        this.symbolizers = this.options.styleMap.styles.default.rules[0].symbolizer;
    }
}
gbi.Layers.Vector.prototype = new gbi.Layers.Layer();
$.extend(gbi.Layers.Vector.prototype, {
    CLASS_NAME: 'gbi.Layers.Vector',
    setStyle: function(symbolizers) {
        $.extend(this.symbolizers, symbolizers);
        var style = new OpenLayers.Style();
        style.addRules([
            new OpenLayers.Rule({symbolizer: this.symbolizers})
        ]);
        if(this.olLayer.styleMap) {
            this.olLayer.styleMap.styles.default = style;
        } else {
            this.olLayer.styleMap = new OpenLayers.StyleMap({"default": style});
        }
        this.olLayer.redraw();
    },
    registerCallback: function(key, callback) {
        this._addCallbacks(key, [callback]);
    },
    addFeatures: function(features, options) {
        this.olLayer.addFeatures(features);
    },
    addFeature: function(feature, options) {
        this.addFeatures([feature], options);
    },
    clone: function() {
        var clone_options = $.extend({}, this.options, {clone: true});
        var clone = new gbi.Layers.Vector(clone_options);
        clone.olLayer = this.olLayer.clone();
        return clone;
    },
    selectAllFeatures: function() {
        var selectCtrl = new OpenLayers.Control.SelectFeature();
        for(var i in this.features) {
            selectCtrl.select(this.features[i]);
        }
        selectCtrl.destroy();
    },
    _select: function(e) {
        if(this.callbacks.select) {
            var self = this;
            $.each(this.callbacks.select, function(idx, callback) {
                callback.call(self, e.feature, e.object.selectedFeatures)
            });
        }
    },
    _unselect: function(e) {
        if(this.callbacks.unselect) {
            var self = this;
            $.each(this.callbacks.unselect, function(idx, callback) {
                callback.call(self);
            });
        }
    },
    _addCallbacks: function(key, callbacks) {
        if(this.callbacks[key]) {
            this.callbacks[key] = this.callbacks[key].concat(callbacks);
        } else {
            this.callbacks[key] = callbacks;
        }
    }
});

gbi.Layers.SaveableVector = function(options) {
    var self = this;
    this.saveStrategy = new OpenLayers.Strategy.Save();
    this.saveStrategy.events.register('start', this, this._start);
    this.saveStrategy.events.register('success', this, this._success);
    this.saveStrategy.events.register('fail', this, this._fail);

    if(options) {
        options.strategies.push(this.saveStrategy);
    }

    this.unsavedChanges = false;

    gbi.Layers.Vector.call(this, options);

    this.olLayer.events.register('loadend', '', function() {
        self.unsavedChanges = false;
        self.olLayer.events.register('featureadded', self, self._trackStatus);
        self.olLayer.events.register('featureremoved', self, self._trackStatus);
        self.olLayer.events.register('afterfeaturemodified', self, self._trackStatus);
    });
};
gbi.Layers.SaveableVector.prototype = new gbi.Layers.Vector();
$.extend(gbi.Layers.SaveableVector.prototype, {
    CLASS_NAME: 'gbi.Layers.SaveableVector',
    save: function() {
        this.saveStrategy.save();
    },
    _change: function() {
        if(this.callbacks.changes) {
            var self = this;
            $.each(this.callbacks.changes, function(idx, callback) {
                callback.call(self, self.unsavedChanges);
            });
        }
    },
    _start: function(response) {
        if(this.callbacks.start) {
            var self = this;
            $.each(this.callbacks.start, function(idx, callback) {
                callback.call(self);
            });
        }
    },
    _success: function(response) {
        this.unsavedChanges = false;
        this._change();
        if(this.callbacks.success) {
            var self = this;
            $.each(this.callbacks.success, function(idx, callback) {
                callback.call(self);
            });
        }
    },
    _fail: function(response) {
        if(this.callbacks.fail) {
            var self = this;
            $.each(this.callbacks.fail, function(idx, callback) {
                callback.call(self);
            });
        }
    },
    _trackStatus: function(e) {
        if (e.feature && (e.feature.state == OpenLayers.State.DELETE || e.feature.state == OpenLayers.State.UPDATE || e.feature.state == OpenLayers.State.INSERT)) {
            //XXXkai: set unsavedChanges to false when new feature inserted and then deleted?
            this.unsavedChanges = true;
            this._change();
        }
    },
    changesMade: function() {
        this.unsavedChanges = true;
        this._change();
    }
});

gbi.Layers.Couch = function(options) {
    var self = this;
    var defaults = {
        readExt: '_all_docs?include_docs=true',
        saveExt: '_bulk_docs',
        createDB: true
    };
    options = $.extend({}, defaults, options);

    this.format = new OpenLayers.Format.JSON();

    options.url += options.name.replace(/[^a-z0-9]*/, '') + '/';

    var couchExtension = {
        protocol: new OpenLayers.Protocol.CouchDB({
            url: options.url,
            readExt: options.readExt,
            saveExt: options.saveExt,
            format: new OpenLayers.Format.CouchDB()
        }),
        strategies: [
            new OpenLayers.Strategy.Fixed()
        ]
    };

    delete options.readExt;
    delete options.saveExt;

    gbi.Layers.SaveableVector.call(this, $.extend({}, defaults, options, couchExtension));

    if(this.options.createDB) {
        this._createCouchDB();
    }

    this._loadStyle();
};
gbi.Layers.Couch.prototype = new gbi.Layers.SaveableVector();
$.extend(gbi.Layers.Couch.prototype, {
    CLASS_NAME: 'gbi.Layers.Couch',
    //XXXkai: add error handling and callbacks
    _loadStyle: function() {
        var self = this;
        var format = new OpenLayers.Format.JSON();
        var request = OpenLayers.Request.GET({
            url: this.options.url + 'style',
            async: false,
            headers: {
                'contentType': 'application/json'
            },
            success: function(response) {
                self.setStyle(self.format.read(response.responseText));
            }
        });
    },
    _saveStyle: function() {
        var self = this;
        var request = OpenLayers.Request.PUT({
            url: this.options.url + 'style',
            async: false,
            headers: {
                'Content-Type': 'application/json'
            },
            data: this.format.write(this.symbolizers),
            success: function(response) {
                if(response.responseText) {
                    jsonResponse = self.format.read(response.responseText);
                    if(jsonResponse.rev) {
                        self.symbolizers._rev = jsonResponse.rev;
                    }
                }
            }
        });
    },
    _createCouchDB: function() {
        var self = this;
        //GET to see if couchDB already exist
        OpenLayers.Request.GET({
            url: this.options.url,
            async: false,
            failure: function(response) {
                OpenLayers.Request.PUT({
                    url: self.options.url,
                    async: false,
                    success: function(response) {
                        self._createDefaultDocuments();
                    }
                });
            },
            success: function(response) {
                self.couchExists = true;
            }
        });
    },
    _createDefaultDocuments: function() {
        var metadata = {
            title: this.options.name,
            type: 'GeoJSON'
        }
        OpenLayers.Request.PUT({
            url: this.options.url + 'metadata',
            async: false,
            headers: {
                'Content-Type': 'application/json'
            },
            data: this.format.write(metadata)
        });
        OpenLayers.Request.PUT({
            url: this.options.url + 'style',
            async: false,
            headers: {
                'Content-Type': 'application/json'
            },
            data: this.format.write({})
        });
    },
    destroy: function() {
        this._deleteCouchDB();
        gbi.Layers.SaveableVector.prototype.destroy.apply(this)
    },
    _deleteCouchDB: function() {
        OpenLayers.Request.DELETE({
            url: this.options.url,
            async: false,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
});

gbi.Layers.WFS = function(options) {
    var defaults = {
        featureNS: '',
        featureType: '',
        geometryName: '',
        version: '1.1.0',
        maxFeatures: 500,
        typename: ''
    };
    options = $.extend({}, defaults, options);
    var wfsExtension = {
        protocol: new OpenLayers.Protocol.WFS({
            url: options.url,
            featureNS: options.featureNS,
            featureType: options.featureType,
            geometryName: options.geometryName,
            schema: options.url + 'service=wfs&request=DescribeFeatureType&version='+options.version+'&typename='+options.typename+':'+options.layer,
            maxFeatures: options.maxFeatures,
            typename: options.typename + ':' + options.layer
        }),
        strategies: [
            new OpenLayers.Strategy.BBOX()
        ]
    };
    gbi.Layers.SaveableVector.call(this, $.extend({}, defaults, options, wfsExtension));
};
gbi.Layers.WFS.prototype = new gbi.Layers.SaveableVector();
$.extend(gbi.Layers.WFS.prototype, {
    CLASS_NAME: 'gbi.Layers.WFS'
});
