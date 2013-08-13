$(document).ready(function() {
    var editor = initEditor();

    $('#tabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    })

    $("#tabs > li > a ").click(function() {
        if (editor.map.toolbars && editor.map.toolbars.length > 0) {
            var tab = $(this).attr('href');

            $.each(editor.map.toolbars, function(id, toolbar) {
                toolbar.deactivateAllControls();
                var activeLayer = editor.layerManager.active();
                if (activeLayer && toolbar.select && toolbar.select.olControl) {
                    toolbar.select.olControl.unselectAll();
                }
                if (toolbar.select && toolbar.select.olControl && tab == '#edit') {
                    toolbar.select.activate();
                    $(gbi).off('gbi.layer.couch.loadFeaturesEnd');
                    orderToolbar();
                }
            });
        }
   });

   $('#select_all_features').click(function() {
        var activeLayer = editor.layerManager.active();
        if (!activeLayer) {
          return false;
        }
        if(activeLayer instanceof gbi.Layers.SaveableVector) {
            activeLayer.selectAllFeatures();
        }
        return false;
   });

   orderToolbar();

   function orderToolbar() {
       var toolbarButton = $('#edit-toolbar .olButton');
       var toolbarWork = ['DrawFeaturePoint', 'DrawFeatureLine', 'DrawFeaturePolygon'];
       if ($('#toolbar-draw').length == 0) {
           $('#edit-toolbar').append('<div id="toolbar-draw" class="span12">'+
            '</div><div id="toolbar-work"></div>');
       }
       // order toolbar as long as gbi editor dont support groups
       $.each(toolbarButton, function(id, button) {
            var class_ = $(button).attr('class');
            var toolbar = false;
            $.each(toolbarWork, function(index, buttonClass) {
                if (class_.indexOf(buttonClass) >= 0) {
                  $(button).appendTo('#toolbar-draw')
                  toolbar = true;
                }
            });

            if (!toolbar) {
                 $(button).appendTo('#toolbar-work')
            }

       });
    }

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
    if (backgroundLayer.olLayer.restrictedExtent) {
      editor.map.olMap.zoomToExtent(backgroundLayer.olLayer.restrictedExtent);
    }
    $.each(raster_sources, function(index, layer) {
        editor.addLayer(layer);
    });

    $(gbi).on('gbi.layer.couch.loadFeaturesEnd', function(event) {
      var activeLayer = editor.layerManager.active();
      var extent = activeLayer.olLayer.getDataExtent();
      if (extent) {
         editor.map.olMap.zoomToExtent(extent);
      }
      $(gbi).off('gbi.layer.couch.loadFeaturesEnd');
    });

    $.each(couchLayers, function(index, layer) {
        editor.addLayer(layer);
    });


    var layermanager = new gbi.widgets.LayerManager(editor, {
        element: 'layermanager'
    });

    var measure = new gbi.widgets.Measure(editor, {
    	element: 'measure-toolbar',
        srs: {
              'EPSG:4326': 'WGS 84 (EPSG:4326)',
              'EPSG:25832': 'UTM 32N (EPSG:25832)',
              'EPSG:25833': 'UTM 33N (EPSG:25833)',
              'EPSG:31466': 'Gauß-Krüger Zone 3 (EPSG:31466)',
              'EPSG:31467':'Gauß-Krüger Zone 4 (EPSG:31467)',
              'EPSG:31468':'Gauß-Krüger Zone 5 (EPSG:31468)',
              'EPSG:3857':'Webmercator (EPSG:3857)'
            }
    });

    var toolbar = new gbi.Toolbar(editor, {
        element: 'edit-toolbar',
        tools: {
            'drawPoint': true,
            'drawLine': true,
            'drawPolygon': true,
            'select': true,
            'edit': true,
            'split': true,
            'merge': true,
            'copy': true,
            'delete': true
        }
    });
    toolbar.select.deactivate();

    var attributeEditor = new gbi.widgets.AttributeEditor(editor);
    var styleEditor = new gbi.widgets.StyleEditor(editor);
    var pointStyleEditor = new gbi.widgets.PointStyleEditor(editor);

    var layerfilter = new gbi.widgets.Filter(editor, {
        element: 'filtermanager'
    });

    var thematicalVector = new gbi.widgets.ThematicalVector(editor, {
      'element': 'thematical-vector',
      'legendElement': 'thematical-legend'
    });

    $('#save_changes').click(function() {
        var layer = editor.layerManager.active();
        if (layer) {
          layer.save();
        }
        $(this).removeClass('btn-success').attr('disabled', 'disabled');
    });
	return editor;
}

