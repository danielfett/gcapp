#!/bin/bash
set -e 
set -o nounset

INDEXFILE=www/index.html
IP=`hostname -I | cut -d' ' -f1`
PLACEHOLDER="<!-- make script adds weinre.js here -->"
WEINRE="<script src='http://$IP:8081/target/target-script-min.js'></script>"

echo "Copying $INDEXFILE to $INDEXFILE.make for backup..."
cp $INDEXFILE $INDEXFILE.make
echo "Injecting weinre script tag"
sed -ie "s~$PLACEHOLDER~$WEINRE~g" $INDEXFILE
echo "Running cordova" 
cordova run android # TODO: Allow other commands
echo "Restoring backup"
mv $INDEXFILE.make $INDEXFILE
echo "Done."
