from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.auth import Role, User


class UserRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_username(self, username: str) -> User | None:
        return self.db.scalar(select(User).where(User.username == username))

    def get_role(self, name: str) -> Role | None:
        return self.db.scalar(select(Role).where(Role.name == name))

    def list_roles(self) -> list[Role]:
        return list(self.db.scalars(select(Role).order_by(Role.name)))

    def add(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        return user

    def add_role(self, role: Role) -> Role:
        self.db.add(role)
        self.db.flush()
        return role

