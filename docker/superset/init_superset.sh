#!/bin/sh
set -eu

echo "Running Superset metadata migrations..."
superset db upgrade

echo "Creating Superset admin account when needed..."
superset fab create-admin \
  --username "${SUPERSET_ADMIN_USERNAME:-admin}" \
  --firstname "CCAP" \
  --lastname "Administrator" \
  --email "${SUPERSET_ADMIN_EMAIL:-admin@ccap.gov.my}" \
  --password "${SUPERSET_ADMIN_PASSWORD:-password123}" || true

echo "Initializing Superset roles and permissions..."
superset init

echo "Registering the CCAP analytics database..."
python /opt/ccap/register_ccap_database.py

echo "Creating CCAP analytical views..."
python /opt/ccap/create_analytics_views.py

echo "Registering the CCAP analytics datasets..."
python /opt/ccap/register_ccap_datasets.py

echo "Creating the CCAP Executive Overview dashboard..."
python /opt/ccap/register_executive_dashboard.py

echo "Superset initialization completed."
