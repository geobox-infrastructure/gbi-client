$(window).on('beforeunload', function() {
  if($('#save-tab').hasClass('save-enabled')) {
    return OpenLayers.i18n("Unsaved changes present. Sure, you want to leave the editor?");
  }
});

$(document).ready(function() {
    var gbiLayerEvents = {
      'gbi.layer.vector.styleChanged': enableSaveButton,
      'gbi.layer.saveableVector.unsavedChanges': enableSaveButton,
      'gbi.layer.vector.ruleChanged': enableSaveButton,
      'gbi.layer.vector.listAttributesChanged': enableSaveButton,
      'gbi.layer.vector.popupAttributesChanged': enableSaveButton,
      'gbi.layer.vector.featureAttributeChanged': enableSaveButton,
      'gbi.layer.vector.schemaLoaded': enableSaveButton,
      'gbi.layer.vector.schemaRemoved': enableSaveButton,
      'gbi.layer.vector.featuresStored': enableExportSelectedGeometriesButton,
      'gbi.layer.vector.featuresStoreCleared': disableExportSelectedGeometriesButton,
    };
    var olLayerEvents = {
      'featureselected': storeSelectedFeatures
    };
    var editor = initEditor();
    var activeLayer = editor.layerManager.active();

    var clearStoredFeaturesWrapper = function(f) {
      var layer = f.feature.layer.gbiLayer;
      layer.clearStoredFeatures();
      layer.unregisterEvent('featureunselected', editor, clearStoredFeaturesWrapper);
      editor.widgets.layerfilter.clearFields();
    }

    $('#exportVectorLayer form, #exportSelectedGeometries form').submit(function(event) {
      console.log('submit')
      var filename_input = $(this).find('#filename');
      if(!filename_input.val()) {
        filename_input.parent().parent().addClass('error');
        filename_input.after('<span class="help-inline">' + OpenLayers.i18n('Required') + '</span>');
        event.preventDefault();
      }
    });

    if(activeLayer.odataUrl) {
      $('#odata_url').val(activeLayer.odataUrl);
    }

    $('#tabs a').click(function (e) {
        e.preventDefault();
        $(this).tab('show');
    })

    $("#tabs > li > a ").click(function() {
      var tab = $(this).attr('href');

      // seeding widgets changes active layer back to real active layer when deactivate
      if(offline) {
        editor.widgets.seeding.deactivate();
      }

      var activeLayer = editor.layerManager.active();
      if(activeLayer) {
        activeLayer.unregisterEvent('featureunselected', editor, clearStoredFeaturesWrapper);
      }
      // sedding widgets changes active layer to its draw layer when activate
      if(offline && tab == '#seeding') {
        editor.widgets.seeding.activate();
      }
      if(tab == '#thematical') {
        $(gbi).trigger('gbi.widgets.thematicalVector.activate', activeLayer);
      }

      if (editor.map.toolbars && editor.map.toolbars.length > 0) {
        $.each(editor.map.toolbars, function(id, toolbar) {
          toolbar.deactivateAllControls();

          // unselect all and select stored features
          if (activeLayer && toolbar.select && toolbar.select.olControl) {
            toolbar.select.olControl.unselectAll();
            if(tab == '#edit') {
              // with select control to enable unselecting
              $.each(activeLayer.storedFeatures(), function(idx, feature) {
                toolbar.select.olControl.select(feature)
              });
              activeLayer.registerEvent('featureunselected', editor, clearStoredFeaturesWrapper);
            } else {
              // with layer
              activeLayer.selectFeatures(activeLayer.storedFeatures());
            }
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
          $('#odata_url').val(activeLayer.odataUrl);
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

   $('#export_type').change(function() {
    if($(this).val() == 'odata') {
      $('#srs').hide().prev().hide();
      $('#destination').hide().prev().hide();
      $('#odata_url').parent().parent().show();
    } else {
      $('#srs').show().prev().show();
      $('#destination').show().prev().show();
      $('#odata_url').parent().parent().hide();
    }
   }).change();

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
      if(activeLayer) {
        var saved = activeLayer.setSavepoint();
        if (saved.ok) {
          $("#save-msg-success").show().fadeOut(3000);
          refreshSavePointList();
        } else if (saved.error) {
          $("#save-msg-error").show().fadeOut(3000);
        }
      } else {
        $('#savepoint_error').show().fadeOut(3000);
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
      var newName = newTitle.toLowerCase().replace(/[^a-z0-9_]*/g, '');
      if(newName && activeLayer) {
        newName = 'local_vector_' + newName;
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
      } else {
        $('#save_as_error').show().fadeOut(3000);
      }
    });

   $('#discard-changes').click(function() {
    if(activeLayer) {
      activeLayer.refresh();
    }
    $('#save-changes').attr('disabled', 'disabled').removeClass('btn-success');
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
      $.each(gbiLayerEvents, function(type, func) {
        $(layer).on(type, func);
      });
      if(layer) {
        $.each(olLayerEvents, function(type, func) {
          layer.registerEvent(type, editor, func);
        });
      }
    }

    function unregisterEvents(layer) {
      $.each(gbiLayerEvents, function(type, func) {
        $(layer).off(type, func);
      });
      if(layer) {
        $.each(olLayerEvents, function(type, func) {
          layer.unregisterEvent(type, editor, func);
        });
      }
    };

    function enableSaveButton() {
      if(activeLayer instanceof gbi.Layers.Couch) {
        $('#save-tab').addClass('save-enabled');
        $('#save-changes').removeAttr('disabled').addClass('btn-success');
        $('#discard-changes').removeAttr('disabled').addClass('btn-danger');
      }
    };

    function enableExportSelectedGeometriesButton() {
      $('#export_selected_geometries').removeAttr('disabled');
    }

    function disableExportSelectedGeometriesButton() {
      $('#export_selected_geometries').attr('disabled', 'disabled');
    }


    $("#export_vectorlayer").click(function() {
        var layer = activeLayer;
        if(layer) {
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
        } else {
          $('#export_error').show().fadeOut(3000);
        }
        return false;
    });

    $("#export_selected_geometries").click(function() {
      var layer = activeLayer;
      if(layer && layer.storedFeatures().length > 0) {
        var features = layer.storedFeatures();
        $("#exportSelectedGeometries input#name").val(layer.olLayer.name)
        if (features && features.length != 0) {
          var geoJSON = new OpenLayers.Format.GeoJSON();
          var geoJSONText = geoJSON.write(features);
          $("#exportSelectedGeometries input#geojson").val(geoJSONText)
        }
        // add filename
        $("#exportSelectedGeometries input#filename").val(layer.olLayer.name)
        $('#exportSelectedGeometries').modal('show');
        $('#exportSelectedGeometries').on('hidden', function () {
          $('#remove_layer').off('click');
          $('#deleteVectorLayer').off('hidden');
         })
      } else {
        $('#export_error').show().fadeOut(3000);
      }
      return false;
    });

    var activeSearchLayer;
    $('#start_search').click(function() {
      if (activeSearchLayer) {
        activeSearchLayer.olLayer.filter = null
        activeSearchLayer.olLayer.removeAllFeatures();
       }

       var value = $('#search_value').val();

       var layername = $("#wfs_layers").val()
       activeSearchLayer = editor.layerManager.layerByName(layername);

       if (value) {
          value = value.split("\n")
          $(activeSearchLayer).one('gbi.layer.WFS.filter_applied', function(event) {
            $('#wfsSearchInProgress').hide()
            var foundFeaturesCount = activeSearchLayer.features.length;
            if(!foundFeaturesCount) {
              $('#no_features_found').show().fadeOut(3000);
            }
          });
          $('#wfsSearchInProgress').show()
          activeSearchLayer.filter(
            activeSearchLayer.olLayer.searchProperty, value, 'like', true
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

  var realHostName = window.location.hostname;
  var wmtsURL = OpenlayersCouchURL.replace(gbi.Helper.extractHostName(OpenlayersCouchURL), realHostName);

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
                    var cacheURL = false;
                    if(offline) {
                      cacheURL = OpenlayersCouchURL + metadata.name + '/GoogleMapsCompatible-{TileMatrix}-{TileCol}-{TileRow}/tile';
                      cacheURL = cacheURL.replace('{TileMatrix}', '${z}');
                      cacheURL = cacheURL.replace('{TileCol}', '${x}');
                      cacheURL = cacheURL.replace('{TileRow}', '${y}');
                    }
                    raster_sources.push(new gbi.Layers.WMTS({
                      name: metadata.title,
                      url: wmtsURL + metadata.name + '/GoogleMapsCompatible-{TileMatrix}-{TileCol}-{TileRow}/tile',
                      cacheURL: cacheURL,
                      sourceURL: metadata.source.url,
                      layer:  metadata.name,
                      format: metadata.source.format,
                      requestEncoding: 'REST'
                    }));
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
        element: 'layermanager',
        allowSeeding: offline
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
    toolbar.select.olControl.onUnselect = function(feature) {
      console.log('unselect')
      var layer = feature.layer.gbiLayer;

      layer.removeStoredFeature(feature);
      layer.storeFeatures(layer.olLayer.selectedFeatures);
    };

    var attributeEditor = new gbi.widgets.AttributeEditor(editor);
    editor.widgets.attributeEditor = attributeEditor;
    var styleEditor = new gbi.widgets.StyleEditor(editor);
    var pointStyleEditor = new gbi.widgets.PointStyleEditor(editor);

    var layerfilter = new gbi.widgets.Filter(editor, {
        element: 'filtermanager'
    });
    editor.widgets.layerfilter = layerfilter;
    var thematicalVector = new gbi.widgets.ThematicalVector(editor);
    editor.widgets.thematicalVector = thematicalVector;
    if(offline) {
      var seeding = new gbi.widgets.Seeding(editor);
      editor.widgets.seeding = seeding;
    }

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
