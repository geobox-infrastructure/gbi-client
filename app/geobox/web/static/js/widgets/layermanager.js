var layerManagerLabel = {
    'activeLayer': OpenLayers.i18n("activeLayer"),
    'background': OpenLayers.i18n("backgroundTitle"),
    'raster': OpenLayers.i18n("rasterLayerTitle"),
    'vector': OpenLayers.i18n("vectorLayerTitle"),
    'addLayer': OpenLayers.i18n("addvectorLayerButton"),
    'noActiveLayer': OpenLayers.i18n("noActiveLayer"),
    'invalidLayerName': OpenLayers.i18n("Given layer name is invalid"),
    'up': OpenLayers.i18n('Layer up'),
    'down': OpenLayers.i18n('Layer down'),
    'dataExtent': OpenLayers.i18n('Zoom to layer extent'),
    'remove': OpenLayers.i18n('Remove layer')
}

gbi.widgets = gbi.widgets || {};

gbi.widgets.LayerManager = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'layermanager',
        showActiveLayer: true,
        tiny: false
    };

    this.editor = editor;
    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);

    if(this.options.tiny) {
        this.element = $('<div></div>');
        this.element.addClass('gbi_widgets_LayerManager');
    } else {
        this.element = $('#' + this.options.element);
    }

    // add active layer
    if(this.options.showActiveLayer) {
        this.activeLayerDIV = $('<div id="layermanager_active_layer" class="label label-success">'+layerManagerLabel.activeLayer+': <span></span></div>');
        $('.olMapViewport').append(this.activeLayerDIV);
    }

    this.render();

    if(this.options.tiny) {
        $('.olMapViewport').append(this.element);
    }

    $(gbi).on('gbi.layermanager.layer.remove', function(event, layer) {
         self.render();
    });

    $(gbi).on('gbi.layermanager.layer.add', function(event, layer) {
         self.render();
    });

    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        if (layer === undefined) {
            $('#layermanager_active_layer > span').html(layerManagerLabel.noActiveLayer);
        }
        self.render();
    });
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
                    if (gbiLayer.isActive) {
                        if (self.options.showActiveLayer) {
                            $('#layermanager_active_layer > span').html(gbiLayer.options.title);
                        }
                    }
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
        if (!this.layerManager.active()) {
            $('#layermanager_active_layer > span').html(layerManagerLabel.noActiveLayer);
        }

        if (!accordion) {
            accordion = 'collapseVector';
        }

        var template = this.options.tiny ? gbi.widgets.LayerManager.templates.tiny : gbi.widgets.LayerManager.templates.normal;

        this.element.append(tmpl(template, {
            backgroundLayers: backgroundLayers,
            rasterLayers: rasterLayers,
            vectorLayers: vectorLayers,
            accordion: accordion,
            self: this}));

        //bind events
        $.each(layers, function(idx, layer) {
            self.element.find('#visible_' + layer.id)
                .prop('checked', layer.visible())
                .click(function(e) {
                    var status = $(this).prop("checked");
                    layer.visible(status);
                    e.stopPropagation()

                });

            self.element.find('#up_' + layer.id).click(function() {
                if(self.layerManager.up(layer)) {
                self.render(self.findAccordion(this));
                }
                return false;
            });
            self.element.find('#down_' + layer.id).click(function() {
               if(self.layerManager.down(layer)) {
                self.render(self.findAccordion(this));
                }
                return false;
            });
            self.element.find('#data_extent_' + layer.id).click(function(e) {
                layer.visible(true)
                var extent = layer.olLayer.getDataExtent();
                if (extent) {
                    self.editor.map.olMap.zoomToExtent(extent);
                }
                self.render(self.findAccordion(this));
                return false;
            });
            self.element.find('#remove_' + layer.id).click(function() {
                var element = this;
                var activeLayer = layer;

                $('#deleteVectorLayer #layer_title').html(activeLayer.options.title)
                $('#deleteVectorLayer').modal('show');

                $('#remove_layer').click(function() {
                    self.layerManager.removeLayer(activeLayer);
                    $('#deleteVectorLayer').modal('hide');
                    self.render(self.findAccordion(element));
                });
                $('#deleteVectorLayer').on('hidden', function () {
                    $('#remove_layer').off('click');
                    $('#deleteVectorLayer').off('hidden');
                })
                return false;
            });
        });

        this.element.find('.vectorLayer').click(function() {
            var clickedElement = this;
            var activeLayer = self.layerManager.active();
            if(activeLayer && jQuery.isFunction(activeLayer.unsavedChanges) && activeLayer.unsavedChanges()) {
                $('#changeVectorLayer').modal('show');
                $('#change_layer_save').click(function() {
                    activeLayer.save();
                    activeLayer._saveMetaDocument();
                    $('#changeVectorLayer').modal('hide');
                    changeLayer(clickedElement);
                });
                $('#change_layer_discard').click(function() {
                    activeLayer.refresh();
                    $('#changeVectorLayer').modal('hide');
                    changeLayer(clickedElement);
                });
                $('#changeVectorLayer').on('hidden', function () {
                    $('#change_layer_save').off('click');
                    $('#change_layer_discard').off('click');
                    $('#changeVectorLayer').off('hidden');
                })
            } else {
                changeLayer(clickedElement);
            }
        });

        function changeLayer(clickedElement) {
            var id = parseInt($(clickedElement).attr('id'));
            var layer = self.layerManager.layerById(id);
            self.layerManager.active(layer);
            layer.visible(true);
            self.render(self.findAccordion(clickedElement));
        }

        this.element.find('#add_vector_layer').click(function() {
            var newLayer = $('#new_vector_layer').val();
            if(newLayer) {
                var activeLayer = self.layerManager.active();
                if(activeLayer && activeLayer.unsavedChanges()) {
                    $('#changeVectorLayer').modal('show');
                    $('#change_layer_save').click(function() {
                        activeLayer.save();
                        activeLayer._saveMetaDocument();
                        $('#changeVectorLayer').modal('hide');
                        createLayer(newLayer);
                    });
                    $('#change_layer_discard').click(function() {
                        activeLayer.refresh();
                        $('#changeVectorLayer').modal('hide');
                        createLayer(newLayer);
                    });
                    $('#changeVectorLayer').on('hidden', function () {
                        $('#change_layer_save').off('click');
                        $('#change_layer_discard').off('click');
                        $('#changeVectorLayer').off('hidden');
                    })
                } else {
                    createLayer(newLayer);
                }
            } else {
                $('#invalid_layer_name').show().fadeOut(3000);
            }
        });

        function createLayer(title) {
            var newLayer = title.replace(/[^a-z0-9_]*/g, '');
            var newLayer_name = 'local_vector_'+ newLayer;
            var couchLayer = new gbi.Layers.Couch({
                name: newLayer_name,
                title: title,
                url: OpenlayersCouchURL,
                hoverPopup: true,
                callbacks: {
                    changes: function(unsavedChanges) {
                        if(unsavedChanges)
                            $('#save_changes').removeAttr('disabled').addClass('btn-success');
                         else
                            $('#save_changes').attr('disabled', 'disabled').removeClass('btn-success');;
                    }
                }
            });
            if (!couchLayer.couchExists) {
                self.layerManager.addLayer(couchLayer);
                self.layerManager.active(couchLayer);
                self.render(self.findAccordion(this));
                var addSuccessful = OpenLayers.i18n("addLayerSuccessful");
                $("#help_text").attr('class','alert alert-success').html(addSuccessful).show().fadeOut(6000);
            } else {
                var notPossible = OpenLayers.i18n("notPossible")
                $("#help_text").attr('class','alert alert-error').html(notPossible).show().fadeOut(6000);
                delete couchLayer;
            }
        }

        if(this.options.tiny) {
            this.element.find('.gbi_widgets_LayerManager_Minimize').click(function(event) {
                event.stopPropagation();
                self.element.find('.gbi_widgets_LayerManager_LayerSwitcher').hide();
                self.element.find('.gbi_widgets_LayerManager_Minimize').hide();
                self.element.find('.gbi_widgets_LayerManager_Maximize').show();
            }).show();
            this.element.find('.gbi_widgets_LayerManager_Maximize').click(function(event) {
                event.stopPropagation();
                self.element.find('.gbi_widgets_LayerManager_LayerSwitcher').show();
                self.element.find('.gbi_widgets_LayerManager_Minimize').show();
                self.element.find('.gbi_widgets_LayerManager_Maximize').hide();
            }).hide();
        }

    },
    findAccordion: function(element) {
       var accordion = $(element).closest('.accordion-body ');
       return $(accordion).attr('id');
    }
};

