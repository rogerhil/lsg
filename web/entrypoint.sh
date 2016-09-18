#!/bin/bash
set -e

if [ "${1:0:1}" = '-' ]; then
	set -- run "$@"
fi

if [ "$1" = 'run' ]; then
    supervisord -n
elif [ "$1" = 'bash' ]; then
    bash
else
    cd /app/lsg/server
    python manage.py $@
fi

