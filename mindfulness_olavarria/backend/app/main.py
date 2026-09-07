"""
Serenalma — Backend API
Psicóloga Gabriela Ithurralde | psicologaithurralde.com.ar

Punto de entrada de la aplicación FastAPI.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import sys

# En Windows la consola puede no estar en UTF-8 (cp1252), lo que rompe
# cualquier print() con emojis o acentos. Forzamos UTF-8 en stdout/stderr.
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.database import create_tables

# ─── Crear aplicación ─────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    API para la plataforma de Serenalma.
    
    **Psicóloga Gabriela Ithurralde** — 30 años de experiencia en psicología clínica y mindfulness.
    
    ## Características
    - 🔐 Autenticación JWT con registro y login
    - 🎵 Audios y ejercicios de mindfulness (gratis y premium)
    - 📚 Programas guiados (Ej: "Regular la ansiedad en 21 días")  
    - 💚 Registro emocional diario con recomendaciones personalizadas
    - ⭐ Favoritos y seguimiento de progreso
    - 💳 Sistema freemium (prueba 7 días → suscripción mensual/anual)
    """,
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Servir archivos de media (audios, imágenes) ──────────────────────────────
media_dir = settings.MEDIA_DIR
os.makedirs(media_dir, exist_ok=True)
app.mount("/media", StaticFiles(directory=media_dir), name="media")

# ─── Incluir rutas de la API ──────────────────────────────────────────────────
app.include_router(api_router, prefix=settings.API_V1_STR)

# ─── Eventos de inicio ────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Crea las tablas en la BD al arrancar (solo si no existen)."""
    create_tables()
    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} iniciado")
    print(f"📖 Documentación: http://localhost:8000/docs")


# ─── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Sistema"])
def health_check():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["Sistema"])
def root():
    return {
        "message": f"Bienvenida a la API de {settings.APP_NAME}",
        "docs": "/docs",
    }
