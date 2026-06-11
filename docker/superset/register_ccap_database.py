import os

from superset.app import create_app


app = create_app()

with app.app_context():
    from superset import db
    from superset.models.core import Database

    database_name = "CCAP PostgreSQL"
    database = db.session.query(Database).filter_by(database_name=database_name).one_or_none()

    if database is None:
        database = Database(database_name=database_name)
        db.session.add(database)

    database.sqlalchemy_uri = os.environ["CCAP_DATABASE_URI"]
    database.expose_in_sqllab = True
    database.allow_dml = False
    database.allow_file_upload = False

    db.session.commit()
    print(f"Registered Superset database connection: {database_name}")
