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

    @property
    def auth_enabled(self) -> bool:
        return bool(self.admin_username and self.admin_password)


@lru_cache
def get_settings() -> Settings:
    return Settings()
