gbi.widgets = gbi.widgets || {};

gbi.widgets.PointStyleEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'point-style-editor'
    };

    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.selectedFeatures = [];
    this.editor = editor;
    this.stylingLayer = this.layerManager.active();
    this.changed = false;

    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        if(layer !== undefined) {
            self.stylingLayer = layer;
        } else {
            self.stylingLayer = false;
        }
    });

    $.each(this.layerManager.vectorLayers, function(idx, layer) {
        layer.registerEvent('featureselected', self, function(f) {
            this.selectedFeatures.push(f.feature);
            this._checkFeatureType()
        });
        layer.registerEvent('featureunselected', self, function(f) {
            var idx = this.selectedFeatures.indexOf(f.feature);
            if(idx != -1) {
                this.selectedFeatures.splice(idx, 1);
            }
            this._checkFeatureType()
        });
    });


};
gbi.widgets.PointStyleEditor.prototype = {

    render: function() {
        var self = this;
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
                'value': $(this).val()
                // change: function() {
                //     self.setStyle();
                // }
            });
        });

        // $(".styleControl").keyup(function() {
        //     self.setStyle();
        // }).change(function() {
        //     self.setStyle();
        // });

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
        if(Object.keys(point).length > 0) {
            symbolizers["Point"] = point;
        }

        if(Object.keys(symbolizers).length > 0) {
            $.each(this.selectedFeatures, function(id, feature) {
                 feature.style = point;
           });
       }
        return this.stylingLayer;
    },

    saveStyle: function() {
        this.setStyle();
        var selectCtrl = this.editor.map.toolbars[1].select.olControl;
        $.each(this.selectedFeatures, function(id, feature) {
            if (feature && feature.layer) {
                selectCtrl.unselect(feature)
            }
        });
    },

    _setStyleProperty: function(id, obj) {
        var value = $(id).val();
        if(value) {
            value = id.match('Color') ? value : parseFloat(value);
            value = id.match('Opacity') ? value / 100 : value;
            obj[id.split('.')[1]] = value; // todo remove . and not split
        }
    },

    _checkFeatureType: function() {
        var self = this;
        if(this.selectedFeatures.length !== 0) {
            var featureType = this.selectedFeatures[0]._drawType;
            $.each(this.selectedFeatures, function(id, feature) {
                if (featureType != feature._drawType || feature._drawType != gbi.Controls.Draw.TYPE_POINT) {
                    featureType = false;
                }
            });
            if (featureType) {
                self.render();
            } else {
                self.element.empty();
            }
        }
    }

};

var pointLabel = {
    'point': OpenLayers.i18n('point'),
    'radius': OpenLayers.i18n('radius'),
    'color': OpenLayers.i18n('color'),
    'saveStyling': OpenLayers.i18n('save')
}

gbi.widgets.PointStyleEditor.template = '\
<h3>'+pointLabel.point+'</h3>\
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
    </div>\
    <button id="savePointStyle" class="btn btn-small">'+pointLabel.saveStyling+'</button>\
</form>\
';
