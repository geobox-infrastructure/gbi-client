gbi.widgets = gbi.widgets || {};

gbi.widgets.AttributeEditor = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'attribute-editor'
    };
    this.attributes = {};
    this.attributeLayer = null;
    this.attributeFeature = null;
    this.layerManager = editor.layerManager;
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    $.each(this.layerManager.vectorLayers, function(idx, layer) {
        layer.registerCallback('select', function(feature) {
            self._attributes(feature);
        });
        layer.registerCallback('unselect', function() {
            self.element.empty();
            self.attributes = {};
            self.attributeLayer = null;
            self.attributeFeature = null;
        });
    });
};

gbi.widgets.AttributeEditor.prototype = {
    render: function() {
        var self = this;
        this.element.empty();
        this.element.append(tmpl(gbi.widgets.AttributeEditor.template, {attributes: this.attributes}));

        //bind events
        $.each(this.attributes, function(key, value) {
            $('#'+key).change(function() {
                var newVal = $('#' + key).val();
                self.edit(key, newVal);
            });
            $('#remove_'+key).click(function() {
                self.remove(key);
            });
        });
        $('#addKeyValue').click(function() {
            var key = $('#newKey').val();
            var val = $('#newValue').val();
            self.add(key, val);
        });
    },
    add: function(key, value) {
        if(!this.attributes[key]) {
            this.edit(key, value);
        }
    },
    edit: function(key, value) {
        this.attributes[key] = value;
        if(this.attributeLayer instanceof gbi.Layers.Couch) {
            this.attributeFeature.state = OpenLayers.State.UPDATE;
            this.attributeLayer.changesMade();
        }
        this.render();
    },
    remove: function(key) {
        delete this.attributes[key];
        this.attributeFeature.state = OpenLayers.State.UPDATE;
        this.attributeLayer.changesMade();
        this.render();
    },
    _attributes: function(feature, features) {
        this.attributeFeature = feature;
        this.attributes = feature.attributes;
        this.attributeLayer = this.layerManager.layerById(feature.layer.gbiId)
        this.render();
    }
};
gbi.widgets.AttributeEditor.template = '\
<% if(Object.keys(attributes).length == 0) { %>\
    <span>No attributes</span>\
<% } else { %>\
    <% for(var key in attributes) { %>\
        <form class="form-inline">\
            <label class="key-label" for="<%=key%>"><%=key%></label>\
            <input class="input-small" type="text" id="<%=key%>" value="<%=attributes[key]%>" />\
            <button id="remove_<%=key%>" title="remove" class="btn btn-small"> \
                <i class="icon-remove"></i>\
            </button> \
        </form>\
    <% } %>\
<% } %>\
<h4>Add new attribute</h4>\
<form class="form-horizontal"> \
	 <div class="control-group"> \
		<label class="control-label" for="newKey">Key</label> \
		<div>\
			<input type="text" id="newKey" class="input-small" placeholder="Key">\
		</div>\
	</div>\
	 <div class="control-group"> \
		<label class="control-label" for="newValue">Value</label> \
		<div>\
			<input type="text" id="newValue" class="input-small" placeholder="100">\
		</div>\
	</div>\
    <button id="addKeyValue" class="btn btn-small">Add</button>\
</form>\
';
