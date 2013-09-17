$(document).ready(function() {
    var layerEvents = {
      'gbi.layer.vector.styleChanged': eneableSaveButton,
      'gbi.layer.saveableVector.unsavedChanges': eneableSaveButton,
      'gbi.layer.vector.ruleChanged': eneableSaveButton,
      'gbi.layer.vector.listAttributesChanged': eneableSaveButton,
      'gbi.layer.vector.popupAttributesChanged': eneableSaveButton,
      'gbi.layer.vector.featureAttributeChanged': eneableSaveButton,
      'gbi.layer.vector.schemaLoaded': eneableSaveButton
    }

    var editor = initEditor();
    var activeLayer = editor.layerManager.active();

    if(activeLayer.odataUrl) {
      $('.odata_url_elements').show();
      $('#odata_url').text(activeLayer.odataUrl);
    } else {
      $('.odata_url_elements').hide();
    }

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


    $('a[data-toggle="tab"]').on('shown', function (e) {
        if ($(e.relatedTarget).prop('id') == 'thematical-tab') {
           $(gbi).trigger('gbi.widgets.thematicalVector.deactivate');
        }

        if ($(e.relatedTarget).prop('id') == 'edit-tab') {
           $(gbi).trigger('gbi.widgets.attributeEditor.deactivate');
        }
    })



    $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
        unregisterEvents(activeLayer);
        activeLayer = layer;
        registerEvents(activeLayer);
        $(this).attr('disabled', 'disabled').removeClass('btn-success');
        $('#discard-changes').attr('disabled', 'disabled').removeClass('btn-danger');
        $('#save-tab').removeClass('save-enabled');
        if(activeLayer.odataUrl) {
          $('.odata_url_elements').show();
          $('#odata_url').text(activeLayer.odataUrl);
        } else {
          $('.odata_url_elements').hide();
        }
        refreshSavePointList();
    });

   $('#select_all_features').click(function() {
        if (!activeLayer) {
          return false;
        }
        if(activeLayer instanceof gbi.Layers.SaveableVector) {
            activeLayer.selectAllFeatures();
        }
        return false;
   });

   // save-button enabeling events
   $('#save-changes').click(function() {
    if(activeLayer) {
      activeLayer.save();
      activeLayer._saveMetaDocument();
    }
    $(this).attr('disabled', 'disabled').removeClass('btn-success');
    $('#discard-changes').attr('disabled', 'disabled').removeClass('btn-danger');
    $('#save-tab').removeClass('save-enabled');
   });

    // savepoint settings

    $('#create-savepoint').click(function() {
      $("#save-msg-success").hide();
      $("#save-msg-error").hide();

      var saved = activeLayer.setSavepoint();
      if (saved.ok) {
        $("#save-msg-success").show().fadeOut(3000);
        refreshSavePointList();
      } else if (saved.error) {
        $("#save-msg-error").show().fadeOut(3000);
      }
    });

    $("#load-savepoint-modal").click(function() {
        $("#loadSavepointModal").modal('show');
    });

    $("#delete-savepoint-modal").click(function() {
       $("#deleteSavepointModal").modal('show');
    });

    $('#load-savepoint').click(function() {
      var savepoint = $("select#select-savepoints option:selected");
      var id = savepoint.attr('id')
      activeLayer.loadSavepoint(id);

      var extent = activeLayer.olLayer.getDataExtent();
      if (extent) {
        editor.map.olMap.zoomToExtent(extent);
      }
      $("#loadSavepointModal").modal('hide');
    });

    $('#delete-savepoint').click(function() {
      var savepoint = $("select#select-savepoints option:selected");
      var id = savepoint.attr('id')
      var rev = savepoint.attr('data-rev-url')
      var deleteSavePoint = activeLayer.deleteSavepoint(id, rev);

      // refresh savepoint list
      if (deleteSavePoint.ok) {
          refreshSavePointList();
      }

      $("#deleteSavepointModal").modal('hide');
    });

    function refreshSavePointList(savepoints) {
      var savepoints = false;
      if (activeLayer && activeLayer.CLASS_NAME == "gbi.Layers.Couch") {
        savepoints = activeLayer.getSavepoints();
      }
      $("#show-savepoints").show();
      $("#select-savepoints").empty();

      if (savepoints) {
        if (savepoints.rows) {
          $.each(savepoints.rows, function(index, savepoint) {
            $("#select-savepoints").append('<option id="'+savepoint.id+'" data-rev-url="'+savepoint.value+'">'+savepoint.key+'</option>')
          });
        }
      }
    };
    //  savepoint settings end

    $('#save-as').click(function() {
      var newTitle = $('#save-as-name').val();
      var newName = 'local_vector_' + newTitle;
      if(newName && activeLayer) {
        var newLayer = false;
        // clone couch if class is couch
        if (activeLayer.CLASS_NAME == 'gbi.Layers.Couch') {
          newLayer = activeLayer.clone(newName, true, newTitle);
          newLayer.visible(true);
        } else {
          //  create couch to save layer and copy features
          newLayer = new gbi.Layers.Couch({
              name: newName,
              title: newTitle,
              url: OpenlayersCouchURL,
              displayInLayerSwitcher: true,
              createDB: false,
              visibility: true,
              loadStyle: false,
              callbacks: {
                changes: function(unsavedChanges) {
                    if(unsavedChanges)
                        $('#save_changes').removeAttr('disabled').addClass('btn-success');
                    else
                        $('#save_changes').attr('disabled', 'disabled').removeClass('btn-success');
                    }
              }
          });
          newLayer.olLayer.setMap(activeLayer.olLayer.map);

          var features = [];
          $.each(activeLayer.features, function(idx, feature) {
            newFeature = feature.clone()
            newFeature.state = OpenLayers.State.INSERT;
            features.push(newFeature);
          });

          newLayer.addFeatures(features);
           $(newLayer).on('gbi.layers.couch.created', function() {
                newLayer.save();
            });
          newLayer._createCouchDB(true)
        }
        editor.layerManager.addLayer(newLayer)
        editor.layerManager.active(newLayer);
        editor.widgets.layermanager.render();
        $('#discard-changes').attr('disabled', 'disabled').removeClass('btn-danger');
        $('#save-tab').removeClass('save-enabled');
      }
    });

   $('#discard-changes').click(function() {
    if(activeLayer) {
      activeLayer.refresh();
    }
    $(this).attr('disabled', 'disabled').removeClass('btn-success');
    $('#discard-changes').attr('disabled', 'disabled').removeClass('btn-danger');
    $('#save-tab').removeClass('save-enabled');
   })

   orderToolbar();
   if(activeLayer) {
    registerEvents(activeLayer);
  }

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
    };

    function registerEvents(layer) {
      $.each(layerEvents, function(type, func) {
        $(layer).on(type, func);
      });
    }

    function unregisterEvents(layer) {
      $.each(layerEvents, function(type, func) {
        $(layer).off(type, func);
      });
    };

    function eneableSaveButton() {
      if(activeLayer instanceof gbi.Layers.Couch) {
        $('#save-tab').addClass('save-enabled');
        $('#save-changes').removeAttr('disabled').addClass('btn-success');
        $('#discard-changes').removeAttr('disabled').addClass('btn-danger');
      }
    };


    $("#export_vectorlayer").click(function() {
        var layer = activeLayer;
        var features = editor.widgets.attributeEditor.selectedFeatures;
        // add value to hiddenfoelds
        $("#exportVectorLayer input#name").val(layer.olLayer.name)
        if (features && features.length != 0) {
          var geoJSON = new OpenLayers.Format.GeoJSON();
          var geoJSONText = geoJSON.write(features);
          $("#exportVectorLayer input#geojson").val(geoJSONText)
        }

        // add filename
        $("#exportVectorLayer input#filename").val(layer.olLayer.name)
        // show modal
        $('#exportVectorLayer').modal('show');
        $('#exportVectorLayer').on('hidden', function () {
          $('#remove_layer').off('click');
          $('#deleteVectorLayer').off('hidden');
         })
        return false;
    });


    var activeSearchLayer;
    $('#start_search').click(function() {
      if (activeSearchLayer) {
        activeSearchLayer.visible(false)
        activeSearchLayer.olLayer.filter = null
        activeSearchLayer.olLayer.removeAllFeatures();
       }

       var value = $('#search_value').val();

       var layername = $("#wfs_layers").val()
       activeSearchLayer = editor.layerManager.layerByName(layername);
       activeSearchLayer.visible(true)
       if (value) {
          value = value.split("\n")
          activeSearchLayer.filter(
            activeSearchLayer.olLayer.searchProperty, value
          );
          $('#remove_search').removeAttr('disabled');
      } else {
        activeSearchLayer.olLayer.removeAllFeatures();
        activeSearchLayer.removeFilter();
      }
      $('#hide_searchlayer').removeAttr('disabled');
      return false;
   });

    $('#remove_search').click(function() {
      $("#search_value").val('');
      $(this).prop('disabled', 'disabled');
      return false;
    });

    $('#hide_searchlayer').click(function() {
      activeSearchLayer.visible(false)
      $(this).prop('disabled', 'disabled');
      return false;
    });
});

