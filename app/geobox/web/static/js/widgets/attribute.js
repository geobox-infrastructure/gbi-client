gbi.widgets = gbi.widgets || {};

gbi.widgets.AttributeEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'attributemanager'
    };
    this.featuresAttributes = {};
    this.newAttributes = {};
    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.selectedFeatures = [];
    this.changed = false;
    this.editable = false;

    $.each(this.layerManager.vectorLayers, function(idx, layer) {
        layer.registerEvent('featureselected', self, function(f) {
            this.selectedFeatures.push(f.feature);
            this._attributes(f.feature);
            $('#attributeTab').tab('show');
        });
        layer.registerEvent('featureunselected', self, function(f) {
            var idx = $.inArray(f.feature, this.selectedFeatures);
            if(idx != -1) {
                this.selectedFeatures.splice(idx, 1);
                this._attributes(false);
            }
        });
    });
};

gbi.widgets.AttributeEditor.prototype = {
    CLASS_NAME: 'gbi.widgets.AttributeEditor',
    render: function() {
        var self = this;
        this.element.empty();
        if(this.selectedFeatures.length > 0) {
            this.element.append(tmpl(
                gbi.widgets.AttributeEditor.template,
                {attributes: this.featuresAttributes, editable: this.editable}
            ));
            //bind events
            $.each(this.featuresAttributes, function(key, value) {
                $('#'+key).change(function() {
                    var newVal = $('#' + key).val();
                    self.edit(key, newVal);
                    self._applyAttributes();
                });
                $('#'+key+'_remove').click(function() {
                    self.remove(key);
                    return false;
                });
            });
            $('#addKeyValue').click(function() {
                var key = $('#newKey').val();
                var val = $('#newValue').val();
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
            this.changed = true;
            this.featuresAttributes = $.extend({}, this.featuresAttributes, this.newAttributes);
            this.newAttributes = {};
            this.render();
        }
    },
    edit: function(key, value) {
        this.featuresAttributes[key] = value;
        this.changed = true;
        this.render();
    },
    remove: function(key) {
        delete this.featuresAttributes[key];
        this.changed = true;
        this._applyAttributes();
        this.render();
    },
    _applyAttributes: function() {
        var self = this;
        $.each(this.selectedFeatures, function(idx, feature) {
            feature.attributes = $.extend({}, self.featuresAttributes, self.newAttributes);
            var gbiLayer = self.layerManager.layerById(feature.layer.gbiId);
            if(gbiLayer instanceof gbi.Layers.SaveableVector) {
                feature.state = OpenLayers.State.UPDATE;
                gbiLayer.changesMade();
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
    <span>'+attributeLabel.noAttributes+'</span>\
<% } else { %>\
    <% for(var key in attributes) { %>\
        <form id="view_attributes" class="form-inline">\
            <label class="key-label" for="<%=key%>"><%=key%></label>\
            <input class="input-medium" type="text" id="<%=key%>" value="<%=attributes[key]%>" \
            <% if(!editable) { %>\
                disabled=disabled \
            <% } %>\
            />\
            <% if(editable) { %>\
            <button id="<%=key%>_remove" title="remove" class="btn btn-small"> \
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
    		<label class="control-label" for="newKey">'+attributeLabel.key+'</label> \
    		<div class="controls">\
    			<input type="text" id="newKey" class="input-medium">\
    		</div>\
    	</div>\
    	 <div class="control-group"> \
    		<label class="control-label" for="newValue">'+attributeLabel.val+'</label> \
    		<div class="controls">\
    			<input type="text" id="newValue" class="input-medium">\
    		</div>\
    	</div>\
        <button id="addKeyValue" class="btn btn-small">'+attributeLabel.add+'</button>\
    </form>\
<% } else { %>\
    <span>'+attributeLabel.addAttributesNotPossible+'</span>\
<% } %>\
';
