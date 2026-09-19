from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "dev-insecure-secret-change-me"


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
    jwt_secret: str = DEFAULT_JWT_SECRET
    jwt_expires_minutes: int = 60

    oidc_issuer: str | None = None
    oidc_client_id: str | None = None
    oidc_client_secret: str | None = None
    # Must be this backend's own public URL + /auth/oidc/callback, registered
    # as the redirect URI in the IdP's client config.
    oidc_redirect_uri: str | None = None
    oidc_display_name: str = "SSO"
    oidc_scopes: str = "openid email profile"

    price_refresh_enabled: bool = True
    price_refresh_interval_minutes: int = 360
    # How long a fetched price is reused without hitting the external API
    # again — protects against two assets sharing a symbol, or a manual
    # refresh following closely after the scheduled one.
    price_cache_ttl_minutes: int = 5

    # Deployment-wide default for the consolidated net worth view when a
    # request doesn't explicitly pass ?currency=; each account/liability
    # still keeps its own currency regardless of this setting.
    reference_currency: str = "EUR"
    # Frankfurter (ECB rates) only updates ~once/day, so a long TTL is fine.
    fx_rate_cache_ttl_minutes: int = 720

    # Periodically checks GitHub for a newer Croesus release, surfaced as an "update available"
    # indicator in Settings -> About. Disable for an air-gapped self-hosted instance, or one that
    # just doesn't want the outbound call.
    update_check_enabled: bool = True
    # GitHub releases are infrequent, so a long TTL is fine.
    update_check_cache_ttl_minutes: int = 720

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
