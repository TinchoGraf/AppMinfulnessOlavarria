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
    content_item_id: Optional[int] = None
    is_completed: bool = False
    is_locked: bool = False
    # Estado de cada paso: 'locked' | 'available' | 'completed'.
    # quiz_status/activity_status son None si la sesión no tiene cuestionario cargado.
    video_status: str = "available"
    quiz_status: Optional[str] = None
    activity_status: Optional[str] = None

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


# ─── Quiz (vista del usuario) ─────────────────────────────────────────────────

class QuizOptionPublic(BaseModel):
    """Opción sin revelar si es correcta."""
    id: int
    option_text: str
    order: int

    class Config:
        from_attributes = True


class QuizQuestionPublic(BaseModel):
    id: int
    question_text: str
    order: int
    options: List[QuizOptionPublic] = []

    class Config:
        from_attributes = True


class QuizPublic(BaseModel):
    id: int
    title: str
    questions: List[QuizQuestionPublic] = []
    is_answered: bool = False


class QuizAnswer(BaseModel):
    question_id: int
    option_id: int


class QuizSubmit(BaseModel):
    answers: List[QuizAnswer]


class QuizAnswerResult(BaseModel):
    question_id: int
    question_text: str
    selected_option_id: int
    selected_option_text: str
    correct_option_id: Optional[int] = None
    correct_option_text: Optional[str] = None
    is_correct: bool


class QuizResult(BaseModel):
    quiz_id: int
    title: str
    score: int
    total: int
    answered_at: Optional[datetime] = None
    answers: List[QuizAnswerResult] = []


# ─── Registro emocional por sesión (ActivityLog) ──────────────────────────────

ACTIVITY_NOTICE = "Tu registro será leído por la psicóloga para acompañar tu avance."


class ActivityLogCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=5000)


class ActivityLogEntry(BaseModel):
    id: int
    content: str
    logged_at: datetime

    class Config:
        from_attributes = True


class ActivityLogCreated(BaseModel):
    message: str = ACTIVITY_NOTICE
    entry: ActivityLogEntry


class ActivityLogList(BaseModel):
    message: str = ACTIVITY_NOTICE
    entries: List[ActivityLogEntry] = []


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
