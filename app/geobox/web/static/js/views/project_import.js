function downloadLevel(id) {
    var minLevel = raster_sources[id].olLayer['download_level_start'];
    var maxLevel = raster_sources[id].olLayer['download_level_end'];
    $('#start_level > option').remove();
    $('#end_level > option').remove();

    for (i=minLevel; i <= maxLevel; i++) {
        $('#start_level, #end_level')
         .append($("<option></option>")
         .attr("value",i)
         .text(i));
    }
    if(selectedLevel) {
        $('#start_level option[value="'+select_start_level+'"]').attr("selected", "selected");
        $('#end_level option[value="'+select_end_level+'"]').attr("selected", "selected");
        selectedLevel = false;
    }
}

function showSelectedLayer(editor, id, selectedLayer) {
// function showSelectedSource(element, editor) {
    var source = $(selectedLayer);

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


$(document).ready(function() {
    var editor = initProjectEditor({toolbar: true});
    if(coverage) {
        loadFeatures(editor, coverage);
    }
    $('#raster_source').change(function() {
        var id = $(this).val();
        downloadLevel(id);
        getDataVolume(editor);
        showSelectedLayer(editor, id, $(this));
    });
    $('#raster_source').change();

    $('#start_level #end_level').change(function() {
        verifyZoomLevel(editor)
        getDataVolume(editor)
    });

    $('#start_btn').click(function() {submitAndStart(editor)});
    $('#save_btn').click(function() {submitData(editor)});

    toggleStartButton(editor);

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
        deleteAllFeatures(editor)
        return false;
    });

});