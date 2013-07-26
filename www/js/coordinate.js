Number.prototype.format = function(numZeros, numDecimals) {
  var n = Math.abs(this).toFixed(numDecimals);
  var zeros = Math.max(0, numZeros - n.length + numDecimals + (numDecimals ? 1 : 0));
  var zeroString = Math.pow(10, zeros).toString().substr(1);
  if( this < 0 ) {
    zeroString = '-' + zeroString;
  }
  return (zeroString + n);
};

(function(window, undefined) {

  var DEGREES = '°';

  var RADIUS_EARTH = 6371000.0;

  Coordinate = function(lat, lon) {
    this.lat = lat;
    this.lon = lon;
  }

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

  Coordinate.prototype.fromDM = function (latdd, latmm, londd, lonmm) {
    this.lat = latdd + (latmm / 60.0);
    this.lon = londd + (lonmm / 60.0);
    this.testLog();
  }

  Coordinate.prototype.distanceTo = function(target) {
      var dlat = Math.pow(Math.sin(((target.lat-this.lat) * Math.PI / 180.0) / 2), 2)
    var dlon = Math.pow(Math.sin(((target.lon-this.lon) * Math.PI / 180.0) / 2), 2)
    var a = dlat + Math.cos(this.lat * Math.PI / 180.0) * Math.cos(target.lat * Math.PI/180.0) * dlon;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return RADIUS_EARTH * c;
  }

  Coordinate.prototype.toString = function() {
      if (this.lat === undefined || this.lon === undefined) {
	return '(not set)';
      } else {
	return getLatD.call(this) + ' ' + getLonD.call(this);
      }
  }

  Coordinate.prototype.toHTML = function() {
      if (this.lat === undefined || this.lon === undefined) {
	return '<emph>(not set)</emph>';
      } else {
	return getLatD.call(this, '&#8198;') + ' ' + getLonD.call(this, '&#8198;');
      }
  } 

  function getLatD(space) {
    if (! space) space = ' ';
    var l = Math.abs(this.lat);
    console.debug(l);
    var sign = (this.lat > 0) ? 'N' : 'S';
    return sign
         + space
	 + Math.floor(l)
	 + DEGREES
	 + space
	 + ((l - Math.floor(l)) * 60.0).format(2, 3);
  }

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