function loadCouchDBs() {
  var url = OpenlayersCouchURL;
  var jsonFormat = new OpenLayers.Format.JSON();
  var couchLayers = [];
  var raster_sources = [];

  OpenLayers.Request.GET({
    url: url + "_all_dbs",
    async: false,
    success: function(response) {
        var doc = jsonFormat.read(response.responseText);
        for (var i=0; i<doc.length; i++) {
            // load metadata from couchdb
            var metadataURL = url.replace(/\/$/,'') + "/" + doc[i] + "/metadata";
            OpenLayers.Request.GET({
              url: metadataURL,
              async: false,
              success: function(meta_response) {
                var metadata = jsonFormat.read(meta_response.responseText);
                if (metadata._id) {
                  if (metadata.type == 'GeoJSON') {
                    couchLayers.push(new gbi.Layers.Couch({
                        title: metadata.title,
                        name: metadata.name,
                        url: OpenlayersCouchURL,
                        displayInLayerSwitcher: true,
                        createDB: false,
                        visibility: false,
                        loadStyle: true,
                        hoverPopup: true,
                        callbacks: {
                        changes: function(unsavedChanges) {
                          if(unsavedChanges)
                            $('#save_changes').removeAttr('disabled').addClass('btn-success');
                          else
                            $('#save_changes').attr('disabled', 'disabled').removeClass('btn-success');
                        }
                      }
                    }));
                  }

                  if (metadata.type == 'tiles') {
                        raster_sources.push(new gbi.Layers.WMTS({
                            name: metadata.title,
                            url: OpenlayersCouchURL,
                            layer:  metadata.name,
                            format: metadata.source.format
                        })
                      )
                  }
                }
              }
            });
        }
    }
  });
  return [couchLayers, raster_sources];
}


