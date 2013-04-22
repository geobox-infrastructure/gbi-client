gbi.widgets = gbi.widgets || {};

gbi.widgets.PointStyleEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'point-style-editor',
        selectDefaults : {
            strokeWidth: 2,
            strokeColor: 'blue',
            strokeOpacity: 1,
            cursor: "pointer"
        }
    };

    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.selectedFeatures = [];
    this.editor = editor;
    this.stylingLayer = this.layerManager.active();
    this.changed = false;
    this.activeLayer = this.layerManager.active();

    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        if(layer !== undefined) {
            self.stylingLayer = layer;
        } else {
            self.stylingLayer = false;
        }
    });

    this.registerEvents();
    $(gbi).on('gbi.layermanager.layer.add', function(event, layer) {
       self.registerEvents();
    });

};
gbi.widgets.PointStyleEditor.prototype = {

    registerEvents: function() {
        var self = this;
        $.each(self.layerManager.vectorLayers, function(idx, layer) {
            layer.registerEvent('featureselected', self, function(f) {
                var activeLayer = self.layerManager.active();
                if (f.feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.Point') {
                    self.activeLayer = self.layerManager.active();
                    self.addSelectFeatureStyle(f.feature);
                    self.selectedFeatures.push(f.feature);
                    if(self.selectedFeatures.length == 1) {
                        self.render();
                    }
                    if (activeLayer.olLayer == f.feature.layer) {
                        $('#pointTab').show();
                    }

                }
            });
            layer.registerEvent('featureunselected', self, function(f) {
                if (f.feature.geometry.CLASS_NAME == 'OpenLayers.Geometry.Point') {
                    self.activeLayer = self.layerManager.active();
                    var idx = $.inArray(f.feature, self.selectedFeatures);
                    if(idx != -1) {
                        self.selectedFeatures.splice(idx, 1);
                    }
                    self.removeSelectFeatureStyle(f.feature)
                    f.feature.layer.redraw();
                    if (self.selectedFeatures.length == 0) {
                        $('#attributeTab').tab('show');
                        $('#pointTab').hide();
                        self.element.empty();
                    }
                }
            });
        });
    },

    addSelectFeatureStyle: function(feature) {
        var styleBackup = {};
        jQuery.extend(styleBackup, feature.style);
        feature.styleBackup = styleBackup;
        var defaults =  {
            strokeWidth: 2,
            strokeColor: 'blue',
            strokeOpacity: 1,
            cursor: "pointer"
        }
        if (feature.style) {
            feature.style = $.extend({}, feature.style, defaults);
        }
        feature.layer.redraw();
    },

    removeSelectFeatureStyle: function(feature) {
        if (feature.styleBackup && !jQuery.isEmptyObject(feature.styleBackup)) {
            feature.style = feature.styleBackup;
        } else {
            delete feature.style
        }
    },

    render: function() {
        var self = this;
        this.activeLayer = this.layerManager.active();
        this.element.empty();

        if (this.selectedFeatures.length == 0) {
            return false;
        }

        var pointStyling = false;
        $.each(this.selectedFeatures, function(id, feature) {
            if (feature.style) {
                pointStyling = feature.style;
                return false;
            }
        });
        // load pointstyling from layer if not selcted point has styling
        if (!pointStyling) {
            pointStyling = this.stylingLayer.symbolizers.Point;
        };

        this.element.append(tmpl(gbi.widgets.PointStyleEditor.template, {pointStyling: pointStyling}));

        $('.color_picker').each(function() {
            $(this).minicolors({
                'value': $(this).val(),
                change: function() {
                    self.setStyle();
                }
            });
        });

        $(".styleControl").keyup(function() {
            self.setStyle();
        }).change(function() {
            self.setStyle();
        });

        $('#savePointStyle').click(function() {
            self.saveStyle();
            return false;
        });
    },

    setStyle: function() {
        var self = this;
        var point = {
            strokeWidth: 0
        };
        var symbolizers = {};
        $.each(['.pointRadius', '.fillColor'], function(idx, id) {
            self._setStyleProperty(id, point);
        });
        $.each(this.selectedFeatures, function(id, feature) {
            feature.styleBackup = point;
            if (!feature.style) {
                feature.style = self.options.selectDefaults;
            }
            feature.style.pointRadius = point.pointRadius;
            feature.style.fillColor = point.fillColor;
        });
        this.activeLayer.olLayer.redraw();

        return point;
    },

    saveStyle: function() {
        var self = this;
        var pointStyling = this.setStyle();
        var selectCtrl = this.editor.map.toolbars[1].select.olControl;
        $.each(this.selectedFeatures, function(id, feature) {
            if (feature && !feature.state) {
                feature.state = OpenLayers.State.UPDATE;
            }
        });
        selectCtrl.unselectAll();
        var activeLayer = self.layerManager.active();
        activeLayer.changesMade();
        self.selectedFeatures = [];
        self.render();
    },

    _setStyleProperty: function(id, obj) {
        var value = $(id).val();
        if(value) {
            value = id.match('Color') ? value : parseFloat(value);
            value = id.match('Opacity') ? value / 100 : value;
            obj[id.split('.')[1]] = value; // todo remove . and not split
        }
    }
};

var pointLabel = {
    'point': OpenLayers.i18n('point'),
    'pointinfotext': OpenLayers.i18n('pointinfotext'),
    'radius': OpenLayers.i18n('radius'),
    'color': OpenLayers.i18n('color'),
    'setStyling': OpenLayers.i18n('setStyling')
}

gbi.widgets.PointStyleEditor.template = '\
<h4>'+pointLabel.point+'</h4>\
<p>'+pointLabel.pointinfotext+'</p>\
<form class="form-horizontal"> \
     <div class="control-group">\
        <label for="pointRadius" class="control-label">'+pointLabel.radius + ':</label>\
         <div class="controls"> \
            <input type="text" class="pointRadius styleControl input-small" value="<%=pointStyling.pointRadius%>"/>\
        </div>\
    </div>\
    <div class="control-group">\
        <label for="fillColor" class="control-label">'+pointLabel.color+':</label>\
        <div class="controls"> \
            <input class="fillColor color_picker styleControl input-small" value="<%=pointStyling.fillColor%>"/>\
        </div>\
    </div>\
    <button id="savePointStyle" class="btn btn-small">'+pointLabel.setStyling+'</button>\
</form>\
';
