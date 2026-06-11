from datetime import datetime

from pydantic import BaseModel


class RoleRead(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = {"from_attributes": True}


class UserRead(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    is_active: bool
    last_login_at: datetime | None = None
    roles: list[RoleRead] = []

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
