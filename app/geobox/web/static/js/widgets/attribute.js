gbi.widgets = gbi.widgets || {};

gbi.widgets.AttributeEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'attributemanager'
    };
    this.keyIDs = {};
    this.keyCounter = 0;
    this.featuresAttributes = {};
    this.newAttributes = {};
    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.selectedFeatures = [];
    this.changed = false;
    this.editable = false;

    this.registerEvents();

    $(gbi).on('gbi.layermanager.layer.add', function(event, layer) {
       self.registerEvents();
    });
};

gbi.widgets.AttributeEditor.prototype = {
    CLASS_NAME: 'gbi.widgets.AttributeEditor',

    registerEvents: function() {
        var self = this;
        $.each(self.layerManager.vectorLayers, function(idx, layer) {
            layer.registerEvent('featureselected', self, function(f) {
                self.selectedFeatures.push(f.feature);
                self._attributes(f.feature);
                $('#attributeTab').tab('show');
            });
            layer.registerEvent('featureunselected', self, function(f) {
                var idx = $.inArray(f.feature, self.selectedFeatures);
                if(idx != -1) {
                    self.selectedFeatures.splice(idx, 1);
                    self._attributes(false);
                }
            });
        });
    },
    render: function() {
        var self = this;
        this.element.empty();
        var attributes = $.extend({}, this.featuresAttributes, this.newAttributes);
        if(this.selectedFeatures.length > 0) {
            this.element.append(tmpl(
                gbi.widgets.AttributeEditor.template, {
                 attributes: attributes,
                 editable: this.editable,
                 keyIDs: this.keyIDs}
            ));

            //bind events
            $.each(attributes, function(key, value) {
                $('#_'+self.keyIDs[key]).change(function() {
                    var newVal = $('#_'+self.keyIDs[key]).val();
                    self.edit(key, newVal);
                });
                $('#_'+self.keyIDs[key]+'_remove').click(function() {
                    self.remove(key);
                    return false;
                });
            });
            $('#addKeyValue').click(function() {
                var key = $('#_newKey').val();
                var val = $('#_newValue').val();
                if (key && val) {
                    self.add(key, val);
                    self._applyAttributes();
                }
                return false;
            });
        }
    },
    add: function(key, value) {
        if(!this.newAttributes[key] && !this.featuresAttributes[key]) {
            this.newAttributes[key] = value;
            this.keyIDs[key] = this.keyCounter++;
            this.changed = true;
            this.render();
        }
    },
    edit: function(key, value) {
        this.featuresAttributes[key] = value;
        this.newAttributes[key] = value;
        this.changed = true;
        this._applyAttributes();
        this.render();
    },
    remove: function(key) {
        delete this.featuresAttributes[key];
        delete this.newAttributes[key];
        delete this.keyIDs[key];
        this.changed = true;
        this._applyAttributes();
        this.render();
    },
    _applyAttributes: function() {
        var self = this;
        $.each(this.selectedFeatures, function(idx, feature) {
            if (feature) {
                feature.attributes = $.extend({}, self.featuresAttributes, self.newAttributes);
                var gbiLayer = self.layerManager.layerById(feature.layer.gbiId);
                if(gbiLayer instanceof gbi.Layers.SaveableVector) {
                    if(feature.state != OpenLayers.State.INSERT) {
                        feature.state = OpenLayers.State.UPDATE;
                    }
                    gbiLayer.changesMade();
                }
            }
        });
    },

    _attributes: function(feature) {
        var self = this;
        this.element.empty();
        this.featuresAttributes = {};
        var newFeatureAttributes = false;

        if (feature) {
            var featureLayer = feature.layer;
            var activeLayer = this.layerManager.active();
            if (featureLayer == activeLayer.olLayer) {
                this.editable = true;
            } else {
                this.editable = false;
            }
        }

        if(this.selectedFeatures.length == 0) {
            this.attributeLayers = null;
            this.newAttributes = {};
            this.changed = false;
        } else {
            $.each(this.selectedFeatures, function(idx, feature) {
                $.each(feature.attributes, function(key, value) {
                    if(!(key in self.featuresAttributes)) {
                        self.featuresAttributes[key] = value;
                        self.keyIDs[key] = self.keyCounter++;
                        if(idx>0) {
                            newFeatureAttributes = true;
                        }
                    }
                });
                if(!newFeatureAttributes) {
                    $.each(self.featuresAttributes, function(key, value) {
                        if(!(key in feature.attributes)) {
                            newFeatureAttributes = true;
                        }
                    });
                }
            });
            this.changed = newFeatureAttributes || Object.keys(this.newAttributes).length > 0;
        }
        this.render();
    }
};


var attributeLabel = {
    'noAttributes': OpenLayers.i18n("noAttributes"),
    'key': OpenLayers.i18n("key"),
    'val': OpenLayers.i18n("value"),
    'add': OpenLayers.i18n("add"),
    'formTitle': OpenLayers.i18n("addNewAttributesTitle"),
    'addAttributesNotPossible': OpenLayers.i18n("addAttributesNotPossible"),
}

gbi.widgets.AttributeEditor.template = '\
<% if(Object.keys(attributes).length == 0) { %>\
    <span>'+attributeLabel.noAttributes+'.</span>\
<% } else { %>\
    <% for(var key in attributes) { %>\
        <form id="view_attributes" class="form-inline">\
            <label class="key-label" for="_<%=keyIDs[key]%>"><%=key%></label>\
            <input class="input-medium" type="text" id="_<%=keyIDs[key]%>" value="<%=attributes[key]%>" \
            <% if(!editable) { %>\
                disabled=disabled \
            <% } %>\
            />\
            <% if(editable) { %>\
            <button id="_<%=keyIDs[key]%>_remove" title="remove" class="btn btn-small"> \
                <i class="icon-remove"></i>\
            </button> \
            <% } %>\
        </form>\
    <% } %>\
<% } %>\
<% if(editable) { %>\
    <h4>'+attributeLabel.formTitle+'</h4>\
    <form class="form-horizontal"> \
    	 <div class="control-group"> \
    		<label class="control-label" for="_newKey">'+attributeLabel.key+'</label> \
    		<div class="controls">\
    			<input type="text" id="_newKey" class="input-medium">\
    		</div>\
    	</div>\
    	 <div class="control-group"> \
    		<label class="control-label" for="_newValue">'+attributeLabel.val+'</label> \
    		<div class="controls">\
    			<input type="text" id="_newValue" class="input-medium">\
    		</div>\
    	</div>\
        <button id="addKeyValue" class="btn btn-small">'+attributeLabel.add+'</button>\
    </form>\
<% } else { %>\
    <span>'+attributeLabel.addAttributesNotPossible+'.</span>\
<% } %>\
';
