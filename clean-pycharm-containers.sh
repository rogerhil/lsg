#!/bin/bash
docker ps -a | grep 'pycharm' | awk '{print $1}' | xargs docker rm
