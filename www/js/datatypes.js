console.debug("PERSISTENCE: Defining Database...");

// initialize database ORM
persistence.store.websql.config(persistence, 'gcdb', 'Geocache database', 15 * 1024 * 1024);

// initialize full text search:
persistence.search.config(persistence, persistence.store.websql.sqliteDialect);

var Geocache = persistence.define('Geocache', {
  source: 'TEXT',
  parseDate: 'INT',
  guid: 'TEXT',
  gcid: 'TEXT',
  lat: 'REAL',
  lon: 'REAL',
  title: 'TEXT',
  owner: 'TEXT',
  rawHiddenDate: 'TEXT',
  difficulty: 'INT',
  terrain: 'INT',
  size: 'INT',
  type: 'TEXT',
  shortdesc: 'TEXT',
  hints: 'TEXT',
  desc: 'TEXT',
  stats: 'JSON',
  found: 'BOOL'
});

Geocache.index('gcid');
Geocache.index(['lat', 'lon']);
Geocache.index('found');

var Attribute = persistence.define('Attribute', {
  source: 'TEXT',
  name: 'TEXT'
});

Attribute.index(['source', 'name']);

var Waypoint = persistence.define('Waypoint', {
  source: 'TEXT',
  wpid: 'TEXT',
  name: 'TEXT',
  description: 'TEXT',
  lat: 'REAL',
  lon: 'REAL',
});

Waypoint.index('wpid');

var Log = persistence.define('Log', {
  source: 'TEXT',
  datetime: 'INT',
  user: 'TEXT',
  text: 'TEXT'
});

Log.index(['source', 'datetime', 'user']);

/*var Stats = persistence.define('Stats', {
  findCount: 'INT'
});*/

Geocache.hasMany('attributes', Attribute, 'geocaches');
Attribute.hasMany('geocaches', Geocache, 'attributes');

Geocache.hasMany('waypoints', Waypoint, 'geocache');

Geocache.hasMany('logs', Log, 'geocache');

//Geocache.hasOne('stats', Stats);

// todo: intercept images and then persist them.


Geocache.textIndex('gcid');
Geocache.textIndex('title');
Geocache.textIndex('owner');
Geocache.textIndex('shortdesc');
Geocache.textIndex('desc');
Geocache.textIndex('hints');

persistence.schemaSync(function (tx) {
  console.debug("PERSISTENCE: Schema synchronised.");
});

Geocache.prototype.coordinate = function (setv) {
  if (setv) {
    this.lat = setv.lat;
    this.lon = setv.lon;
    return setv;
  }
  return new Coordinate(this.lat, this.lon);
}