from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Mindfulness Olavarría"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Base URL
    API_V1_STR: str = "/api/v1"

    # Seguridad JWT
    SECRET_KEY: str = "CAMBIA_ESTO_EN_PRODUCCION_clave_muy_larga_y_segura"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días

    # Base de datos
    DATABASE_URL: str = "sqlite:///./mindfulness_olavarria.db"

    # CORS - orígenes permitidos
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",   # React dev
        "http://localhost:5173",   # Vite dev
        "http://127.0.0.1:3000",
    ]

    # Archivos de audio/media
    MEDIA_DIR: str = "media"
    MAX_AUDIO_SIZE_MB: int = 50

    # Planes de suscripción (en pesos argentinos)
    PRICE_MONTHLY_ARS: float = 2990.0
    PRICE_YEARLY_ARS: float = 24900.0
    FREE_TRIAL_DAYS: int = 7

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
