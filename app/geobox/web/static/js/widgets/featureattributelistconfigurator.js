var featuresAttributeListConfiguratorLabel = {
    'attributes': OpenLayers.i18n('Attributes'),
    'showInList': OpenLayers.i18n('Show in list'),
    'showInPopup': OpenLayers.i18n('Show in popup'),
    'apply': OpenLayers.i18n('Apply'),
    'noLayer': OpenLayers.i18n('No layer selected'),
    'noAttributes': OpenLayers.i18n('Layer have no attributes')
};



gbi.widgets = gbi.widgets || {};

gbi.widgets.FeatureAttributesListConfigurator = function(thematicalVector, options) {
    if(!(thematicalVector instanceof gbi.widgets.ThematicalVector)) {
        return;
    }
    var self = this;
    var defaults = {
        element: 'featureattributelistconfigurator',
        mode: 'exact'
    }
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.thematicalVector = thematicalVector
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
    this.render();
};
gbi.widgets.FeatureAttributesListConfigurator.prototype = {
    render: function() {
        var self = this;
        this.element.empty();

        if(!this.activeLayer) {
            this.element.append($('<div class="text-center">' + featuresAttributeListConfiguratorLabel.noLayer + '</div>'));
            return;
        }

        this.element.append(tmpl(
            gbi.widgets.FeatureAttributesListConfigurator.template, {
                attributes: self.attributes || []
            }
        ));

        var listAttributes = self.activeLayer ? self.activeLayer.listAttributes() : [];
        var popupAttributes = self.activeLayer ? self.activeLayer.popupAttributes() : [];

        if(listAttributes) {
            this.element.find('.list-attribute').each(function(idx, elm) {
                elm = $(elm);
                elm.change(function() {
                    self._restrictAttributes(elm, '.list-attribute', 5)
                })
                if($.inArray(elm.val(), listAttributes) != -1) {
                    elm.attr('checked', 'checked');
                }

            })
        }

        if(popupAttributes) {
            this.element.find('.popup-attribute').each(function(idx, elm) {
                elm = $(elm);
                elm.change(function() {
                    self._restrictAttributes(elm, '.popup-attribute', 5)
                });
                if($.inArray(elm.val(), popupAttributes) != -1) {
                    elm.attr('checked', 'checked');
                }
            })
        }

        this.element.find('#sortable').sortable();

        $('#setListAttributes').click(function() {
            var listAttributes = [];
            var popupAttributes = [];
            $.each(self.element.find('.list-attribute:checked'), function(idx, checkbox) {
                listAttributes.push(checkbox.value);
            });
            $.each(self.element.find('.popup-attribute:checked'), function(idx, checkbox) {
                popupAttributes.push(checkbox.value);
            });
            self.activeLayer.listAttributes(listAttributes);
            self.activeLayer.popupAttributes(popupAttributes);
            if(self.activeLayer instanceof gbi.Layers.Couch) {
                self.activeLayer._saveGBIData();
            }
        })
    },
    _registerLayerEvents: function(layer) {
        var self = this;
        if(layer instanceof gbi.Layers.SaveableVector && !layer.loaded) {
            $(layer).on('gbi.layer.couch.loadFeaturesEnd', function() {
                self.attributes = layer.featuresAttributes() || [];
                self.render();
            });
        }
        $(layer).on('gbi.layer.vector.featureAttributeChanged', function() {
            self.attributes = layer.featuresAttributes() || [];
            self.render();
        });
    },
    _restrictAttributes: function(elm, selector, max) {
        var self = this;
        var count = self.element.find(selector + ':checked').length;
        if(count > max) {
            elm.removeAttr('checked');
            console.log('Only ' + max + ' or less attributes can be selected')
        }
    }
};

gbi.widgets.FeatureAttributesListConfigurator.template = '\
    <% if(attributes.length == 0) { %>\
        <div>' + featuresAttributeListConfiguratorLabel.noAttributes + '</div>\
    <% } else { %>\
        <table class="table">\
            <thead>\
                <tr>\
                    <th>&nbsp;</th>\
                    <th>' + featuresAttributeListConfiguratorLabel.attributes + '</th>\
                    <th>' + featuresAttributeListConfiguratorLabel.showInList + '</th>\
                    <th>' + featuresAttributeListConfiguratorLabel.showInPopup + '</th>\
                </tr>\
            </thead>\
            <tbody id="sortable">\
                <% for(var a_key in attributes) { %>\
                    <tr>\
                        <td><i class="icon-move opacity-1"></i></td>\
                        <td><%=attributes[a_key]%></td>\
                        <td><input type="checkbox" class="list-attribute" value="<%=attributes[a_key]%>" /></td>\
                        <td><input type="checkbox" class="popup-attribute" value="<%=attributes[a_key]%>" /></td>\
                    </tr>\
                <% } %>\
            </tbody>\
        </table>\
        <div class="text-center">\
            <button id="setListAttributes" class="btn btn-small">' + featuresAttributeListConfiguratorLabel.apply + '</button>\
        </div>\
    <% } %>\
';
