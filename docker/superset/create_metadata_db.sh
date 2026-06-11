#!/bin/sh
set -eu

database_name="${SUPERSET_METADATA_DB:-superset_metadata}"

if [ "$(psql -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '${database_name}'")" != "1" ]; then
  createdb --maintenance-db=postgres -O "${PGUSER}" "${database_name}"
  echo "Created Superset metadata database: ${database_name}"
else
  echo "Superset metadata database already exists: ${database_name}"
fi
