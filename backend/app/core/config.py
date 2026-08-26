from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./croesus.db"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "tauri://localhost",
        "http://tauri.localhost",
    ]

    admin_username: str | None = None
    admin_password: str | None = None
    jwt_secret: str = "dev-insecure-secret-change-me"
    jwt_expires_minutes: int = 60

    oidc_issuer: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: str | None = None
    # Must be this backend's own public URL + /auth/oidc/callback, registered
    # as the redirect URI in the IdP's client config.
    oidc_redirect_uri: str | None = None
    oidc_display_name: str = "SSO"
    oidc_scopes: str = "openid email profile"

    @property
    def password_enabled(self) -> bool:
        return bool(self.admin_username and self.admin_password)

    @property
    def oidc_enabled(self) -> bool:
        return bool(
            self.oidc_issuer and self.oidc_client_id and self.oidc_client_secret and self.oidc_redirect_uri
        )

    @property
    def auth_enabled(self) -> bool:
        return self.password_enabled or self.oidc_enabled


@lru_cache
def get_settings() -> Settings:
    return Settings()
