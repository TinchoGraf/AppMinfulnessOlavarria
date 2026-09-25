"""
Endpoints de Programas guiados y Registro Emocional.

GET  /programs/              → Lista programas
GET  /programs/{id}          → Detalle con sesiones
POST /programs/{id}/enroll   → Inscribirse a un programa

GET  /programs/{id}/sessions/{sid}/quiz          → Cuestionario (sin respuestas correctas)
POST /programs/{id}/sessions/{sid}/quiz/respond  → Enviar respuestas
GET  /programs/{id}/sessions/{sid}/quiz/result   → Resultado del usuario
POST /programs/{id}/sessions/{sid}/activity      → Nueva entrada de registro emocional
GET  /programs/{id}/sessions/{sid}/activity      → Entradas del usuario en la sesión

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
    EmotionalLog, ContentItem, User,
    QuizResponse, ActivityLog,
)
from app.schemas.content import (
    ProgramResponse, ProgramDetail, ProgramSessionResponse,
    EmotionalLogCreate, EmotionalLogResponse,
    ContentItemResponse, UserStats,
    QuizPublic, QuizSubmit, QuizResult, QuizAnswerResult,
    ActivityLogCreate, ActivityLogCreated, ActivityLogList,
)
from app.api.deps import get_current_active_user
from app.services.progress import (
    is_session_completed, is_session_locked, is_video_completed,
    get_session_progress, get_active_quiz, get_session_steps,
)

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
        sessions.append(ProgramSessionResponse(
            id=session.id,
            day_number=session.day_number,
            title=session.title,
            description=session.description,
            duration_minutes=session.duration_minutes,
            content_item_id=session.content_item_id,
            **get_session_steps(db, current_user.id, session),
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
    """Marca una sesión de programa como completada (90% del video, o botón "Marcar como visto")."""
    session = db.query(ProgramSession).filter(
        ProgramSession.id == session_id,
        ProgramSession.program_id == program_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    if is_session_locked(db, current_user.id, session):
        raise HTTPException(
            status_code=403,
            detail="Completá la clase anterior para desbloquear"
        )

    existing = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.program_session_id == session_id
    ).first()

    if existing:
        if not existing.completed:
            existing.completed = True
            existing.completed_at = datetime.utcnow()
            db.commit()
    else:
        prog = UserProgress(
            user_id=current_user.id,
            program_id=program_id,
            program_session_id=session_id,
            content_item_id=session.content_item_id,
            completed=True,
            completed_at=datetime.utcnow(),
        )
        db.add(prog)
        db.commit()

    return {"message": f"Día {session.day_number} completado ✓"}


# ─── Cuestionario de la sesión ────────────────────────────────────────────────

def _get_accessible_session(
    db: Session, user: User, program_id: int, session_id: int
) -> ProgramSession:
    """Sesión del programa, validando que exista y que el usuario tenga acceso."""
    session = (
        db.query(ProgramSession)
        .join(Program, Program.id == ProgramSession.program_id)
        .filter(
            ProgramSession.id == session_id,
            ProgramSession.program_id == program_id,
            Program.is_active == True,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")

    is_premium_user = bool(user.subscription and user.subscription.is_premium)
    if session.program.is_premium and not is_premium_user:
        raise HTTPException(status_code=402, detail="Este programa requiere suscripción premium")
    return session


def _require_active_quiz(db: Session, session_id: int):
    quiz = get_active_quiz(db, session_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Esta sesión no tiene cuestionario")
    return quiz


def _build_quiz_result(db: Session, user_id: int, quiz) -> QuizResult | None:
    responses = {
        r.question_id: r
        for r in db.query(QuizResponse).filter(
            QuizResponse.user_id == user_id, QuizResponse.quiz_id == quiz.id
        )
    }
    if not responses:
        return None

    answers = []
    for question in quiz.questions:
        response = responses.get(question.id)
        if not response:
            continue
        correct = next((o for o in question.options if o.is_correct), None)
        answers.append(QuizAnswerResult(
            question_id=question.id,
            question_text=question.question_text,
            selected_option_id=response.option_id,
            selected_option_text=response.option.option_text,
            correct_option_id=correct.id if correct else None,
            correct_option_text=correct.option_text if correct else None,
            is_correct=bool(response.option.is_correct),
        ))

    return QuizResult(
        quiz_id=quiz.id,
        title=quiz.title,
        score=sum(a.is_correct for a in answers),
        total=len(quiz.questions),
        answered_at=max(r.answered_at for r in responses.values()),
        answers=answers,
    )


@programs_router.get("/{program_id}/sessions/{session_id}/quiz", response_model=QuizPublic)
def get_session_quiz(
    program_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Cuestionario de la sesión, sin indicar las opciones correctas."""
    _get_accessible_session(db, current_user, program_id, session_id)
    quiz = _require_active_quiz(db, session_id)

    if not is_video_completed(db, current_user.id, session_id):
        raise HTTPException(status_code=403, detail="Completá el video para acceder al cuestionario")

    progress = get_session_progress(db, current_user.id, session_id)
    return QuizPublic(
        id=quiz.id,
        title=quiz.title,
        questions=quiz.questions,
        is_answered=bool(progress and progress.quiz_completed_at),
    )


