OpenLayers.Control.DeleteFeature = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(layer, options) {
        if(options) {
            this.selectControl = options.selectControl || null;
            delete options.selectControl;
            this.modifyControl = options.modifyControl || null;
            delete options.modifyControl;
        }
        OpenLayers.Control.prototype.initialize.apply(this, [OpenLayers.Util.extend(options, {type: OpenLayers.Control.TYPE_BUTTON})]);
        this.layer = layer;

        if(!this.selectControl && !this.modifyControl) {
            this.handler = new OpenLayers.Handler.Feature(
                this, layer, {click: this.clickFeature}
            );
        }
    },
    clickFeature: function(feature) {
        this._deleteFeature(feature);
    },
    _deleteFeature: function(feature) {
        if(this.selectControl) {
            this.selectControl.unselect(feature);
        }
        if(this.modifyControl) {
            this.modifyControl.selectControl.unselect(feature);
        }
        // if feature doesn't have a fid, destroy it
        if(feature.fid == undefined) {
            this.layer.destroyFeatures([feature]);
        } else {
            feature.state = OpenLayers.State.DELETE;
            this.layer.events.triggerEvent("afterfeaturemodified", {feature: feature});
            feature.renderIntent = "select";
            this.layer.drawFeature(feature);
        }
    },
    deleteSelectedFeatures: function() {
        var self = this;
        var features = this.layer.selectedFeatures;
        while(features[0]) {
            this._deleteFeature(features[0]);
        };
    },
    setMap: function(map) {
        if(this.handler) {
            this.handler.setMap(map);
        }
        OpenLayers.Control.prototype.setMap.apply(this, arguments);
    },
    setSelectControl: function(selectControl) {
        this.selectControl = selectControl;
        this.handler = null;

    },
    setModifyControl: function(modifyControl) {
        this.modifyControl = modifyControl;
        this.handler = null;
    },
    setLayer: function(layer) {
        this.layer = layer;
        this.handler = new OpenLayers.Handler.Feature(
            this, layer, {click: this.clickFeature}
        );
        this.handler.setMap(layer.map);
    },
    trigger: function() {
        this.deleteSelectedFeatures();
        if(this.selectControl) {
            this.selectControl.deactivate();
        }
        if(this.modifyControl) {
            this.modifyControl.deactivate();
        }
    },

    CLASS_NAME: "OpenLayers.Control.DeleteFeature"
});

OpenLayers.Control.SplitFeature = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        var self = this;
        this.layer = layer;
        this.feature_to_split = null;

        this._select = new OpenLayers.Control.SelectFeature(layer, {});
        this._select.setMap(layer.map);
        this._select.events.on({
            featurehighlighted: function(e) {
                self.feature_to_split = e.feature;
                self._select.deactivate();
                self._draw.activate();
            }
        });

        this._draw = new OpenLayers.Control.DrawFeature(layer, OpenLayers.Handler.Path, {});
        this._draw.setMap(layer.map)
        this._draw.events.on({
            featureadded: function(e) {
                var split_line = e.feature;
                self.layer.addFeatures(self._split(split_line, self.feature_to_split));
                split_line.destroy();
                self._draw.deactivate();
                self.deactivate();

            }
        });
    },

    setLayer: function(layer) {
        this.layer = layer;
        this._select.setLayer(layer);
        this._draw.layer = layer;

    },
    activate: function() {
        var activated = OpenLayers.Control.prototype.activate.call(this);
        if(activated) {
            this._select.activate();
        }
    },
    _split: function(line_feature, polygon_feature) {
        if (line_feature.geometry.intersects(polygon_feature.geometry)) {
            var new_features = []
            var jstsFromWkt = new jsts.io.WKTReader();
            var wktFromOl = new OpenLayers.Format.WKT();
            var olFromJsts = new jsts.io.OpenLayersParser();
            var polygonizer = new jsts.operation.polygonize.Polygonizer();

            var line = jstsFromWkt.read(wktFromOl.write(line_feature));
            var polygon = jstsFromWkt.read(wktFromOl.write(polygon_feature));

            //XXXkai: intersection don't work as expected
            // var intersection = line.intersection(polygon);
            // var union = polygon.getExteriorRing().union(intersection);
            var union = polygon.getExteriorRing().union(line);

            polygonizer.add(union);

            var polygons = polygonizer.getPolygons();
            for(var p_iter = polygons.iterator(); p_iter.hasNext();) {
                var polygon = p_iter.next();

                var feature = new OpenLayers.Feature.Vector(olFromJsts.write(polygon), polygon_feature.attributes);
                new_features.push(feature);
            }
            polygon_feature.destroy();
            return new_features;
        } else {
            return [polygon_feature];
        }
    },
    destroy: function() {
        this._draw.destroy();
        this._select.destroy();
        OpenLayers.Control.prototype.destroy.apply(this, []);
    },

    CLASS_NAME: "OpenLayers.Control.SplitFeature"
});

