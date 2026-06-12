from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.auth import Role, User
from app.repositories.users import UserRepository
from app.services.capacity_seed import CapacitySeedService


DEMO_USERS = [
    ("admin", "admin@ccap.local", "CCAP Admin", "Admin"),
    ("planner", "planner@ccap.local", "Government Planner", "Planner"),
    ("analyst", "analyst@ccap.local", "Spatial Analyst", "Analyst"),
    ("viewer", "viewer@ccap.local", "Read Only Viewer", "Viewer"),
]


def seed_demo_data(db: Session) -> None:
    repo = UserRepository(db)
    roles: dict[str, Role] = {}
    for role_name in ["Admin", "Planner", "Analyst", "Viewer"]:
        role = repo.get_role(role_name)
        if role is None:
            role = repo.add_role(Role(name=role_name, description=f"{role_name} access role"))
        roles[role_name] = role

    for username, email, full_name, role_name in DEMO_USERS:
        if repo.get_by_username(username):
            continue
        user = User(
            username=username,
            email=email,
            full_name=full_name,
            hashed_password=get_password_hash("password123"),
            roles=[roles[role_name]],
        )
        repo.add(user)

    db.commit()
    CapacitySeedService(db).ensure_seed_data()
