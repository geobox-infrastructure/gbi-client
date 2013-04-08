$(document).ready(function() {
    var editor = initProjectEditor(
    	{toolbar: false}
    );
    $.each(raster_sources, function(index, layer) {
        editor.addLayer(layer);
    });

    load_vector_geometries(editor, vector_sources)
});


function load_vector_geometries(editor, geometries) {
    if (geometries.length > 0) {
        var vector_layer = new gbi.Layers.Vector(vector_layer_title,
        {
            styleMap: styleMap,
            displayInLayerSwitcher: true
        });
        editor.addLayer(vector_layer);

        var geojson_format = new OpenLayers.Format.GeoJSON();
        $.each(geometries, function(index, geom) {
            vector_layer.addFeatures(geojson_format.read(geom.geometry));
        });
    }
};