$(document).ready(function() {
    var editor = initEditor();

});

function initEditor() {
     var editor = new gbi.Editor({
       map: {
            element: 'map',
            numZoomLevels : numZoomLevels,
            theme: OpenlayersThemeURL
        },
        imgPath: OpenlayersImageURL
    });
    editor.addLayer(backgroundLayer)

    $.each(raster_sources, function(index, layer) {
        editor.addLayer(layer);
    });

    $.each(couchLayers, function(index, layer) {
        editor.addLayer(layer);
    });

    var layermanager = new gbi.widgets.LayerManager(editor, {
        element: 'layermanager'
    });

    var measure = new gbi.widgets.Measure(editor, {
    	element: 'measure-toolbar',
        srs: ['EPSG:3857', 'EPSG:4326', 'EPSG:25832', 'EPSG:25833', 'EPSG:31466', 'EPSG:31467', 'EPSG:31468']
    });

    var toolbar = new gbi.Toolbar(editor, {
        element: 'edit-toolbar',
        tools: {
            select: true,
            drawPoint: true,
            drawLine: true,
            drawPolygon: true,
            split: true,
            merge: true,
            edit: true,
            delete: true
        }
    });

    var attributeEditor = new gbi.widgets.AttributeEditor(editor);

    var styleeditor = new gbi.widgets.StyleEditor(editor);

    $('#save').click(function() {
        var layer = editor.layerManager.active();
        layer.save();
    });

	return editor;
}

