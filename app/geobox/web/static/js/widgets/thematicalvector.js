var thematicalVectorLabels = {
    'legend': OpenLayers.i18n('legend'),
    'settings': OpenLayers.i18n('settings'),
    'active': OpenLayers.i18n('active'),
    'list': OpenLayers.i18n('list')
}

gbi.widgets = gbi.widgets || {};

gbi.widgets.ThematicalVector = function(editor, options) {
    var self = this;
    var defaults = {
        "element": "thematical-vector",
        "changeAttributes": true,
        "components": {
            configurator: true,
            legend: true,
            list: true
        }
    };
    self.options = $.extend({}, defaults, options);

    self.element = $('#' + self.options.element);
    self.editor = editor;
    self.activeLayer = self.editor.layerManager.active();
    self.active = false;


    $(gbi).on('gbi.widgets.thematicalVector.activate', function(event, layer) {
        self.activate(event, layer);
    });

    $(gbi).on('gbi.widgets.thematicalVector.deactivate', function(event) {
        if(self.activeLayer) {
            self.activeLayer.deactivateHover();
            self.activeLayer.deactivateFeatureStylingRule();
        }
        self.active = self.element.find('#thematical-map-active').prop('checked');
        if(
            self.components["legend"] instanceof gbi.widgets.ThematicalVectorLegendChangeAttributes
            && self.components["legend"].selectControl
        ) {
            self.components["legend"].deactivate();
        }
        self.render();
    });

    self.components = {};
    if(self.options.components.list) {
        self.components["list"] = new gbi.widgets.ThematicalVectorAttributeList(self, {
            'element': 'thematical-feature-list',
            featurePopup: 'hover',
            initOnly: true
        });
    }
    if(self.options.components.configurator) {
        self.components["configurator"] = new gbi.widgets.ThematicalVectorConfigurator(self, {
            'element': 'thematical-settings-element',
            initOnly: true
        });
    }
    if(self.options.components.legend) {
        if(self.options.changeAttributes) {
            self.components["legend"] = new gbi.widgets.ThematicalVectorLegendChangeAttributes(self, {
                'element': 'thematical-legend-element',
                'featureList': self.components.list,
                initOnly: true,
                filterWidget: self.options.filterWidget
            });
        } else {
            self.components["legend"] = new gbi.widgets.ThematicalVectorLegend(self, {
                'element': 'thematical-legend-element',
                'featureList': self.components.list,
                initOnly: true,
                filterWidget: self.options.filterWidget
            });
        }
    }
    self.render();
};
gbi.widgets.ThematicalVector.prototype = {
    CLASS_NAME: 'gbi.widgets.ThematicalVectorConfigurator',
    render: function() {
        var self = this;
        self.element.empty();
        self.element.append(tmpl(gbi.widgets.ThematicalVector.template, {active: self.active}));

        $.each(self.components, function(name, component) {
            component.render();
        });
        self.element.find('#tabs a').click(function (e) {
            e.preventDefault();
            $(self).tab('show');
        });
        self.element.find('#thematical-map-active').change(function() {
            self.active = $(this).prop('checked');
            if(self.activeLayer) {
                if(self.active) {
                    self._activate();
                } else {
                    self.activeLayer.deactivateFeatureStylingRule();
                    self.activeLayer.deactivateHover();
                }
            }
            self.render();
        });
        if(self.components["legend"] instanceof gbi.widgets.ThematicalVectorLegendChangeAttributes) {
            self.element.find('#tabs > li > a ').click(function() {
                var tab = $(this).attr('href');
                if(tab != '#thematical-legend') {
                    self.components["legend"].deactivate();
                }
            });
        }
    },
    showListView: function() {
        $('#thematical-list-tab').tab('show');
    },
    showSettings: function() {
        $('#thematical-settings-tab').tab('show');
    },
    activate: function(event, layer) {
        var self = this;
        if(layer != self.activeLayer) {
            if(self.activeLayer) {
                self.activeLayer.deactivateHover();
                self.activeLayer.deactivateFeatureStylingRule();
            }
            self.activeLayer = layer;
        }
        if(self.activeLayer) {
            self.active = self.element.find('#thematical-map-active').prop('checked');
            if(self.activeLayer && self.active) {
                self._activate();
            }
            self.render();
        }
    },
    _activate: function() {
        var self = this;
        $.each(self.editor.layerManager.vectorLayers, function(idx, _layer) {
            if(_layer.hasSelectedFeatures()) {
                _layer.unSelectAllFeatures();
            }
        });
        self.activeLayer.activateFeatureStylingRule();
        if(self.activeLayer.popupAttributes().length > 0) {
            self.activeLayer.activateHover();
        }
    }
};
gbi.widgets.ThematicalVector.template = '\
<label for="thematical-map-active" class="checkbox">\
    <input type="checkbox" <% if(active) {%>checked="checked"<% } %> id="thematical-map-active" />\
    ' + thematicalVectorLabels.active + '\
</label>\
<% if(active) { %>\
    <ul id="tabs" class="nav nav-tabs">\
        <li class="active">\
            <a href="#thematical-legend" id="thematical-legend-tab" data-toggle="tab">' + thematicalVectorLabels.legend + '</a>\
        </li>\
        <li>\
            <a href="#thematical-list" id="thematical-list-tab" data-toggle="tab">' + thematicalVectorLabels.list + '</a>\
        </li>\
        <li>\
            <a href="#thematical-settings" id="thematical-settings-tab" data-toggle="tab">' + thematicalVectorLabels.settings + '</a>\
        </li>\
    </ul>\
    <div class="tab-content">\
        <div class="tab-pane fade in active" id="thematical-legend">\
            <h4>' + thematicalVectorLabels.legend + '</h4>\
            <div id="thematical-legend-element"></div>\
        </div>\
        <div class="tab-pane fade" id="thematical-list">\
            <h4>' + thematicalVectorLabels.list + '</h4>\
            <div id="thematical-feature-list"></div>\
        </div>\
        <div class="tab-pane fade" id="thematical-settings">\
            <div id="thematical-settings-element"></div>\
        </div>\
    </div>\
<% } %>\
';
