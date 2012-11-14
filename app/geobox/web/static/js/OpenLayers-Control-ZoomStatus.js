/* Copyright (c) 2006-2011 by OpenLayers Contributors (see authors.txt for
 * full list of contributors). Published under the Clear BSD license.
 * See http://svn.openlayers.org/trunk/openlayers/license.txt for the
 * full text of the license. */


/**
 * @requires OpenLayers/Control.js
 */

/**
 * Class: OpenLayers.Control.ZoomStatus
 * The ZoomStatus control displays the current zoom level.
 *
 * Inherits from:
 *  - <OpenLayers.Control>
 */
OpenLayers.Control.ZoomStatus = OpenLayers.Class(OpenLayers.Control, {

    /**
     * APIProperty: autoActivate
     * {Boolean} Activate the control when it is added to a map.  Default is
     *     true.
     */
    autoActivate: true,

    /**
     * Property: element
     * {DOMElement}
     */
    element: null,

    /**
     * APIProperty: prefix
     * {String}
     */
    prefix: '',

    /**
     * APIProperty: suffix
     * {String}
     */
    suffix: '',

    /**
     * APIProperty: emptyString
     * {String} Set this to some value to set when the mouse is outside the
     *     map.
     */
    emptyString: null,

    /**
     * Constructor: OpenLayers.Control.ZoomStatus
     *
     * Parameters:
     * options - {Object} Options for control.
     */

    /**
     * Method: destroy
     */
     destroy: function() {
         this.deactivate();
         OpenLayers.Control.prototype.destroy.apply(this, arguments);
     },

    /**
     * APIMethod: activate
     */
    activate: function() {
        if (OpenLayers.Control.prototype.activate.apply(this, arguments)) {
            this.map.events.register('moveend', this, this.redraw); // TODO are there other events as zoomend ???
            this.redraw();
            return true;
        } else {
            return false;
        }
    },

    /**
     * APIMethod: deactivate
     */
    deactivate: function() {
        if (OpenLayers.Control.prototype.deactivate.apply(this, arguments)) {
            this.map.events.unregister('moveend', this, this.redraw);
            this.element.innerHTML = "";
            return true;
        } else {
            return false;
        }
    },

    /**
     * Method: draw
     * {DOMElement}
     */
    draw: function() {
        OpenLayers.Control.prototype.draw.apply(this, arguments);

        if (!this.element) {
            this.div.left = "";
            this.div.top = "";
            this.element = this.div;
        }

        return this.div;
    },

    /**
     * Method: redraw
     */
    redraw: function(evt) {
        var zoom = this.map.getZoom();
        var newHtml = this.formatOutput(zoom);
        if (newHtml != this.element.innerHTML) {
            this.element.innerHTML = newHtml;
        }
    },

    /**
     * Method: reset
     */
    reset: function(evt) {
        if (this.emptyString != null) {
            this.element.innerHTML = this.emptyString;
        }
    },

    /**
     * Method: formatOutput
     * Override to provide custom display output
     *
     * Parameters:
     * zoom - {Number} The zoom factor to display
     */
    formatOutput: function(zoom) {
        return this.prefix + zoom + this.suffix;
    },

    CLASS_NAME: "OpenLayers.Control.ZoomStatus"
});
