GCApp
=====

A geocaching application like
https://github.com/webhamster/advancedcaching but written using
HTML5. It is intended to be run with cordova/phonegap on Android or
other devices.

Setup Cordova
-------------

There's really not much to see for now, so don't bother unless you're
planning to join development. The following instructions may or may
not work.

Install cordova with

    npm install -g cordova

Checkout the files from the repository, the add the android platform

    cordova platform add android

Then compile/run with

    cordova run android


The necessary plugins should already be configured. For reference,
they were added with
    
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-geolocation.git
    cordova plugin add https://git-wip-us.apache.org/repos/asf/cordova-plugin-device-orientation.git

It is not so clear whether this is explicitly needed:

    https://git-wip-us.apache.org/repos/asf/cordova-plugin-device.git

For a full list of cordova plugins in version 3.0.0 and above, see 
for example 
http://www.raymondcamden.com/index.cfm/2013/7/19/PhoneGap-30-Released--Things-You-Should-Know

Testing GCApp
-------------

### On some device

The application can, of course, be tested at an (Android) device. Run 

    ./make 

to have it compiled an run. weinre
(https://people.apache.org/~pmuellr/weinre/docs/latest/) can then be
used for debugging: To install weinre on your (desktop) machine, run
     
     npm install -g weinre

then create ~/.weinre/server.properties with the following contents:

     boundHost:    -all-
     httpPort:     8081
     reuseAddr:    true
     readTimeout:  1
     deathTimeout: 5

Run weinre on the command line and open http://localhost:8081 on your desktop machine. The ./make script inserts the weinre tag into the index.html file, such that weinre connects to your desktop machine.

### On the desktop

Go to the www folder, then run

    python -m SimpleHTTPServer 8000

Start chromium (or google-chrome) with the command line option --disable-web-security:

    chromium --disable-web-security

And navigate to http://localhost:8000.

This way, the application can connect to geocaching.com and retrieve
the data there. The compass will not work.

Have fun!