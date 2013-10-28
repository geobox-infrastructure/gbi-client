gbi.widgets = gbi.widgets || {};

gbi.widgets.Seeding = function(editor, options) {
    var self = this;

    var defaults = {
        'element': 'seeding-widget'
    };

    self.editor = editor;
    self.options = $.extend({}, defaults, options);
    self.element = $('#' + self.options.element);
    self.oldActiveLayer = false;
    self.grid = new Seed.Grid();
    self.bbox = false;
    self.toolbar = false;
    self.layer = new gbi.Layers.Vector({
        title: 'seeding-layer',
        name: 'seeding-layer',
        visibility: false,
        displayInLayerSwitcher: false
    });

    self.layer.registerEvent('beforefeatureadded', null, function(f) {
        self.layer.clear();
        self.bbox = false;
    });
    self.layer.registerEvent('featureadded', null, function(f) {
        var bbox = f.feature.geometry.getBounds();
        self.bbox = new Seed.BBox(bbox.left, bbox.bottom, bbox.right, bbox.top);
        self.updateEsimatedTiles();
    });
    self.layer.registerEvent('featureremoved', null, function(f) {
        self.bbox = false;
        self.updateEsimatedTiles();
    });

    self.editor.addLayer(self.layer);

    self.render();
};

gbi.widgets.Seeding.prototype = {
    CLASS_NAME: 'gbi.widgets.Seeding',
    render: function() {
        var self = this;
        var wmtsLayer = false;

        self.element
            .empty()
            .append(tmpl(gbi.widgets.Seeding.template));
        self.progressbar = self.element.find('#seeding-progressbar')
            .css('transition', 'width 0s ease 0s');

        $.each(self.editor.layerManager.rasterLayers, function(idx, layer) {
            if(layer instanceof gbi.Layers.WMTS) {
                wmtsLayer = true;
                var option = $('<option value="' + layer.options.title + '">' + layer.options.title + '</option>');
                self.element.find('#seeding-layer')
                    .append(option);
            }
        });

        if(wmtsLayer) {
            self.element.find('#no-seeding-layer')
                .hide();
            self.element.find('#seeding-layer')
                .change(function() {
                    var name = $(this).val();
                    var layer = self.editor.layerManager.layerByName(name);
                    for(var i = layer.data.levelMin; i <= layer.data.levelMax; i ++) {
                        var option = $('<option value=' + i + '>' + i + '</option>');
                        $('#seeding-start-level').append(option.clone());
                        $('#seeding-end-level').append(option.clone());
                    }
                })
                .change();

            self.element.find('#seeding-start-level')
                .change(function() { self.updateEsimatedTiles(); });
            self.element.find('#seeding-end-level')
                .change(function() { self.updateEsimatedTiles(); });
            self.element.find('#seeding-start')
                .click({self: self}, self.startSeedingHandler);
            self.element.find('#seeding-stop')
                .click({self: self}, self.stopSeedingHandler);

            self.toolbar = new gbi.Toolbar(self.editor, {
                element: 'seeding-toolbar',
                tools: {
                    'edit': true,
                    'delete': true,
                    'drawRect': true
                }
            });

        } else {
            self.element.find('input, select, button')
                .attr('disabled', 'disabled');
            self.element.find('#no-seeding-layer')
                .show();
        }
    },
    activate: function() {
        var self = this;
        self.oldActiveLayer = self.editor.layerManager.active();
        self.layer.visible(true);
        self.editor.layerManager.active(self.layer);
        self.oldActiveLayer.selectFeatures(self.oldActiveLayer.storedFeatures())
    },
    deactivate: function() {
        var self = this;
        self.layer.visible(false);
        if(self.oldActiveLayer) {
            self.editor.layerManager.active(self.oldActiveLayer);
        }
        self.oldActiveLayer = false;
    },
    startSeedingHandler: function(e) {
        var self = e.data.self;

        if(!self.bbox) {
            self.element.find('#seeding-error-no-bbox')
                .show()
                .fadeOut(3000);
            return
        }

        var startLevel = parseInt($('#seeding-start-level').val());
        var endLevel = parseInt($('#seeding-end-level').val());
        self.seededLayer = self.editor.layerManager.layerByName($('#seeding-layer').val());

        //var sourceURL = Seed.CORSProxyURL + self.seededLayer.data.source.url;
        var sourceURL = self.seededLayer.data.source.url;
        var seedingSource = new Seed.Source.WMTSSource(sourceURL);

        //var cacheURL = Seed.CORSProxyURL + self.seededLayer.options.url;
        var cacheURL = self.seededLayer.options.url;
        var seedingCache = new Seed.Cache.CouchDB(cacheURL);

        self.seeder = new Seed.Seeder({
            grid: self.grid,
            levels: [startLevel, endLevel],
            bbox: self.bbox
        }, seedingSource, seedingCache);

        self.element.find('#seeding-start')
            .attr('disabled', 'disabled');

        self.element.find('#seeding-stop')
            .removeAttr('disabled');

        self.tilePercent = 100 / self.seeder.totalTiles;

        self.seeder.start(function(progress) {
            self.updateProgressBar(progress);
        });
    },
    stopSeedingHandler: function(e) {
        self = e.data.self;

        self.seeder.stop();
    },
    updateProgressBar: function(status) {
        var self = this;

        self.progressbar.css('width', self.tilePercent * status.tiles + '%');

        if(!status.running) {
            self.finishSeeding(status);
        }
    },
    updateEsimatedTiles: function() {
        var self = this;

        var estimatedTiles = 0;
        if(self.bbox) {
            var levels = [
                parseInt($('#seeding-start-level').val()),
                parseInt($('#seeding-end-level').val())
            ];
            estimatedTiles = self.grid.estimateTiles(self.bbox, levels);
        }
        self.element.find('#estimated-tiles')
            .html(estimatedTiles);
    },
    finishSeeding: function(status) {
        var self = this;

        var msgContainer = status.tiles == status.totalTiles ? '#seeding-success' : '#seeding-abort';

        self.element.find(msgContainer)
            .show()
            .fadeOut(3000);

        self.element.find('#seeding-start')
            .removeAttr('disabled');
        self.element.find('#seeding-stop')
            .attr('disabled', 'disabled');

        self.seededLayer.refresh();
    }
};

