#!/bin/bash
docker ps -a | grep 'Exited' | awk '{print $1}' | xargs docker rm
