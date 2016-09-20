#!/bin/bash
set -e

sleep 5
chown -R lsg:lsg /app

if [ "$1" = 'run' ]; then
    supervisord -n
else
    exec "$@"
fi