seedingLabel = {
    'layer': OpenLayers.i18n('Layer to seed'),
    'startLevel': OpenLayers.i18n('Start level'),
    'endLevel': OpenLayers.i18n('End level'),
    'startSeed': OpenLayers.i18n('Start seeding'),
    'stopSeed': OpenLayers.i18n('Stop seeding'),
    'success': OpenLayers.i18n('Seeding finished'),
    'noBBox': OpenLayers.i18n('No BBox given'),
    'estimatedTiles': OpenLayers.i18n('Tiles estimated'),
    'abort': OpenLayers.i18n('Seeding stopped'),
    'noSeedingLayer': OpenLayers.i18n('No layer to seed')
};

gbi.widgets.Seeding.template = '\
    <div id="seeding-input">\
        <div id="seeding-toolbar"></div><br>\
        <hr>\
        <div id="no-seeding-layer">' + seedingLabel.noSeedingLayer + '</div>\
        <div id="seeding-error-no-bbox" class="alert alert-error" style="display: none;">' + seedingLabel.noBBox + '</div>\
        <div class="control-group">\
            <label for="seeding-layer" class="control-label">' + seedingLabel.layer + '</label>\
            <div class="controls">\
                <select id="seeding-layer" name="seeding-layer"></select>\
            </div>\
        </div>\
        <div class="control-group">\
            <label for="seeding-start-level" class="control-label">' + seedingLabel.startLevel + '</label>\
            <div class="controls">\
                <select id="seeding-start-level" name="seeding-start-level"></select>\
            </div>\
        </div>\
        <div class="control-group">\
            <label for="seeding-end-level" class="control-label">' + seedingLabel.endLevel + '</label>\
            <div class="controls">\
                <select id="seeding-end-level" name="seeding-end-level"></select>\
            </div>\
        </div>\
        <div id="estimated-tiles-container">\
            <span id="estimated-tiles">0</span> ' + seedingLabel.estimatedTiles + '\
        </div>\
        <br>\
        <button class="btn btn-small" id="seeding-start">' + seedingLabel.startSeed + '</button>\
        <button class="btn btn-small" id="seeding-stop" disabled="disabled">' + seedingLabel.stopSeed + '</button>\
    </div>\
    <br>\
    <div id="seeding-progressbar-container" class="progress">\
        <div id="seeding-progressbar" class="bar"></div>\
    </div>\
    <div id="seeding-success" class="alert alert-success" style="display: none;">' + seedingLabel.success + '</div>\
    <div id="seeding-abort" class="alert" style="display: none;">' + seedingLabel.abort + '</div>\
';