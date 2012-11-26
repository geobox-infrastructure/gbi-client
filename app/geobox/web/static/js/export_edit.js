var map_obj;

function limit_download_level_wrapper() {
    _limit_download_level($(this).val(), $(this).parent());
}

function _limit_download_level(source_id, parent) {
    var min_lvl = raster_sources[source_id]['download_level_start'];
    var max_lvl = raster_sources[source_id]['download_level_end'];
    $.each(parent.find('#start_level > option, #end_level > option'), function(idx, elem) {
        elem = $(elem);
        if(elem.val() < min_lvl || elem.val() > max_lvl) {
            elem.css('display', 'none');
        } else {
            elem.css('display', 'block');
        }
    })
    parent.find('#start_level option:visible').first().attr('selected', 'selected');
    parent.find('#end_level option:visible').last().attr('selected', 'selected');
}

function add_raster_layer() {
    var last_raster_layer = $('.raster_layer').last();
    var new_layer = raster_layer_template.clone();

    new_layer.find('#raster_source').change(limit_download_level_wrapper).change(show_selected_source);
    new_layer.find('select').change(get_data_volume).change(verify_zoom_level);
    new_layer.find('#remove_layer').click(remove_raster_layer).click(toggle_start_button);

    _limit_download_level(new_layer.find('#raster_source').val(), new_layer);

    if(last_raster_layer.length) {
        new_layer[0].id = 'rl_' + (parseInt(last_raster_layer[0].id.split('_')[1]) + 1);
        last_raster_layer.after(new_layer);
    } else {
        new_layer[0].id = 'rl_1';
        $('#add_layer').before(new_layer);
    }

    set_layer_inputs_by_format_type();
    $('#'+new_layer[0].id+' #raster_source').change();
    new_layer.show();
    return false;
}

function remove_raster_layer() {
    var $this = $(this);
    map_obj.removeLayer($this.parent().find('#raster_source').data('ol_layer'));
    $this.parent().remove();
    return false;
}

function set_layer_inputs_by_format_type() {
    var format = $('#format');
    var value = format.val();
    if( value == 'MBTiles' || value == 'CouchDB' ) {
        $('#srs option[value="EPSG:3857"]').attr('selected', 'selected')
        $('#srs').attr('disabled', 'disabled');
        $('.raster_layer').each(function(idx, elem) {
            $(elem).find('#start_level').prev().text(start_level_text);
            $(elem).find('#end_level').show().prev().show();
        });
    } else {
        $('.raster_layer').each(function(idx, elem) {
            $(elem).find('#start_level').prev().text(level_text);
            $(elem).find('#end_level').hide().prev().hide();
        })
        $('#srs').removeAttr('disabled');
    }

}

function show_selected_source() {
    var source = $(this);
    var id = source.val();

    if(typeof source.data('ol_layer') !== "undefined") {
        map_obj.removeLayer(source.data('ol_layer'));
    }
    layer = raster_sources[id].clone();
    source.data('ol_layer', layer);
    map_obj.addLayer(layer);

    if (draw_layer) {
        map_obj.raiseLayer(draw_layer, map_obj.layers.length +1);
    }
}

function add_remove_vector() {
    $('.vector_source').toggle();
    if($('.vector_source').is(":visible")) {
        $(this).text(remove_vector_text);
        $('.vector_source').children().removeAttr('disabled');
    } else {
        $(this).text(add_vector_text);
        $('.vector_source').children().attr('disabled', 'disabled');
    }
    return false;
}

function set_layer_data(layer_id, source_id, zoom_start, zoom_end) {
    var layer = $('#rl_'+layer_id);
    select_option(layer.find('#raster_source option'), source_id);
    select_option(layer.find('#start_level option'), zoom_start);
    if(zoom_end!=='undefined')
        select_option(layer.find('#end_level option'), zoom_end);
}

function select_option(option_list, value) {
    option_list.each(function(idx, elem) {
        elem = $(elem);
        if(elem.val() == value)
            elem.attr('selected', 'selected');
    })
}

function init() {
    map_obj = init_map();
    draw_layer = activate_draw_controls(map_obj);
    if(coverage) {
        load_features(coverage);
    }
    raster_layer_template = $('#rl_0').clone();
    $('#rl_0').remove()
    $('#format').change(set_layer_inputs_by_format_type).change(verify_zoom_level);
    if($.isEmptyObject(raster_sources)) {
        $('#add_layer').attr('disabled', 'disabled');
    } else {
        $('#add_layer').click(add_raster_layer).click(toggle_start_button);
    }
    $('.raster_layer #remove_layer').click(remove_raster_layer).click(toggle_start_button);
    $('#vector_add_remove').click(add_remove_vector).click(toggle_start_button);
    $('form').submit(submit_data);
    $('.raster_layer #raster_source')
        .change(limit_download_level_wrapper)
        .change(show_selected_source)
        .change();
    $('.raster_layer select').change(get_data_volume).change(verify_zoom_level);
    
    $('#format, #srs').change(get_data_volume)

    set_layer_inputs_by_format_type();
    $('#start_btn').click(submit_and_start);
    $('#load_couchdb_coverage').click(function() {
        load_coverage_from_project(true)
        return false;
    });

    $('#load_coverage').click(function() {
        load_coverage_from_project(false)   
        return false;
    });

};