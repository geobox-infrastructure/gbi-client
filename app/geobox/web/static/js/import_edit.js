function limit_download_level(source_id) {
    var min_lvl = raster_sources[source_id]['download_level_start'];
    var max_lvl = raster_sources[source_id]['download_level_end'];
    $.each($('#start_level > option, #end_level > option'), function(idx, elem) {
        elem = $(elem);
        if(elem.val() < min_lvl || elem.val() > max_lvl) {
            elem.css('display', 'none');
        } else {
            elem.css('display', 'block');
        }
    })
    if(!has_zoom_level) {
        $('#start_level option:visible').first().attr('selected', 'selected');
        $('#end_level option:visible').first().attr('selected', 'selected');
    }
}

function show_selected_source(map, id, selected_source) {
    if(typeof selected_source.data('ol_layer') !== "undefined") {
        map.removeLayer(selected_source.data('ol_layer'));
    }
    layer = raster_sources[id].clone();
    selected_source.data('ol_layer', layer);
    map.addLayer(layer);
    if (draw_layer) {
        map.raiseLayer(draw_layer, map.layers.length +1);
    }
}


$(document).ready(function() {
    var map = init_map();
    draw_layer = activate_draw_controls(map);
    if(coverage) {
        load_features(coverage);
        get_data_volume();
    }
    draw_layer.events.on({
        'featureadded': get_data_volume,
        'afterfeaturemodified': get_data_volume
    });

    $('#raster_source').change(function() {
        var id = $(this).val();
        var selected_source = $(this);
        limit_download_level(id);
        get_data_volume();
        show_selected_source(map, id, selected_source);
    });
    $('#raster_source').change();

    $('#start_level').change(get_data_volume).change(verify_zoom_level);
    $('#end_level').change(get_data_volume).change(verify_zoom_level);

    $('#start_btn').click(submit_and_start);
    $('#save_btn').click(submit_data);
    limit_download_level($('#raster_source').val());
    toggle_start_button();
    
    $('#load_couchdb_coverage').click(function() {
        load_coverage_from_project(true)
        return false;
    });

    $('#load_coverage').click(function() {
        load_coverage_from_project(false)   
        return false;
    });

});