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
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    # Archivos de audio/media
    MEDIA_DIR: str = "media"
    MAX_AUDIO_SIZE_MB: int = 50

    # Planes de suscripción (en pesos argentinos)
    # Valores de ejemplo — Martin los va a definir más adelante.
    PRICE_MONTHLY_ARS: float = 2990.0
    PRICE_QUARTERLY_ARS: float = 7990.0
    PRICE_YEARLY_ARS: float = 29900.0  # equivale a 10 meses (2 meses gratis)
    FREE_TRIAL_DAYS: int = 7

    # ─── MercadoPago ──────────────────────────────────────────────────────────
    # Credenciales de PRUEBA (sandbox)
    # Cuando Gabriela tenga las credenciales reales, reemplazar estos valores
    # en el archivo .env (NO en este archivo)
    # Obtenerlas en: mercadopago.com.ar/developers → Mis aplicaciones → Credenciales
    MP_ACCESS_TOKEN: str = "TEST-0000000000000000-000000-00000000000000000000000000000000-000000000"
    MP_PUBLIC_KEY: str = "TEST-00000000-0000-0000-0000-000000000000"

    # URLs de retorno después del pago
    # En producción reemplazar localhost por el dominio real
    MP_SUCCESS_URL: str = "http://localhost:5173/suscripcion/exitosa"
    MP_FAILURE_URL: str = "http://localhost:5173/suscripcion/fallida"
    MP_PENDING_URL: str = "http://localhost:5173/suscripcion/pendiente"

    # URL del webhook (donde MercadoPago notifica pagos confirmados)
    MP_WEBHOOK_URL: str = "http://localhost:8000/api/v1/payments/webhook"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
