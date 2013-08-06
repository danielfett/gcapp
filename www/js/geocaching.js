(function(window, $, undefined) {

  /**
   * These are the numbers that are used internally at geocaching.com
   * for the different cache types. The strings are our own internal
   * representation.
   */
  var TYPE_STRINGS = {
    2: 'REGULAR',
    3: 'MULTI',
    4: 'VIRTUAL',
    6: 'EVENT',
    8: 'MYSTERY',
    11: 'WEBCAM',
    137: 'EARTH'
  }

  /**
   * These are the numeric codes that are used at geocaching.com for
   * the different types of a log. The strings are our own internal
   * representation.
   */
  var LOG_TYPE_CODE = {
    2: 'found',
    3: 'did not find',
    4: 'write note',
    7: 'needs archived',
    45: 'needs maintenance'
  }

  /**
   * Maximum number of geocaches that can be downloaded in one batch.
   */
  var MAX_DOWNLOAD_NUM = 100;

  /**
   * Create a new instance.
   */
  Geocaching = function() {

  }

  /**
   * This test function is currently called when the document has
   * finished loading and the user is logged in. You may add stuff
   * here.
   */
/*  Geocaching.prototype.test = function() {
    var _this = this;
    this.getListOfGeocaches(new Coordinate(49.777, 6.666), new Coordinate(49.750, 6.650))
    .done(function(list) {
      console.debug(list);
      _this.downloadGeocachesInList(list)
      .done(function(list){
        alert(list);
        console.debug($(list).serialize());
      })
      .fail(function(msg) {
        alert(msg);
      });
    })
    .fail(function(msg) {
      alert(msg);
    });
  }*/

  /*****************************************************************
   * Functions for user management (logging in, etc.)
   ****************************************************************/

  /**
   * Make sure that the user with the given user name (and password)
   * is logged in.
   */
  Geocaching.prototype.ensureLogin = function(username, password) {
    var dfd = new $.Deferred();
    var _this = this;

    // First, check if we are logged in.
    checkLogin.call(this)
    .done(function(loggedInUser, indexDocument) {
      // We are logged in, now check if the right user is logged in.
      if (loggedInUser == undefined
        || loggedInUser.toLowerCase() != username.toLowerCase()) {

        if (loggedInUser == undefined) {
	  console.debug("No user is logged in.");
          dfd.notify(undefined, "No user is logged in.");
	} else {
          dfd.notify(undefined, "The wrong user is logged in.");
	  console.debug("User '" + loggedInUser
                       + "' is logged in, but '" + username
                       + "' is supposed to be logged in. Logging in again.");
	}

	login.call(_this, indexDocument, username, password)
	.done(function() {
	  dfd.resolve("Login successful.");
	})
	.fail(function(msg) {
	  dfd.reject(msg);
	})
	.progress(function(progress, msg) {
	  dfd.notify(progress, msg);
	});
      } else {
	console.debug("User was already logged in.");
        dfd.notify(undefined, "User is logged in.");
	dfd.resolve("User is logged in.");
      }
    })
    .fail(function(msg) {
      dfd.reject(msg);
    })
    .progress(function(progress, msg) {
      dfd.notify(progress, msg);
    });;
    return dfd.promise();
  }

  /**
   * Check is a user is logged in and if so, which.
   *
   * Returns (via Deferred) the name of the logged in user (or
   * undefined) and a geocaching.com document that can be used, e.g.,
   * for logging in.
   */
  function checkLogin() {
    var dfd = new $.Deferred();
    var _this = this;

    // Retrieve the home page.
    //
    // TODO: Check if other pages of the web
    // site load faster and then use these instead here.
    dfd.notify(undefined, "Checking login.");
    $.ajax({
      url: 'http://www.geocaching.com',
      xhrFields: { withCredentials: true }
    })
    .done(function(data) {
      var doc = $('<output>').append($.parseHTML(data));
      var status = checkLoginStatus.call(_this, doc);
      if (status === false) {
	dfd.resolve(undefined, doc);
      } else if (status === undefined){
	dfd.reject("Failed to check login status. Maybe you have to update this application.");
      } else {
	dfd.resolve(status);
      }
    })
    .fail(function() {
      dfd.reject("Failed to check login status. Network error?");
    });

    return dfd.promise();
  }

  /**
   * Perform a login. Needs some document doc that contains the login
   * form.
   *
   * Checks if the login was successful.
   */
  function login(doc, username, password) {
    var dfd = new $.Deferred();
    var _this = this;

    console.debug("Starting login.");
    var formData = $('form', doc).serializeArray();
    $.each(formData, function(index, value) {
      if (value.name == 'ctl00$tbUsername') {
	formData[index].value = username;
      } else if (value.name == 'ctl00$tbPassword') {
	formData[index].value = password;
      }
    });

    dfd.notify(undefined, "Logging in...");
    $.ajax({
      url: 'https://www.geocaching.com/login/default.aspx',
      data: formData,
      type: 'POST',
      xhrFields: { withCredentials: true }
    })
    .done(function(data) {
      var doc = $('<output>').append($.parseHTML(data));

      // Now check whether we are really logged in.
      var status = checkLoginStatus.call(_this, doc);
      if (status === false) {
        dfd.reject('Username or password wrong, or some other error.');
      } else if (status === undefined) {
        dfd.reject('Cannot determine whether login was successful.'
                  + ' Maybe you need to update this application.');
      } else {
        dfd.notify(undefined, "Done.");
        dfd.resolve();
      }
    })
    .fail(function(xhr, status, error) {
      console.debug('XHR failed: status=' + status + ', error='
		   + error + ', XHRStatus=' + xhr.status
		   + ', responseText=' + xhr.responseText);
      dfd.reject('Unknown error occured while logging in.');
    });
    return dfd.promise();
  }

  /**
   * Check a document for signs of a logged in user.
   *
   * Returns false (not logged in), undefined (cannot determine
   * status) or a user name.
   */
  function checkLoginStatus(doc) {
    if ($('#ctl00_divNotSignedIn', doc).length
      || $('#ctl00_ContentBody_cvLoginFailed', doc).length) {
      console.debug("Not signed in; #ctl00_divNotSignedIn is present.");
      return false;
    } else if ($('#ctl00_divSignedIn', doc).length
             || $('#ctl00_ContentBody_hlLoginAsAnother', doc).length) {
      console.debug("User is signed in; #ctl00_divSignedIn is present.");
      return $('a.SignedInProfileLink', doc).text();
    } else {
      // This should never happen, but it may.
      return undefined;
    }
  }


  /*****************************************************************
   * Functions for downloading stuff
   ****************************************************************/


  /**
   * Get a geocache (identified by the GCID) from the locate
   * database.
   *
   * - updateIfAvailable: If the geocache is already in the local
   *   database, update it before returning it.
   *
   * - downloadIfNotAvailable: If the geocache is not in the local
   *   database, download it.
   */
  Geocaching.prototype.getGeocache = function(id, updateIfAvailable, downloadIfNotAvailable) {
    var dfd = new $.Deferred();
    var _this = this;

    Geocache.findBy('gcid', id, function(geocache) {
      if ((geocache == null && downloadIfNotAvailable) ||
          (geocache != null && updateIfAvailable)) {
        // The geocache is not in the local DB but we want to download
        // it, or it is already there but we like to update it.

        // Retrieve geocache document.
        var url = 'http://www.geocaching.com/seek/cache_details.aspx?wp=' + id;
        dfd.notify(undefined, "Retrieving Geocache " + id + "...");
        readUrl.call(this, url)
        .done(function(doc){
          if (geocache == null) {
            // Geocache was not in DB before, so add it.
            geocache = new Geocache();
          }

          dfd.notify(undefined, "Parsing Geocache " + id + "...");

          if (parseCacheDocument.call(_this, doc, geocache)) {
            // Add the geocache to the database. If it's already
            // there, nothing happens.
            persistence.add(geocache);
            dfd.notify(undefined, "Done.");
            dfd.resolve(geocache);
          } else {
            console.debug("This is a premium member cache!");
            dfd.reject('PREMIUM', 'Premium member cache');
          }
        })
        .fail(function(msg){
          dfd.reject(undefined, msg);
        });
      } else {
        // geocache is either null or the geocache object from the
        // database.
        dfd.resolve(geocache);
      }
    });

    return dfd.promise();
  }

  /**
   * Retrieve a list of geocaches that are in a circular area around a
   * given coordinate.
   *
   * The list that is returned can be used with downloadGeocachesInList.
   */
  Geocaching.prototype.getListOfGeocachesAround = function(center, dist) {
    var dfd = new $.Deferred();
    var _this = this;

    var url = 'http://www.geocaching.com/seek/nearest.aspx?t=k&origin_lat=' + center.lat + '&origin_long=' + center.lon + '&dist=' + dist/1000;

    dfd.notify(undefined, "Retrieving List of Geocaches");
    readUrl.call(this, url)
    .done(function(doc){
      fetchListRecursively.call(_this, dfd, doc, [], 0);
    })
    .fail(function(msg){
      dfd.reject(msg);
    });
    return dfd.promise();
  }

  /**
   * Retrieve a list of geocaches that are in the rectangle area
   * defined by the two given coordinate. Actually, a circular area is
   * searched that is bigger than the given rectangle.
   *
   * The list that is returned can be used with downloadGeocachesInList.
   */
  Geocaching.prototype.getListOfGeocaches = function(coordinate1, coordinate2) {

    var center = new Coordinate(
      (coordinate1.lat + coordinate2.lat)/2,
      (coordinate1.lon + coordinate2.lon)/2);
    var dist = (center.distanceTo(coordinate1))/2;
    return this.getListOfGeocachesAround(center, dist);
  }

  /**
   * Download all geocaches that are contained in the given list. If
   * updateExisting is true, update geocaches that are already in the
   * local database. Returns (via Deferred) an array containing the
   * Geocache objects.
   *
   * TODO: Check if this fully works, build some better test case.
   *
   * TODO: It would be nice to have some sort of smart strategy to
   * update the geocaches. For example, one could update only those
   * geocaches that are older than 14 days.
   */
  Geocaching.prototype.downloadGeocachesInList = function(list, updateExisting) {
    var dfd = new $.Deferred();
    var _this = this;

    var numberOfGeocaches = list.length;
    var output = [];

    dfd.notify([0, numberOfGeocaches], "Need to download " + list.length + " Geocaches");

    for (var i in list) {
      this.getGeocache(list[i].gcid, updateExisting, true)
      .done(function(cache){
        console.debug("Downloaded geocache.");
        output.push(cache);
      })
      .fail(function(reason, msg){
        console.debug("Failed to download cache: " + msg);
        numberOfGeocaches -= 1;
      })
      .then(function() {
        dfd.notify([output.length, numberOfGeocaches],
                   "Still downloading " + (numberOfGeocaches - output.length) + " Geocache(s)");
        if (output.length == numberOfGeocaches) {
          dfd.resolve(output);
        }
      })
      .progress(function(progress, msg) {
        // TODO: If the called function reports a progress (!=
        // undefined), we should somehow incorporate this.
        dfd.notify(undefined, msg);
      });
    }

    return dfd.promise();
  }


  /**
   * Walk through the pages of the geocache listing at
   * geocaching.com. Parse out all geocaches (their gcids). Then
   * proceed with the next page by calling this function again.
   *
   * dfd - a Deferred object that we can call reject or resolve on.
   *
   * doc - the document that is to be parsed.
   *
   * wpts - the list of gcids so far
   *
   * page_last - the number of the page that was parsed last. If this
   * does not increment, abort (preventing infinite loops).
   */
  function fetchListRecursively(dfd, doc, wpts, page_last) {
    var bs = $('#ctl00_ContentBody_ResultsPanel .PageBuilderWidget b', doc);

    // Nothing to see here, move on.
    if (bs.length == 0) {
      dfd.resolve([]);
      return;
    }

    // Retrieve some numbers from the top pagination widget.
    var count = parseInt($(bs[0]).text());
    var page_current = parseInt($(bs[1]).text());
    var page_max = parseInt($(bs[2]).text());

    // Stop if we do not proceed.
    if (page_current == page_last) {
      dfd.reject("Current page has the same number as the last page; aborting!");
      return;
    }
    page_last = page_current;

    // Stop if there are too many geocaches in this area. Nobody wants
    // to wait for the retrieval of 1000 geocaches.
    if (count > MAX_DOWNLOAD_NUM) {
      dfd.reject("Found " + count + " geocaches in this area. Please select a smaller part of the map.");
      return;
    }

    // Notify User
    dfd.notify([page_current, page_max],
               "...reading page " + page_current + " of " + page_max);

    // Add what we've found to the result set.
    $('.SearchResultsTable tr.Data', doc).each(function(index, item) {

      // Default distance is null, which indicates that we have found
      // some string, e.g., "here". We will assume that this string
      // always indicates that the geocache is "very close" (whatever
      // that means).
      var distance = null,
          direction = null;

      var distText = $('td:eq(1) span', item).contents().eq(3).text();

      if (distText) {
        var result = /^([0-9.]+)([a-zA-Z]+)$/.exec(distText.trim());
        if (result != null) {
          if (result[2] == 'km') {
            distance = result[1] * 1000;
          } else if (result[2] == 'ft') {
            distance = result[1] * 0.3048;
          } else if (result[2] == 'mi') {
            distance = result[1] * 1609.344;
          } else {
            console.error("Found unknown distance unit: " + result[2]);
          }
        }
        direction = $('td:eq(1) img', item).attr('alt').trim();
      }

      wpts.push({
        gcid: $(item).text().split('|')[1].trim(),
        direction: direction,
        distance: distance
      });
    });

    // Proceed if there are more pages.
    if (page_current < page_max) {

      // Get all form data and change it...
      var formData = $('form', doc).serializeArray();
      $.each(formData, function(index, value) {
	if (value.name == '__EVENTTARGET') {
          // Change this value, we have 'clicked' on the "next" button.
	  formData[index].value = 'ctl00$ContentBody$pgrTop$ctl08';
	} else if (value.name == 'ctl00$ContentBody$chkAll') {
          // Remove this value, for some reason.
	  formData.splice(index, 1);
	}
      });

      // Form target URL
      url = 'http://www.geocaching.com/seek/' + $('form', doc).attr('action');
      readUrl.call(this, url, formData, 'POST')
      .done(function(doc){
        // Recurse to infinity and beyond.
	fetchListRecursively.call(this, dfd, doc, wpts, page_last);
	return;
      })
      .fail(function(msg){
	dfd.reject(msg);
	return;
      });
    } else {
      console.debug("Finished fetching list.");
      dfd.resolve(wpts);
      return;
    }
  }

  /**
   * Experimental function: Determine the exact position of a geocache
   * by using the search function only.
   *
   * WARNING: This causes a lot of requests to the geocaching website,
   * so use with care.
   *
   * For testing, the following code can be used in the browser
   * console:
   * var a = new Geocaching();
   * a.searchGeocachePosition('GC38WRZ', new Coordinate(49.7494, 6.69021), 300, 1).done(function(d) { debugger; }).progress(function(coord, m, t) { L.circle(coord.latlon(), m, {fill: false, weight: 1, color: ['#900', '#090', '#000'][t]}).addTo(ui.map);});
   */
  Geocaching.prototype.searchGeocachePosition = function(gcid, coordinate, radius, targetMaxRadius) {
    var dfd = new $.Deferred();
    searchGeocachePositionHelper.call(this, dfd, gcid, coordinate, radius, targetMaxRadius);
    return dfd.promise();
  }

  /**
   * Helper function that tries to find the exact coordinate for a
   * geocache that is known to be in the search results for a given
   * area.
   *
   * We have two strategies: Directed search and quadsection.
   *
   * Directed search: If the geocache is in the search results, it is
   * likely to have a direction and distance attached there. So we
   * search in the given direction to find the geocache.
   *
   * Quadsection: The function searches for geocaches starting from
   * points located in four directions (NE, NW, SE, SW) from the
   * initial coordinate. The distance of these points from the initial
   * coordinate is the same as the radius for the new searches, namely
   * sqrt(2)*initialRadius/2.
   *
   * If one of both strategies finds the geocache, the search is
   * repeated at that place until the search radius is lower than the
   * targetMaxRadius, in which case the function returns (via
   * $.Deferred) the coordinate where the geocache was found.
   */
  function searchGeocachePositionHelper(dfd, gcid, coordinate, radius, targetMaxRadius, mustBeThere, state) {
    var _this = this,
        newSearchCoordinate,
        newSearchRadius;

    // We use state to track some information about the recursion.
    if (! state) {
      state = {
        foundRadius: radius,
        requests: 0
      };
    }

    // Fetch the geocaches at (coordinate) in the given (radius).
    state.requests++;
    _this.getListOfGeocachesAround(coordinate, radius)
    .done(function (list) {
      console.debug("Found " + list.length + " geocaches here.");
      for (var i in list) {
        // Skip other geocaches
        if (list[i].gcid != gcid) {
          continue;
        }

        // We have found it...
        if (radius < targetMaxRadius) {
          console.debug("Found geocache at coordinate "
                       + coordinate.toString()
                       + " in a radius of" + radius + "m.");
          dfd.notify(coordinate, radius, 2);
          dfd.resolve(coordinate, radius, state);
          return;
        }

        dfd.notify(coordinate, radius, 1);

        // See below.
        state.foundRadius = Math.min(radius, state.foundRadius);

        // We found our geocache, but it is just shown as being
        // "here". That doesn't help, so we do quadsection unless the
        // radius was already small enough.
        if (list[i].distance == null) {
          // We are right on the spot? Let's see. We set a small
          // search radius and then do quadsection.
          newSearchRadius = Math.min(20, Math.sqrt(2)*radius/2);

          // We are working asynchronously here. Another branch of the
          // search may have advanced past the radius that we are
          // about to search, so we abort in this case.
          if (state.foundRadius < newSearchRadius) {
            console.debug("Aborting");
            return;
          }

          console.debug("Searching Geocache: Using quadsection, new radius 4x" + newSearchRadius);

          // Increment the angle so that we search in 45, 135, 225 and 315
          // degrees from the original coordinate.
          for (var angle = 45; angle < 45 + 360; angle += 90) {
            newSearchCoordinate = coordinate
                                  .project(angle, newSearchRadius);
            searchGeocachePositionHelper.call(_this, dfd, gcid, newSearchCoordinate,
                                              newSearchRadius, targetMaxRadius, false, state);
          }
          // we have now started four requests to search in the four
          // adjacent areas, so we are done here.
          return;
        }

        // Now we are in the situation that we have found the geocache
        // we were looking for on the map, and it has some nice
        // direction and distance information attached. We do the
        // directed search.

        var direction = {
          'N': 0,
          'NW': 45,
          'W': 90,
          'SW': 135,
          'S': 180,
          'SE': 225,
          'E': 270,
          'NE': 315}[list[i].direction];

        newSearchCoordinate = coordinate.project(direction, list[i].distance);

        // We calculate the radius using an approximation. We use the
        // length of an arc with 45 degrees in a circle with diameter
        // (distance).
        newSearchRadius = Math.radians(45) * list[i].distance;
        console.debug("Searching Geocache: Proceeding " + list[i].distance
                     + "m in direction " + direction
                     + "deg, using new radius " + newSearchRadius);
        searchGeocachePositionHelper.call(_this, dfd, gcid, newSearchCoordinate,
                                          newSearchRadius, targetMaxRadius, true, state);
        return;
      }

      // If we arrive here, we have not found the geocache. This may
      // be fine (during quadsection), but it may also indicate an
      // error (during directed search). Thus, in the second case, we
      // abort.

      dfd.notify(coordinate, radius, 0);
      if (mustBeThere) {
        console.error("Did not find geocache!");
        dfd.reject();
      }
    });
  }


  /**
   * Another wrapper for XMLHTTPRequest. Retrieves a page from
   * geocaching.com with all the right settings (e.g., including
   * cookies). Checks if there is an error message saying that the
   * user is not logged in anymore.
   */
  function readUrl(url, data, method) {
    var dfd = new $.Deferred();
    console.debug("-> Fetching " + url);
    $.ajax({
      url: url,
      data: data,
      method: method,
      xhrFields: { withCredentials: true },
      beforeSend: function(xhr){
	xhr.withCredentials = true;
      }
    })
    .done(function(data) {
      console.debug("<- Received XHR response.");
      var doc = $('<output>').append($.parseHTML(data));
      if ($('#pnlErrorMessage', doc).length && $('.Warning', doc).length) {
	console.debug("User is not logged in anymore. Exiting.");
	dfd.reject('Not logged in anymore.');
      } else {
	console.debug("User seems to be logged in still.");
	dfd.resolve(doc);
      }
    })
    .fail(function(xhr, textStatus, error) {
      console.debug('ERROR: Failed to read web site via ' + xhr.method + '. Status is ' + xhr.status + ', error is ' + error);
      dfd.reject('Failed to read web site.');
    });
    return dfd.promise();
  }

  /**
   * Parse a geocache overview page (doc) and update the geocache
   * (cache) with the data.
   */
  function parseCacheDocument(doc, cache) {

    // This is a premium member only cache, skip it.
    if ($('.PMOWarning', doc).length) {
      return false;
    }

    var coordinate = new Coordinate();
    coordinate.tryParse($('#uxLatLon', doc).text());

    // Source is web site where this cache was loaded from
    cache.source = 'geocaching.com';

    // Date when the cache was last updated
    cache.parseDate = (new Date()).getTime();

    // GUID is a unique ID for all geocaching.com caches
    cache.guid = $('link[rel="canonical"]', doc).attr('href').split('=')[1];

    // The well-known GC... code
    cache.gcid = $('.CoordInfoCode', doc).text();

    // The coordinates (lat/lon)
    //cache.lat = coordinate.lat;
    //cache.lon = coordinate.lon;
    cache.coordinate(coordinate);

    // The title (name) of the geocache
    cache.title = $('meta[name="og:title"]', doc).attr('content');

    // The owner of the geocache, note that this might not map to an
    // actual user name at geocaching.com
    cache.owner = $('#ctl00_ContentBody_mcd1 a', doc).text();

    // The date when this cache was hidden.
    //
    // TODO: As we have different date formats depending on the
    // language settings, we do not parse this for now.
    cache.rawHiddenDate = $('#ctl00_ContentBody_mcd2', doc).text().trim();

    // Difficulty, from 10 to 50.
    cache.difficulty = _getRatingFromImage.call(this, $('#ctl00_ContentBody_diffTerrStars img:eq(0)', doc));

    // Terrain, as above.
    cache.terrain = _getRatingFromImage.call(this, $('#ctl00_ContentBody_diffTerrStars img:eq(1)', doc));

    // Size, from 10 to 40 or -1 if not set.
    cache.size = _getSizeFromImage.call(this, $('.minorCacheDetails img', doc));

    // Type, see TYPE_STRINGS above
    cache.type = _getTypeFromImage.call(this, $('.cacheImage img', doc));

    // The short description.
    cache.shortdesc = $('#ctl00_ContentBody_ShortDescription', doc).text().trim();

    // The hint, we save it in a decoded form.
    cache.hint = _rot13.call(this, $('#div_hint', doc).text().trim());

    // The cache's attributes need special attention...
    var attributes = _getAttributesFromImages.call(this, $('#ctl00_ContentBody_detailWidget div.WidgetBody img', doc));
    for (index in attributes) {
      console.debug("Adding attribute " + attributes[index]);
      addAttribute.call(this, attributes[index], cache);
    }

    // The long description
    cache.desc = $('#ctl00_ContentBody_LongDescription', doc).html();

    // The cache stats
    cache.stats = {
      findCount: parseInt($('.InformationWidget h3', doc).text().trim())
    };

    // Whether the user has found the cache already
    cache.found = (
      $('ctl00_ContentBody_GeoNav_logTypeImage', doc).length
                  && _basename.call(this, $('ctl00_ContentBody_GeoNav_logTypeImage', doc).attr('src')) == '3');

    persistence.flush();

    var test_props = ['lat', 'lon', 'guid', 'gcid', 'difficulty', 'terrain', 'size', 'type'];
    for (var i in test_props) {
      if (cache[test_props[i]] === undefined) {
        alert("Undefined property: " + test_props[i]);
        debugger;
      }
    }

    return true;
  }

  /**
   * Check if an attribute is already in the database. If not so, add
   * it. Then add the attribute to the given geocache.
   */
  function addAttribute(name, cache) {
    var existingAttribute = Attribute.all().filter('source', '=', 'geocaching.com').filter('name', '=', name);
    console.debug("Adding attribute " + name);
    existingAttribute.one(function(tx, attrib) {
      if (attrib == null) {
        attrib = new Attribute({
          source: 'geocaching.com',
          name: name
        });
      }
      console.debug("-- adding attribute" + attrib.name);
      // We add the attribute regardless of whether it is already there. Check what persistence.js does with it.
      cache.attributes.add(attrib);
    });
  }

  /**
   * From a full file path or url, strip the path and the extension.
   *
   * e.g., http://example.com/bla/bla/test.gif -> test
   */
  function _basename(s) {
    var path = s.split('/')
    return path[path.length-1].split('.')[0]
  }

  /**
   * Parse the image file names from these "stars" images.
   */
  function _getRatingFromImage(img) {
    var basename = _basename.call(this, img.attr('src'));
    var ratingStr = basename.replace(/[^0-9_]/g, '').replace(/_/, '.');
    return Math.round(parseFloat(ratingStr)*10);
  }

  /**
   * Translate the filename of the image to a size of a geocache.
   */
  function _getSizeFromImage(img) {
    var sizestring = _basename.call(this, $(img).attr('src'));
    switch (sizestring) {
      case 'micro':
      return 10;
      case 'small':
      return 20;
      case 'regular':
      return 30;
      case 'large':
      case 'big':
      return 40;
      case 'not_chosen':
      return -1;
      default:
      return -2;
    }
  }

  /**
   * Get the type of a geocache from the image URL.
   */
  function _getTypeFromImage(img) {
    var type_string = _basename.call(this, img.attr('src'));
    return TYPE_STRINGS[type_string];
  }

  /**
   * What do you expect?
   */
  function _rot13(s) {
    return s.split('').map(function(_) {
	     if (!_.match(/[A-Za-z]/)) return _;
	     c = _.charCodeAt(0)>=96;
	     k = (_.toLowerCase().charCodeAt(0) - 96 + 12) % 26 + 1;
	     return String.fromCharCode(k + (c ? 96 : 64));
	   }).join('');
  }

  /**
   * From a list of images that visualize attributes, retrieve strings
   * that represent the attributes.
   */
  function _getAttributesFromImages(imgs) {
    var attrs = [];
    var attr;
    $.each(imgs, function(index, img){
      attr = _basename.call(this, $(img).attr('src'));
      if (attr != 'attribute-blank') {
	attrs.push(attr);
      }
    });
    return attrs;
  }

})(this, $);