OpenLayers.Control.MergeFeatures = OpenLayers.Class(OpenLayers.Control, {
    initialize: function(layer, options) {
        OpenLayers.Control.prototype.initialize.apply(this, [options]);
        this.layer = layer;
    },
    setLayer: function(layer) {
        this.layer = layer;
    },
    activate: function() {
        if(this.layer.selectedFeatures.length > 1) {
            this.layer.addFeatures(this._merge(this.layer.selectedFeatures));
            this.layer.removeFeatures(this.layer.selectedFeatures);
        }
        this.deactivate();
    },
    _merge: function(polygon_features) {
        var reader = new jsts.io.WKTReader();
        var wkt = new OpenLayers.Format.WKT();
        var parser = new jsts.io.OpenLayersParser();
        var union = false;
        for(var i = 0; i < polygon_features.length; i++) {
            if(!union) {
                union = reader.read(wkt.write(polygon_features[i]));
            } else {
                var polygon_wkt = reader.read(wkt.write(polygon_features[i]));
                union = union.union(polygon_wkt);
            }
        }
        return [new OpenLayers.Feature.Vector(parser.write(union))];
    },

    CLASS_NAME: "OpenLayers.Control.MergeFeatures"
});

OpenLayers.Format.CouchDB = OpenLayers.Class(OpenLayers.Format.GeoJSON, {
    read: function(json, type, filter) {
        var results = [];
        var obj = null;
        if (typeof json == "string") {
            obj = OpenLayers.Format.JSON.prototype.read.apply(this, [json, filter]);
        } else {
            obj = json;
        }
        if(!obj) {
            OpenLayers.Console.error("Bad JSON: " + json);
        } else if(obj.rows) {
            for(var i = 0; i < obj.rows.length; i++) {
                var geojson = obj.rows[i].doc;
                if(geojson.type && geojson.geometry) {
                    var feature = OpenLayers.Format.GeoJSON.prototype.read.apply(this, [geojson, geojson.type, filter]);
                    feature.fid = geojson._id;
                    feature._rev = geojson._rev;
                    feature._drawType = geojson.drawType;
                    results.push(feature)
                }
            }
        }
        return results
    },
    writeBulk: function(obj, pretty) {
        var bulk = {
            "docs": []
        };
        if(OpenLayers.Util.isArray(obj)) {
            var numFeatures = obj.length;
            features = new Array(numFeatures);
            for(var i=0; i<numFeatures; i++) {
                var geojson = this._prepareGeoJSON(obj[i]);
                bulk.docs.push(geojson)
            }
        }
        return OpenLayers.Format.JSON.prototype.write.apply(this, [bulk, pretty]);
    },
    write: function(obj, pretty) {
        var geojson = this._prepareGeoJSON(obj);
        return OpenLayers.Format.JSON.prototype.write.apply(this, [geojson, pretty]);
    },
    _prepareGeoJSON: function(element) {
        if(!element instanceof OpenLayers.Feature.Vector) {
            var msg = "Only OpenLayers.Feature.Vector is supported. " +
                      "Feature was: " + element;
            throw msg;
        }
        var geojson = OpenLayers.Format.GeoJSON.prototype.extract.feature.apply(this, [element]);
        if(element.fid) {
            geojson._id = element.fid;
        }
        if(element._rev) {
            geojson._rev = element._rev;
        }
        if(element._deleted) {
            geojson._deleted = element._deleted;
        }
        if(element._drawType) {
            geojson.drawType = element._drawType;
        }
        return geojson;
    },

    CLASS_NAME: "OpenLayers.Format.GeoCouch"
});

