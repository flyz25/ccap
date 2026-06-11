from superset.app import create_app


DATASET_TABLES = (
    "overall_population",
    "ecc_spk_map",
    "optimum_map",
    "zoning_map",
    "ketepuan",
    "superset_executive_kpi",
    "superset_executive_area",
    "superset_population_trend",
    "superset_land_use_summary",
)

app = create_app()

with app.app_context():
    from superset import db
    from superset.connectors.sqla.models import SqlaTable
    from superset.models.core import Database

    database = db.session.query(Database).filter_by(database_name="CCAP PostgreSQL").one()

    for table_name in DATASET_TABLES:
        dataset = (
            db.session.query(SqlaTable)
            .filter_by(database_id=database.id, schema="public", table_name=table_name)
            .one_or_none()
        )

        if dataset is None:
            dataset = SqlaTable(database=database, schema="public", table_name=table_name)
            db.session.add(dataset)
            db.session.flush()

        dataset.fetch_metadata()
        print(f"Registered Superset dataset: public.{table_name}")

    db.session.commit()
