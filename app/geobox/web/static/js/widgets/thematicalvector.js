var thematicalVectorLabel = {
    'selectValue': OpenLayers.i18n('Select a value'),
    'attribute': OpenLayers.i18n('Attribute'),
    'exact': OpenLayers.i18n('Exact'),
    'range': OpenLayers.i18n('Range'),
    'value': OpenLayers.i18n('Value'),
    'color': OpenLayers.i18n('Color'),
    'min': OpenLayers.i18n('Min'),
    'max': OpenLayers.i18n('Max'),
    'execute': OpenLayers.i18n('Execute'),
    'legendFor': OpenLayers.i18n('Legend for'),
    'areaIn': OpenLayers.i18n('Area in'),
    'noThematicalMap': OpenLayers.i18n('No thematical map present for this layer'),
    'addInputField': OpenLayers.i18n('Add input'),
    'removeInputField': OpenLayers.i18n('Remove input')
};

gbi.widgets = gbi.widgets || {};

gbi.widgets.ThematicalVector = function(editor, options) {
    var self = this;
    var defaults = {
        element: 'thematicalvector',
        mode: 'exact'
    }
    this.options = $.extend({}, defaults, options);
    this.element = $('#' + this.options.element);
    this.legendElement = this.options.legendElement ? $('#' + this.options.legendElement) : false;
    this.editor = editor;
    this.activeLayer = editor.layerManager.active();
    this.attributes = [];
    this.attributeValues = [];
    this.mode = this.options.mode;

    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        self.activeLayer = layer;
        if(self.activeLayer instanceof gbi.Layers.SaveableVector && !self.activeLayer.loaded) {
            $(gbi).on('gbi.layer.couch.loadFeaturesEnd', function() {
                self.attributes = self.activeLayer.featuresAttributes();
                self.render();
            });
        } else {
            self.attributes = self.activeLayer.featuresAttributes();
            self.render();
        }

    });

    $(gbi).on('gbi.layer.couch.loadFeaturesEnd', function() {
        self.attributes = self.activeLayer.featuresAttributes();
        self.render();
    });


};
gbi.widgets.ThematicalVector.prototype = {
    CLASS_NAME: 'gbi.widgets.ThematicalVector',
    render: function(reset) {
        var self = this;
        var attribute = false;
        if(reset) {
            attribute = this.element.find('#attribute').val();
        }
        this.element.empty();
        this.element.append(tmpl(
            gbi.widgets.ThematicalVector.template, {
                attributes: self.attributes,
                defaultColors: gbi.widgets.ThematicalVector.defaultColors
            }
        ));

        if(!reset && this.legendElement) {
            this.renderLegend();
        }

        $('#rangeInputDiv').hide();

        $('#toggleExact').click(function() {
            self.toggleExact();
        });

        $('#toggleRange').click(function() {
            self.toggleRange();
        });

        $('#attribute').change(function() {
            self.render(true);
            self.fillExactInputSelect(this)
        });

        $('.exactSelect').change(function() {
            self.fillExactInputField(this)
        });

        $('#addExactInput').click(function() {
            self.addExactInput()
        });

        $('#addRangeInput').click(function() {
            self.addRangeInput();
        });

        $('#executeFilter').click(function() {
            self.execute();
        });

        $('#exactInputDiv .icon-remove').click(function() {
            self.removeInput();
        });

        $('#rangeInputDiv .icon-remove').click(function() {
            self.removeInput();
        });

        this.fillExactInputSelect();

        $('.color_picker').each(function() {
            $(this).minicolors({
                'value': $(this).val()
            });
        });

        if(!reset) {
            this.fillWithStylingRule($.extend(true, {}, this.activeLayer.featureStylingRule));
        }

        if(reset) {
            switch(this.mode) {
                case 'exact':
                    this.toggleExact();
                    break;
                case 'range':
                    this.toggleRange()
                    break;
            }
            if(attribute) {
                this.element.find('#attribute').val(attribute)
            }
        }

    },
    renderLegend: function() {
        var self = this;
        var legend = this.activeLayer.filteredFeatures();
        var entries = []
        this.legendElement.empty();
        if(legend) {
            var units = 'm';
            $.each(legend.result, function(idx, r) {
                var value = '';
                if(r.min && r.max) {
                    value = r.min + ' <= x < ' + r.max;
                } else if(r.min) {
                    value = r.min + ' <= x';
                } else if(r.max) {
                    value = 'x < ' + r.max
                } else {
                    value = r.value;
                }
                var area = 0;
                $.each(r.features, function(idx, feature) { area += feature.geometry.getGeodesicArea(self.editor.map.olMap.getProjectionObject())});
                if(area > 100000) {
                    area /= 1000000;
                    area = Math.round(area * 10000) / 10000;
                    units = 'km';
                } else {
                    area = Math.round(area * 100) / 100;
                }
                entries.push({
                    color: r.color,
                    value: value,
                    area: area

                });
            });
            this.legendElement.append(tmpl(
                gbi.widgets.ThematicalVector.legendTemplate, {
                    attribute: legend.attribute,
                    type: thematicalVectorLabel[legend.type],
                    entries: entries,
                    units: units
                }
            ));
        } else {
            this.legendElement.append($('<div>' + thematicalVectorLabel.noThematicalMap + '</div>'));
        }
    },
    fillWithStylingRule: function(stylingRule) {
        var self = this;
        if(!stylingRule) {
            return;
        }
        $('#attribute').val(stylingRule.attribute);
        switch(stylingRule.type) {
            case 'exact':
                this.toggleExact();
                var element = $('.exactInputControl').first();
                element.find('.exactInput').first().val(stylingRule.filterOptions[0].value);
                var colorElement = element.find('.exactColor').first().minicolors('value', stylingRule.filterOptions[0].symbolizer.fillColor);
                stylingRule.filterOptions.splice(0, 1);
                $.each(stylingRule.filterOptions, function(idx, filterOption) {
                    self.addExactInput(filterOption);
                });
                break;
            case 'range':
                this.toggleRange();
                var element = $('.rangeInputControl').first();
                if(stylingRule.filterOptions[0].min) {
                    element.find('.rangeInputMin').first().val(stylingRule.filterOptions[0].min)
                }
                if(stylingRule.filterOptions[0].max) {
                    element.find('.rangeInputMax').first().val(stylingRule.filterOptions[0].max)
                }
                var colorElement = element.find('.rangeColor').first().minicolors('value', stylingRule.filterOptions[0].symbolizer.fillColor);
                stylingRule.filterOptions.splice(0, 1);
                $.each(stylingRule.filterOptions, function(idx, filterOption) {
                    self.addRangeInput(filterOption);
                });
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
    addExactInput: function(filterOption) {
        var self = this;
        var element = $('.exactInputControl').last();
        var newElement = element.clone()
        var idx = parseInt(newElement.find('.exactInput').first().attr('id').split('_')[1]);
        var newIdx = idx + 1;

        var label = newElement.find('label').first();
        label.attr('for', 'exactInput_' + newIdx);

        var input = newElement.find('.exactInput').first();
        input.attr('id', 'exactInput_' + newIdx);
        if(filterOption) {
            input.val(filterOption.value);
        } else {
            input.val('');
        }

        newElement.find('.colorControl').empty();

        var colorValue = filterOption ? filterOption.symbolizer.fillColor : gbi.widgets.ThematicalVector.defaultColors[newIdx];
        var color = $('<input id="exactColor_'+newIdx+'" class="exactColor color_picker styleControl input-small" value="'+ colorValue +'" />');
        newElement.find('.colorControl').append(color);
        color.minicolors({
            'value': colorValue
        });

        var select = newElement.find('select').first();
        select.attr('id', 'exactInputSelect_' + newIdx);
        select.change(function() {
            self.fillExactInputField(this)
        });

        var removeElement = newElement.find('.icon-remove').first();
        removeElement.removeClass('hide');
        removeElement.click(function() {
            self.removeInput(this);
        });

        element.after(newElement);
    },
    removeInput: function(element) {
        $(element).parent().remove();
    },
    fillExactInputSelect: function() {
        var self = this;
        var target = $('#exactInputDiv select').empty();
        target.append($('<option disabled selected>' + thematicalVectorLabel.selectValue + '</option>'));
        $.each(self.activeLayer.attributeValues($('#attribute').val()), function(idx, value) {
            target.append($('<option value="'+ value+'">'+value+'</option>'));
        });
    },
    fillExactInputField: function(element) {
        var idx = element.id.split('_')[1]
        $('#exactInput_'+idx).val($('#exactInputSelect_'+idx).val())
    },
    addRangeInput: function(filterOption) {
        var self = this;
        var element = $('.rangeInputControl').last();
        var newElement = element.clone()
        var idx = parseInt(newElement.find('.rangeInputMin').first().attr('id').split('_')[1]);
        var newIdx = idx + 1;

        var minLabel = newElement.find('#rangeInputMinLabel_' + idx).first();
        minLabel.attr('for', 'rangeInputMinLabel_' + newIdx);

        var minInput = newElement.find('#rangeInputMin_' + idx).first();
        minInput.attr('id', 'rangeInputMin_' + newIdx)
        if(filterOption && filterOption.min) {
            minInput.val(filterOption.min);
        } else {
            minInput.val('')
        }

        var maxLabel = newElement.find('#rangeInputMaxLabel_' + idx).first();
        maxLabel.attr('for', 'rangeInputMaxLabel_' + newIdx);

        var maxInput = newElement.find('#rangeInputMax_' + idx).first();
        maxInput.attr('id', 'rangeInputMax_' + newIdx)
        if(filterOption && filterOption.max) {
            maxInput.val(filterOption.max);
        } else {
            maxInput.val('')
        }

        newElement.find('.colorControl').empty();
        var colorValue = filterOption ? filterOption.symbolizer.fillColor : gbi.widgets.ThematicalVector.defaultColors[newIdx];
        var color = $('<input id="rangeColor_'+newIdx+'" class="rangeColor color_picker styleControl input-small" value="'+ colorValue +'" />');
        newElement.find('.colorControl').append(color);
        color.minicolors({
            'value': colorValue
        });

        var removeElement = newElement.find('.icon-remove').first();
        removeElement.removeClass('hide');
        removeElement.click(function() {
            self.removeInput(this);
        });

        element.after(newElement)
    },
    execute: function() {
        var self = this;
        var filterOptions = [];
        switch(this.mode) {
            case 'exact':
                $('.exactInputControl').each(function(idx, element) {
                    element = $(element);
                    var value = element.find('.exactInput').first().val() || false;
                    var color = element.find('.exactColor').first().val() || false;

                    filterOptions.push({
                        value: value,
                        symbolizer: {
                            'fillColor': color,
                            'strokeColor': color
                        }
                    });
                });
                break;
            case 'range':
                $('.rangeInputControl').each(function(idx, element) {
                    element = $(element);
                    var min = element.find('.rangeInputMin').first().val() || false;
                    var max = element.find('.rangeInputMax').first().val() || false;
                    var color = element.find('.rangeColor').first().val() || false;
                    filterOptions.push({
                        min: min,
                        max: max,
                        symbolizer: {
                            'fillColor': color,
                            'strokeColor': color
                        }
                    })
                });
                break;
        }
        this.activeLayer.addAttributeFilter(this.mode, $('#attribute').val(), filterOptions);
        if(this.legendElement) {
            this.renderLegend();
        }
        this.activeLayer._saveRule();
    }
};

gbi.widgets.ThematicalVector.defaultColors = [
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

gbi.widgets.ThematicalVector.template = '\
<div class="control-group">\
    <label class="control-label" for="attribute">' + thematicalVectorLabel.attribute + ':</label>\
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
        ' + thematicalVectorLabel.exact + '\
    </button>\
    <button id="toggleRange"\
            type="button"\
            class="btn btn-small">\
        ' + thematicalVectorLabel.range + '\
    </button>\
</div>\
<div id="exactInputDiv" class="form-horizontal">\
    <h3>' + thematicalVectorLabel.exact + '</h3>\
    <div class="exactInputControl">\
        <i class="icon-remove hide inline-block pull-right pointer" title="' + thematicalVectorLabel.removeInputField + '"></i>\
        <div class="control-group">\
            <label class="control-label" for="exactInput_0">' + thematicalVectorLabel.value + ':</label>\
            <div class="controls">\
                <input type="text" id="exactInput_0" class="exactInput">\
                <select id="exactInputSelect_0" class="exactSelect"></select>\
            </div>\
        </div>\
        <div class="control-group">\
            <label class="control-label" for="exactColor_0">' + thematicalVectorLabel.color + ':</label>\
            <div class="controls colorControl">\
                <input id="exactColor_0" class="exactColor color_picker styleControl input-small" value="<%=defaultColors[0]%>" />\
            </div>\
        </div>\
    </div>\
    <i class="icon-plus-sign pointer" id="addExactInput" title="' + thematicalVectorLabel.addInputField + '"></i>\
</div>\
<div id="rangeInputDiv" class="form-horizontal">\
    <h3>' + thematicalVectorLabel.range + '</h3>\
    <div class="rangeInputControl">\
        <i class="icon-remove hide inline-block pull-right pointer" title="' + thematicalVectorLabel.removeInputField + '"></i>\
        <div class="control-group">\
            <label id="rangeInputMinLabel_0" class="control-label" for="rangeInputMin_0">' + thematicalVectorLabel.min + ':</label>\
            <div class="controls">\
                <input type="text" id="rangeInputMin_0" class="rangeInputMin">\
            </div>\
        </div>\
        <div class="control-group">\
            <label id="rangeInputMaxLabel_0" class="control-label" for="rangeInputMax_0">' + thematicalVectorLabel.min + ':</label>\
            <div class="controls">\
                <input type="text" id="rangeInputMax_0" class="rangeInputMax">\
            </div>\
        </div>\
        <div class="control-group">\
            <label class="control-label" for="rangeColor_0">' + thematicalVectorLabel.color + ':</label>\
            <div class="controls colorControl">\
                <input id="rangeColor_0" class="rangeColor color_picker styleControl input-small" value="<%=defaultColors[0]%>" />\
            </div>\
        </div>\
    </div>\
    <i class="icon-plus-sign pointer" id="addRangeInput" title="' + thematicalVectorLabel.addInputField + '"></i>\
</div>\
<button class="btn btn-small" id="executeFilter">' + thematicalVectorLabel.execute + '</button>\
';

gbi.widgets.ThematicalVector.legendTemplate = '\
<h3>' + thematicalVectorLabel.legendFor + ' "<%=attribute%>" (<%=type%>)</h3>\
<table>\
    <thead>\
        <tr>\
            <th class="text-center">' + thematicalVectorLabel.color + '</th>\
            <th class="text-center">' + thematicalVectorLabel.value + '</th>\
            <th class="text-center">' + thematicalVectorLabel.areaIn + ' <%=units%><sup>2</sup></th>\
        </tr>\
    </thead>\
    <tbody>\
        <% for(var key in entries) { %>\
            <tr>\
                <td class="text-center"><div class="gbi_widget_legend_color inline-block" style="background-color: <%=entries[key].color%>;">&nbsp;</div></td>\
                <td class="text-center"><%=entries[key].value%></td>\
                <td class="text-center"><%=entries[key].area%></td>\
            </tr>\
        <% } %>\
    </tbody>\
</table>\
';
