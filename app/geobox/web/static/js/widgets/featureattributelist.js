var featureAttributeListLabels = {
    'noLayer': OpenLayers.i18n('No layer selected'),
    'noAttribute': OpenLayers.i18n('No attributes selected'),
    'reset': OpenLayers.i18n('Show all features')
}

gbi.widgets = gbi.widgets || {};

gbi.widgets.FeatureAttributeList = function(thematicalVector, options) {
    if(!(thematicalVector instanceof gbi.widgets.ThematicalVector)) {
        return;
    }
    var self = this;
    var defaults = {
        element: 'featureattributelist',
        mode: 'exact'
    }
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.thematicalVector = thematicalVector;
    this.editor = thematicalVector.editor;
    this.activeLayer = this.editor.layerManager.active();
    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        self.activeLayer = layer;
        if(self.activeLayer) {
            self._registerLayerEvents(self.activeLayer);
            self.attributes = self.activeLayer.featuresAttributes() || [];
        } else {
            self.attributes = [];
        }
        self.render();

    });
    if(this.activeLayer) {
        this._registerLayerEvents(this.activeLayer);
        this.attributes = this.activeLayer.featuresAttributes() || [];
    } else {
        this.attributes = [];
    }
    self.render();
};
gbi.widgets.FeatureAttributeList.prototype = {
    render: function(features) {
        var self = this;
        this.element.empty();

        if(!self.activeLayer) {
            this.element.append($('<div class="text-center">' + featureAttributeListLabels.noLayer + '</div>'));
            return;
        }
        var attributes = self.activeLayer ? self.activeLayer.listAttributes() || [] : [];

        if(attributes.length == 0) {
            this.element.append($('<div class="text-center">' + featureAttributeListLabels.noAttribute + '</div>'));
            return;
        }

        this.element.append(tmpl(
            gbi.widgets.FeatureAttributeList.template, {
                attributes: this.options.fullList ? self.attributes : self.activeLayer.listAttributes() || self.attributes,
                features: features || self.activeLayer.features,
                resetButton: features ? true : false
            }
        ));

        if(features) {
            $('#reset-list').click(function() {
                self.render();
            });
        }

        this.element.find('.show-feature').click(function() {
            var element = $(this);
            var feature = self.activeLayer.features[element.attr('id')];
            self.activeLayer.showFeature(feature);
        });
    },
    showFilteredFeatures: function(value) {
        var filteredFeatures = this.activeLayer.filteredFeatures().result;
        var features;
        $.each(filteredFeatures, function(idx, filterItem) {
            if(filterItem.value == value) {
                features = filterItem.features;
                return true;
            }
        });
        this.render(features);
    },
    _registerLayerEvents: function(layer) {
        var self = this;
        if(layer instanceof gbi.Layers.SaveableVector && !layer.loaded) {
            $(layer).on('gbi.layer.couch.loadFeaturesEnd', function() {
                self.attributes = layer.featuresAttributes();
                self.render();
            });
        }
        $(layer).on('gbi.layer.vector.listAttributesChanged', function() {
            self.render();
        });
        $(layer).on('gbi.layer.vector.featureAttributeChanged', function() {
            self.render();
        });
    }
};

gbi.widgets.FeatureAttributeList.template = '\
    <% if(resetButton) { %>\
        <button class="btn btn-small" id="reset-list">' + featureAttributeListLabels.reset + '</button>\
    <% } %>\
    <table class="table table-hover">\
        <tr>\
            <% for(var key in attributes) { %>\
                <th><%=attributes[key]%></th>\
            <% } %>\
            <th>&nbsp;</th>\
        </tr>\
        <% for(var f_key in features) { %>\
            <tr>\
                <% for(var a_key in attributes) { %>\
                    <td>\
                    <% if(features[f_key].attributes[attributes[a_key]]) { %>\
                        <%=features[f_key].attributes[attributes[a_key]]%>\
                    <% } else {%>\
                        &nbsp;\
                    <% } %>\
                    </td>\
                <% } %>\
                <td>\
                    <button class="btn btn-small show-feature" id="<%=f_key%>">\
                        <i class="icon-fullscreen"></i>\
                    </button>\
                </td>\
            </tr>\
        <% } %>\
    </table>\
';
