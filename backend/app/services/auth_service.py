from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.models.auth import User
from app.repositories.users import UserRepository


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.users = UserRepository(db)

    def authenticate(self, username: str, password: str) -> tuple[str, User] | None:
        user = self.users.get_by_username(username)
        if user is None or not verify_password(password, user.hashed_password):
            return None
        user.last_login_at = datetime.now(timezone.utc)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        token = create_access_token(user.username, {"roles": [role.name for role in user.roles]})
        return token, user

