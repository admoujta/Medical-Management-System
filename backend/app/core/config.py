from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FADAA Sante API"
    environment: str = "development"
    frontend_origin: str = "http://127.0.0.1:5173"
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:5180,http://localhost:5180"
    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/gestion_medical"
    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60
    upload_dir: str = "uploads"
    backup_dir: str = "backups"
    backup_retention_days: int = 30
    public_frontend_url: str = "http://127.0.0.1:5173"
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@fadaa-sante.ma"
    smtp_use_tls: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @model_validator(mode="after")
    def validate_production_secrets(self):
        if self.environment.lower() == "production" and (self.secret_key == "change-me-in-production" or len(self.secret_key) < 32):
            raise ValueError("SECRET_KEY doit contenir au moins 32 caractères aléatoires en production.")
        return self

    @property
    def allowed_cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
