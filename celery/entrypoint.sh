#!/bin/bash
set -e

if [ "$1" = 'run' ]; then
    cd /app/lsg/server
    #su -m lsguser -c "celery -A config worker -l info"
    supervisord -n
else
    exec "$@"
fi

