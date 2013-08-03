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

    // Now watch the position

    var _this = this;
    try {
      navigator.geolocation.watchPosition(function (position) {
        _this.updatePosition(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.altitude,
          position.coords.accuracy,
          position.coords.altitudeAccuracy);
      }, function (error) {
           console.debug("Error while determining position: ("
                        + error.code + ") " + error.message);
           _this.updatePosition(undefined);
         }, {
           maximumAge: 3000,
           timeout: 5000,
           enableHighAccuracy: true
         });
    } catch (e) {
      console.debug("Failed to initialize position watching: " + e);
    }

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


// now the main app.
(function(window, $, undefined) {

  App = function() {
    // Currently selected geocache
    this.currentGeocache = undefined;
    this.prototype = new Observable();
    this.bindEvents();
  }

  App.prototype = new Observable();

  /**
   * Bind Event Listeners
   *
   * Bind any events that are required on startup. Common events are:
   * 'load', 'deviceready', 'offline', and 'online'.
   */
  App.prototype.bindEvents = function() {
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
      document.addEventListener('deviceready', this.onDeviceReady, false);
    } else {
      $(document).ready(this.onDeviceReady); //this is the browser
    }
  }

  /**
   * deviceready Event Handler
   *
   * The scope of 'this' is the event. In order to call the
   * 'receivedEvent' function, we must explicity call
   * 'app.receivedEvent(...);'
   */
  App.prototype.onDeviceReady = function() {
    if (app.initialized) {
      console.error("Initialize called twice!");
      return;
    }
    app.initialized = true;

    console.debug("Initializing App.");
    app.navstate = new Navstate();
    ui.initialize(app);
    app.thisFunctionWillGetANewNameSomeDay();
  }

  App.prototype.thisFunctionWillGetANewNameSomeDay = function() {
    var geocaches = [
      {gcid: 'test1',
       lat: 49.7123,
       lon: 6.612366666,
       type: 'REGULAR',
       size: 20},
      {gcid: 'test2',
       lat: 49.7823,
       lon: 6.682366666,
       type: 'MULTI',
       size: 30}
    ];
    this.triggerEvent('geocachesUpdated', geocaches);
  }

})(this, $);
