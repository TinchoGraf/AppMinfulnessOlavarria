"""
Endpoints de Programas guiados y Registro Emocional.

GET  /programs/              → Lista programas
GET  /programs/{id}          → Detalle con sesiones
POST /programs/{id}/enroll   → Inscribirse a un programa

POST /emotional/log          → Registrar estado emocional del día
GET  /emotional/history      → Historial emocional del usuario
GET  /emotional/recommend    → Recomendaciones según estado actual
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import (
    Program, ProgramSession, UserProgress,
    EmotionalLog, ContentItem, User
)
from app.schemas.content import (
    ProgramResponse, ProgramDetail, ProgramSessionResponse,
    EmotionalLogCreate, EmotionalLogResponse,
    ContentItemResponse, UserStats
)
from app.api.deps import get_current_active_user

# ─── Programas ────────────────────────────────────────────────────────────────
programs_router = APIRouter(prefix="/programs", tags=["Programas"])


@programs_router.get("/", response_model=list[ProgramResponse])
def list_programs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Lista todos los programas activos con el progreso del usuario."""
    programs = db.query(Program).filter(Program.is_active == True).order_by(Program.order).all()
    return [_build_program_response(p, current_user, db) for p in programs]


@programs_router.get("/{program_id}", response_model=ProgramDetail)
def get_program(
    program_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Detalle de un programa con todas sus sesiones."""
    program = db.query(Program).filter(
        Program.id == program_id, Program.is_active == True
    ).first()

    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    # Verificar acceso premium
    is_premium_user = bool(current_user.subscription and current_user.subscription.is_premium)
    if program.is_premium and not is_premium_user:
        raise HTTPException(
            status_code=402,
            detail="Este programa requiere suscripción premium"
        )

    sessions = []
    for session in program.sessions:
        completed = bool(
            db.query(UserProgress).filter(
                UserProgress.user_id == current_user.id,
                UserProgress.program_session_id == session.id,
                UserProgress.completed == True
            ).first()
        )
        sessions.append(ProgramSessionResponse(
            id=session.id,
            day_number=session.day_number,
            title=session.title,
            description=session.description,
            duration_minutes=session.duration_minutes,
            is_completed=completed,
        ))

    base = _build_program_response(program, current_user, db)
    return ProgramDetail(**base.__dict__, sessions=sessions)


@programs_router.post("/{program_id}/sessions/{session_id}/complete")
def complete_session(
    program_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Marca una sesión de programa como completada."""
    session = db.query(ProgramSession).filter(
        ProgramSession.id == session_id,
        ProgramSession.program_id == program_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    existing = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.program_session_id == session_id
    ).first()

    if not existing:
        prog = UserProgress(
            user_id=current_user.id,
            program_id=program_id,
            program_session_id=session_id,
            completed=True,
            completed_at=datetime.utcnow(),
        )
        db.add(prog)
        db.commit()

    return {"message": f"Día {session.day_number} completado ✓"}


# ─── Registro Emocional ───────────────────────────────────────────────────────
emotional_router = APIRouter(prefix="/emotional", tags=["Registro Emocional"])


@emotional_router.post("/log", response_model=EmotionalLogResponse)
def log_emotion(
    data: EmotionalLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Registra el estado emocional del usuario para hoy."""
    log = EmotionalLog(
        user_id=current_user.id,
        state=data.state,
        note=data.note,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@emotional_router.get("/history", response_model=list[EmotionalLogResponse])
def get_emotional_history(
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Historial de registros emocionales de los últimos N días."""
    since = datetime.utcnow() - timedelta(days=days)
    logs = (
        db.query(EmotionalLog)
        .filter(
            EmotionalLog.user_id == current_user.id,
            EmotionalLog.logged_at >= since
        )
        .order_by(EmotionalLog.logged_at.desc())
        .all()
    )
    return logs


@emotional_router.get("/recommend", response_model=list[ContentItemResponse])
def get_recommendations(
    state: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Devuelve recomendaciones de contenido según el estado emocional.
    
    Mapa de estados → categorías recomendadas:
      ansiosa/acelerada → ansiedad, respiración
      triste/desconectada → regulación emocional
      saturada/cansada → pausas, meditación
      en_calma/contenta → programas, inteligencia emocional
    """
    # Mapeo estado → slugs de categorías prioritarias
    state_to_categories = {
        "ansiosa": ["ansiedad", "respiracion"],
        "acelerada": ["ansiedad", "respiracion"],
        "triste": ["regulacion-emocional", "mindfulness"],
        "saturada": ["pausas", "mindfulness"],
        "desconectada": ["regulacion-emocional", "vinculos"],
        "cansada": ["pausas", "sueno"],
        "en_calma": ["inteligencia-emocional", "mindfulness"],
        "contenta": ["inteligencia-emocional", "vinculos"],
    }

    slugs = state_to_categories.get(state, ["mindfulness"])

    from app.models.models import Category
    categories = db.query(Category).filter(Category.slug.in_(slugs)).all()
    cat_ids = [c.id for c in categories]

    # Priorizar gratis para usuarios free, incluir premium si es suscriptor
    is_premium = bool(current_user.subscription and current_user.subscription.is_premium)

    query = db.query(ContentItem).filter(
        ContentItem.is_active == True,
        ContentItem.category_id.in_(cat_ids) if cat_ids else True
    )

    if not is_premium:
        query = query.filter(ContentItem.is_premium == False)

    items = query.order_by(ContentItem.is_featured.desc()).limit(5).all()

    from app.api.v1.endpoints.content import _enrich_item
    return [_enrich_item(item, current_user, db) for item in items]


# ─── Stats del usuario ────────────────────────────────────────────────────────
stats_router = APIRouter(prefix="/stats", tags=["Estadísticas"])


@stats_router.get("/me", response_model=UserStats)
def get_my_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Estadísticas del usuario para el dashboard."""
    # Total sesiones completadas
    total_sessions = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.completed == True
    ).count()

    # Total minutos (suma de segundos reproducidos)
    from sqlalchemy import func
    total_seconds = db.query(func.sum(UserProgress.progress_seconds)).filter(
        UserProgress.user_id == current_user.id
    ).scalar() or 0

    # Último estado emocional
    last_log = db.query(EmotionalLog).filter(
        EmotionalLog.user_id == current_user.id
    ).order_by(EmotionalLog.logged_at.desc()).first()

    # Programas en progreso
    programs_in_progress = db.query(UserProgress.program_id).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.program_id != None
    ).distinct().count()

    return UserStats(
        total_sessions=total_sessions,
        total_minutes=total_seconds // 60,
        current_streak_days=0,  # TODO: calcular streak real
        programs_in_progress=programs_in_progress,
        last_emotional_state=last_log.state if last_log else None,
    )


# ─── Helper ───────────────────────────────────────────────────────────────────

def _build_program_response(program: Program, user: User, db: Session) -> ProgramResponse:
    sessions_count = len(program.sessions)
    completed_days = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.program_id == program.id,
        UserProgress.completed == True
    ).count()

    return ProgramResponse(
        id=program.id,
        title=program.title,
        description=program.description,
        thumbnail=program.thumbnail,
        duration_days=program.duration_days,
        is_premium=program.is_premium,
        category=program.category,
        sessions_count=sessions_count,
        user_progress_days=completed_days,
    )
