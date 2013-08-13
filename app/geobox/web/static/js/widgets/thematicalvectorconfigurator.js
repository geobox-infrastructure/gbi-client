var thematicalVectorConfiguratorLabel = {
    'selectValue': OpenLayers.i18n('Select a value'),
    'attribute': OpenLayers.i18n('Attribute'),
    'exact': OpenLayers.i18n('Exact'),
    'range': OpenLayers.i18n('Range'),
    'value': OpenLayers.i18n('Value'),
    'color': OpenLayers.i18n('Color'),
    'min': OpenLayers.i18n('Min'),
    'max': OpenLayers.i18n('Max'),
    'execute': OpenLayers.i18n('Execute'),
    'addInputField': OpenLayers.i18n('Add input'),
    'removeInputField': OpenLayers.i18n('Remove input'),
    'active': OpenLayers.i18n('Active'),
    'choose': OpenLayers.i18n('Choose value'),
    'noInput': OpenLayers.i18n('No entries'),
    'noLayer': OpenLayers.i18n('No layer selected')
};

gbi.widgets = gbi.widgets || {};

gbi.widgets.ThematicalVectorConfigurator = function(thematicalVector, options) {
    if(!(thematicalVector instanceof gbi.widgets.ThematicalVector)) {
        return;
    }
    var self = this;
    var defaults = {
        element: 'thematicalvectorconfigurator',
        mode: 'exact'
    }
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.thematicalVector = thematicalVector
    this.editor = thematicalVector.editor;
    this.activeLayer = this.editor.layerManager.active();
    this.attributes = [];
    this.mode = this.options.mode;

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
gbi.widgets.ThematicalVectorConfigurator.prototype = {
    CLASS_NAME: 'gbi.widgets.ThematicalVectorConfigurator',
    render: function() {
        var self = this;

        this.element.empty();

        if(!self.activeLayer) {
            this.element.append($('<div class="text-center">' + thematicalVectorConfiguratorLabel.noLayer + '</div>'));
            return;
        }

        this.element.append(tmpl(
            gbi.widgets.ThematicalVectorConfigurator.template, {
                attributes: self.attributes,
                defaultColors: gbi.widgets.ThematicalVectorConfigurator.defaultColors
            }
        ));

        $('#rangeInputDiv').hide();

        $('#toggleExact').click(function() {
            self.toggleExact();
        });

        $('#toggleRange').click(function() {
            self.toggleRange();
        });

        $('#attribute').change(function() {
            $.each($('.exactInputControl select'), function(idx, element) {
                element = $(element);
                self.fillExactInputSelect(element, element.val());
            });
        });

        $('#addInput').click(function() {
            self.addInput(self.mode);
        });

        $('#executeFilter').click(function() {
            self.execute();
        });

        if(this.activeLayer && this.activeLayer.featureStylingRule) {
            this.element.find('#attribute').val(this.activeLayer.featureStylingRule.attribute);
            this.element.find('#rule-active').attr('checked', this.activeLayer.featureStylingRule.active)
            this.mode = this.activeLayer.featureStylingRule.type;
            switch(this.mode) {
                case 'exact':
                    this.toggleExact();
                    $.each(this.activeLayer.featureStylingRule.filterOptions, function(idx, filterOption) {
                        self.addInput('exact', filterOption);
                    });
                    this.addInput('range');
                    break;
                case 'range':
                    this.toggleRange()
                    $.each(this.activeLayer.featureStylingRule.filterOptions, function(idx, filterOption) {
                        self.addInput('range', filterOption);
                    });
                    this.addInput('exact');
                    break;
            }

        } else {
            this.addInput('exact');
            this.addInput('range');
        }
    },
    toggleExact: function() {
        var self = this;
        $('#toggleRange').removeClass('active');
        $('#toggleExact').addClass('active')
        $('#rangeInputDiv').hide();
        $('#exactInputDiv').show();
        self.mode = "exact";
    },
    toggleRange: function() {
        var self = this;
        $('#toggleRange').addClass('active');
        $('#toggleExact').removeClass('active')
        $('#rangeInputDiv').show();
        $('#exactInputDiv').hide();
        self.mode = "range";
    },
    fillExactInputSelect: function(element, value) {
        var self = this;
        element.empty();
        element.append($('<option disabled selected>' + thematicalVectorConfiguratorLabel.selectValue + '</option>'));
        var optionValues = self.activeLayer ? self.activeLayer.attributeValues($('#attribute').val()) : [];
        $.each(optionValues, function(idx, value) {
            element.append($('<option value="'+ value+'">'+value+'</option>'));
        });
        if(value && $.inArray(value, optionValues) != -1) {
            element.val(value);
        }
    },
    addInput: function(mode, filterOption) {
        var self = this;
        var idx, selectBaseId, colorBaseId, minBaseId, maxBaseId, colorClass;
        var tds = [];

        $('.exactInputControl tbody tr').first().addClass('hide');

        switch(mode) {
            case 'exact':
                idx = $('.exactInputControl tbody tr:visible').length;
                selectBaseId = 'exactInputSelect_';
                colorBaseId = 'exactColor_';
                colorClass = 'exactColor';

                var select = $(gbi.widgets.ThematicalVectorConfigurator.selectTempalte);
                select.attr('id', selectBaseId + idx);
                this.fillExactInputSelect(select);
                if(filterOption) {
                    select.val(filterOption.value);
                }
                tds.push(select);
                break;
            case 'range':
                idx = $('.rangeInputControl tbody tr:visible').length;
                minBaseId = 'rangeInputMin_';
                maxBaseId = 'rangeInputMax_';
                colorBaseId = 'rangeColor_';
                colorClass = 'rangeColor';

                var minInput = $(gbi.widgets.ThematicalVectorConfigurator.inputTemplate);
                minInput.attr('id', minBaseId + idx);
                minInput.addClass('rangeInputMin');
                if(filterOption) {
                    minInput.val(filterOption.min || '');
                }
                tds.push(minInput);

                var maxInput = $(gbi.widgets.ThematicalVectorConfigurator.inputTemplate);
                maxInput.attr('id', maxBaseId + idx);
                maxInput.addClass('rangeInputMax');
                if(filterOption) {
                    maxInput.val(filterOption.max || '');
                }
                tds.push(maxInput)
        }
        var colorValue = filterOption ? filterOption.symbolizer.fillColor : gbi.widgets.ThematicalVectorConfigurator.defaultColors[idx];
        var color = $(gbi.widgets.ThematicalVectorConfigurator.colorTemplate);
        color.attr('id', colorBaseId + idx);
        color.addClass(colorClass);
        color.val(colorValue);
        tds.push(color)

        var remove = $(gbi.widgets.ThematicalVectorConfigurator.removeTemplate);
        remove.click(function() {
            $(this).parent().parent().remove();
            var elements = $('.' + self.mode + 'InputControl tbody tr');
            if(elements.length == 1) {
                elements.first().removeClass('hide');
            }
        });
        tds.push(remove)

        var tr = $('<tr></tr>');
        $.each(tds, function(idx, element) {
            var td = $('<td></td>');
            td.append(element);
            tr.append(td);
        });
        $('.' + mode + 'InputControl tbody').append(tr);
        color.minicolors({
            'value': colorValue
        });
    },
    execute: function() {
        var self = this;
        var filterOptions = [];
        switch(this.mode) {
            case 'exact':
                $('.exactInputControl tbody tr:visible').each(function(idx, element) {
                    element = $(element);
                    var value = element.find('.exactSelect').first().val() || false;
                    var color = element.find('.exactColor').first().val() || false;
                    if(value && color) {
                        filterOptions.push({
                            value: value,
                            symbolizer: {
                                'fillColor': color,
                                'strokeColor': color
                            }
                        });
                    }
                });
                break;
            case 'range':
                $('.rangeInputControl tbody tr:visible').each(function(idx, element) {
                    element = $(element);
                    var min = element.find('.rangeInputMin').first().val() || false;
                    var max = element.find('.rangeInputMax').first().val() || false;
                    var color = element.find('.rangeColor').first().val() || false;
                    if((min || max) && color) {
                        filterOptions.push({
                            min: min,
                            max: max,
                            symbolizer: {
                                'fillColor': color,
                                'strokeColor': color
                            }
                        });
                    }
                });
                break;
        }
        this.activeLayer.addAttributeFilter(this.mode, $('#attribute').val(), $('#rule-active').is(':checked'), filterOptions);
        if(this.activeLayer instanceof gbi.Layers.Couch) {
            this.activeLayer._saveGBIData();
        }
    },
    _registerLayerEvents: function(layer) {
        var self = this;
        if(self.activeLayer instanceof gbi.Layers.SaveableVector && !self.activeLayer.loaded) {
            $(layer).on('gbi.layer.couch.loadFeaturesEnd', function() {
                self.attributes = layer.featuresAttributes();
                self.render();
            });
        }
        $(layer).on('gbi.layer.vector.featureAttributeChanged', function() {
            self.attributes = layer.featuresAttributes();
            self.render();
        });
    }
};

gbi.widgets.ThematicalVectorConfigurator.defaultColors = gbi.widgets.ThematicalVectorConfigurator.defaultColors || [
    '#ff0000',
    '#00ff00',
    '#0000ff',
    '#ffff00',
    '#ff00ff',
    '#00ffff',
    '#770000',
    '#007700',
    '#000077',
    '#777700',
    '#770077',
    '#007777'
];

gbi.widgets.ThematicalVectorConfigurator.template = '\
    <label for="active">\
        <input type="checkbox" id="rule-active" />\
        ' + thematicalVectorConfiguratorLabel.active + '\
    </label>\
    <div class="control-group">\
        <label class="control-label" for="attribute">' + thematicalVectorConfiguratorLabel.attribute + ':</label>\
        <div class="controls">\
            <select id="attribute">\
            <% for(var key in attributes) { %>\
                <option value="<%=attributes[key]%>"><%=attributes[key]%></option>\
            <% } %>\
            </select>\
        </div>\
    </div>\
    <div class="btn-group"\
         data-toggle="buttons-radio">\
        <button id="toggleExact"\
                type="button"\
                class="btn btn-small active">\
            ' + thematicalVectorConfiguratorLabel.exact + '\
        </button>\
        <button id="toggleRange"\
                type="button"\
                class="btn btn-small">\
            ' + thematicalVectorConfiguratorLabel.range + '\
        </button>\
    </div>\
    <div id="exactInputDiv">\
        <h3>' + thematicalVectorConfiguratorLabel.exact + '</h3>\
        <table class="exactInputControl table">\
            <thead>\
                <tr>\
                    <th>' + thematicalVectorConfiguratorLabel.choose + '</th>\
                    <th>' + thematicalVectorConfiguratorLabel.color + '</th>\
                    <th></th>\
                </tr>\
            </thead>\
            <tbody>\
                <tr class="hide no-inpput">\
                    <td colspan="4" class="text-center">' + thematicalVectorConfiguratorLabel.noInput + '</td>\
                </tr>\
            </tbody>\
        </table>\
    </div>\
    <div id="rangeInputDiv">\
        <h3>' + thematicalVectorConfiguratorLabel.range + '</h3>\
        <table class="rangeInputControl table">\
            <thead>\
                <tr>\
                    <th>' + thematicalVectorConfiguratorLabel.min + '</th>\
                    <th>' + thematicalVectorConfiguratorLabel.max + '</th>\
                    <th>' + thematicalVectorConfiguratorLabel.color + '</th>\
                    <th></th>\
                </tr>\
            </thead>\
            <tbody>\
                <tr class="hide no-input">\
                    <td colspan="4" class="text-center">' + thematicalVectorConfiguratorLabel.noInput + '</td>\
                </tr>\
            </tbody>\
        </table>\
    </div>\
    <button class="btn btn-small btn-success" id="executeFilter">' + thematicalVectorConfiguratorLabel.execute + '</button>\
    <button class="btn btn-small pull-right" id="addInput">' + thematicalVectorConfiguratorLabel.addInputField + '</button>\
';

gbi.widgets.ThematicalVectorConfigurator.inputTemplate = '<input type="text" id="" class="input-small">';
gbi.widgets.ThematicalVectorConfigurator.selectTempalte = '<select id="" class="exactSelect input-small"></select>';
gbi.widgets.ThematicalVectorConfigurator.colorTemplate = '<input id="" class="color_picker styleControl input-small" value="" />';
gbi.widgets.ThematicalVectorConfigurator.removeTemplate = '<i class="icon-remove pointer" title="' + thematicalVectorConfiguratorLabel.removeInputField + '"></i>';
