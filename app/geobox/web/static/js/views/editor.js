$(document).ready(function() {
    var editor = initEditor();

});

function initEditor() {
     var editor = new gbi.Editor({
       map: {
            element: 'map',
            numZoomLevels : numZoomLevels,
            theme: "{{ url_for('static', filename='css/openlayers.css') }}"
        },
        imgPath: "{{ url_for('static', filename='img/') }}"
    });
    editor.addLayer(backgroundLayer)

    $.each(raster_sources, function(index, layer) {
        editor.addLayer(layer);
    });

    var layermanager = new gbi.widgets.LayerManager(editor, {
        element: 'layermanager'
    });
	return editor;
}

