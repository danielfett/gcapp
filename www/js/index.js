
// Add rotation to jQuery
(function($){
 var _e = document.createElement("canvas").width
 $.fn.cssrotate = function(d) {
    return this.css({
  '-moz-transform':'rotate('+d+'deg)',
  '-webkit-transform':'rotate('+d+'deg)',
  '-o-transform':'rotate('+d+'deg)',
  '-ms-transform':'rotate('+d+'deg)'
 }).prop("rotate", _e ? d : null)
 };
 var $_fx_step_default = $.fx.step._default;
 $.fx.step._default = function (fx) {
 if(fx.prop != "rotate")return $_fx_step_default(fx);
 if(typeof fx.elem.rotate == "undefined")fx.start = fx.elem.rotate = 0;
 $(fx.elem).cssrotate(fx.now)
 };
})(jQuery);

// the UI
var ui = {
  initialize: function() {
    console.debug("Initializing User Interface.");
    try {
      navigator.compass.watchHeading(
        this.onCompassUpdate,
        this.onCompassError);
    } catch (e) {
      console.debug("Unable to initialize compass: " + e);
    }

    /* now for the map */
    this.vectorLayer = new OpenLayers.Layer.Vector("My Layer", {
      style: OpenLayers.Feature.Vector.style["default"]
    });

    this.map = new OpenLayers.Map({
      div: "map",
      theme: null,
      controls: [
        new OpenLayers.Control.Attribution(),
        new OpenLayers.Control.TouchNavigation({
          dragPanOptions: {
            enableKinetic: true
          }
        }),
        new OpenLayers.Control.Zoom(),
        new OpenLayers.Control.CacheRead(),
        new OpenLayers.Control.CacheWrite({
          imageFormat: "image/jpeg"
        })
      ],
      layers: [
        new OpenLayers.Layer.OSM("OpenStreetMap", null, {
          transitionEffect: 'resize'
        }),

        this.vectorLayer
      ],
      center: new OpenLayers.LonLat(6.6666666, 49.7777777).transform(
                    new OpenLayers.Projection("EPSG:4326"),
                    new OpenLayers.Projection("EPSG:900913")),
      zoom: 13
    });

    this.mapPosition =  new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(6.6666666, 49.7777777).transform(
                    new OpenLayers.Projection("EPSG:4326"),
                    new OpenLayers.Projection("EPSG:900913")));

    this.vectorLayer.addFeatures([this.mapPosition]);


  },
  onCompassUpdate: function(heading) {
    //console.debug("New heading: " + heading.trueHeading);
    $('#compass').jqrotate(-heading.trueHeading);
  },
  onCompassError: function(error) {
    console.debug("Compass error: " + error);
  },
  onPositionUpdate: function(position) {
    ui.mapPosition
    .move(new OpenLayers.LonLat(6.67666, 49.78777)
          .transform(
            new OpenLayers.Projection("EPSG:4326"),
            new OpenLayers.Projection("EPSG:900913")));
  }
};

// now the main app.
var app = {
  // Application Constructor
  initialize: function() {
    this.bindEvents();
  },
  // Bind Event Listeners
  //
  // Bind any events that are required on startup. Common events are:
  // 'load', 'deviceready', 'offline', and 'online'.
  bindEvents: function() {
    document.addEventListener('deviceready', this.onDeviceReady, false);

  },
  // deviceready Event Handler
  //
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicity call 'app.receivedEvent(...);'
  onDeviceReady: function() {
    ui.initialize();
  }
};
