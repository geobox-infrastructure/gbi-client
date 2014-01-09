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
        var self = this
        self.element.empty().append(tmpl(gbi.widgets.Filter.template, {srs: self.options.srs}));

        var layer = self.editor.layerManager.active()
        if(layer) {
            if(layer._filterWidget !== undefined) {
                self.fillFields(layer._filterWidget['attr'], layer._filterWidget['value']);
            }
            $('#setFilter').click(function() {
                var attr = $('#filterAttr').val();
                var value = $('#filterValue').val();
                self.setFilter(attr, value);
                $(layer).on('gbi.layer.vector.unstoredFeature', function(event, layer) {
                    self.clearFields(event, layer);
                });
            });
        } else {
            $('#setFilter').attr('disabled', 'disabled');
        }
    },
    fillFields: function(attr, value) {
        var self = this;
        self.element.find('#filterAttr').val(attr);
        self.element.find('#filterValue').val(value);
    },
    clearFields: function(event, layer) {
        var self = this;
        self.element.find('#filterAttr').val('');
        self.element.find('#filterValue').val('');
        delete layer._filterWidget;
    },
    setFilter: function(attr, value) {
        var self = this;
        var layer = self.editor.layerManager.active();
        layer.clearStoredFeatures();
        layer.selectByPropertyValue(attr, value);
        layer._filterWidget = {'attr': attr, 'value': value};
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
    <button id="setFilter" class="btn btn-small" type="button">'+filterLabel.loadFilter+'</button>\
    </div>\
</form>\
';
