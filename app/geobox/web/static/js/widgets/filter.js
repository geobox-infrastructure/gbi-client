gbi.widgets = gbi.widgets || {};

gbi.widgets.Filter = function(editor, options) {
    var self = this;
    this.options = $.extend({}, options);
    this.element = $('#' + this.options.element);
    this.editor = editor;
    this.render();

    $('#setFilter').click(function() {
    	var attr = $('#filterAttr').val();
        var value = $('#filterValue').val();
        var layer = self.editor.layerManager.active();
        layer.selectByPropertyValue(attr, value);
        return false;
     });

};
gbi.widgets.Filter.prototype = {
    render: function() {
        this.element.append(tmpl(gbi.widgets.Filter.template, {srs: this.options.srs}));
    }
};

var filterLabel = {
    'key': OpenLayers.i18n('key'),
    'val': OpenLayers.i18n('value'),
    'loadFilter':  OpenLayers.i18n('loadFilter')
}

gbi.widgets.Filter.template = '\
<form class="form-horizontal"> \
     <div class="control-group">\
        <label for="filterAttr" class="control-label">'+filterLabel.key + ':</label>\
         <div class="controls"> \
            <input type="text" id="filterAttr" class="input-small" />\
        </div>\
    </div>\
     <div class="control-group">\
        <label for="filterValue" class="control-label">'+filterLabel.val + ':</label>\
         <div class="controls"> \
            <input type="text" id="filterValue" class="input-small" />\
        </div>\
    </div>\
    <button id="setFilter" class="btn btn-small">'+filterLabel.loadFilter+'</button>\
    </div>\
';
