
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


/**
 * Navstate is the object capturing the current "state of navigation",
 * i.e., the position, the current navigation target etc.
 *
 * It is an Observable object, i.e., the UI can watch for changes here.
 */
(function(window, undefined) {
  Navstate = function () {
    // The current position (a Coordinate)
    this.position = new Coordinate();

    // The current position accuracy
    this.accuracy = undefined;

    // The current altitude accuracy
    this.altitudeAccuracy = undefined;

    // The current target.
    this.target = undefined;

    // The bearing to the target ("in which direction is the target?")
    this.bearing = undefined;

    // The distance to the target in meters.
    this.distance = undefined;
  }

  Navstate.prototype = new Observable();

  /**
   * Update the current position and recalculate the bearing to the
   * target.
   */
  Navstate.prototype.updatePosition = function(newlat, newlon, newalt, acc, altacc) {
    this.position = new Coordinate(newlat, newlon, newalt);
    this.accuracy = acc;
    this.altitudeAccuracy = altacc;
    this.triggerEvent('positionChanged', this.position);
    updateBearingDistance.call(this);
    this.triggerEvent('accuracyChanged', this.accuracy);
    this.triggerEvent('altitudeAccuracyChanged', this.altitudeAccuracy);
  }

  /**
   * Set a new target. Update the bearing accordingly.
   */
  Navstate.prototype.setTarget = function(newTarget) {
    this.target = newTarget;
    this.triggerEvent('targetChanged', this.target);
    updateBearingDistance.call(this);
  }

  /**
   * Recalculate distance & bearing to target.
   */
  function updateBearingDistance() {
    if (this.position && this.target) {
      this.bearing = this.position.bearingTo(this.target);
      this.distance = this.position.distanceTo(this.target);
    } else {
      this.bearing = undefined;
      this.distance = undefined;
    }
    this.triggerEvent('bearingChanged',  this.bearing);
    this.triggerEvent('distanceChanged', this.distance);
  }

})(this);




// the UI
var ui = {
  initialize: function(navstate) {
    console.debug("Initializing User Interface.");

    this.navstate = navstate;
    this.navstate.addEventListener('positionChanged', this.onPositionChanged);
    this.navstate.addEventListener('targetChanged', this.onTargetChanged);
    this.navstate.addEventListener('bearingChanged', this.onBearingChanged);
    this.navstate.addEventListener('distanceChanged', this.onDistanceChanged);
    this.navstate.addEventListener('accuracyChanged', this.onAccuracyChanged);

    // We want to observe the compass here. Note that we do this in
    // the user interface because the compass is really needed only
    // for presentation reasons (as opposed to the current position,
    // which is used to calculate and do stuff).
    try {
      navigator.compass.watchHeading(
        this.onCompassUpdate,
        this.onCompassError);
    } catch (e) {
      console.debug("Unable to initialize compass: " + e);
    }

    // Initialize the map.

    // First, a vector layer which we will need to show symbols
    // representing the user's position, geocaches and so on.
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

   // Show an initial position - for testing only.
    this.mapPosition =  new OpenLayers.Feature.Vector(
      new OpenLayers.Geometry.Point(6.6666666, 49.7777777).transform(
        new OpenLayers.Projection("EPSG:4326"),
        new OpenLayers.Projection("EPSG:900913")));

    this.vectorLayer.addFeatures([this.mapPosition]);
  },

  /**
   * Event coming from the navstate.
   */
  onPositionChanged: function(event, position) {
    ui.mapPosition
    .move(new OpenLayers.LonLat(position.lon, position.lat)
          .transform(
            new OpenLayers.Projection("EPSG:4326"),
            new OpenLayers.Projection("EPSG:900913")));
    $('#position').html(position.toHtml());
    // TODO: Include a function that formats distances nicely (see
    // AGTL)
    $('#altitude').text(position.alt);
  },


  /**
   * Event coming from the navstate.
   */
  onDistanceChanged: function(event, distance) {
    // TODO: Include a function that formats distances nicely (see
    // AGTL)
    $('#distance').text(distance ? distance : '?');
  },

  /**
   * Event coming from the navstate.
   */
  onBearingChanged: function(event, bearing) {
    if (bearing) {
      $('#compassdirection').fadeIn(400)
      $('#compassdirection').jqrotate(bearing);
    } else {
      $('#compassdirection').fadeOut(400);
    }
  },

  /**
   * Event coming from the navstate.
   */
  onTargetChanged: function(event, target) {
    $('#target').html(target.toHTML());
  },

  /**
   * Event coming from the navstate.
   */
  onAccuracyChanged: function(event, accuracy) {
    // TODO: Include a function that formats distances nicely (see
    // AGTL)
    $('#accuracy').text('± ' + accuracy);
  },

  /**
   * The compass is managed solely by the ui.
   */
  onCompassUpdate: function(heading) {
    //console.debug("New heading: " + heading.trueHeading);
    $('#compass').jqrotate(-heading.trueHeading);
  },

  /**
   * The compass is managed solely by the ui.
   */
  onCompassError: function(error) {
    console.debug("Compass error: " + error);
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
    app.navstate = new Navstate();
    try {
      navigator.geolocation.watchPosition(function (position) {
        app.navstate.updatePosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.altitude,
          position.coords.accuracy,
          position.coords.altitudeAccuracy);
      });
    } catch (e) {
      console.debug("Failed to initialize position watching: " + e);
    }
    ui.initialize(app.navstate);
  }
};


// Now the main initialization of the app.
app.initialize();
$(document).ready(function() {
  app.onDeviceReady(); // we call this manually for testing on the desktop browser.
});

/*
  var gc = new Geocaching();
  gc.ensureLogin('AGTLTestUser', '5dc60db7d5c7a86364c44091a')
  .done(function() {
    gc.test();
  })
  .fail(function(error) {
    alert(error);
  });
});*/