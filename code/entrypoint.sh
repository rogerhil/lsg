#!/bin/bash
set -e

sleep 5
chown -R lsg:lsg /app

if [ "$1" = 'update' ]; then
    cd /app/lsg/
    git pull origin master
else
    exec "$@"
fi

