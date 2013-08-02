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
    if (! newlat) {
      this.position = undefined;
      this.accuracy = undefined;
      this.altitudeAccuracy = undefined;
      console.debug("Undefined position.");
    } else {
      this.position = new Coordinate(newlat, newlon, newalt);
      this.accuracy = acc;
      this.altitudeAccuracy = altacc;
      console.debug("Position updated to " + this.position.toString());
    }
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
    console.debug("bearing and distance changed to " + this.bearing + " / " + this.distance);
  }

})(this);


IMAGE_PATH="img/";

// the UI
var ui = {
  initialize: function(navstate) {
    if (this.initialized) {
      console.error("Already initialized!");
      return;
    }
    this.initalized = true;
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
        this.onCompassError, {
          frequency: 100
        });
    } catch (e) {
      console.error("Unable to initialize compass: " + e);
    }

    // Initialize the map.

    // We need some icons.
    var positionIcon = L.icon({
      iconUrl: IMAGE_PATH + 'position-indicator-red.png',
      //iconRetinaUrl: 'my-icon@2x.png',
      iconSize: [44, 100],
      iconAnchor: [22, 78],
      popupAnchor: [22, 0]
      //shadowUrl: '../img/position-indicator-red.png'
      //shadowRetinaUrl: 'my-icon-shadow@2x.png',
      //shadowSize: [68, 95],
      //shadowAnchor: [22, 94]
    });

    var targetIcon = L.icon({
      iconUrl: IMAGE_PATH + 'target-indicator-cross.png',
      //iconRetinaUrl: 'my-icon@2x.png',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [22, 0]
      //shadowUrl: '../img/position-indicator-red.png'
      //shadowRetinaUrl: 'my-icon-shadow@2x.png',
      //shadowSize: [68, 95],
      //shadowAnchor: [22, 94]
    });

    this.map = L.map('map').setView([49.777777777, 6.66666666], 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    // The marker indicating the current position
    // TODO: Add rotation
    this.mapPosition = L.marker([49.7777777, 6.666666], {
      icon: positionIcon
    }).addTo(this.map);

    // And a circle around the current position for the accuracy
    this.accuracyMarker = new L.Circle([49.7777777, 6.666666], 40, {
      stroke: false,
      fill: true,
      fillColor: '#f90',
      fillOpacity: 0.3,
      clickable: false
      });
    this.map.addLayer(this.accuracyMarker);

    // The marker indicating the current targer
    this.targetPosition = L.marker([49.7777777, 6.666666], {
      icon: targetIcon
    }).addTo(this.map);

    //$(this.targetPosition._icon).hide();
    $(this.mapPosition._icon).hide();

    var markers = new L.MarkerClusterGroup();
    for (var i = 0; i < 200; i++) {
      markers.addLayer(new L.Marker([Math.random() + 49, Math.random() + 6], {
        icon: targetIcon
      }));
    }
    this.map.addLayer(markers);

  },

  /**
   * Event coming from the navstate.
   */
  onPositionChanged: function(event, position) {
    if (position) {
      ui.mapPosition.setLatLng(position.latlon());
      $(ui.mapPosition._icon).show();
      ui.accuracyMarker.setLatLng(position.latlon());
      ui.accuracyMarker.setStyle({
        fillOpacity: 0.3
      });
      $('#position').html(position.toHTML());
      // TODO: WTF? Why is the altitude a string "null" when not set
      // (and not the value null)?!  The W3C standard has this to say
      // on this topic:
      //
      //    The altitude attribute denotes the height of the position,
      //    specified in meters above the [WGS84] ellipsoid. If the
      //    implementation cannot provide altitude information, the
      //    value of this attribute must be
      //    null. (http://www.w3.org/TR/geolocation-API/)
      //
      // But "null" is not specified further (at least not in this
      // document itself).
      $('#altitude').text((position.alt != 'null') ? '?' : position.alt.formatDistance());
    } else {
      // Hide position if not available.
      $(ui.mapPosition._icon).hide();
      ui.accuracyMarker.setStyle({
        fillOpacity: 0
      });
    }
  },


  /**
   * Event coming from the navstate.
   */
  onDistanceChanged: function(event, distance) {
    $('#distance').text(distance ? distance.formatDistance() : '?');
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
    if (target) {
      // TODO: Hide when no target set.
      ui.targetPosition.setLatLng(target.latlon());
      $(ui.targetPosition._icon).show();
      $('#target').html(target.toHTML());
    } else {
      $('#target').text("(no target set)");
      $(ui.targetPosition._icon).hide();
    }
  },

  /**
   * Event coming from the navstate.
   */
  onAccuracyChanged: function(event, accuracy) {
    // TODO: Visualize accuracy on map, e.g., with a circle around the
    // current position
    if (accuracy) {
      $('#positionalAccuracy').text('± ' + accuracy.formatDistance());
      ui.accuracyMarker.setRadius(accuracy);
      ui.accuracyMarker.setStyle({
        fillOpacity: 0.3
      });
    } else {
      $('#positionalAccuracy').text('?');
      ui.accuracyMarker.setStyle({
        fillOpacity: 0
      });
    }
  },

  /**
   * The compass is managed solely by the ui.
   */
  onCompassUpdate: function(heading) {
    if (ui.oldHeading && Math.abs(ui.oldHeading - heading.trueHeading) < 2) {
      return;
    }
    ui.oldHeading = heading.trueHeading;
    //console.debug("New heading: " + heading.trueHeading);
    $('#compass').jqrotate(-heading.trueHeading);
    $('#bearing').text(heading.trueHeading);
    $('#directionalAccuracy').text('± ' + heading.headingAccuracy);
    //ui.mapPosition.attributes.heading = heading;
    //ui.vectorLayer.redraw();
  },

  /**
   * The compass is managed solely by the ui.
   */
  onCompassError: function(error) {
    console.debug("Compass error: " + error);
    $('#compass').jqrotate(0);
    // TODO: Show grayed-out compass image so that the user can see
    // that the compass doesn't work.
    $('#bearing').text('?');
    $('#directionalAccuracy').text('?');
  },

  actionGotoPosition: function() {
    if (ui.navstate.position) {
      ui.map.panTo(new OpenLayers.LonLat(
        ui.navstate.position.lon,
        ui.navstate.position.lat)
                     .transform(
                       new OpenLayers.Projection("EPSG:4326"),
                       new OpenLayers.Projection("EPSG:900913"))
                    );
      }
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
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
      document.addEventListener('deviceready', this.onDeviceReady, false);
    } else {
      $(document).ready(this.onDeviceReady); //this is the browser
    }


  },
  // deviceready Event Handler
  //
  // The scope of 'this' is the event. In order to call the 'receivedEvent'
  // function, we must explicity call 'app.receivedEvent(...);'
  onDeviceReady: function() {
    if (app.initialized) {
      console.error("Initialize called twice!");
      return;
    }
    app.initialized = true;

    console.debug("Initializing App.");
    app.navstate = new Navstate();
    try {
      navigator.geolocation.watchPosition(function (position) {
        app.navstate.updatePosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.altitude,
          position.coords.accuracy,
          position.coords.altitudeAccuracy);
      }, function (error) {
           console.debug("Error while determining position: ("
                        + error.code + ") " + error.message);
           app.navstate.updatePosition(undefined);
         }, {
           maximumAge: 3000,
           timeout: 5000,
           enableHighAccuracy: true
         });
    } catch (e) {
      console.debug("Failed to initialize position watching: " + e);
    }
    ui.initialize(app.navstate);

  }
};


app.initialize();
