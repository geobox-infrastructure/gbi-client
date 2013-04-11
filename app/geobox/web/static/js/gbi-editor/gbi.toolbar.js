gbi.Toolbar = function(editor, options) {
    var self = this;
    var defaults = {
        'displayClass': 'customEditingToolbar',
        'allowDepress': true,
        tools: {
            select: true,
            drawPolygon: true,
            drawRect: false,
            drawLine: false,
            drawPoint: false,
            edit: true,
            delete: true,
            merge: false,
            split: false
        }
    };
    this.multiLayerControls = [];
    this.singleLayerControls = [];
    this.vectorLayers = {};
    $.each(editor.layerManager.vectorLayers, function(idx, layer) {
        if(layer.isEditable) {
            self.vectorLayers[idx] = layer;
        }
    });
    var _activeLayer = editor.layerManager.active() || null;
    this.vectorActive = (_activeLayer && _activeLayer.isEditable) ? _activeLayer : null;

    this.options = $.extend({}, defaults, options);
    this.tools = this.options.tools;
    delete this.options.tools;

    if(this.options.element) {
        var element = $('#'+this.options.element);
        element.addClass(this.options.displayClass);

        this.options.div = element[0];
        delete this.options.element;
    }

    this.olControl = new OpenLayers.Control.Panel(this.options);

    this.initTools();

    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        if(layer === undefined) {
            self.deactivateAllControls();
        }
        self.vectorActive = layer;
        self.activeLayer(layer);
    });
    $(gbi).on('gbi.layermanager.vectorlayer.add', function(event, layer) {
        self.addControlLayer(layer);
    });
    $(gbi).on('gbi.layermanager.vectorlayer.remove', function(event, layer) {
        self.removeControlLayer(layer);
    });

    editor.addControls([this]);
};
gbi.Toolbar.prototype = {
    CLASS_NAME: 'gbi.Toolbar',
    initTools: function() {
        var self = this;
        var toolbarControls = [];
        $.each(this.tools, function(type, available) {
            if(available) {
                var newTool = false;
                switch(type) {
                    case 'drawPolygon':
                        newTool = self.drawPolygon = new gbi.Controls.Draw(self.vectorActive, {drawType: gbi.Controls.Draw.TYPE_POLYGON});
                        break;
                    case 'drawRect':
                        newTool = self.drawPolygon = new gbi.Controls.Draw(self.vectorActive, {drawType: gbi.Controls.Draw.TYPE_RECT});
                        break;
                    case 'drawLine':
                        newTool = self.drawPolygon = new gbi.Controls.Draw(self.vectorActive, {drawType: gbi.Controls.Draw.TYPE_LINE});
                        break;
                    case 'drawPoint':
                        newTool = self.drawPolygon = new gbi.Controls.Draw(self.vectorActive, {drawType: gbi.Controls.Draw.TYPE_POINT});
                        break;
                    case 'edit':
                        newTool = self.edit = new gbi.Controls.Edit(self.vectorActive);
                        if(self.delete) {
                            self.delete.setModifyControl(self.edit.olControl);
                        }
                        break;
                    case 'delete':
                        var options = {};
                        if(self.select) {
                            $.extend(options, {selectControl: self.select.olControl});
                        }
                        if(self.edit) {
                            $.extend(options, {modifyControl: self.edit.olControl});
                        }
                        newTool = self.delete = new gbi.Controls.Delete(self.vectorActive, options);
                        break;
                    case 'select':
                        newTool = self.select = new gbi.Controls.Select(self.vectorLayers);
                        if(self.delete) {
                            self.delete.setSelectControl(self.select.olControl);
                        }
                        break;
                    case 'merge':
                        newTool = self.merge = new gbi.Controls.Merge(self.vectorActive);
                        break;
                    case 'split':
                        newTool = self.split = new gbi.Controls.Split(self.vectorActive);
                        break;
                }
                if(newTool) {
                    toolbarControls.push(newTool);
                }
            }
        });
        this.addControls(toolbarControls);

    },
    activeLayer: function(layer) {
        if(layer === undefined || layer.isEditable) {
            var self = this;
            $.each(this.singleLayerControls, function(idx, control) {
                control.changeLayer(layer);
            });
            if(this.delete && this.edit && this.delete.olControl instanceof OpenLayers.Control.DeleteFeature) {
                this.delete.olControl.setModifyControl(this.edit.olControl);
            }
            this.olControl.redraw();
        }
    },
    addControlLayer: function(layer) {
        if(layer.isEditable) {
            var self = this;
            $.each(this.multiLayerControls, function(idx, control) {
                if($.isFunction(control.addLayer)) {
                    control.addLayer(layer);
                }
            });
            this.olControl.redraw();
        }
    },
    removeControlLayer: function(layer) {
        if(layer.isEditable) {
            $.each(this.multiLayerControls, function(idx, control) {
                if($.isFunction(control.removeLayer)) {
                    control.removeLayer(layer);
                }
            });
        }
    },
    addControl: function(control) {
        if(control instanceof gbi.Controls.MultiLayerControl) {
            this.multiLayerControls.push(control);
        } else {
            this.singleLayerControls.push(control);
        }
        control.olToolbar = this.olControl;
        this.olControl.addControls([control.olControl]);
    },
    addControls: function(controls) {
        var self = this;
        $.each(controls, function(idx, control) {
            self.addControl(control);
        });
    },
    deactivateAllControls: function() {
        var self = this;
        $.each(this.multiLayerControls.concat(this.singleLayerControls), function(idx, control) {
            if(control.active()) {
                control.deactivate();
            }
        });
    }
};