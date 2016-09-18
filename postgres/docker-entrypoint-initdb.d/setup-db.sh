#!/bin/env bash
psql -U postgres -c "CREATE USER $DB_USER PASSWORD '$DB_PASS'"
psql -U postgres -c "ALTER ROLE lsg SUPERUSER;" 
psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER"
psql -U lsg -c "CREATE EXTENSION postgis;"
psql -U postgres -c "ALTER ROLE rogerio CREATEDB NOSUPERUSER NOCREATEROLE;" 

