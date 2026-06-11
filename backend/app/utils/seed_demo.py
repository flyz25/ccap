from app.core.database import SessionLocal
from app.services.seed import seed_demo_data


def main() -> None:
    with SessionLocal() as db:
        seed_demo_data(db)
    print("Demo roles and users are ready.")


if __name__ == "__main__":
    main()

