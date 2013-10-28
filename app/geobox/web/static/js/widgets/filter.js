gbi.widgets = gbi.widgets || {};

gbi.widgets.Filter = function(editor, options) {
    var self = this;
    this.options = $.extend({}, options);
    this.element = $('#' + this.options.element);
    this.editor = editor;
    this.render();

    $(gbi).on('gbi.layermanager.layer.active', function() {
        self.render();
    });
};
gbi.widgets.Filter.prototype = {
    render: function() {
        self = this
        self.element.empty().append(tmpl(gbi.widgets.Filter.template, {srs: self.options.srs}));

        if(self.editor.layerManager.active()) {
            $('#setFilter').click(function() {
                var attr = $('#filterAttr').val();
                var value = $('#filterValue').val();
                self.setFilter(attr, value);
                $(layer).on('gbi.layer.vector.unstoredFeature', self.clearFields)
            });
        } else {
            $('#setFilter').attr('disabled', 'disabled');
        }
    },
    clearFields: function() {
        self.element.find('#filterAttr').val('');
        self.element.find('#filterValue').val('');
    },
    setFilter: function(attr, value) {
        var self = this;
        var layer = self.editor.layerManager.active();
        layer.clearStoredFeatures();
        self.filteredFeatures = layer.selectByPropertyValue(attr, value, true);
        return false;
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
