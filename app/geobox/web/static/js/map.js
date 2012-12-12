$(document).ready(function() {
    var map = init_map();
    $.each(raster_sources, function(index, layer) {
        map.addLayer(layer);
    });

    load_vector_geometries(map, vector_sources)
});


function load_vector_geometries(map, geometries) {
    if (geometries.length > 0) {
        var vector_layer = new OpenLayers.Layer.Vector(vector_layer_title, 
        {
            styleMap: styleMap,
            displayInLayerSwitcher: true
        });
        map.addLayer(vector_layer);

        var geojson_format = new OpenLayers.Format.GeoJSON();
        $.each(geometries, function(index, geom) {
            vector_layer.addFeatures(geojson_format.read(geom.geometry));
        });
        
        var extent = vector_layer.getDataExtent();
        vector_layer.map.setCenter(extent.getCenterLonLat(), 12);
    }
};



