window.onbeforeunload = function() {
  if($('#save-tab').hasClass('save-enabled')) {
    return OpenLayers.i18n("Unsaved changes present. Sure, you want to leave the editor?");
  }
};

$(document).ready(function() {
  var gbiLayerEvents = {
    'gbi.layer.vector.styleChanged': [enableSaveButton],
    'gbi.layer.saveableVector.unsavedChanges': [enableSaveButton],
    'gbi.layer.vector.ruleChanged': [enableSaveButton],
    'gbi.layer.vector.listAttributesChanged': [enableSaveButton],
    'gbi.layer.vector.popupAttributesChanged': [enableSaveButton],
    'gbi.layer.vector.featureAttributeChanged': [enableSaveButton],
    'gbi.layer.vector.schemaLoaded': [enableSaveButton],
    'gbi.layer.vector.schemaRemoved': [enableSaveButton],
    'gbi.layer.vector.featuresStored': [enableExportSelectedGeometriesButton],
    'gbi.layer.vector.featuresStoreCleared': [disableExportSelectedGeometriesButton],
    'gbi.layer.refreshed': [refreshWidgets, refreshJSONSchemaInput]
  };
  var olLayerEvents = {
    'featureselected': [storeSelectedFeatures, enableAttributeEdit],
    'featureunselected': [disableAttributeEdit]
  };

  var editor = initEditor();
  var activeLayer = editor.layerManager.active();

  var resizeTab = function() {
    var element = $('#editor-tabs');
    var browserHeight = $(window).height();
    var offsetTop = element.prop('offsetTop');
    element.css('max-height', browserHeight - offsetTop - 20);
  }

  resizeTab();
  $(window).resize(function() {
      resizeTab();
  });

  $.each(editor.layerManager.vectorLayers, function(idx, layer) {
    layer.registerEvent('featureselected', editor, updateArea)
    layer.registerEvent('featureunselected', editor, updateArea)
    layer.registerEvent('featuremodified', editor, updateArea)
  });

  $(gbi).on('gbi.layermanager.vectorlayer.add', function(event, layer) {
    layer.registerEvent('featureselected', editor, updateArea)
    layer.registerEvent('featureunselected', editor, updateArea)
    layer.registerEvent('featuremodified', editor, updateArea)
  });

  $('#exportVectorLayer form').submit(function(event) {
    if(!checkFilenameInput(this)) {
      event.preventDefault();
    }
  });

  $('#exportSelectedGeometries form').submit(function(event) {
    event.preventDefault();
    if(!checkFilenameInput(this)) {
      return
    }
    var form = $(this);
    var filename = form.find('#filename').val();
    var geojson = form.find('#geojson').val()
    $.ajax(form.attr('action'), {
      'type': 'POST',
      'data': {
        'filename': filename,
        'geojson': geojson,
        'title': filename
      }
    }).done(function(resp) {
      $('#exportSelectedGeometries').modal('hide');
      if(resp['error']) {
        $('#export_failed').show().fadeOut(3000);
      } else {
        $('#export_success').show().fadeOut(3000);
      }
    });
  });

  function checkFilenameInput(form) {
    var filename_input = $(form).find('#filename');
    if(!filename_input.val()) {
      filename_input.parent().parent().addClass('error');
      filename_input.after('<span class="help-inline">' + OpenLayers.i18n('Required') + '</span>');
      return false;
    }
    return true;
  }

  if(activeLayer.odataUrl) {
    $('#odata_url').val(activeLayer.odataUrl);
  }

  $('#tabs a').click(function (e) {
    e.preventDefault();
    $(this).tab('show');
  });

  $("#tabs > li > a ").click(function() {
    var tab = $(this).attr('href');

    // seeding widgets changes active layer back to real active layer when deactivate
    if(offline) {
      editor.widgets.seeding.deactivate();
    }

    var activeLayer = editor.layerManager.active();

    if(tab == '#thematical') {
      $(gbi).trigger('gbi.widgets.thematicalVector.activate', activeLayer);
    }

    if (editor.map.toolbars && editor.map.toolbars.length > 0) {
      $.each(editor.map.toolbars, function(id, toolbar) {
        toolbar.deactivateAllControls();

        if (activeLayer && toolbar.select && toolbar.select.olControl) {
          if(tab == '#edit') {
            var selectedFeatures = activeLayer.olLayer.selectedFeatures.slice();
            // select features with toolbar.select for unselecting
            $.each(selectedFeatures, function(idx, feature) {
              f_idx = $.inArray(feature, activeLayer.olLayer.selectedFeatures)
              if(f_idx != -1) {
                activeLayer.olLayer.selectedFeatures.splice(f_idx, 1);
                toolbar.select.olControl.select(feature);
              }
            });
          }
        }
        if (toolbar.select && toolbar.select.olControl && tab == '#edit') {
          toolbar.select.activate();
          $(gbi).off('gbi.layer.couch.loadFeaturesEnd');
          orderToolbar();
        }
      });
    }
    // sedding widgets changes active layer to its draw layer when activate
    if(offline && tab == '#seeding') {
      editor.widgets.seeding.activate();
    }
  });

  $('a[data-toggle="tab"]').on('shown', function (e) {
    if ($(e.relatedTarget).prop('id') == 'thematical-tab') {
     $(gbi).trigger('gbi.widgets.thematicalVector.deactivate');
    }

    if ($(e.relatedTarget).prop('id') == 'edit-tab') {
     $(gbi).trigger('gbi.widgets.attributeEditor.deactivate');
    }
  });

  $(gbi).on('gbi.layermanager.layer.active', function(event, layer) {
    unregisterEvents(activeLayer);
    activeLayer = layer;
    registerEvents(activeLayer);
    $(this).attr('disabled', 'disabled').removeClass('btn-success');
    $('.discard-changes-btn').attr('disabled', 'disabled').removeClass('btn-danger');
    $('#save-tab').removeClass('save-enabled');
    if(activeLayer.odataUrl) {
      $('#odata_url').val(activeLayer.odataUrl);
    }
    refreshSavePointList();

    refreshJSONSchemaInput();

    deactivateSaveDiscard();

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


  // activate / deactivate attribute edit mode block
  $('#activate_attribute_edit_mode').click(function() { activateEditMode(); })

  function activateEditMode() {
    var storedActiveControls
    if(!activeLayer) {
      return false;
    }
    if(activeLayer instanceof gbi.Layers.Vector) {
      var clickPopup = new gbi.Controls.ClickPopup({
        'editor': editor,
        'width': 190,
        'height': 45,
        'popupContent': '<div style="text-align: center;"><b>' + OpenLayers.i18n('Finish edit first') + '</b></div>'
      });
      editor.map.addControl(clickPopup);
      clickPopup.olControl.activate();
      var activeToolbar = false;
      $.each(self.editor.map.toolbars, function(idx, toolbar) {
        if ($(toolbar.options.div).is(':visible')) {
          activeToolbar = toolbar;
        }
      });
      if(activeToolbar) {
        storedActiveControls = activeToolbar.activeControls();
        activeToolbar.deactivateAllControls();
        $('#attribute-edit-mode').find('#save_btn').click(function() {
          editor.widgets.attributeEditor.saveChanges();
          deactivateEditMode(activeLayer, storedActiveControls, clickPopup)
        });
        $('#attribute-edit-mode').find('#cancel_btn').click(function() {
          deactivateEditMode(activeLayer, storedActiveControls, clickPopup)
        });
      }

      $('#edit-toolbar-mode').addClass('hide');
      $('#attribute-edit-mode').removeClass('hide');
      $('#json-schema-container button').attr('disabled', 'disabled');
      $('#disable-overlay').removeClass('hide')
      editor.widgets.attributeEditor.activateEditMode();
    }
  };

  function deactivateEditMode(activeLayer, storedActiveControls, clickPopup) {
    editor.widgets.attributeEditor.deactivateEditMode();
    $.each(storedActiveControls, function(idx, control) {
      control.activate();
      if(control instanceof gbi.Controls.Select) {
        var selectedFeatures = activeLayer.selectedFeatures().slice();
        activeLayer.unSelectAllFeatures();
        $.each(selectedFeatures, function(idx, feature) {
          control.selectFeature(feature);
        });
      }
    });
    $('#edit-toolbar-mode').removeClass('hide');
    $('#attribute-edit-mode').addClass('hide');
    $('#json-schema-container button').removeAttr('disabled');
    $('#disable-overlay').addClass('hide');
    editor.map.removeControl(clickPopup);
    clickPopup.destroy();
    delete clickPopup
  };

  // end attribute edit mode block

  $('#export_type').change(function() {
    if($(this).val() == 'odata') {
      $('#srs').hide().prev().hide();
      $('#destination').hide().prev().hide();
      $('#odata_url').parent().parent().show();
      $('#odata_help_text').show();
    } else {
      $('#srs').show().prev().show();
      $('#destination').show().prev().show();
      $('#odata_url').parent().parent().hide();
      $('#odata_help_text').hide();
    }
  }).change();

  // save-button enabeling events
  $('.save-changes-btn').click(function() {
    if(activeLayer) {
      activeLayer.save();
      activeLayer._saveMetaDocument();
    }
    deactivateSaveDiscard();
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
        newLayer.visible(false);
      } else {
        //  create couch to save layer and copy features
        newLayer = new gbi.Layers.Couch({
          name: newName,
          title: newTitle,
          url: OpenlayersCouchURL,
          displayInLayerSwitcher: true,
          createDB: false,
          visibility: false,
          loadStyle: false,
          callbacks: {
            changes: function(unsavedChanges) {
              if(unsavedChanges) {
                $('#save_changes').removeAttr('disabled').addClass('btn-success');
              } else {
                $('#save_changes').attr('disabled', 'disabled').removeClass('btn-success');
              }
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
      editor.widgets.layermanager.render();
      $('#save_as_success #new_layer_name').text(newTitle)
      $('#save-as-name').val('');
      $('#save_as_success').show().fadeOut(3000);
    } else {
      $('#save_as_error').show().fadeOut(3000);
    }
  });

  $('.discard-changes-btn').click(function() {
    if(activeLayer) {
      activeLayer.unSelectAllFeatures();
      activeLayer.refresh();
    }
    deactivateSaveDiscard();
  });

  function deactivateSaveDiscard() {
    $('.save-changes-btn').attr('disabled', 'disabled').removeClass('btn-success');
    $('.discard-changes-btn').attr('disabled', 'disabled').removeClass('btn-danger');
    $('#save-tab').removeClass('save-enabled');
    $('#export_vectorlayer').removeAttr('disabled');
    enableExportSelectedGeometriesButton();
  }

  orderToolbar();
  if(activeLayer) {
    registerEvents(activeLayer);
  }

  function storeSelectedFeatures(f) {
    var layer = f.feature.layer.gbiLayer;
    var selectedFeatures = f.feature.layer.selectedFeatures;
    layer.storeFeatures(selectedFeatures);
  };

  function removeStoredFeature(f) {
    var layer = f.feature.layer.gbiLayer;
    layer.removeStoredFeature(f.feature);
  }
  function orderToolbar() {
    var toolbarButton = $('#edit-toolbar .olButton');
    var toolbarWork = ['DrawFeaturePoint', 'DrawFeatureLine', 'DrawFeaturePolygon'];
    if ($('#toolbar-draw').length == 0) {
      $('#edit-toolbar').append(
        '<div id="toolbar-draw" class="span12">'+
        '</div><div id="toolbar-work"></div>'
      );
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
    $.each(gbiLayerEvents, function(type, funcList) {
      $.each(funcList, function(idx, func) {
        $(layer).on(type, func);
      });
    });
    if(layer) {
      $.each(olLayerEvents, function(type, funcList) {
        $.each(funcList, function(idx, func) {
          layer.registerEvent(type, editor, func);
        });
      });
    }
  };

  function unregisterEvents(layer) {
    $.each(gbiLayerEvents, function(type, funcList) {
      $.each(funcList, function(idx, func) {
        $(layer).off(type, func);
      });
    });
    if(layer) {
      $.each(olLayerEvents, function(type, funcList) {
        $.each(funcList, function(idx, func) {
          layer.unregisterEvent(type, editor, func);
        })
      });
    }
  };

  function updateArea() {
    var area = 0;
    $.each(editor.layerManager.vectorLayers, function(idx, layer) {
      $.each(layer.selectedFeatures(), function(idx, feature) {
        if($.isFunction(feature.geometry.getGeodesicArea)) {
          area += feature.geometry.getGeodesicArea(new OpenLayers.Projection('EPSG:3857'));
        }
      });
    });
    $('#selected-area-label').removeClass('hide');
    $('#drawn-area-label').addClass('hide');
    displayArea(area);
  };

  function enableAttributeEdit() {
    if(activeLayer.selectedFeatures().length > 0) {
      $('#activate_attribute_edit_mode').removeAttr('disabled');
    }
  }

  function disableAttributeEdit() {
    if(activeLayer.selectedFeatures().length < 1) {
      $('#activate_attribute_edit_mode').attr('disabled', 'disabled');
    }
  }

  function enableSaveButton() {
    if(activeLayer instanceof gbi.Layers.Couch) {
      $('#save-tab').addClass('save-enabled');
      $('.save-changes-btn').removeAttr('disabled').addClass('btn-success');
      $('.discard-changes-btn').removeAttr('disabled').addClass('btn-danger');
      $('#export_vectorlayer, #export_selected_geometries').attr('disabled', 'disabled');
    }
  };

  function enableExportSelectedGeometriesButton() {
    if(activeLayer && !$('#save-tab').hasClass('save-enabled') && activeLayer.storedFeatures().length > 0) {
      $('#export_selected_geometries').removeAttr('disabled');
    }
  }

  function disableExportSelectedGeometriesButton() {
    $('#export_selected_geometries').attr('disabled', 'disabled');
  }

  function refreshWidgets() {
    $.each(editor.widgets, function(name, widget) {
      if($.isFunction(widget.render)) {
        widget.render();
      }
    });
  }

  // json schema block
  $('#add_json_schema_url').click(function() {
    if(activeLayer) {
      $(activeLayer).on('gbi.layer.vector.schemaLoaded', function(event, schema) {
        $('#json_schema_refreshed').show().fadeOut(3000);
        $(activeLayer).off('gbi.layer.vector.schemaLoaded');
        $(activeLayer).off('gbi.layer.vector.loadSchemaFail');
        refreshJSONSchemaInput()
      });
      $(activeLayer).on('gbi.layer.vector.loadSchemaFail', function(event, schema) {
        $('#json_schema_load_fail').show().fadeOut(3000);
        $(activeLayer).off('gbi.layer.vector.schemaLoaded');
        $(activeLayer).off('gbi.layer.vector.loadSchemaFail');
      });
      var schemaURL = $('#json_schema_url').val();
      activeLayer.unSelectAllFeatures();
      activeLayer.addSchemaFromUrl(schemaURL);
    } else {
      $('#json_schema_no_active_layer').show().fadeOut(3000);
    }
  });

  $('#refresh_json_schema').click(function() {
    $(activeLayer).on('gbi.layer.vector.schemaLoaded', function(event, schema) {
      $(activeLayer).off('gbi.layer.vector.schemaLoaded');
      $(activeLayer).off('gbi.layer.vector.loadSchemaFail');
      $('#json_schema_refreshed').show().fadeOut(3000);
      refreshJSONSchemaInput();
    });
    $(activeLayer).on('gbi.layer.vector.loadSchemaFail', function(event, schema) {
      $('#json_schema_refresh_fail').show().fadeOut(3000);
      $(activeLayer).off('gbi.layer.vector.schemaLoaded');
      $(activeLayer).off('gbi.layer.vector.loadSchemaFail');
    });
    activeLayer.addSchemaFromUrl(activeLayer.options.jsonSchemaUrl);
  });
  $('#remove_json_schema').click(function() {
      activeLayer.removeJsonSchema();
      refreshJSONSchemaInput();
  });

  function refreshJSONSchemaInput() {
    if(activeLayer && activeLayer.jsonSchema) {
      $('#json_schema_url').val(activeLayer.options.jsonSchemaUrl);
      $('#add_json_schema_url').addClass('hide');
      $('#refresh_json_schema').removeClass('hide');
      $('#remove_json_schema').removeClass('hide');
    } else {
      $('#json_schema_url').val('');
      $('#add_json_schema_url').removeClass('hide');
      $('#refresh_json_schema').addClass('hide');
      $('#remove_json_schema').addClass('hide');
    }
    editor.widgets.attributeEditor.setJsonSchema(activeLayer.jsonSchema || false);
  }

  refreshJSONSchemaInput();
  // end json schema block

  $("#export_vectorlayer").click(function() {
    var layer = activeLayer;
    if(layer) {
      var features = editor.widgets.attributeEditor.selectedFeatures;
      // add value to hiddenfoelds
      $("#exportVectorLayer input#name").val(layer.olLayer.name);
      if (features && features.length != 0) {
        var geoJSON = new OpenLayers.Format.GeoJSON();
        var geoJSONText = geoJSON.write(features);
        $("#exportVectorLayer input#geojson").val(geoJSONText);
      }

      // add filename
      $("#exportVectorLayer input#filename").val(layer.olLayer.name);
      // show modal
      $('#exportVectorLayer').modal('show');
      $('#exportVectorLayer').on('hidden', function () {
        $('#remove_layer').off('click');
        $('#deleteVectorLayer').off('hidden');
       });
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

  $('#disable-overlay').click(function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  })

  var wmsSearchResults = []

  function prepareSeedableWMSMetadata(layer, title, url, bbox) {
    var name = 'external_wms_tiles_' + layer;
    var metadata = {
      'name': name,
      'title': title,
      'type': 'tiles',
      'levelMin': 0,
      'levelMax': 18,
      'source': {
        'url': url,
        'srs': 'EPSG:3857',
        'type': 'wms',
        'layers': [layer],
        'format': 'image/png'
      }
    };
    if(bbox) {
      metadata.source.bbox = bbox;
    }
    return metadata;
  }

  function createCouchTileStore(layer, metadata) {

    var couchdbURL = OpenlayersCouchURL + metadata.name;

    $.ajax({
      url: couchdbURL,
      async: false
    }).fail(function(response) {
      // create new couchdb
      $.ajax({
          type: 'put',
          url: couchdbURL,
          async: false
      }).done(function(response) {
        $.ajax({
          type: 'put',
          url: couchdbURL + '/metadata',
          async: false,
          data: JSON.stringify(metadata),
          contentType: 'application/json',
          processData: false
        });
      });
    })
    return couchdbURL;
  }

  function addWMSSearchResultLayer(wms_id, layer_id) {
    var wms = wmsSearchResults[wms_id];
    var _layer = wms['layer'][layer_id];
    var options = {
      name: _layer.title,
      url: wms.getMapUrl,
      layer: _layer.name,
      params: {
        layers: [_layer.name],
        format: 'image/png',
        transparent: true
      }
    }
    var bbox = _layer['bbox'] || wms['bbox'] || false;
    if(bbox) {
      var bounds = new OpenLayers.Bounds.fromString(bbox).transform(new OpenLayers.Projection('EPSG:4326'), editor.map.options.projection);
      options.maxExtent = bounds;
      options.singleTile = false;
    }

    var layerConstructor = gbi.Layers.WMS;

    if(offline && wms.openData) {
      options.data = prepareSeedableWMSMetadata(_layer.name, _layer.title, wms.getMapUrl, bbox);
      var couchURL = createCouchTileStore(options.data);
      options.sourceURL = 'http://localhost:8888/proxy/' + wms.getMapUrl;
      options.url = couchURL + '/GoogleMapsCompatible-{TileMatrix}-{TileCol}-{TileRow}/tile';
      options.singleTile = false;
      options.sourceType = 'wms';
      options.requestEncoding = 'REST';
      layerConstructor = gbi.Layers.SMS;
    }
    var layer = new layerConstructor(options);
    editor.addLayer(layer);
    if(offline) {
      editor.widgets.seeding.render();
    }
    $('#layermanager #collapseRaster').collapse('show')
  }

  function searchWMS() {
    $.get(wmsSearchURL, {
        'languageCode': 'de',
        'maxResults': 40,
        'resultTarget': 'web',
        'searchText': $('#wms_search_text').val()
      }, null, 'json'
    ).done(function(data) {
      if(data && data['wms'] && data['wms']['srv'] && data['wms']['srv'].length > 0) {
        wmsSearchResults = data['wms']['srv'];
        $('#wmsSearchResults tbody').empty();
        $.each(wmsSearchResults, function(idx, wms) {
          var container = $('<tr ></tr>');
          var wmsServerTitle = $('<td rowspan="' + (wms.layer.length + 1) + '">' + wms['title'] + '</td>');
          if(wms['abstract']) {
            var tooltip = $('<span class="tooltip_element icon-info-sign" title="' + wms['abstract'] + '"></span>');
            tooltip.tooltip();
            wmsServerTitle.append(tooltip);
          }
          container.append(wmsServerTitle);
          $('#wmsSearchResults tbody').append(container);
          var wmsLayerList = $('<tr></tr>');
          $.each(wms['layer'], function(l_idx, layer) {
            var layerContainer = $('<tr></tr>');
            var layerTitle = $('<td>' + layer['title'] + '</td>');
            if(layer['abstract']) {
              var tooltip = $('<span class="tooltip_element icon-info-sign" title="' + layer['abstract'] + '"></span>');
              tooltip.tooltip();
              layerTitle.append(tooltip);
            }
            layerContainer.append(layerTitle);
            var addLayerBtn = $('<button class="btn btn-small" data-wms_id="' + idx + '" data-layer_id="' + l_idx + '"><i class="icon-plus"></i></button>');
            addLayerBtn.click(function() {
              addWMSSearchResultLayer($(this).data('wms_id'), $(this).data('layer_id'));
              $(this)
                .attr('disabled', 'disabled')
                .find('i')
                  .removeClass('icon-plus')
                  .addClass('icon-ok')
            });
            layerContainer.append($('<td></td>').append(addLayerBtn));
            $('#wmsSearchResults tbody').append(layerContainer);
          });
        });
        $('#wmsSearchResultsModal').modal('show')
      } else {
        wmsSearchResults = [];
        $('#noWMSSearchResults').removeClass('hide').show().fadeOut(3000)
      }
    })
  .fail(function(data) {
    wmsSearchResults = [];
    $('#noWMSSearchResults').removeClass('hide').show().fadeOut(3000)
  });
  };

  $('#start_wms_search_btn').click(searchWMS)
});

function displayArea(area) {
  area /= 10000;
  area = Math.round(area*100000)/100000;
  $('#measure-result')
    .empty()
    .text(area);
};

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
                      if(unsavedChanges) {
                        $('#save_changes').removeAttr('disabled').addClass('btn-success');
                      } else {
                        $('#save_changes').attr('disabled', 'disabled').removeClass('btn-success');
                      }
                    }
                  }
                }));
              }

              if (metadata.type == 'tiles') {
                var layerConstructor = offline ? gbi.Layers.SMS : gbi.Layers.WMTS;
                var options = {
                  name: metadata.title,
                  url: wmtsURL + metadata.name + '/GoogleMapsCompatible-{TileMatrix}-{TileCol}-{TileRow}/tile',
                  sourceURL: metadata.source.url,
                  layer:  metadata.name,
                  format: metadata.source.format,
                  data: metadata,
                  requestEncoding: 'REST',
                  sourceType: metadata.source.type
                }
                if(offline && options.sourceType == 'wms') {
                  options['params'] = {
                    layers: metadata.source.layers,
                    format: 'image/png',
                    transparent: true
                  }
                }
                raster_sources.push(new layerConstructor(options));
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
      theme: OpenlayersThemeURL,
      autoResize: true,
      autoResizeSpaceBelowMap: 20
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
    editor.layerManager.active(tmp_vectorLayer)
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
      'drawPolygon': false,
      'select': true,
      'edit': true,
      'split': true,
      'merge': true,
      'copy': true,
      'delete': true
    }
  });

  // move div into viewport
  $('#measure-result-container')
    .appendTo($('.olMapViewport'))
    .removeClass('hide')

  var measuredDraw = new gbi.Controls.MeasuredDraw(toolbar.vectorActive, {
    measureCallback: function(result) {
      $('#selected-area-label').addClass('hide');
      $('#drawn-area-label').removeClass('hide');
      var target = $('#measure-result');
      target.empty()
      var area = result.measure;
      if(result.units == 'km') {
        area *= 1000;
      }
      displayArea(area);
    }
  });

  toolbar.addControl(measuredDraw)
  toolbar.select.deactivate();
  toolbar.select.olControl.onUnselect = function(feature) {
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
  var thematicalVector = new gbi.widgets.ThematicalVector(editor, {'filterWidget': layerfilter});
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
