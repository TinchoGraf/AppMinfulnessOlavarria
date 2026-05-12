from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.content import router as content_router
from app.api.v1.endpoints.programs import (
    programs_router, emotional_router, stats_router
)
from app.api.v1.endpoints.admin import router as admin_router
from app.api.v1.endpoints.media import router as media_router
from app.api.v1.endpoints.payments import router as payments_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(programs_router)
api_router.include_router(emotional_router)
api_router.include_router(stats_router)
api_router.include_router(admin_router)
api_router.include_router(media_router)
api_router.include_router(payments_router)