function initEditor() {
    var layers = loadCouchDBs();
    var couchLayers = layers[0];
    var raster_sources = layers[1];

    if (typeof numZoomLevels == 'undefined') {
      numZoomLevels = 18;
    }

    var editor = new gbi.Editor({
       map: {
            element: 'map',
            numZoomLevels : numZoomLevels,
            theme: OpenlayersThemeURL
        },
        imgPath: OpenlayersImageURL,
        imageBaseLayer: true
    });

    if ((typeof backgroundLayer !== 'undefined') && backgroundLayer) {
      editor.addLayer(backgroundLayer)
      if (backgroundLayer.olLayer.restrictedExtent) {
        editor.map.olMap.zoomToExtent(backgroundLayer.olLayer.restrictedExtent);
      }
    }

    $.each(raster_sources, function(index, layer) {
        editor.addLayer(layer);
    });

    if ((typeof tmp_vectorLayer !== 'undefined') && tmp_vectorLayer) {
      editor.addLayer(tmp_vectorLayer);
      var extent = tmp_vectorLayer.olLayer.getDataExtent();
      if (extent) {
        editor.map.olMap.zoomToExtent(extent);
      }
    }

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

    editor.widgets = {}
    editor.widgets.layermanager = layermanager;

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
    editor.widgets.attributeEditor = attributeEditor;
    var styleEditor = new gbi.widgets.StyleEditor(editor);
    var pointStyleEditor = new gbi.widgets.PointStyleEditor(editor);

    var layerfilter = new gbi.widgets.Filter(editor, {
        element: 'filtermanager'
    });

    var thematicalVector = new gbi.widgets.ThematicalVector(editor);
    editor.widgets.thematicalVector = thematicalVector;

    $('#save_changes').click(function() {
        var layer = editor.layerManager.active();
        if (layer) {
          layer.save();
        }
        $(this).removeClass('btn-success').attr('disabled', 'disabled');
    });

    // add WFS Layer on top

    if ((typeof wfsLayers !== 'undefined') && wfsLayers) {
      $.each(wfsLayers, function(index, layer) {
          editor.addLayer(layer);
      });
    }


  return editor;
}