gbi.widgets.LayerManager.templates = {
 normal: '\
 <div class="accordion" id="accordion2">\
    <div class="accordion-group">\
        <div class="accordion-heading">\
            <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#collapseBackground">\
             '+layerManagerLabel.background+'\
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
                            <button id="up_<%=backgroundLayers[i].id%>" class="btn btn-small" title="' + layerManagerLabel.up + '">\
                                <i class="icon-chevron-up"></i>\
                            </button> \
                            <button id="down_<%=backgroundLayers[i].id%>" class="btn btn-small" title="' + layerManagerLabel.down + '"> \
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
             '+layerManagerLabel.raster+'\
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
                            <button id="up_<%=rasterLayers[i].id%>" class="btn btn-small" title="' + layerManagerLabel.up + '">\
                                <i class="icon-chevron-up"></i>\
                            </button> \
                            <button id="down_<%=rasterLayers[i].id%>" class="btn btn-small" title="' + layerManagerLabel.down + '"> \
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
             '+layerManagerLabel.vector+'\
            </a>\
        </div>\
        <div id="collapseVector" class="accordion-body collapse <% if(accordion == "collapseVector") { %> in <% } %>">\
            <div class="accordion-inner"><ul class="nav nav-pills nav-stacked">\
                <% for(var i=0; i<vectorLayers.length; i++) { %>\
                    <li class="layerElement <% if(vectorLayers[i].isActive) { %> active <% } %>">\
                    <a href="#" class="vectorLayer" id="<%=vectorLayers[i].id%> "> \
                        <span class="inline">\
                            <input type="checkbox" id="visible_<%=vectorLayers[i].id%>" />\
                            <%=vectorLayers[i].olLayer.title%> \
                        </span><br>\
                        <div class="btn-group controls"> \
                            <button id="up_<%=vectorLayers[i].id%>" title="' + layerManagerLabel.up + '" class="btn btn-small">\
                                <i class="icon-chevron-up"></i>\
                            </button> \
                            <button id="down_<%=vectorLayers[i].id%>" title="' + layerManagerLabel.down + '" class="btn btn-small"> \
                                <i class="icon-chevron-down"></i>\
                            </button> \
                            <button id="data_extent_<%=vectorLayers[i].id%>" title="' + layerManagerLabel.dataExtent + '" class="btn btn-small"> \
                                <i class="icon-search"></i>\
                            </button> \
                            <button id="remove_<%=vectorLayers[i].id%>" title="' + layerManagerLabel.remove+ '" class="btn btn-small"> \
                                <i class="icon-remove"></i>\
                            </button> \
                        </div> \
                        </a>\
                    </li>\
                <% } %>\
            </ul> \
            <div class="alert alert-error" style="display: none" id="invalid_layer_name">'+layerManagerLabel.invalidLayerName+'</div>\
            <div class="input-append"> \
                <input class="span5" id="new_vector_layer" name="new_vector_layer" type="text"> \
                <button class="btn" id="add_vector_layer" type="button">'+layerManagerLabel.addLayer+'</button> \
            </div> \
            <div id="help_text"></div> \
        </div>\
    </div> \
</div> \
',
tiny: '\
        <div class="gbi_widgets_LayerManager_Maximize"></div>\
        <div class="gbi_widgets_LayerManager_Minimize"></div>\
        <div class="gbi_widgets_LayerManager_LayerSwitcher">\
            <h5>'+layerManagerLabel.background+'\</h5>\
            <ul>\
                <% for(var i=0; i<backgroundLayers.length; i++) { %>\
                    <li class="gbi_layer">\
                        <input type="checkbox" id="visible_<%=backgroundLayers[i].id%>" />\
                        <span><%=backgroundLayers[i].olLayer.name%></span>\
                            <div class="btn-group"> \
                                <button id="up_<%=backgroundLayers[i].id%>" title="up" class="btn btn-mini">\
                                    <i class="icon-chevron-up"></i>\
                                </button> \
                                <button id="down_<%=backgroundLayers[i].id%>" title="down" class="btn btn-mini"> \
                                    <i class="icon-chevron-down"></i>\
                                </button> \
                            </div> \
                    </li>\
                <% } %>\
            </ul>\
            <% if(rasterLayers.length != 0) { %> \
                <h5>'+layerManagerLabel.raster+'\</h5>\
                <ul>\
                    <% for(var i=0; i<rasterLayers.length; i++) { %>\
                        <li class="gbi_layer">\
                            <input type="checkbox" id="visible_<%=rasterLayers[i].id%>" />\
                            <span><%=rasterLayers[i].olLayer.name%></span>\
                            <div class="btn-group"> \
                                <button id="up_<%=rasterLayers[i].id%>" title="up" class="btn btn-mini">\
                                    <i class="icon-chevron-up"></i>\
                                </button> \
                                <button id="down_<%=rasterLayers[i].id%>" title="down" class="btn btn-mini"> \
                                    <i class="icon-chevron-down"></i>\
                                </button> \
                            </div> \
                        </li>\
                    <% } %>\
                </ul>\
                <% } %> \
            <% if(vectorLayers.length != 0) { %> \
                <h5>'+layerManagerLabel.vector+'\</h5>\
                <ul>\
                    <% for(var i=0; i<vectorLayers.length; i++) { %>\
                        <li class="gbi_layer">\
                            <input type="checkbox" id="visible_<%=vectorLayers[i].id%>" />\
                            <span><%=vectorLayers[i].olLayer.name%></span>\
                            <div class="btn-group"> \
                                <button id="up_<%=vectorLayers[i].id%>" title="up" class="btn btn-mini">\
                                    <i class="icon-chevron-up"></i>\
                                </button> \
                                <button id="down_<%=vectorLayers[i].id%>" title="down" class="btn btn-mini"> \
                                    <i class="icon-chevron-down"></i>\
                                </button> \
                            </div> \
                        </li>\
                    <% } %>\
                </ul>\
            <% } %> \
        </div>\
    '
};