OpenLayers.Protocol.CouchDB = OpenLayers.Class(OpenLayers.Protocol.HTTP, {
    initialize: function(options) {
        OpenLayers.Util.extend(options, {'headers': {'Content-Type': 'application/json'}, callback: this.cb});
        OpenLayers.Protocol.HTTP.prototype.initialize.apply(this, arguments);

    },

    read: function(options) {
        options.url = this.options.url + this.options.readExt;
        return OpenLayers.Protocol.HTTP.prototype.read.apply(this, [options]);
    },
    commit: function(features, options) {
        var self = this;
        var bulkCommit = [];
        var updates = [];
        var inserts = [];
        options = OpenLayers.Util.applyDefaults(options, this.options);

        for(var i=0; i < features.length; i++) {
            if(features[i].state != null) {
                if(features[i].state == OpenLayers.State.DELETE) {
                    features[i]._deleted = true;
                    bulkCommit.push(features[i]);
                } else if(features[i].state == OpenLayers.State.UPDATE) {
                    updates.push(features[i]);
                } else {
                    inserts.push(features[i]);
                }
            }
        }
        if(bulkCommit.length > 0) {
            var resp = new OpenLayers.Protocol.Response({reqFeatures: bulkCommit});
            resp.priv = OpenLayers.Request.POST({
                url: this.options.url + this.options.bulkExt,
                headers: options.headers,
                data: this.format.writeBulk(bulkCommit),
                callback: this.createCallback(this.handleResponse, resp, options),
                success: function(response) {
                    self.handleCommitResponse(resp);
                }
            });
        }
        for(var i=0;i<inserts.length; i++) {
            var resp = new OpenLayers.Protocol.Response({reqFeatures: [inserts[i]]});
            resp.priv = OpenLayers.Request.POST({
                url: this.options.url,
                headers: options.headers,
                data: this.format.write(inserts[i]),
                callback: this.createCallback(this.handleResponse, resp, options),
                success: function() {
                    self.handleCommitResponse(resp);
                }
            });
        }
        for(var i=0;i<updates.length; i++) {
            var resp = new OpenLayers.Protocol.Response({reqFeatures: [updates[i]]});
            resp.priv = OpenLayers.Request.PUT({
                url: this.options.url + updates[i].fid,
                headers: options.headers,
                data: this.format.write(updates[i]),
                callback: this.createCallback(this.handleResponse, resp, options),
                success: function() {
                    self.handleCommitResponse(resp);
                }
            });
        }
    },
    handleCommitResponse: function(response) {
        var format = new OpenLayers.Format.JSON();
        var responseJSON = format.read(response.priv.responseText);

        //only deletes handle more than one feature at a time
        if(response.reqFeatures.length == 1) {
            var feature = response.reqFeatures[0];
            feature.fid = responseJSON.id;
            feature._rev = responseJSON.rev;
        }
    },
    CLASS_NAME: "OpenLayers.Protocol.CouchDB"
});

/**
 * @requires OpenLayers/Protocol/WFS/v1_1_0.js
 */

/**
 * Class: OpenLayers.Protocol.WFS.v1_1_0_ordered
 * Get attribute order by calling WFSDescribeFeatureType
 *
 * Inherits from:
 * - <OpenLayers.Protocol.WFS.v1_0_0>
 */

OpenLayers.Protocol.WFS.v1_1_0_ordered = OpenLayers.Class(OpenLayers.Protocol.WFS.v1_1_0, {

    version: "1.1.0",

    attribute_order: false,

    initialize: function(options) {
        this.get_attribute_order(options.schema)
        this.formatOptions = OpenLayers.Util.extend({
            attribute_order: this.attribute_order
        }, this.formatOptions);
        OpenLayers.Protocol.WFS.v1_1_0.prototype.initialize.apply(this, arguments);
    },

    /**
     * Method: get_attribute_order
     * Load attribute order for INSERT by calling WFSDescribeFeatureType
     *
     * Parameters:
     * url - {String} URL of WFS server
     */
    get_attribute_order: function(url) {
        var response = OpenLayers.Request.GET({
            url: url,
            async: false
        });
        var feature_type_parser = new OpenLayers.Format.WFSDescribeFeatureType();
        try {
            var properties = feature_type_parser.read(response.responseText).featureTypes[0].properties;
        } catch(e) {
            var properties = false;
        }
        if(properties) {
            var attribute_order = [];
            var attribute_types = {};
            for(var idx in properties) {
                attribute_order.push(properties[idx].name);
                attribute_types[properties[idx].name] = properties[idx].type;
            }
            this.attribute_order = attribute_order;
            this.attribute_types = attribute_types;
        }

    },

    CLASS_NAME: "OpenLayers.Protocol.WFS.v1_1_0_ordered"
});

