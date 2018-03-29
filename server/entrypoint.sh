#!/bin/bash

cd /srv/server

# Migrate DB
# http://knexjs.org/#Migrations
echo "Migrating DB to latest"
npx knex migrate:latest

npm start
