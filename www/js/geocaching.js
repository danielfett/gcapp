(function(window, $, undefined) {

  var TYPE_STRINGS = {
    2: 'REGULAR',
    3: 'MULTI',
    4: 'VIRTUAL',
    6: 'EVENT',
    8: 'MYSTERY',
    11: 'WEBCAM',
    137: 'EARTH'
  }

  var LOG_TYPE_CODE = {
    2: 'found',
    3: 'did not find',
    4: 'write note',
    7: 'needs archived',
    45: 'needs maintenance'
  }

  var MAX_DOWNLOAD_NUM = 100;

  Geocaching = function() {
    if (SIMULATE_GC) {
      console.debug("Geocaching.js running in simulation mode.");
    }
  }

  /**
   * Make sure that the user with the given user name (and password)
   * is logged in.
   */
  Geocaching.prototype.ensureLogin = function(username, password) {
    var dfd = new $.Deferred();
    checkLogin.call(this)
    .done(function(loggedInUser, indexDocument) {
      if (loggedInUser == undefined || loggedInUser.toLowerCase() != username.toLowerCase()) {
	if (loggedInUser == undefined) {
	  console.debug("No user is logged in.");
	} else {
	  console.debug("User '" + loggedInUser + "' is logged in, but '" + username + "' is supposed to. Loggin in again.");
	}
	login.call(this, indexDocument, username, password)
	.done(function() {
	  dfd.resolve("Login successful.");
	})
	.fail(function(msg) {
	  dfd.reject(msg);
	})
	.progress(function(msg) {
	  dfd.notify(msg);
	});
      } else {
	console.debug("User was already logged in.");
	dfd.resolve("User is logged in.");
      }
    })
    .fail(function(msg) {
      dfd.reject(msg);
    });
    return dfd.promise();
  }

  /**
   * This test function is currently called when the document has
   * finished loading and the user is logged in. You may add stuff
   * here.
   */
  Geocaching.prototype.test = function() {
    //this.readGeocache('c73299e3-f31b-489b-8d02-3db49e8b7816')
    /*this.readGeocache('GC2CMHW')
      .done(function(cache) {
      alert(cache);
      debugger;
      })
      .fail(function(msg) {
      alert(msg);
      });
     */
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
  }

  /**
   * Retrieve a geocache from the local database and return it;
   * If the geocache is not in the local database, retrieve it.
   */
  Geocaching.prototype.getGeocache = function(id) {
    var dfd = new $.Deferred();
    Geocache.findBy('gcid', id, function(geocache) {
      if (geocache == null) {
        this.updateGeocache(id)
        .done(function(geocache){
          dfd.resolve(geocache);
        })
        .fail(function(msg){
          dfd.reject(msg);
        });
      } else {
        dfd.resolve(geocache);
      }
    });
    return dfd.promise();
  }


  /**
   * Update a geocache (identified by the GCID) in the local database;
   * If it is not in there, download it.
   */
  Geocaching.prototype.updateGeocache = function(id) {
    var dfd = new $.Deferred();
    var _this = this;

    // Simulation can be enabled by including the simulate-geocaching.js file.
    if (SIMULATE_GC) {
      dfd.resolve(parseCacheDocument.call(this, CACHE_DOC));
      return dfd.promise();
    }

    // Fetch geocache from URL
    var url = 'http://www.geocaching.com/seek/cache_details.aspx?wp=' + id;
    readUrl.call(this, url)
    .done(function(doc){
      // Check if geocache is in DB, if not create it.
      Geocache.findBy('gcid', id, function(geocache) {
        if (geocache == null) {
          geocache = new Geocache();
          persistence.add(geocache);
        }
        dfd.resolve(parseCacheDocument.call(_this, doc, geocache));
      });
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
    var dfd = new $.Deferred();
    var _this = this;

    // Simulation can be enabled by including the simulate-geocaching.js file.
    if (SIMULATE_GC) {
      dfd.resolve({dummy: 'dummy'});
      return dfd.promise();
    }

    var center = new Coordinate(
      (coordinate1.lat + coordinate2.lat)/2,
      (coordinate1.lon + coordinate2.lon)/2);
    var dist = (center.distanceTo(coordinate1)/1000)/2;
    var url = 'http://www.geocaching.com/seek/nearest.aspx?lat=' + center.lat + '&lng=' + center.lon + '&dist=' + dist;

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

    // Simulation can be enabled by including the simulate-geocaching.js file.
    if (SIMULATE_GC) {
      dfd.resolve({dummy: 'dummy', cache: this.readGeocache('dummy')});
      return dfd.promise();
    }

    var action = updateExisting ? this.updateGeocache : this.getGeocache;

    var counter = list.length;
    var output = [];
    for (var i in list) {
      action(list[i])
      .done(function(cache){
        output.push(cache);
        counter -= 1;
        if (! counter) {
          dfd.resolve(output);
        }
      })
      .fail(function(msg){
        console.debug("Failed to download cache: " + msg);
        counter -= 1;
        if (! counter) {
          dfd.resolve(output);
        }
      });
    }

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

    // Simulation can be enabled by including the simulate-geocaching.js file.
    if (SIMULATE_GC) {
      dfd.resolve('AGTLTestUser', undefined);
      return dfd.promise();
    }

    // Retrieve the home page.
    //
    // TODO: Check if other pages of the web
    // site load faster and then use these instead here.
    $.ajax({
      url: 'http://www.geocaching.com',
      xhrFields: { withCredentials: true }
    })
    .done(function(data) {
      var doc = $('<output>').append($.parseHTML(data));
      var status = checkLoginStatus.call(doc);
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

    // Simulation can be enabled by including the simulate-geocaching.js file.
    if (SIMULATE_GC) {
      dfd.reject("Cannot log in in simulation mode.");
      return dfd.promise();
    }

    console.debug("Starting login.");
    var formData = $('form', doc).serializeArray();
    $.each(formData, function(index, value) {
      if (value.name == 'ctl00$tbUsername') {
	formData[index].value = username;
      } else if (value.name == 'ctl00$tbPassword') {
	formData[index].value = password;
      }
    });

    $.ajax({
      url: 'https://www.geocaching.com/login/default.aspx',
      data: formData,
      type: 'POST',
      xhrFields: { withCredentials: true }
    })
    .done(function(data) {
      var doc = $('<output>').append($.parseHTML(data));

      // Now check whether we are really logged in.
      var status = checkLoginStatus(doc);
      if (status === false) {
        dfd.reject('Username or password wrong, or some other error.');
      } else if (status === undefined) {
        dfd.reject('Cannot determine whether login was successful.'
                  + ' Maybe you need to update this application.');
      } else {
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
    } else if ($('#ctl00_divSignedIn', doc).length) {
      console.debug("User is signed in; #ctl00_divSignedIn is present.");
      return $('a.SignedInProfileLink', doc).text();
    } else {
      // This should never happen, but it may.
      return undefined;
    }
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
      dfd.reject("There are no geocaches in this area.");
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
    console.debug("We are at page "
		 + page_current
		 + " of "
		 + page_max
		 + ", total "
		 + count
		 + " geocaches.");

    // Stop if there are too many geocaches in this area. Nobody wants
    // to wait for the retrieval of 1000 geocaches.
    if (count > MAX_DOWNLOAD_NUM) {
      dfd.reject("Found " + count + " geocaches in this area. Please select a smaller part of the map.");
      return;
    }

    // Add what we've found to the result set.
    $('.SearchResultsTable .Merge .small', doc).each(function(index, item) {
      wpts.push($(item).text().split('|')[1].trim());
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
    var coordinate = new Coordinate();
    coordinate.tryParse($('.uxLatLon', doc).text());

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
    // As we have different date formats depending on the language settings,
    // we do not parse this for now.
    cache.rawHiddenDate = $('#ctl00_ContentBody_mcd2', doc).text().trim();

    // Difficulty, from 10 to 50.
    cache.difficulty = _getRatingFromImage.call(this, $('#ctl00_ContentBody_diffTerr img:eq(0)', doc));

    // Terrain, as above.
    cache.terrain = _getRatingFromImage.call(this, $('#ctl00_ContentBody_diffTerr img:eq(1)', doc));

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
    return cache;
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
    var type_string = _basename.call(this, $(img).attr('src'));
    return TYPE_STRINGS.type_string;
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
