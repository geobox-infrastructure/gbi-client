function require(jspath) {
    document.write('<script type="text/javascript" src="'+jspath+'"><\/script>');
}
require("/static/js/gbi-editor/openlayers.extensions.js");
require("/static/js/gbi-editor/gbi.editor.js");
require("/static/js/gbi-editor/gbi.layermanager.js");
require("/static/js/gbi-editor/gbi.map.js");
require("/static/js/gbi-editor/gbi.layer.js");
require("/static/js/gbi-editor/gbi.controls.js");
require("/static/js/gbi-editor/gbi.toolbar.js");
require("/static/js/gbi-editor/gbi.toolbar.controls.js");