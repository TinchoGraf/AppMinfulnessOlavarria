from fastapi import APIRouter
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.content import router as content_router
from app.api.v1.endpoints.programs import (
    programs_router, emotional_router, stats_router
)

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(content_router)
api_router.include_router(programs_router)
api_router.include_router(emotional_router)
api_router.include_router(stats_router)
