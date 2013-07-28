
/**
 * Install a function to format floats by padding zeros to the left
 * and right if necessary. Takes two arguments:
 *
 * - numZeros is the number of digits for the integer part.
 *
 * - numDecimals is the number of digits after the point.
 */
Number.prototype.format = function(numZeros, numDecimals) {
  var n = Math.abs(this).toFixed(numDecimals);
  var zeros = Math.max(0, numZeros - n.length + numDecimals + (numDecimals ? 1 : 0));
  var zeroString = Math.pow(10, zeros).toString().substr(1);
  if( this < 0 ) {
    zeroString = '-' + zeroString;
  }
  return (zeroString + n);
};

/**
 * Format this number as a meters/kilometers/etc. in a sensible
 * way. We assume the number already represents the distance in
 * meters.
 */
Number.prototype.formatDistance = function() {
  if (this >= 1000) {
    return Math.round(this / 1000.0) + " km"
  } else if (this >= 100) {
    return Math.round(this) + " m"
  } else {
    return this.toFixed(1) + " m"
  }
};

(function(window, undefined) {

  /**
   * Symbol for 'degrees'.
   */
  var DEGREES = '°';

  /**
   * Radius of the earth in kilometers.
   */
  var RADIUS_EARTH = 6371000.0;

  /**
   * Create a new Coordinate object, with lat, lon and alt (for
   * altitude) given as floats.
   */
  Coordinate = function(lat, lon, alt) {
    this.lat = lat;
    this.lon = lon;
    this.alt = alt;
  }

  /**
   * Try to parse a string that represents a coordinate in
   * Degree-Minute notation. The expected string format is "Nab°
   * cd.efg Eabc° de.fgh" with some variations allowed (e.g., '°' is
   * optional).
   *
   * Returns undefined if the string is not parsable and sets the
   * lat/lon values of the current coordinate otherwise.
   */
  Coordinate.prototype.tryParse = function(s) {
    var rep = s.trim();
    regex = /^([NS+-]?)\s?(\d\d?\d?)[ °]{0,2}(\d\d?\d?)[., ](\d+)['\s,]+([EOW+-]?)\s?(\d{1,3})[ °]{0,2}(\d\d?\d?)[., ](\d+)?[\s']*$/i;
    var match = regex.exec(rep);
    if (! match) return undefined;
    var sign_lat = ('sS-'.indexOf(match[1]) != -1) ? -1 : 1;
    var sign_lon = ('wW-'.indexOf(match[5]) != -1) ? -1 : 1;
    this.fromDM(
      sign_lat * parseInt(match[2]),
      sign_lat * parseFloat(match[3] + '.' + match[4]),
      sign_lon * parseInt(match[6]),
      sign_lon * parseFloat(match[7] + '.' + match[8])
    );
    return this;
  }

  /**
   * Convert from Degree-Minute notation to floats for lat/lon.
   */
  Coordinate.prototype.fromDM = function (latdd, latmm, londd, lonmm) {
    this.lat = latdd + (latmm / 60.0);
    this.lon = londd + (lonmm / 60.0);
    this.testLog();
  }

  /**
   * Calculate the great-circle distance between two points on the
   * earth.
   */
  Coordinate.prototype.distanceTo = function(target) {
      var dlat = Math.pow(Math.sin(((target.lat-this.lat) * Math.PI / 180.0) / 2), 2)
    var dlon = Math.pow(Math.sin(((target.lon-this.lon) * Math.PI / 180.0) / 2), 2)
    var a = dlat + Math.cos(this.lat * Math.PI / 180.0) * Math.cos(target.lat * Math.PI/180.0) * dlon;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return RADIUS_EARTH * c;
  }

  /**
   * Calculate the bearing (relative to north) for the shortest way
   * between this point and the given point.
   */
  Coordinate.prototype.bearingTo = function(target) {
    var lat1 = this.lat * Math.PI / 180.0;
    var lat2 = target.lat * Math.PI / 180.0;

    var dlon = (target.lon - this.lon) * Math.PI / 180.0;
    var y = Math.sin(dlon) * Math.cos(lat2);
    var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dlon);
    var bearing = Math.atan2(y, x)  * 180.0 / Math.PI;
    return (360.0 + bearing) % 360.0;
  }

  /**
   * Return a nicely formatted string in Degree-Minute notation.
   */
  Coordinate.prototype.toString = function() {
      if (this.lat === undefined || this.lon === undefined) {
	return '(not set)';
      } else {
	return getLatD.call(this) + ' ' + getLonD.call(this);
      }
  }

  /**
   * As above, but the string uses some HTML features for a nicer
   * printing.
   */
  Coordinate.prototype.toHTML = function() {
      if (this.lat === undefined || this.lon === undefined) {
	return '<emph>(not set)</emph>';
      } else {
	return getLatD.call(this, '&#8198;') + ' ' + getLonD.call(this, '&#8198;');
      }
  }

  /**
   * Return a string for the LAT part of the coordinate.
   */
  function getLatD(space) {
    if (! space) space = ' ';
    var l = Math.abs(this.lat);
    var sign = (this.lat > 0) ? 'N' : 'S';
    return sign
         + space
	 + Math.floor(l)
	 + DEGREES
	 + space
	 + ((l - Math.floor(l)) * 60.0).format(2, 3);
  }

  /**
   * Return a string for the LON part of the coordinate.
   */
  function getLonD(space) {
    if (! space) space = ' ';
    var l = Math.abs(this.lon);
    var sign = (this.lon > 0) ? 'E ' : 'W ';
    return sign
         + space
	 + Math.floor(l)
	 + DEGREES
	 + space
	 + ((l - Math.floor(l)) * 60.0).format(2, 3);
  }
})(this);
