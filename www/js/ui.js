
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

// Add rotation of markers to leaflet.js
// found at http://stackoverflow.com/questions/13494649/rotate-marker-in-leaflet
// TODO: It seems like the rotation center is not the iconAnchor.
L.Marker.RotatedMarker = L.Marker.extend({
  _reset: function() {
    var pos = this._map.latLngToLayerPoint(this._latlng).round();

    L.DomUtil.setPosition(this._icon, pos);
    if (this._shadow) {
      L.DomUtil.setPosition(this._shadow, pos);
    }

    if (this.options.iconAngle) {
      this._icon.style.MozTransform = L.DomUtil.getTranslateString(pos) + ' rotate(' + this.options.iconAngle + 'deg)';
      this._icon.style.WebkitTransform = this._icon.style.WebkitTransform + ' rotate(' + this.options.iconAngle + 'deg)';
    }

    this._icon.style.zIndex = pos.y;
  },

  setIconAngle: function (iconAngle) {
    if (this._map) {
      this._removeIcon();
    }
    this.options.iconAngle = iconAngle;
    if (this._map) {
      this._initIcon();
      this._reset();
    }
  }
});

// Hack, image path is different on device and on desktop, for
// whatever reason. TODO: Investigate why.
IMAGE_PATH=navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/) ? "img/" : "../img/";

