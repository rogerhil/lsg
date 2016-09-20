#!/bin/env bash
psql -U postgres -c "CREATE USER $LSG_DB_USER PASSWORD '$LSG_DB_PASS'"
psql -U postgres -c "ALTER ROLE lsg SUPERUSER;" 
psql -U postgres -c "CREATE DATABASE $LSG_DB_NAME OWNER $LSG_DB_USER"
psql -U lsg -c "CREATE EXTENSION postgis;"
psql -U postgres -c "ALTER ROLE rogerio CREATEDB NOSUPERUSER NOCREATEROLE;" 

