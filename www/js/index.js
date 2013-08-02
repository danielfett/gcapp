IMAGE_PATH="img/";

// the UI
var ui = {
  initialize: function() {
    if (this.initialized) {
      console.error("Already initialized!");
      return;
    }
    this.initalized = true;
    console.debug("Initializing User Interface.");

    // Initialize the map.
    // We need some icons.
    var positionIcon = L.icon({
      iconUrl: IMAGE_PATH + 'target-indicator-cross.png',
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
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [22, 0]
    });

    this.map = L.map('map').setView([49.777777777, 6.66666666], 13);
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
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

    // The marker indicating the current position
    // TODO: Add rotation
    this.mapPosition = L.marker([49.7777777, 6.666666], {
      icon: positionIcon
    }).addTo(this.map);

    var markers = new L.MarkerClusterGroup();
    for (var i = 0; i < 200; i++) {
      markers.addLayer(new L.Marker([Math.random() + 49, Math.random() + 6], {
        icon: targetIcon
      }));
    }
    this.map.addLayer(markers);
  }
};

// now the main app.
var app = {
  // Application Constructor
  initialize: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
      document.addEventListener('deviceready', this.onDeviceReady, false);
    } else {
      this.onDeviceReady(); //this is the browser
    }
  },

  onDeviceReady: function() {
    if (app.initialized) {
      console.error("Initialize called twice!");
      return;
    }
    app.initialized = true;

    console.debug("Initializing App.");
    ui.initialize();

  }
};


app.initialize();
