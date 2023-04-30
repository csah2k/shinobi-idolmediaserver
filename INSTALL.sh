#!/bin/bash
DIR=$(dirname $0)
echo "Removing existing Node.js modules..."
rm -rf $DIR/node_modules

nonInteractiveFlag=false

if [ ! -e "$DIR/conf.json" ]; then
	dontCreateKeyFlag=false
    echo "Creating conf.json"
    sudo cp $DIR/conf.sample.json $DIR/conf.json
else
    echo "conf.json already exists..."
fi

if [ "$dontCreateKeyFlag" = false ]; then
	echo "Adding Random Plugin Key to Main Configuration"
    key=$(head -c 64 < /dev/urandom | sha256sum | awk '{print substr($1,1,60)}')
    echo "KEY=$key"
	node $DIR/../../tools/modifyConfigurationForPlugin.js idolmediaserver key=$key
fi


echo "Starting pm2 service"
pm2 start $DIR/shinobi-idolmediaserver.js

sleep 1
echo "Saving pm2 startup"

sleep 2
pm2 save