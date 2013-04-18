$(document).ready(function() {
    var editor = initProjectEditor(
    	{toolbar: false, couchVisible: true}
    );
    $.each(raster_sources, function(index, layer) {
        editor.addLayer(layer);
    });

    loadVectorGeometries(editor, geometries);
});


function loadVectorGeometries(editor, geometries) {
    if (geometries.length > 0) {
        var vectorLayer = new gbi.Layers.Vector({
            name: vectorLayerTitle,
            styleMap: styleMap
        });
        editor.addLayer(vectorLayer);

        var geojson = new OpenLayers.Format.GeoJSON();
        $.each(geometries, function(index, geom) {
            vectorLayer.addFeatures(geojson.read(geom.geometry));
        });
    }
};