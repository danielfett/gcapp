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

  var MAX_DOWNLOAD_NUM = 100;

  Geocaching = function() {

  }

  Geocaching.prototype.ensureLogin = function(username, password) {
    var dfd = new $.Deferred();
    this.checkLogin()
    .done(function(loggedInUser, indexDocument) {
      if (loggedInUser == undefined || loggedInUser.toLowerCase() != username.toLowerCase()) {
	if (loggedInUser == undefined) {
	  console.debug("No user is logged in.");
	} else {
	  console.debug("User '" + loggedInUser + "' is logged in, but '" + username + "' is supposed to. Loggin in again.");
	}
	this.login(indexDocument, username, password)
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
    var instance = this;
    this.getListOfGeocaches(new Coordinate(49.777, 6.666), new Coordinate(49.750, 6.650))
    .done(function(list) {
      console.debug(list);
      instance.downloadGeocachesInList(list)
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

  Geocaching.prototype.checkLogin = function() {
    var dfd = new $.Deferred();

    var loggedIn = false;
    $.ajax({
      url: 'http://www.geocaching.com',
      xhrFields: { withCredentials: true }
    })
    .done(function(data) {
      var doc = $('<output>').append($.parseHTML(data));
      if ($('#ctl00_divNotSignedIn', doc).length) {
	console.debug("Not signed in; #ctl00_divNotSignedIn is present.");
	dfd.resolve(undefined, doc);
      } else if ($('#ctl00_divSignedIn', doc).length) {
	console.debug("User is signed in; #ctl00_divSignedIn is present.");
	dfd.resolve($('a.SignedInProfileLink', doc).text());
      } else {
	console.debug("Cannot determine whether user is signed in...");
	console.debug("...assuming 'no'.");
	dfd.resolve(undefined, doc);
      }
    })
    .fail(function() {
      dfd.reject("Failed to check login status. Network error?");
    });

    return dfd.promise();
  }

  Geocaching.prototype.login = function(doc, username, password) {
    var dfd = new $.Deferred();

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
      var loggedInDocument = $('<output>').append($.parseHTML(data));
      if ($('#ctl00_ContentBody_lbUsername', loggedInDocument).length) {
	console.debug("User is signed in; " +
		      "#ctl00_ContentBody_lbUsername is present.");
	dfd.resolve();
      } else if ($('#ctl00_divNotSignedIn', loggedInDocument).length
	       || $('#ctl00_ContentBody_cvLoginFailed', loggedInDocument).length) {
	console.debug("User is not signed in; " +
		      "#ctl00_ContentBody_cvLoginFailed or " +
		      "#ctl00_divNotSignedIn is present.");
	dfd.reject('Username or password wrong, or some other error.');
      } else {
	console.debug("Cannot determine whether login was successful.");
	dfd.reject('Cannot determine whether login was successful.');
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

  Geocaching.prototype.readGeocache = function(id) {
    var dfd = new $.Deferred();
    var idstr = (id.length > 8) ? ('guid=' + id) : ('wp=' + id);

    console.debug("Reading geocache with " + idstr);

    var url = 'http://www.geocaching.com/seek/cache_details.aspx?' + idstr;

    var instance = this;
    readUrl.call(this, url)
    .done(function(doc){
      dfd.resolve(parseCacheDocument.call(instance, doc));
    })
    .fail(function(msg){
      dfd.reject(msg);
    });

    return dfd.promise();
  }

  Geocaching.prototype.getListOfGeocaches = function(coordinate1, coordinate2) {
    var center = new Coordinate(
      (coordinate1.lat + coordinate2.lat)/2,
      (coordinate1.lon + coordinate2.lon)/2);
    var dist = (center.distanceTo(coordinate1)/1000)/2;
    var url = 'http://www.geocaching.com/seek/nearest.aspx?lat=' + center.lat + '&lng=' + center.lon + '&dist=' + dist;

    var dfd = new $.Deferred();

    var instance = this;
    readUrl.call(this, url)
    .done(function(doc){
      fetchListRecursively.call(instance, dfd, doc, [], 0);
    })
    .fail(function(msg){
      dfd.reject(msg);
    });
    return dfd.promise();
  }

  Geocaching.prototype.downloadGeocachesInList = function(list) {
    var dfd = new $.Deferred();
    var counter = list.length;
    for (var i in list) {
      this.readGeocache(list[i].guid)
      .done(function(cache){
        list[i].cache = cache;
        counter -= 1;
        if (! counter) {
          dfd.resolve(list);
        }
      })
      .fail(function(msg){
        counter -= 1;
        console.debug("Failed to download cache " + list[i].gcid);
        if (! counter) {
          dfd.resolve(list);
        }
      });
    }

    return dfd.promise();
  }

  function fetchListRecursively(dfd, doc, wpts, page_last) {
    console.debug("Fetching list of geocaches, currently " + wpts.length + " fetched; last page was number " + page_last);
    var bs = $('#ctl00_ContentBody_ResultsPanel .PageBuilderWidget b', doc);
    if (bs.length == 0) {
      dfd.reject("There are no geocaches in this area.");
      return;
    }
    var count = parseInt($(bs[0]).text());
    var page_current = parseInt($(bs[1]).text());
    var page_max = parseInt($(bs[2]).text());
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
    if (count > MAX_DOWNLOAD_NUM) {
      dfd.reject("Found " + count + " geocaches in this area. Please select a smaller part of the map.");
      return;
    }

    $('.SearchResultsTable .Merge .small', doc).each(function(index, item) {
      wpts.push({
	guid: $(item).parent().children(':first-child').attr('href').split('guid=')[1],
	found: ($(item).parent().parent().attr('class').search('TertiaryRow') != -1),
	gcid: $(item).text().split('|')[1].trim()
      });
    });

    if (page_current < page_max) {
      var formData = $('form', doc).serializeArray();
      $.each(formData, function(index, value) {
	if (value.name == '__EVENTTARGET') {
	  formData[index].value = 'ctl00$ContentBody$pgrTop$ctl08';
	} else if (value.name == 'ctl00$ContentBody$chkAll') {
	  formData.splice(index, 1);
	}
      });

      url = 'http://www.geocaching.com/seek/' + $('form', doc).attr('action');
      readUrl.call(this, url, formData, 'POST')
      .done(function(doc){
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

  function parseCacheDocument(doc) {
    var coordinate = new Coordinate();
    coordinate.tryParse($('.uxLatLon', doc).text());
    var cache = {
      source: 'geocaching.com',
      parseDate: (new Date()).getTime(),
      guid: $('link[rel="canonical"]', doc).attr('href').split('=')[1], //todo: investigate undefined here
      gcid: $('.CoordInfoCode', doc).text(),
      coord: coordinate,
      title: $('meta[name="og:title"]', doc).attr('content'),
      owner: $('#ctl00_ContentBody_mcd1 a', doc).text(),
      rawHiddenDate: $('#ctl00_ContentBody_mcd2', doc).text().trim(), // simplify?
      difficulty: _getRatingFromImage.call(this, $('#ctl00_ContentBody_diffTerrStars img', doc)[0]),
      terrain: _getRatingFromImage.call(this, $('#ctl00_ContentBody_diffTerrStars img', doc)[1]),
      size: _getSizeFromImage.call(this, $('.minorCacheDetails img', doc)),
      type: _getTypeFromImage.call(this, $('.cacheImage img', doc)),
      shortdesc: $('#ctl00_ContentBody_ShortDescription', doc).text().trim(),
      hint: _rot13.call(this, $('#div_hint', doc).text().trim()),
      attributes: _getAttributesFromImages.call(this, $('#ctl00_ContentBody_detailWidget div.WidgetBody img', doc)),
      desc: $('#ctl00_ContentBody_LongDescription', doc).html(),
      stats: {
	findCount: parseInt($('.InformationWidget h3', doc).text().trim())
      }
    } ;
    console.debug("Cache: " + JSON.stringify(cache));
    return cache;
  }

  function _basename(s) {
    var path = s.split('/')
    return path[path.length-1].split('.')[0]
  }

  function _getRatingFromImage(img) {
    var basename = _basename.call(this, $(img).attr('src'));
    var ratingStr = basename.replace(/[^0-9_]/g, '').replace(/_/, '.');
    return Math.round(parseFloat(ratingStr)*10);
  }

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

  function _getTypeFromImage(img) {
    var type_string = _basename.call(this, $(img).attr('src'));
    return TYPE_STRINGS.type_string;
  }

  function _rot13(s) {
    return s.split('').map(function(_) {
	     if (!_.match(/[A-Za-z]/)) return _;
	     c = _.charCodeAt(0)>=96;
	     k = (_.toLowerCase().charCodeAt(0) - 96 + 12) % 26 + 1;
	     return String.fromCharCode(k + (c ? 96 : 64));
	   }).join('');
  }

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