// the UI
var ui = {
  /**
   * The list of geocaches and their markers that are currently shown
   * on the map.
   */
  markersOnMap: {},

  /**
   * The list of initialized Icons for the map
   */
  iconList: {},

  initialize: function(app) {
    if (this.initialized) {
      console.error("Already initialized!");
      return;
    }
    this.initalized = true;
    console.debug("Initializing User Interface.");

    this.app = app;
    this.app.navstate.addEventListener('positionChanged', this.onPositionChanged);
    this.app.navstate.addEventListener('targetChanged', this.onTargetChanged);
    this.app.navstate.addEventListener('bearingChanged', this.onBearingChanged);
    this.app.navstate.addEventListener('distanceChanged', this.onDistanceChanged);
    this.app.navstate.addEventListener('accuracyChanged', this.onAccuracyChanged);
    this.app.addEventListener('geocachesUpdated', this.onGeocachesUpdated);
    this.app.addEventListener('clearProgress', this.onClearProgress);
    this.app.addEventListener('progress', this.onProgress);

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
    // TODO: This causes a severe performance regression at least on Nexus 10
    /*this.accuracyMarker = new L.Circle([49.7777777, 6.666666], 40, {
      stroke: false,
      fill: true,
      fillColor: '#f90',
      fillOpacity: 0.3,
      clickable: false
      });
    this.map.addLayer(this.accuracyMarker);*/

    // The marker indicating the current target
    this.targetPosition = L.marker([49.7777777, 6.666666], {
      icon: targetIcon
    }).addTo(this.map);

    $(this.targetPosition._icon).hide();
    $(this.mapPosition._icon).hide();

    this.markersCluster = new L.MarkerClusterGroup();
    this.map.addLayer(this.markersCluster);

  },

  /**
   * Event coming from the navstate.
   */
  onPositionChanged: function(event, position) {
    if (position) {
      ui.mapPosition.setLatLng(position.latlon());
      $(ui.mapPosition._icon).show();
      /*ui.accuracyMarker.setLatLng(position.latlon());
      ui.accuracyMarker.setStyle({
        fillOpacity: 0.3
      });*/
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
      /*ui.accuracyMarker.setStyle({
        fillOpacity: 0
      });*/
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
      /*ui.accuracyMarker.setRadius(accuracy);
      ui.accuracyMarker.setStyle({
        fillOpacity: 0.3
      });*/
    } else {
      $('#positionalAccuracy').text('?');
      /*ui.accuracyMarker.setStyle({
        fillOpacity: 0
      });*/
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

  /**
   * The list of geocaches has changed.
   */
  onGeocachesUpdated: function(event, listOfGeocaches) {
    // TODO: Currently, markers are never removed. That *should be*
    // fine, because geocaches are never removed from the geocaching
    // database either (they become archived geocaches).
    var markersToAdd = [];
    for (var i in listOfGeocaches) {
      var geocache = listOfGeocaches[i];

      // If this geocache already has a marker, we don't need to do
      // anything.
      if (geocache.marker != undefined) {
        continue;
      }
      geocache.marker = new L.Marker(geocache.coordinate().latlon(), {
        icon: ui._getIconFromGeocache(geocache)
      });
      geocache.marker.geocache = geocache;
      geocache.marker.on('click', function(event) {
        var popup = L.popup()
                    .setLatLng(event.target.getLatLng())
                    .setContent(ui._createPopupContent(event.target.geocache))
                    .openOn(ui.map);
      });
      geocache.addEventListener('change', ui._updateGeocacheMarker);
      markersToAdd.push(geocache.marker);
    }
    ui.markersCluster.addLayers(markersToAdd);
  },

  /**
   * Determine the geocache icon from the geocache object.
   *
   * The function uses the iconList object to determine whether an
   * icon for this type and size of geocache already exists. If so,
   * the icon is returned. Otherwise, a new icon is created and added
   * to the iconList before returning it. The iconList is indexed by a
   * string containing the type and size of the geocache. We could
   * have used a two-dimensional data structure instead, but this way
   * the list is easier to handle.
   *
   * TODO: We probably also want to show some other attributes, e.g.,
   * the archive state of the geocache.
   */
  _getIconFromGeocache: function(geocache) {
    var id = (geocache.type && geocache.size)
           ? (geocache.type + '-' + geocache.size)
           : 'undefined';
    if (ui.iconList[id]) {
      return ui.iconList[id];
    }
    var options = {};
    if (geocache.type && geocache.size) {
      // TODO: Fill in these options depending on the real geocache
      // data.
      options.iconUrl = IMAGE_PATH + "box-green.svg";
      options.iconSize = [40, 40];
      options.iconAnchor = [20, 20];
    } else {
      // TODO: Add notfound.png and other options for this icon if
      // this should ever really be needed.
      options.iconUrl = IMAGE_PATH + 'notfound.png';
    }
    return ui.iconList[id] = new L.Icon(options);
  },

  /**
   * Callback that is triggered when the data for a geocache
   * changes. Update the marker that is attached to a geocache and
   * shown on the map.
   */
  _updateGeocacheMarker: function(event, object, property, newValue) {
    if (property == 'lat' || property == 'lon') {
      object.marker.setLatLng(object.coordinate().latlon());
    } else if (property == 'type' || property == 'size') {
      console.debug("Property " + property + " of geocache " + object.gcid + " changed to new value " + newValue);
      object.marker.setIcon(ui._getIconFromGeocache(object));
    }
  },

  /**
   * Assemble the HTML code that is shown inside the geocache popup
   * window.
   */
  _createPopupContent: function(geocache) {
    var text = "<span class='gcid'>"
             + geocache.gcid + "</span> "
             + "<span class='title'>" + geocache.title + "</span> "
             + "<span class='type'>(" + geocache.type + ")</span><br>"
             + "<label>Difficulty:<label><meter min='10' max='50' value='" + geocache.difficulty + "'></meter><br>"
             + "<label>Terrain:<label><meter min='10' max='50' value='" + geocache.terrain + "'></meter><br>"
             + "<label>Size:<label>" + geocache.size + "<br>"// TODO
             + "<a href='details.html#" + geocache.gcid + "'>Show details</a>";
    return text;
  },

  /**
   * Event coming from the App.
   */
  onClearProgress: function(event) {
    $('#logwindow progress').hide();
  },

  /**
   * Event coming from the App.
   */
  onProgress: function(event, progress, message) {
    if (progress) {
      $('#logwindow progress')
      .attr('max', progress[1])
      .attr('value', progress[0]);
    }
    var $logtext = $('#logtext');
    $logtext.html($logtext.html() + "<br>" + message);
    $logtext.scrollTop($logtext[0].scrollHeight);
  }
};
