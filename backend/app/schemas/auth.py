from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthStatus(BaseModel):
    auth_enabled: bool
    password_enabled: bool
    oidc_enabled: bool
    oidc_display_name: str | None = None
