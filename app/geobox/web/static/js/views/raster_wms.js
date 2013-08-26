   var activeLayer;
    var editor;
    var capa;
    $(document).ready(function() {
        editor = new OpenLayers.Map('map', {
            theme: OpenlayersThemeURL,
            controls: [
                new OpenLayers.Control.Navigation({
                documentDrag: true,
                dragPanOptions: {
                    interval: 1,
                    enableKinetic: true
                    }
                }),
                new OpenLayers.Control.PanZoomBar()
            ]
        });
        OpenLayers.ImgPath = OpenlayersImageURL || "../css/theme/default/img/";

        $("#layers_select").change(function() {
            $("#layer").val($(this).val());
        });

        $("#srs_select").change(function() {
            $("#srs").val($(this).val());
        });

        $("#getCapabilites").click(function() {
            var url = $("#url").val();
            if (url) {
                $.ajax({
                  type: 'GET',
                  async: true,
                  url: loadCapabilitiesURL,
                  data: { url: url },
                  success: function(response) {
                     $("#wms-capabilities-info").empty();
                    if (response.data.error) {
                        $("#wms-capabilities-info").html(response.data.error).show().fadeOut(4000)
                        return false;
                    } else {
                        $("#wms-capabilities-info").html(OpenLayers.i18n('load wms capabilities')).show().fadeOut(4000);
                    }

                    // Input values
                    $("#title").val(response.data.title)
                    $("#name").val(response.data.name);

                    // Layers
                    $('#layers_select').empty();
                    $.each(response.data.layer.layers, function(key, value) {
                        $('#layers_select').append('<option value="'+ value['name'] +'">'+ value['name'] +'</option>');
                    });
                    // SRS
                    $('#srs_select').empty();
                    $.each(response.data.layer.srs, function(key, value) {
                        var hasBBOX = false;
                        if (response.data.layer.bbox[value]) {
                            hasBBOX = true;
                        }
                        var option;
                        if (hasBBOX) {
                            option = '<option value="'+ value +'">**'+ value +'**</option>';
                        } else {
                            option = '<option value="'+ value +'">'+ value +'</option>';
                        }
                        $('#srs_select').append(option);
                    });
                    $("#srs").val( $('#srs_select').val());

                    $("#llbbox").val(response.data.layer.llbbox )
                    capa = response.data

                  }
                });
            }
            return false;
        });

        $("#mapPreview").click(function() {
            var url = $("#url").val()
            var title = $("#title").val();
            var layers = $("#layer").val();
            var srs = $("#srs").val();
            var format = $("#format").val();

            if (activeLayer) {
                editor.removeLayer(activeLayer)
            }

            var bboxArray = capa.layer.bbox
            bbox = bboxArray[srs]
            $("#wms-preview-info").empty().hide();
            if (bbox && layers) {
                editor.maxExtent = new OpenLayers.Bounds(bbox[0], bbox[1], bbox[2], bbox[3])
            } else {
                $("#wms-preview-info").html(OpenLayers.i18n('preview not possible')).show().fadeOut(5000);
                return false;
            }

            var projection = new OpenLayers.Projection(srs);
            editor.projection = projection;

            activeLayer = new OpenLayers.Layer.WMS( title,
                url, {
                    layers: layers,
                    srs : srs
                },
                {
                    singleTile: true,
                    ratio: 1.0
                }
            );

            editor.addLayer(activeLayer)

            editor.zoomToMaxExtent();
            return false;
        });


    });