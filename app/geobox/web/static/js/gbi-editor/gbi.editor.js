var gbi = gbi || {};

gbi.Editor = function(options) {
    var self = this;
    this.options = options;

    OpenLayers.ImgPath = this.options.imgPath || "../css/theme/default/img/";


    this.map = new gbi.Map(this, this.options.map);
    this.layerManager = new gbi.LayerManager(this.map.olMap);

    if(this.options.layers) {
        this.addLayers(this.options.layers);
    }
};
gbi.Editor.prototype = {
    CLASS_NAME: 'gbi.Editor',
    addLayer: function(layer) {
        this.layerManager.addLayer(layer);
    },
    addLayers: function(layers) {
        this.layerManager.addLayers(layers);
    },
    addControl: function(control) {
        this.map.addControl(control);
    },
    addControls: function(controls) {
        this.map.addControls(controls);
    },
    removeLayer: function(layer) {
        this.layerManager.removeLayer(layer);
    }
};