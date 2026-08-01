import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "PromptVault"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretkeyforpromptvaultprototype2026")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for easy prototyping
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./promptvault.db")

    class Config:
        case_sensitive = True

settings = Settings()
