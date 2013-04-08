function downloadLevel(id) {
    var minLevel = raster_sources[id].olLayer['download_level_start'];
    var maxLevel = raster_sources[id].olLayer['download_level_end'];
    $('#start_level > option').remove();
    $('#end_level > option').remove();

    for (i=minLevel; i <= maxLevel;i++) {
        $('#start_level, #end_level')
         .append($("<option></option>")
         .attr("value",i)
         .text(i));
    }
    if(set_selected_level) {
        $('#start_level option[value="'+select_start_level+'"]').attr("selected", "selected");
        $('#end_level option[value="'+select_end_level+'"]').attr("selected", "selected");
        set_selected_level = false;
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
       editor.layerManager.up(coverageLayer, 10);
    }

    if (draw_layer) {
       editor.layerManager.up(draw_layer, 11);
    }
}


$(document).ready(function() {
    var editor = initProjectEditor();
    if(coverage) {
        load_features(editor, coverage);
    }

    $('#raster_source').change(function() {
        var id = $(this).val();
        var selectedLayer = $(this);
        downloadLevel(id);
        get_data_volume();
        showSelectedLayer(editor, id, selectedLayer);
    });
    $('#raster_source').change();

    $('#start_level').change(get_data_volume).change(verify_zoom_level);
    $('#end_level').change(get_data_volume).change(verify_zoom_level);

    $('#start_btn').click(submit_and_start);
    $('#save_btn').click(submit_data);
    toggle_start_button();

    $('#load_couchdb_coverage').click(function() {
        load_coverage_from_project(editor, true)
        return false;
    });

    $('#load_coverage').click(function() {
        load_coverage_from_project(editor, false)
        return false;
    });

    $('#delete_all_features').click(delete_all_features);

});