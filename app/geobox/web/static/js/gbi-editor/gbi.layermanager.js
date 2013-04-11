gbi.LayerManager = function(olMap) {
    this.counter = 0;
    this._layers = {};
    this.backgroundLayers = {};
    this.rasterLayers = {};
    this.vectorLayers = {};
    this._activeLayer = false;
    this.olMap = olMap;
};
gbi.LayerManager.prototype = {
    CLASS_NAME: 'gbi.LayerManager',
    nextID: function() {
        return this.counter++;
    },
    addLayer: function(layer) {
        var id = this.nextID();
        layer.id = layer.olLayer.gbiId = id;
        this._layers[id] = layer;
        if(layer.isVector) {
            this.vectorLayers[id] = layer;
            $(gbi).trigger('gbi.layermanager.vectorlayer.add', layer);
            if(!this.active()) {
                this.active(layer);
            }
        } else if (layer.isBackground) {
            this.backgroundLayers[id] = layer;
        } else {
            this.rasterLayers[id] = layer;
        }
        this.olMap.addLayer(layer.olLayer);
        this.position(layer, this.minMaxPosition(layer)['max']);
    },
    addLayers: function(layers) {
        var self = this;
        $.each(layers, function(idx, layer) {
            self.addLayer(layer);
        });
    },
    removeLayer: function(layer) {
        var id = layer.id;
        this.olMap.removeLayer(layer.olLayer);
        delete this._layers[id];
        if(layer.isVector) {
            delete this.vectorLayers[id];
            if(layer.isActive) {
                $(gbi).trigger('gbi.layermanager.layer.active');
            }
            $(gbi).trigger('gbi.layermanager.vectorlayer.remove', layer);
        } else if(layer.isBackground) {
            delete this.backgroundLayers[id];
            $(gbi).trigger('gbi.layermanager.backgroundLayer.remove', layer);
        } else {
            delete this.rasterLayers[id];
            $(gbi).trigger('gbi.layermanager.rasterlayer.remove', layer);
        }
        layer.destroy();
    },
    layers: function() {
        var self = this;
        var result = [];
        $.each(this.olMap.layers, function(idx, olLayer) {
            if(olLayer && !olLayer.isBaseLayer) {
                var gbiLayer = self._layers[olLayer.gbiId];
                if(gbiLayer) {
                    result.push(gbiLayer);
                }
            }
        });
        return result.reverse();
    },
    layerById: function(gbiId) {
        return this._layers[gbiId];
    },
    active: function(layer) {
        if(arguments.length == 0) {
            return self._activeLayer;
        }
        if(self._activeLayer) {
            self._activeLayer.isActive = false;
        }
        self._activeLayer = layer;
        self._activeLayer.isActive = true;
        $(gbi).trigger('gbi.layermanager.layer.active', layer);
    },
    style: function(layer, style) {},
    up: function(layer, delta) {
        var max = this.minMaxPosition(layer)['max'];
        delta = delta || 1;
        var pos = this.position(layer) + delta;
        if(pos > max) { return false; }
        this.position(layer, pos);
        return true;
    },
    top: function(layer) {
        this.position(layer, this.minMaxPosition(layer)['max']);
    },
    down: function(layer, delta) {
        var min = this.minMaxPosition(layer)['min'];
        delta = delta || 1;
        var pos = this.position(layer) - delta;
        if(pos < min) { return false; }
        this.position(layer, pos);
        return true;
    },
    position: function(layer, pos) {
        if(pos===undefined) {
            return this.olMap.getLayerIndex(layer.olLayer);
        }
        this.olMap.setLayerIndex(layer.olLayer, pos);
    },
    bottom: function(layer) {
        this.position(layer, this.minMaxPosition(layer)['min']);
    },
    minMaxPosition: function(layer) {
        var min;
        var max;
        if(layer.isBackground) {
            min = 1;
            max = Object.keys(this.backgroundLayers).length;
        } else if (layer.isRaster) {
            min = Object.keys(this.backgroundLayers).length + 1;
            max = min + Object.keys(this.rasterLayers).length -1;
        } else {
            min = Object.keys(this.backgroundLayers).length + Object.keys(this.rasterLayers).length + 1;
            max = this.olMap.layers.length;
        }
        return {min: min, max: max};
    }
};
