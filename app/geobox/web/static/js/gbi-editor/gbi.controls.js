gbi.Controls = gbi.Controls || {};

gbi.Controls.LayerSwitcher = function(options) {
    this.olControl = new OpenLayers.Control.LayerSwitcher(options);
};
gbi.Controls.LayerSwitcher.prototype = {
    CLASS_NAME: 'gbi.Controls.LayerSwitcher',
    maximize: function() {
        this.olControl.maximizeControl();
    }
};

gbi.Controls.MousePosition = function(options) {
    //MousePosition expect HTML element, cause internal no document.getElement... is called
    if(options.element!==undefined) {
        options.element = $('#' + options.element)[0];
    }

    this.olControl = new OpenLayers.Control.MousePosition(options);
};
gbi.Controls.MousePosition.prototype = {
    CLASS_NAME: 'gbi.Controls.MousePosition',
    updateSRS: function(srs) {
        srs = new OpenLayers.Projection(srs);
        this.olControl.displayProjection = srs;
    }
};
