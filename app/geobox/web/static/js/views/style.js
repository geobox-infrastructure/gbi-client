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

var downloadAreaSymbolizers  = {
   "Polygon": {
        strokeWidth: 2,
        strokeOpacity: 1,
        strokeColor: "#24D0D6",
        fillOpacity: 0
   }
};

var downloadAreaStyle = new OpenLayers.Style();
downloadAreaStyle.addRules([
    new OpenLayers.Rule({symbolizer: downloadAreaSymbolizers})
]);

var downloadAreaStyleMap = new OpenLayers.StyleMap(
    {"default": downloadAreaStyle}
);
