GCApp
=====

A geocaching application like
https://github.com/webhamster/advancedcaching but written using
HTML5. It is intended to be run with cordova/phonegap on Android or
other devices.

Setup
-----

There's really not much to see for now, so don't bother unless you're
planning to join development. The following instructions may or may not
work.

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
