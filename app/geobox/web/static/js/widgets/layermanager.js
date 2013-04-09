gbi.widgets = gbi.widgets || {};

gbi.widgets.LayerManager = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'layermanager'
    };

    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);

    this.render();
};
gbi.widgets.LayerManager.prototype = {
    render: function(accordion) {
        var self = this;
        this.element.empty();
        var layers = [];
        var rasterLayers = [];
        var backgroundLayers = [];
        var vectorLayers = [];

        $.each(this.layerManager.layers(), function(idx, gbiLayer) {
            if(gbiLayer.options.displayInLayerSwitcher) {
                if (gbiLayer.isVector) {
                    vectorLayers.push(gbiLayer);
                }

                if (gbiLayer.isRaster && gbiLayer.isBackground) {
                    backgroundLayers.push(gbiLayer);
                }

                if (gbiLayer.isRaster && !gbiLayer.isBackground) {
                    rasterLayers.push(gbiLayer);
                }
                layers.push(gbiLayer);
            }
        });
        if (!accordion) {
            accordion = 'collapseBackground';
        }
        this.element.append(tmpl(gbi.widgets.LayerManager.template, {
            backgroundLayers: backgroundLayers,
            rasterLayers: rasterLayers,
            vectorLayers: vectorLayers,
            accordion: accordion,
            self: this}));

        //bind events
        $.each(layers, function(idx, layer) {
            self.element.find('#visible_' + layer.id)
                .prop('checked', layer.visible())
                .change(function() {
                    layer.visible($(this).prop('checked'));
                });
            self.element.find('#up_' + layer.id).click(function() {
                if(self.layerManager.up(layer)) {
                self.render(self.findAccordion(this));
                }
            });
            self.element.find('#down_' + layer.id).click(function() {
               if(self.layerManager.down(layer)) {
                self.render(self.findAccordion(this));
                }
            });
            self.element.find('#remove_' + layer.id).click(function() {
                self.layerManager.removeLayer(layer);
                self.render(self.findAccordion(this));
            });
        });

        // this.setActiveLayer(this.layerManager.active());

        this.element.find('.vectorLayer').click(function() {
            var id = parseInt($(this).attr('id'));
            var layer = self.layerManager.layerById(id);
            self.layerManager.active(layer);
            self.render(self.findAccordion(this));
        });

        this.element.find('#add_vector_layer').click(function() {
            var newLayer = $('#new_vector_layer').val();
            if(newLayer) {
                var vectorLayer = new gbi.Layers.Vector({name: newLayer});
                self.layerManager.addLayer(vectorLayer);
                self.render(self.findAccordion(this));
            }
        });

    },
    findAccordion: function(element) {
       var accordion = $(element).closest('.accordion-body ');
       return $(accordion).attr('id');
    },
    setActiveLayer: function(layer) {
        if(layer) {
            this.element.find('input:radio').removeProp('checked');
            this.element.find('#active_' + layer.id).prop('checked', 'checked');
        }
    }
};
gbi.widgets.LayerManager.template = '\
<div class="accordion" id="accordion2">\
    <div class="accordion-group">\
        <div class="accordion-heading">\
            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#collapseBackground">\
                Hintergrundlayer\
            </a>\
        </div>\
        <div id="collapseBackground" class="accordion-body collapse <% if(accordion == "collapseBackground") { %> in <% } %>">\
            <div class="accordion-inner"><ul class="nav nav-pills nav-stacked">\
                <% for(var i=0; i<backgroundLayers.length; i++) { %>\
                    <li class="layerElement">\
                        <label class="inline" for="visible_<%=backgroundLayers[i].id%>">\
                            <input type="checkbox" id="visible_<%=backgroundLayers[i].id%>" />\
                            <%=backgroundLayers[i].olLayer.name%> \
                        </label>\
                        <div class="btn-group pull-right"> \
                            <button id="up_<%=backgroundLayers[i].id%>" class="btn btn-small">\
                                <i class="icon-chevron-up"></i>\
                            </button> \
                            <button id="down_<%=backgroundLayers[i].id%>" class="btn btn-small"> \
                                <i class="icon-chevron-down"></i>\
                            </button> \
                        </div> \
                    </li>\
                <% } %>\
            </ul></div>\
        </div>\
    </div>\
    <div class="accordion-group">\
        <div class="accordion-heading">\
            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#collapseRaster">\
                Rasterlayer\
            </a>\
        </div>\
        <div id="collapseRaster" class="accordion-body collapse <% if(accordion == "collapseRaster") { %> in <% } %> ">\
            <div class="accordion-inner"><ul class="nav nav-pills nav-stacked">\
                <% for(var i=0; i<rasterLayers.length; i++) { %>\
                    <li class="layerElement">\
                        <label class="inline" for="visible_<%=rasterLayers[i].id%>">\
                            <input type="checkbox" id="visible_<%=rasterLayers[i].id%>" />\
                            <%=rasterLayers[i].olLayer.name%> \
                        </label>\
                        <div class="btn-group pull-right"> \
                            <button id="up_<%=rasterLayers[i].id%>" class="btn btn-small">\
                                <i class="icon-chevron-up"></i>\
                            </button> \
                            <button id="down_<%=rasterLayers[i].id%>" class="btn btn-small"> \
                                <i class="icon-chevron-down"></i>\
                            </button> \
                        </div> \
                    </li>\
                <% } %>\
            </ul></div>\
        </div>\
    </div>\
    <div class="accordion-group">\
        <div class="accordion-heading">\
            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#collapseVector">\
                Vektorlayer\
            </a>\
        </div>\
        <div id="collapseVector" class="accordion-body collapse <% if(accordion == "collapseVector") { %> in <% } %>">\
            <div class="accordion-inner"><ul class="nav nav-pills nav-stacked">\
                <% for(var i=0; i<vectorLayers.length; i++) { %>\
                    <li class="layerElement <% if(vectorLayers[i].isActive) { %> active <% } %>">\
                    <a href="#" class="vectorLayer" id="<%=vectorLayers[i].id%> "> \
                        <span class="inline">\
                            <input type="checkbox" id="visible_<%=vectorLayers[i].id%>" />\
                            <%=vectorLayers[i].olLayer.name%> \
                        </span><br>\
                        <div class="btn-group controls"> \
                            <button id="up_<%=vectorLayers[i].id%>" class="btn btn-small">\
                                <i class="icon-chevron-up"></i>\
                            </button> \
                            <button id="down_<%=vectorLayers[i].id%>" class="btn btn-small"> \
                                <i class="icon-chevron-down"></i>\
                            </button> \
                            <button id="remove_<%=vectorLayers[i].id%>" class="btn btn-small"> \
                                <i class="icon-remove"></i>\
                            </button> \
                        </div> \
                        </a>\
                    </li>\
                <% } %>\
            </ul> \
            <div class="input-append"> \
                <input class="span5" id="new_vector_layer" name="new_vector_layer" type="text"> \
                <button class="btn" id="add_vector_layer" type="button">Add Vector Layer</button> \
            </div> \
        </div>\
    </div> \
</div> \
';
