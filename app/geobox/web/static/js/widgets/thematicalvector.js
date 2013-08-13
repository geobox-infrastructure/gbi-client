var thematicalVectorLabels = {
    'mapSettings': OpenLayers.i18n('Map settings'),
    'legend': OpenLayers.i18n('Legend'),
    'shortList': OpenLayers.i18n('Short list'),
    'fullList': OpenLayers.i18n('Complete list'),
    'listSettings': OpenLayers.i18n('List settings')
}

gbi.widgets = gbi.widgets || {};

gbi.widgets.ThematicalVector = function(editor, options) {
    var defaults = {
        "element": "thematical-vector",
        "changeAttributes": true,
        "components": {
            configurator: true,
            legend: true,
            list: true,
            listConfigurator: true
        }
    };
    this.options = $.extend({}, defaults, options);

    this.element = $('#' + this.options.element);
    this.editor = editor;

    this.render();

    this.components = {};
    if(this.options.components.list) {
        this.components["shortList"] = new gbi.widgets.FeatureAttributeList(this, {
           'element': 'thematical-feature-short-list',
           featurePopup: 'hover'
        });
        this.components["fullList"] = new gbi.widgets.FeatureAttributeList(this, {
           'element': 'thematical-feature-full-list',
           fullList: true,
           featurePopup: 'hover'
        });
    }
    if(this.options.components.configurator) {
        this.components["configurator"] = new gbi.widgets.ThematicalVectorConfigurator(this, {
           'element': 'thematical-settings-element'
        });
    }
    if(this.options.components.legend) {
        if(this.options.changeAttributes) {
            this.components["legend"] = new gbi.widgets.ThematicalVectorLegendChangeAttributes(this, {
               'element': 'thematical-legend-element',
               'featureList': this.components.shortList
            });
        } else {
            this.components["legend"] = new gbi.widgets.ThematicalVectorLegend(this, {
               'element': 'thematical-legend-element',
               'featureList': this.components.shortList
            });
        }
    }
    if(this.options.components.listConfigurator) {
        this.components["listConfigurator"] = new gbi.widgets.FeatureAttributesListConfigurator(this, {
           'element': 'thematical-feature-list-options'
        });
    }
};
gbi.widgets.ThematicalVector.prototype = {
    CLASS_NAME: 'gbi.widgets.ThematicalVectorConfigurator',
    render: function() {
        this.element.empty();
        this.element.append(tmpl(gbi.widgets.ThematicalVector.template));
        this.element.find('#tabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
    },
    showListView: function() {
        console.log('here')
        $('#thematical-short-list-tab').tab('show');
    }
};
gbi.widgets.ThematicalVector.template = '\
<ul id="tabs" class="nav nav-tabs">\
  <li class="active">\
    <a href="#thematical-settings" data-toggle="tab">' + thematicalVectorLabels.mapSettings + '</a>\
  </li>\
  <li>\
    <a href="#thematical-short-list" id="thematical-short-list-tab" data-toggle="tab">' + thematicalVectorLabels.shortList + '</a>\
  </li>\
  <li>\
    <a href="#thematical-full-list" id="thematical-full-list-tab" data-toggle="tab">' + thematicalVectorLabels.fullList + '</a>\
  </li>\
  <li>\
    <a href="#thematical-legend" data-toggle="tab">' + thematicalVectorLabels.legend + '</a>\
  </li>\
  <li>\
    <a href="#thematical-list-settings" data-toggle="tab">' + thematicalVectorLabels.listSettings + '</a>\
  </li>\
</ul>\
<div class="tab-content">\
  <div class="tab-pane fade in active" id="thematical-settings">\
    <h4>' + thematicalVectorLabels.mapSettings + '</h4>\
    <div id="thematical-settings-element"></div>\
  </div>\
  <div class="tab-pane fade" id="thematical-short-list">\
    <h4>' + thematicalVectorLabels.shortList + '</h4>\
    <div id="thematical-feature-short-list"></div>\
  </div>\
  <div class="tab-pane fade" id="thematical-full-list">\
    <h4>' + thematicalVectorLabels.fullList + '</h4>\
    <div id="thematical-feature-full-list"></div>\
  </div>\
  <div class="tab-pane fade" id="thematical-legend">\
    <h4>' + thematicalVectorLabels.legend + '</h4>\
    <div id="thematical-legend-element"></div>\
  </div>\
  <div class="tab-pane fade" id="thematical-list-settings">\
    <h4>' + thematicalVectorLabels.listSettings + '</h4>\
    <div id="thematical-feature-list-options"></div>\
  </div>\
</div>\
';