OpenLayers.Protocol.WFS.v1_1_0_ordered_get = OpenLayers.Class(OpenLayers.Protocol.WFS.v1_1_0_ordered, {

    read: function(options) {
        OpenLayers.Protocol.prototype.read.apply(this, arguments);
        options = OpenLayers.Util.extend({}, options);
        OpenLayers.Util.applyDefaults(options, this.options || {});
        var response = new OpenLayers.Protocol.Response({requestType: "read"});
        if(options.additional_feature_ns) {
            this.format.setNamespace('feature', options.additional_feature_ns);
        }
        response.priv = OpenLayers.Request.GET({
            url: options.url + '&request=getfeature&service=wfs&version='+this.format.version+'&srsName='+options.srsName+'&typename='+options.typename,
            callback: this.createCallback(this.handleRead, response, options),
            params: options.params
        })
        return response
    },
    CLASS_NAME: "OpenLayers.Protocol.WFS.v1_1_0_ordered_get"
});


/**
 * @requires OpenLayers/Format/WFST/v1_1_0.js
 */
OpenLayers.Format.WFST.v1_1_0_ordered_get = OpenLayers.Format.WFST.v1_1_0_ordered = OpenLayers.Class(
    OpenLayers.Format.WFST.v1_1_0, {

        version: "1.1.0",

        attribute_order: false,

        initialize: function(options) {
            //replace version by original wfst version number
            options.version = this.version
            OpenLayers.Format.WFST.v1_1_0.prototype.initialize.apply(this, [options]);
        },
        readers: {
            "wfs": OpenLayers.Format.WFST.v1_1_0.prototype.readers["wfs"],
            "gml": OpenLayers.Format.WFST.v1_1_0.prototype.readers["gml"],
            "feature": OpenLayers.Format.WFST.v1_1_0.prototype.readers["feature"],
            "ogc": OpenLayers.Format.WFST.v1_1_0.prototype.readers["ogc"],
            "ows": OpenLayers.Format.WFST.v1_1_0.prototype.readers["ows"]
        },
        writers: {
            "wfs": OpenLayers.Format.WFST.v1_1_0.prototype.writers["wfs"],
            "gml": OpenLayers.Format.WFST.v1_1_0.prototype.writers["gml"],
            "feature": OpenLayers.Util.applyDefaults({
                "_typeName": function(feature) {
                    if(this.attribute_order) {
                        var node = this.createElementNSPlus("feature:" + this.featureType, {
                            attributes: {fid: feature.fid}
                        });
                        for(var idx in this.attribute_order) {
                            var prop = this.attribute_order[idx]
                            if(prop == this.geometryName) {
                                this.writeNode("feature:_geometry", feature.geometry, node);
                            } else {
                                var value = feature.attributes[prop];
                                if(value != null) {
                                    this.writeNode(
                                        "feature:_attribute",
                                        {name: prop, value: value}, node
                                    );
                                }
                            }
                        }
                        return node;
                    } else {
                        return OpenLayers.Format.WFST.v1_1_0.prototype.writers["feature"]["_typeName"].call(this, feature);
                    }
                }
            }, OpenLayers.Format.WFST.v1_1_0.prototype.writers["feature"]),
            "ogc": OpenLayers.Format.WFST.v1_1_0.prototype.writers["ogc"],
            "ows": OpenLayers.Format.WFST.v1_1_0.prototype.writers["ows"]
        },

        CLASS_NAME: "OpenLayers.Format.WFST.v1_1_0_ordered"
});