@programs_router.post("/{program_id}/sessions/{session_id}/quiz/respond", response_model=QuizResult)
def respond_session_quiz(
    program_id: int,
    session_id: int,
    data: QuizSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Guarda las respuestas (una por pregunta, sin reintentos) y marca el cuestionario como completado."""
    _get_accessible_session(db, current_user, program_id, session_id)
    quiz = _require_active_quiz(db, session_id)

    if not is_video_completed(db, current_user.id, session_id):
        raise HTTPException(status_code=403, detail="Completá el video para acceder al cuestionario")

    progress = get_session_progress(db, current_user.id, session_id)
    already = db.query(QuizResponse).filter(
        QuizResponse.user_id == current_user.id, QuizResponse.quiz_id == quiz.id
    ).first()
    if progress.quiz_completed_at or already:
        raise HTTPException(status_code=409, detail="Ya respondiste este cuestionario")

    options_by_question = {q.id: {o.id for o in q.options} for q in quiz.questions}
    answered = [a.question_id for a in data.answers]
    if len(answered) != len(set(answered)):
        raise HTTPException(status_code=400, detail="Hay preguntas respondidas más de una vez")
    if set(answered) != set(options_by_question):
        raise HTTPException(status_code=400, detail="Respondé todas las preguntas del cuestionario")
    for a in data.answers:
        if a.option_id not in options_by_question[a.question_id]:
            raise HTTPException(status_code=400, detail="Opción inválida para la pregunta")

    now = datetime.utcnow()
    for a in data.answers:
        db.add(QuizResponse(
            user_id=current_user.id,
            quiz_id=quiz.id,
            question_id=a.question_id,
            option_id=a.option_id,
            answered_at=now,
        ))
    progress.quiz_completed_at = now
    db.commit()

    return _build_quiz_result(db, current_user.id, quiz)


@programs_router.get("/{program_id}/sessions/{session_id}/quiz/result", response_model=QuizResult)
def get_session_quiz_result(
    program_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Respuestas del usuario, indicando cuáles fueron correctas."""
    _get_accessible_session(db, current_user, program_id, session_id)
    quiz = _require_active_quiz(db, session_id)

    result = _build_quiz_result(db, current_user.id, quiz)
    if not result:
        raise HTTPException(status_code=404, detail="Todavía no respondiste este cuestionario")
    return result


# ─── Registro emocional de la sesión ──────────────────────────────────────────

@programs_router.post(
    "/{program_id}/sessions/{session_id}/activity",
    response_model=ActivityLogCreated, status_code=201,
)
def create_session_activity(
    program_id: int,
    session_id: int,
    data: ActivityLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Agrega una entrada de registro emocional. Requiere el cuestionario completado."""
    _get_accessible_session(db, current_user, program_id, session_id)
    _require_active_quiz(db, session_id)

    progress = get_session_progress(db, current_user.id, session_id)
    if not (progress and progress.quiz_completed_at):
        raise HTTPException(status_code=403, detail="Completá el cuestionario para acceder al registro")

    content = data.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="El registro no puede estar vacío")

    entry = ActivityLog(user_id=current_user.id, program_session_id=session_id, content=content)
    db.add(entry)
    if not progress.activity_completed_at:
        progress.activity_completed_at = datetime.utcnow()
    db.commit()
    db.refresh(entry)
    return ActivityLogCreated(entry=entry)


@programs_router.get("/{program_id}/sessions/{session_id}/activity", response_model=ActivityLogList)
def list_session_activity(
    program_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Entradas de registro emocional del usuario en esta sesión (más recientes primero)."""
    _get_accessible_session(db, current_user, program_id, session_id)
    entries = (
        db.query(ActivityLog)
        .filter(ActivityLog.user_id == current_user.id, ActivityLog.program_session_id == session_id)
        .order_by(ActivityLog.logged_at.desc())
        .all()
    )
    return ActivityLogList(entries=entries)


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
    completed_days = sum(
        is_session_completed(db, user.id, s.id) for s in program.sessions
    )

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
