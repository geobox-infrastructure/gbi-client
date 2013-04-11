gbi.Map = function (editor, options) {
    var defaults = {
        theme: '../css/theme/default/style.css',
        projection: new OpenLayers.Projection('EPSG:3857'),
        displayProjection: new OpenLayers.Projection('EPSG:4326'),
        units: 'm',
        maxResolution: 156543.0339,
        maxExtent: new OpenLayers.Bounds(-20037508.3428, -20037508.3428, 20037508.3428, 20037508.3428),
        numZoomLevels: 19,
        controls: [
            new OpenLayers.Control.Navigation({
                documentDrag: true,
                dragPanOptions: {
                    interval: 1,
                    enableKinetic: true
                }
            }),
            new OpenLayers.Control.PanZoomBar({autoActivate: true})
        ],
        snapping: true
    };

    var centerPosition = options.center;
    delete options.center;

    this.options = $.extend({}, defaults, options);
    // this.element = $('#' + this.options.element);
    this.editor = editor;
    //setup map
    this.olMap = new OpenLayers.Map(this.options.element, this.options);

    this.toolbars = [];

    //setup and add blank image layer as background
    var baseLayer = new OpenLayers.Layer.Image('background',
        OpenLayers.ImgPath+'/blank.gif',
        this.options.maxExtent,
        new OpenLayers.Size(500, 500), {
            maxResolution: this.options.maxResolution,
            displayInLayerSwitcher: false,
            isBaseLayer: true
        }
    );
    this.olMap.addLayer(baseLayer);

    //XXXkai: what happens, wenn snapping is active and a snapping control is added manually?
    if(this.options.snapping) {
        var snapping = new gbi.Controls.Snap();
        this.olMap.addControls([snapping.olControl]);
        snapping.activate();
        $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
            snapping.changeLayer(layer);
        });
        $(gbi).on('gbi.layermanager.vectorlayer.add', function(event, layer) {
            snapping.addLayer(layer);
        });
        $(gbi).on('gbi.layermanager.vectorlayer.remove', function(event, layer) {
            snapping.removeLayer(layer);
        });
    }

    this.center(centerPosition);
};
gbi.Map.prototype = {
    CLASS_NAME: 'gbi.Map',
    center: function(options) {
        if(options) {
            this.olMap.setCenter(
                new OpenLayers.LonLat(options.lon, options.lat).transform(
                    new OpenLayers.Projection(options.srs),
                    this.olMap.getProjectionObject()
                ), options.zoom
            );
        } else {
            this.olMap.zoomToMaxExtent();
        }
    },
    addControl: function(control) {
        if(control instanceof gbi.Toolbar) {
            this.toolbars.push(control);
        }
        this.olMap.addControl(control.olControl);
    },
    addControls: function(controls) {
        var self = this;
        $.each(controls, function(idx, control) {
            self.addControl(control);
        })
    }
};
