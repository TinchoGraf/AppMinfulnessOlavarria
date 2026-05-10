"""
Schemas Pydantic para Contenido, Programas y Registro Emocional.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from app.models.models import ContentType, EmotionalState


# ─── Category ─────────────────────────────────────────────────────────────────

class CategoryResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Content ──────────────────────────────────────────────────────────────────

class ContentItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType
    duration_seconds: Optional[int] = None
    is_premium: bool = False
    tags: Optional[str] = None


class ContentItemCreate(ContentItemBase):
    category_id: Optional[int] = None
    body_text: Optional[str] = None
    audio_file: Optional[str] = None


class ContentItemResponse(ContentItemBase):
    id: int
    category: Optional[CategoryResponse] = None
    thumbnail: Optional[str] = None
    is_featured: bool
    plays_count: int
    created_at: datetime
    # Estos se agregan según el usuario autenticado:
    is_completed: bool = False
    is_favorite: bool = False

    class Config:
        from_attributes = True


class ContentItemDetail(ContentItemResponse):
    """Detalle completo (incluye body_text y URL del audio)."""
    body_text: Optional[str] = None
    audio_url: Optional[str] = None   # URL firmada para servir el audio


# ─── Programs ─────────────────────────────────────────────────────────────────

class ProgramSessionResponse(BaseModel):
    id: int
    day_number: int
    title: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_completed: bool = False

    class Config:
        from_attributes = True


class ProgramResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration_days: Optional[int] = None
    is_premium: bool
    category: Optional[CategoryResponse] = None
    sessions_count: int = 0
    user_progress_days: int = 0   # Cuántos días completó el usuario

    class Config:
        from_attributes = True


class ProgramDetail(ProgramResponse):
    sessions: List[ProgramSessionResponse] = []


# ─── Emotional Log ────────────────────────────────────────────────────────────

class EmotionalLogCreate(BaseModel):
    state: EmotionalState
    note: Optional[str] = Field(None, max_length=500)


class EmotionalLogResponse(BaseModel):
    id: int
    state: EmotionalState
    note: Optional[str] = None
    logged_at: datetime

    class Config:
        from_attributes = True


# ─── User Progress ────────────────────────────────────────────────────────────

class ProgressCreate(BaseModel):
    content_item_id: Optional[int] = None
    program_session_id: Optional[int] = None
    progress_seconds: int = 0
    completed: bool = False


class ProgressResponse(BaseModel):
    id: int
    content_item_id: Optional[int] = None
    program_session_id: Optional[int] = None
    completed: bool
    progress_seconds: int
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Dashboard Stats ──────────────────────────────────────────────────────────

class UserStats(BaseModel):
    """Estadísticas del usuario para el dashboard."""
    total_sessions: int = 0
    total_minutes: int = 0
    current_streak_days: int = 0
    programs_in_progress: int = 0
    last_emotional_state: Optional[EmotionalState] = None
