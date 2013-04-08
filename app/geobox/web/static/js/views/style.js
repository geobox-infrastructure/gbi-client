var sketchSymbolizers = {
  "Point": {
    pointRadius: 8,
    fillColor: "#ccc",
    fillOpacity: 1,
    strokeWidth: 1,
    strokeOpacity: 1,
    strokeColor: "#D6311E"
  },
  "Line": {
    strokeWidth: 3,
    strokeOpacity: 1,
    strokeColor: "#D6311E",
    strokeDashstyle: "dash"
   },
   "Polygon": {
    strokeWidth: 2,
    strokeOpacity: 1,
    strokeColor: "#D6311E",
    fillColor: "#D6311E",
    fillOpacity: 0.6
   }
};

var style = new OpenLayers.Style();
style.addRules([
    new OpenLayers.Rule({symbolizer: sketchSymbolizers})
]);

var styleMap = new OpenLayers.StyleMap(
    {"default": style}
);


/**
 * style for the vector elemenets
 **/
var download_area_symbolizers = {
   "Polygon": {
        strokeWidth: 2,
        strokeOpacity: 1,
        strokeColor: "#24D0D6",
        fillOpacity: 0
   }
};

var download_area_style = new OpenLayers.Style();
download_area_style.addRules([
    new OpenLayers.Rule({symbolizer: download_area_symbolizers})
]);

var download_area_style_map = new OpenLayers.StyleMap(
    {"default": download_area_style}
);
