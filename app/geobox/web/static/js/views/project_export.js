function limitDownloadLevelWrapper(element) {
    _limitDownloadLevel($(element).val(), $(element).parent());
}

function _limitDownloadLevel(source_id, parent) {
    var minLevel = raster_sources[source_id].olLayer['download_level_start'];
    var maxLevel = raster_sources[source_id].olLayer['download_level_end'];

    $(parent.find('#start_level > option, #end_level > option')).remove();

    for (i=minLevel; i<=maxLevel; i++) {
        $(parent.find('#start_level, #end_level'))
         .append($("<option></option>")
            .attr("value",i)
            .text(i)
        );
    }

    parent.find('#start_level option').first().attr('selected', 'selected');
    parent.find('#end_level option').last().attr('selected', 'selected');
}

function addRasterLayer(editor) {
    var lastRasterLayer = $('.raster_layer').last();
    var newLayer = rasterLayerTemplate.clone();

    newLayer.find('#raster_source').change(function(){
        limitDownloadLevelWrapper(this);
        showSelectedSource(this, editor);
        return false;
    });
    newLayer.find('select').change(function() {
        getDataVolume(editor);
        verifyZoomLevel(editor);
    });
    newLayer.find('#remove_layer').click(function() {
        removeRasterLayer(this, editor);
        return false;
    });

    _limitDownloadLevel(newLayer.find('#raster_source').val(), newLayer);

    if(lastRasterLayer.length) {
        newLayer[0].id = 'rl_' + (parseInt(lastRasterLayer[0].id.split('_')[1]) + 1);
        lastRasterLayer.after(newLayer);
    } else {
        newLayer[0].id = 'rl_1';
        $('#add_layer').before(newLayer);
    }

    setLayerOptionForFormat();
    $('#'+newLayer[0].id+' #raster_source').change();
}

function removeRasterLayer(element, editor) {
    // delete layers from map
    editor.removeLayer($(element).parent().find('#raster_source').data('ol_layer'));
    editor.removeLayer($(element).parent().find('#raster_source').data('ol_coverage_layer'));

    // delete html
    $(element).parent().remove();
    toggleStartButton(editor);
}

function setLayerOptionForFormat() {
    var format = $('#format');
    var value = format.val();
    if( value == 'MBTiles' || value == 'CouchDB' ) {
        $('#srs option[value="EPSG:3857"]').attr('selected', 'selected')
        $('#srs').attr('disabled', 'disabled');
        $('.raster_layer').each(function(idx, elem) {
            $(elem).find('#start_level').prev().text(startLevelText);
            $(elem).find('#end_level').show().prev().show();
        });
    } else {
        $('.raster_layer').each(function(idx, elem) {
            $(elem).find('#start_level').prev().text(level);
            $(elem).find('#end_level').hide().prev().hide();
        })
        $('#srs').removeAttr('disabled');
    }
}

function showSelectedSource(element, editor) {
    var source = $(element);
    var id = source.val();

    if(typeof source.data('ol_layer') !== "undefined") {
        var removeLayer = source.data('ol_layer');
        var removeCoverageLayer = source.data('ol_coverage_layer');
        editor.removeLayer(removeLayer);
        editor.removeLayer(removeCoverageLayer);
    }

    layer = raster_sources[id].clone();
    coverageLayer = raster_sources[layer.olLayer.source_id+'_coverage'].clone();

    source.data('ol_layer', layer);
    source.data('ol_coverage_layer', coverageLayer);

    editor.addLayers([layer, coverageLayer]);
    if (coverageLayer) {
       editor.layerManager.top(coverageLayer);
    }

    editor.layerManager.top(editor.layerManager.active());
}

function toggleVetorLayer(element) {
    $('.vector_source').toggle();
    if($('.vector_source').is(":visible")) {
        $(element).text(buttonRemoveVector);
        $('.vector_source').children().removeAttr('disabled');
    } else {
        $(element).text(buttonAddVector);
        $('.vector_source').children().attr('disabled', 'disabled');
    }
}

function loadSavedLayer(options, editor) {
    var layer = $('#rl_'+options.layerID);
    selectOption(layer.find('#raster_source option'), options.sourceID);
    selectOption(layer.find('#start_level option'), options.startLevel);
    if(options.endLevel !== 'undefined') {
        selectOption(layer.find('#end_level option'), options.endLevel);
    }

    source = $("#rl_"+ options.layerID +"> select#raster_source");
    showSelectedSource(source, editor)
}

function selectOption(list, value) {
    list.each(function(idx, elem) {
        elem = $(elem);
        if(elem.val() == value)
            elem.attr('selected', 'selected');
    })
}

$(document).ready(function() {
    var editor = initProjectEditor({toolbar: true});
    if(coverage) {
        loadFeatures(editor, coverage);
    }

    rasterLayerTemplate = $('#rl_0').clone();
    $('#rl_0').remove()
    $('#format').change(setLayerOptionForFormat).change(verifyZoomLevel);

    if($.isEmptyObject(raster_sources)) {
        $('#add_layer').attr('disabled', 'disabled');
    } else {
        $('#add_layer').click(function() {
            addRasterLayer(editor);
            toggleStartButton(editor);
            return false;
        });
    }

    $('.raster_layer #remove_layer').on('click', function() {
        removeRasterLayer(this, editor)
        return false;
    });

    $('.raster_layer #raster_source').change(function(){
        limitDownloadLevelWrapper(this)
        showSelectedSource(this, editor);
        return false;
    });

    $('#vector_add_remove').click(function() {
        toggleVetorLayer(this);
        toggleStartButton(editor);
        return false;
    });

    $('form').submit(function() {
        submitData(editor)
    });

    $('.raster_layer select, #format, #srs').change(function() {
        getDataVolume(editor);
        verifyZoomLevel(editor);
    });

    setLayerOptionForFormat();
    $('#start_btn').click(function() {submitAndStart(editor)});
    $('#load_couchdb_coverage').click(function() {
        loadProjectCoverage(editor, true)
        return false;
    });

    $('#load_coverage').click(function() {
        loadProjectCoverage(editor, false)
        return false;
    });

    $('#load_couchlayers_coverage').click(function() {
        loadCouchCoverage(editor)
        return false;
    });


    $('#delete_all_features').click(function() {
        deleteAllFeatures(editor);
        return false;
    });

    $.each(savedLayers, function(index, layerOptions) {
        loadSavedLayer(layerOptions, editor);
    });
    toggleStartButton(editor);

});