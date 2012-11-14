$(document).ready(function() {
    var map = init_map();
    layer_switcher = new OpenLayers.Control.LayerSwitcher({
        roundedCorner: true
    });
    map.addControl(layer_switcher);
    layer_switcher.maximizeControl();
    $.each(raster_sources, function(index, layer) {
	    map.addLayer(layer);
    })
});