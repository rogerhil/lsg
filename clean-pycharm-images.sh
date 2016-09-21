#!/bin/bash
docker images | grep 'pycharm' | awk '{print $3}' | xargs docker rmi -f
