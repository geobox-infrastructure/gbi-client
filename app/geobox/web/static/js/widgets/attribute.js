gbi.widgets = gbi.widgets || {};

gbi.widgets.AttributeEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'attributemanager'
    };
    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.selectedFeatures = [];
    this.featureChanges = {};
    this.changed = false;
    this.labelValue = undefined;

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
                if(!(f.feature.id in self.featureChanges)) {
                    self.featureChanges[f.feature.id] = {'added': {}, 'edited': {}, 'removed': []};
                }
                self.selectedFeatures.push(f.feature);
                self.render();
                $('#attributeTab').tab('show');
            });
            layer.registerEvent('featureunselected', self, function(f) {
                var idx = $.inArray(f.feature, self.selectedFeatures);
                if(idx != -1) {
                    self.selectedFeatures.splice(idx, 1);
                    self.render();
                }
            });
        });
    },
    render: function() {
        var self = this;
        var activeLayer = this.layerManager.active();
        var attributes = activeLayer.featuresAttributes();
        var selectedFeatureAttributes = {};
        var editable = true;
        $.each(self.selectedFeatures, function(idx, feature) {
            if(feature.layer != activeLayer.olLayer) {
                editable = false;
            }
        })
        $.each(this.selectedFeatures, function(idx, feature) {
            $.each(attributes, function(idx, key) {
                var equal = true;
                var value = feature.attributes[key];
                if(key in selectedFeatureAttributes) {
                    equal = selectedFeatureAttributes[key].value == value;
                    if(!equal) {
                        selectedFeatureAttributes[key] = {'equal': false};
                    }
                } else {
                    selectedFeatureAttributes[key] = {'equal': equal, 'value': value};
                }
            });
        });

        this.element.empty();
        if(this.selectedFeatures.length > 0) {
            this.element.append(tmpl(
                gbi.widgets.AttributeEditor.template, {
                    attributes: attributes,
                    selectedFeatureAttributes: selectedFeatureAttributes,
                    editable: editable
                }
            ));

            //bind events
            $.each(attributes, function(idx, key) {
                $('#_'+key).change(function() {
                    var newVal = $('#_'+key).val();
                    self.edit(key, newVal);
                });
                $('#_'+key+'_remove').click(function() {
                    self.remove(key);
                    return false;
                });
                $('#_'+key+'_label').click(function() {
                    self.label(key);
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
        var self = this;
        $.each(this.selectedFeatures, function(idx, feature) {
            self.featureChanges[feature.id]['added'][key] = value;
        });
        this._applyAttributes();
        this.changed = true;
        this.render();
    },
    edit: function(key, value) {
        var self = this;
        $.each(this.selectedFeatures, function(idx, feature) {
            self.featureChanges[feature.id]['edited'][key] = value;
        });
        this.changed = true;
        this._applyAttributes();
        this.render();
    },
    remove: function(key) {
        var self = this;
        $.each(this.selectedFeatures, function(idx, feature) {
            if($.inArray(key, self.featureChanges[feature.id]['removed']) == -1) {
                self.featureChanges[feature.id]['removed'].push(key);
            }
        });
        this.changed = true;
        this._applyAttributes();
        this.render();
    },
    label: function(key) {
        var symbolizers;
        if(this.labelValue == key) {
            symbolizers = {};
            $('#_' + key + '_label i')
                .removeClass('icon-eye-close')
                .addClass('icon-eye-open');
            this.labelValue = undefined;
        } else {
            var symbol = {'label': key + ': ${' + key + '}'};
            var symbolizers = {
                'Point': symbol,
                'Line': symbol,
                'Polygon': symbol
            };
            $('.add-label-button i')
                .removeClass('icon-eye-close')
                .addClass('icon-eye-open');
            $('#_' + key + '_label i')
                .removeClass('icon-eye-open')
                .addClass('icon-eye-close');
            this.labelValue = key;
        }
        this.layerManager.active().setStyle(symbolizers, true)
    },
    _applyAttributes: function() {
        var self = this;
        var activeLayer = this.layerManager.active();
        $.each($.extend(true, {}, this.featureChanges), function(featureId, changeSet) {
            var feature = activeLayer.featureById(featureId);
            if (feature) {
                // remove
                $.each(changeSet['removed'], function(idx, key) {
                    activeLayer.removeFeatureAttribute(feature, key);
                });
                self.featureChanges[feature.id]['removed'] = [];
                // edit
                $.each(changeSet['edited'], function(key, value) {
                    activeLayer.changeFeatureAttribute(feature, key, value);
                });
                self.featureChanges[feature.id]['edited'] = {};
                // add
                $.each(changeSet['added'], function(key, value) {
                    activeLayer.changeFeatureAttribute(feature, key, value)
                });
                self.featureChanges[feature.id]['added'] = {};

                // remove not selected features
                if($.inArray(feature, self.selectedFeatures) == -1) {
                    delete self.featureChanges[featureId];
                }
            }
        });
    },
};


var attributeLabel = {
    'noAttributes': OpenLayers.i18n("noAttributes"),
    'key': OpenLayers.i18n("key"),
    'val': OpenLayers.i18n("value"),
    'add': OpenLayers.i18n("add"),
    'formTitle': OpenLayers.i18n("addNewAttributesTitle"),
    'addAttributesNotPossible': OpenLayers.i18n("addAttributesNotPossible"),
    'sameKeyDifferentValue': OpenLayers.i18n("sameKeyDifferentValue")
}

gbi.widgets.AttributeEditor.template = '\
<% if(attributes.length == 0) { %>\
    <span>'+attributeLabel.noAttributes+'.</span>\
<% } else { %>\
    <% for(var key in attributes) { %>\
        <form id="view_attributes" class="form-inline">\
            <label class="key-label" for="_<%=attributes[key]%>"><%=attributes[key]%></label>\
            <% if(selectedFeatureAttributes[attributes[key]]) { %>\
                <% if(selectedFeatureAttributes[attributes[key]]["equal"]) {%>\
                    <input class="input-medium" type="text" id="_<%=attributes[key]%>" value="<%=selectedFeatureAttributes[attributes[key]]["value"]%>" \
                <% } else {%>\
                    <input class="input-medium" type="text" id="_<%=attributes[key]%>" placeholder="'+attributeLabel.sameKeyDifferentValue+'" \
                <% } %>\
            <% } else { %>\
                <input class="input-medium" type="text" id="_<%=attributes[key]%>"\
            <% } %>\
            <% if(!editable) { %>\
                disabled=disabled \
            <% } %>\
            />\
            <% if(editable) { %>\
            <button id="_<%=attributes[key]%>_label" title="label" class="btn btn-small add-label-button"> \
                <i class="icon-eye-open"></i>\
            </button>\
            <button id="_<%=attributes[key]%>_remove" title="remove" class="btn btn-small"> \
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
