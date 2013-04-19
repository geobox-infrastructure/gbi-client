gbi.widgets = gbi.widgets || {};

gbi.widgets.StyleEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'style-editor'
    };

    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);

    this.stylingLayer = this.layerManager.active();

    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        if(layer !== undefined) {
            self.stylingLayer = layer;
        } else {
            self.stylingLayer = false;
        }
        self.render();
    });

    this.render();
};
gbi.widgets.StyleEditor.prototype = {


    render: function() {
        var self = this;
        this.element.empty();

        if (!self.stylingLayer) {
            return false;
        }
        this.element.append(tmpl(gbi.widgets.StyleEditor.template, {symbolizers: this.stylingLayer.symbolizers}));

        $('.color_picker').each(function() {
            $(this).minicolors({
                'value': $(this).val(),
                change: function() {
                    self.setStyle();
                }
            });
        });

        var sliderOpts = {
            range: [0, 100],
            start: 100,
            step: 1,
            handles: 1,
            slide: function() {
                self.setStyle();
            }
        }

        $('.noUiSlider').each(function() {
            $(this).noUiSlider(
                $.extend(sliderOpts, {serialization: {to: $(this).prev()}}));
        });

        if(this.stylingLayer.symbolizers) {
            $.each(this.stylingLayer.symbolizers, function(type, style) {
                if (!type.match(/^_/)) {
                    $.each(style, function(key, value) {
                        var cssClass = '.' + type.toLowerCase() + '_' + key;
                        if (key.match('Opacity')) {
                            value = value * 100;
                            $(cssClass+".noUiSlider").val(value);
                        }

                        $(cssClass).val(value);
                    });
                }
            });
        }

        $(".styleControl").keyup(function() {
            self.setStyle();
        }).change(function() {
            self.setStyle();
        });

        $('#saveStyle').click(function() {
            self.saveStyle();
            return false;
        });
    },

    setStyle: function() {
        var self = this;
        var symbolizers = {};
        var point = {};
        $.each(['.point_pointRadius', '.point_strokeWidth', '.point_strokeOpacity', '.point_strokeColor', '.point_fillOpacity', '.point_fillColor'], function(idx, id) {
            self._setStyleProperty(id, point);
        });
        var line = {};
        $.each(['.line_strokeWidth', '.line_strokeOpacity', '.line_strokeColor'], function(idx, id) {
            self._setStyleProperty(id, line);
        });
        var polygon = {};
        $.each(['.polygon_strokeWidth', '.polygon_strokeOpacity', '.polygon_strokeColor', '.polygon_fillOpacity', '.polygon_fillColor'], function(idx, id) {
            self._setStyleProperty(id, polygon);
        });

        if(Object.keys(point).length > 0) {
            symbolizers["Point"] = point;
        }
        if(Object.keys(line).length > 0) {
            symbolizers["Line"] = line;
        }
        if(Object.keys(polygon).length > 0) {
            symbolizers["Polygon"] = polygon;
        }
        if(Object.keys(symbolizers).length > 0) {
            this.stylingLayer.setStyle(symbolizers);
        }
        return this.stylingLayer;
    },

    saveStyle: function() {
        var stylingLayer = this.setStyle();

        if(this.stylingLayer instanceof gbi.Layers.Couch) {
           this.stylingLayer._saveStyle();
        }
    },

    _setStyleProperty: function(id, obj) {
        var value = $(id).val();
        if(value) {
            value = id.match('Color') ? value : parseFloat(value);
            value = id.match('Opacity') ? value / 100 : value;
            obj[id.split('_')[1]] = value;
        }
    }
};

var styleLabel = {
    'line': OpenLayers.i18n('line'),
    'polygon': OpenLayers.i18n('polygon'),
    'strokeColor': OpenLayers.i18n('strokeColor'),
    'strokeWidth': OpenLayers.i18n('strokeWidth'),
    'fillColor': OpenLayers.i18n('fillColor'),
    'fillOpacity': OpenLayers.i18n('fillOpacity'),
    'saveStyling':  OpenLayers.i18n('saveStyling')
}

gbi.widgets.StyleEditor.template = '\
<h3>'+styleLabel.line+'</h3>\
<form class="form-horizontal"> \
     <div class="control-group">\
        <label for="line_strokeWidth" class="control-label">'+styleLabel.strokeWidth + ':</label>\
         <div class="controls"> \
            <input type="text" id="line_strokeWidth" class="line_strokeWidth styleControl input-small" />\
        </div>\
    </div>\
    <div class="control-group">\
        <label for="line_strokeColor" class="control-label">'+styleLabel.strokeColor+':</label>\
        <div class="controls"> \
            <input class="color_picker line_strokeColor styleControl input-small" value="<%=symbolizers.Line.strokeColor%>"/>\
        </div>\
    </div>\
    </div>\
    <hr> \
    <h3>'+styleLabel.polygon+'</h3>\
    <div class="control-group">\
        <label for="polygon_strokeWidth" class="control-label">'+styleLabel.strokeWidth+':</label>\
        <div class="controls"> \
            <input id="polygon_strokeWidth" class="polygon_strokeWidth styleControl input-small" />\
        </div>\
    </div>\
    <div class="control-group">\
        <label for="polygon_strokeColor" class="control-label">'+styleLabel.strokeColor+':</label>\
        <div class="controls"> \
            <input id="polygon_strokeColor" class="color_picker polygon_strokeColor styleControl input-small" value="<%=symbolizers.Polygon.strokeColor%>" />\
        </div>\
   </div>\
   <div class="control-group">\
        <label for="polygon_fillColor" class="control-label">'+styleLabel.fillColor+':</label>\
        <div class="controls"> \
            <input id="polygon_fillColor" class="color_picker polygon_fillColor styleControl input-small" value="<%=symbolizers.Polygon.fillColor %>" />\
        </div>\
    </div>\
    <div class="control-group">\
        <label for="polygon_fillOpacity" class="control-label">'+styleLabel.fillOpacity+':</label>\
        <div class="controls"> \
            <input id="polygon_fillOpacity" class="polygon_fillOpacity styleControl input-small" />\
            <div class="noUiSlider polygon_fillOpacity"></div>\
        </div> \
    </div>\
    <hr> \
    <button id="saveStyle" class="btn btn-small btn-success">'+styleLabel.saveStyling+'</button>\
</form>\
';
