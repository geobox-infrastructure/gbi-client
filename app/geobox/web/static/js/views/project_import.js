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
    if(typeof selectedLayer.data('ol_layer') !== "undefined") {
        var removedLayer = selectedLayer.data('ol_layer');
        var removedCoverageLayer = raster_sources[removedLayer.olLayer.source_id  + '_coverage'];
        editor.removeLayer(removedLayer);
        editor.removeLayer(removedCoverageLayer);
    }

    layer = raster_sources[id].clone();
    selectedLayer.data('ol_layer', layer);
    coverageLayer = raster_sources[id+'_coverage'];

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

    $('#delete_all_features').click(function() {
        deleteAllFeatures(editor)
        return false;
    });

});