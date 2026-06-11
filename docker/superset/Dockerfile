FROM apache/superset:6.0.0

USER root

RUN uv pip install --python /app/.venv/bin/python psycopg2-binary==2.9.10

COPY docker/superset/superset_config.py /app/pythonpath/superset_config.py
COPY docker/superset/init_superset.sh /opt/ccap/init_superset.sh
COPY docker/superset/create_analytics_views.py /opt/ccap/create_analytics_views.py
COPY docker/superset/register_ccap_database.py /opt/ccap/register_ccap_database.py
COPY docker/superset/register_ccap_datasets.py /opt/ccap/register_ccap_datasets.py
COPY docker/superset/register_executive_dashboard.py /opt/ccap/register_executive_dashboard.py

RUN chmod +x /opt/ccap/init_superset.sh

USER superset
