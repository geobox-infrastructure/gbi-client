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
        this.element.append(tmpl(gbi.widgets.StyleEditor.template, {symbolizer: this.stylingLayer.symbolizers}));

        $('.color_picker').each(function() {
            $(this).minicolors().minicolors('value', $(this).val());
        });

        var sliderOpts = {
            range: [0, 100],
            start: 100,
            step: 1,
            handles: 1
        }

        $('.noUiSlider').each(function() {
            $(this).noUiSlider($.extend(sliderOpts, {serialization: {to: $(this).prev()}}));
        });

        if(this.stylingLayer.symbolizers) {
            $.each(this.stylingLayer.symbolizers, function(type, style) {
                if(!type.startsWith('_')) {
                    $.each(style, function(key, value) {
                        var cssClass = '.' + type.toLowerCase() + '_' + key;

                        if (key.endsWith('Color')) {
                            $(cssClass).minicolors('value', value);
                        }
                        if (key.endsWith('Opacity')) {
                            value = value * 100;
                            $(cssClass+".noUiSlider").val(value);
                        }

                        $(cssClass).val(value);
                    });
                }
            });
        }

        $('#set_style').click(function() {
            self.setStyle();
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
            if(this.stylingLayer instanceof gbi.Layers.Couch) {
                this.stylingLayer._saveStyle();
            }
        }
    },
    _setStyleProperty: function(id, obj) {
        var value = $(id).val();
        if(value) {
            value = id.endsWith('Color') ? value : parseFloat(value);
            value = id.endsWith('Opacity') ? value / 100 : value;
            obj[id.split('_')[1]] = value;
        }
    }
};
gbi.widgets.StyleEditor.template = '\
<h3>Line</h3>\
<div>\
    <label for="line_strokeWidth">Stroke width:</label><input id="line_strokeWidth" class="line_strokeWidth" />\
</div>\
<div>\
    <label for="line_strokeColor">Stroke color:</label>\
    <input class="color_picker line_strokeColor"/>\
</div>\
</div>\
<h3>Polygon</h3>\
<div>\
    <label for="polygon_strokeWidth">Stroke width:</label>\
    <input id="polygon_strokeWidth" class="polygon_strokeWidth" />\
</div>\
<div>\
    <label for="polygon_strokeColor">Stroke color:</label>\
    <input id="polygon_strokeColor" class="color_picker polygon_strokeColor"/>\
</div>\
<div>\
    <label for="polygon_fillColor">Fill color:</label>\
    <input id="polygon_fillColor" class="color_picker polygon_fillColor"/>\
</div>\
<div>\
    <label for="polygon_fillOpacity">Fill opacity:</label>\
    <input id="polygon_fillOpacity" class="polygon_fillOpacity" />\
    <div class="noUiSlider polygon_fillOpacity"></div>\
</div>\
<button id="set_style">Style layer</button>\
';
