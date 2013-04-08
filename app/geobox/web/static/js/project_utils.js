var export_edit = false;

function prepare_raster_layer_json_data(raster_layers) {
    var data = [];
    $.each(raster_layers, function(idx, elem) {
        var elem = $(elem);
        var end_level = elem.find('#end_level:enabled');
        if(end_level.length) {
            end_level = end_level.val();
        } else {
            end_level = null;
        }
        data.push({
            'source_id': elem.find('#raster_source').val(),
            'start_level': parseInt(elem.find('#start_level').val()),
            'end_level': parseInt(end_level)
        });
    });
    return JSON.stringify(data);
}

function get_data_volume() {
    var parser = new OpenLayers.Format.GeoJSON();
    var data = {
        'raster_data': prepare_raster_layer_json_data($('.raster_layer')),
        'coverage': parser.write(draw_layer.features)
    };

    if (export_edit) {
        data['format'] = $("#format").val();
        data['srs'] = $("#srs").val();
    }

    $.post(get_data_volume_url, data, function(result) {
        var volume_mb = Math.round(parseFloat(result['volume_mb']) * 100 ) / 100
        $('#data_volume').text(volume_mb)});
}

function verify_zoom_level() {
    var raster_layer_div = $(this).parent();
    var start_level = parseInt(raster_layer_div.find('#start_level').val());
    var end_level = parseInt(raster_layer_div.find('#end_level').val());

    if(raster_layer_div.find('#end_level:visible').length && start_level > end_level) {
        raster_layer_div.find('.error_zoomlevel').show();
        toggle_start_button();
    } else {
        raster_layer_div.find('.error_zoomlevel').hide();
        toggle_start_button();
    }
}

function toggle_start_button() {
    var start_btn = $('#start_btn');

    if( ($('.raster_layer:visible').length && !$('.error_zoomlevel:visible').length && draw_layer.features.length) ||
        ($('.raster_layer:visible').length && !$('.error_zoomlevel:visible').length && export_edit) )
    {
        start_btn.removeAttr('disabled');
    } else if($('.vector_source:visible').length && !$('.raster_layer:visible').length) {
        start_btn.removeAttr('disabled');
    } else {
        start_btn.attr('disabled', 'disabled');
    }
}

function load_coverage_from_project(editor, couchdb_coverage) {
    var coverage_id = $("#select_coverage").val();
    var data = {'id': coverage_id, 'couchdb_coverage': couchdb_coverage};
    $.ajax({
        type: 'POST',
        url: load_coverage_url,
        data: data,
        success: function(data) {
            if (data.coverage)
                load_features(editor, data.coverage, couchdb_coverage);
        }
    });
    return false;
}

function submit_and_start() {
    $('#start').val("start");
    submit_data();
}

function submit_data() {
    if (export_edit) {
       $('#raster_layers').val(prepare_raster_layer_json_data($('.raster_layer')));
    }

    var parser = new OpenLayers.Format.GeoJSON();
    // deacative controls before saving the feautre
    // draw_controls.modify_control.deactivate();
    // todo
    if (draw_layer.features.length !== 0 ) {
        $('#coverage').val(parser.write(draw_layer.features));
    } else {
        $('#coverage').val(false);
    }
    $('#download_size').val(parseFloat($("#data_volume").text()));
}


