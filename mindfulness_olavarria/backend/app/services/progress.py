"""
Lógica de desbloqueo progresivo de sesiones de un Program.

Cada sesión tiene hasta 3 pasos, en este orden:
    🎬 Video → 📝 Cuestionario → 💬 Registro emocional

El cuestionario y el registro solo existen si la sesión tiene un Quiz activo
con al menos una pregunta ("pasos cargados"). Si no lo tiene, la sesión es
solo video: al terminarlo se pasa directo al video siguiente.

Reglas:
  - Video N → disponible si la sesión anterior (por day_number) está completa,
    o si es la primera. Si el usuario ya vio el video N, queda accesible
    para siempre (aunque después se le agregue un quiz a la sesión anterior).
  - Cuestionario N → disponible si completó el video N.
  - Registro N → disponible si completó el cuestionario N.
  - Sesión N completa → video + (cuestionario + registro, si están cargados).
"""

from sqlalchemy.orm import Session
from app.models.models import ProgramSession, UserProgress, Quiz, QuizQuestion

LOCKED = "locked"
AVAILABLE = "available"
COMPLETED = "completed"


def get_session_progress(db: Session, user_id: int, session_id: int) -> UserProgress | None:
    return (
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == user_id,
            UserProgress.program_session_id == session_id,
        )
        .first()
    )


def get_active_quiz(db: Session, session_id: int) -> Quiz | None:
    """Quiz activo y con preguntas de la sesión, o None si no está cargado."""
    return (
        db.query(Quiz)
        .join(QuizQuestion, QuizQuestion.quiz_id == Quiz.id)
        .filter(Quiz.program_session_id == session_id, Quiz.is_active == True)
        .first()
    )


def is_video_completed(db: Session, user_id: int, session_id: int) -> bool:
    progress = get_session_progress(db, user_id, session_id)
    return bool(progress and progress.completed)


def is_quiz_completed(db: Session, user_id: int, session_id: int) -> bool:
    progress = get_session_progress(db, user_id, session_id)
    return bool(progress and progress.quiz_completed_at)


def is_session_completed(db: Session, user_id: int, session_id: int) -> bool:
    """Todos los pasos cargados de la sesión están completos."""
    progress = get_session_progress(db, user_id, session_id)
    if not (progress and progress.completed):
        return False
    if get_active_quiz(db, session_id) is None:
        return True
    return bool(progress.quiz_completed_at and progress.activity_completed_at)


def is_session_locked(db: Session, user_id: int, session: ProgramSession) -> bool:
    """True si el video de la sesión todavía no está disponible."""
    if is_video_completed(db, user_id, session.id):
        return False
    prev = (
        db.query(ProgramSession)
        .filter(
            ProgramSession.program_id == session.program_id,
            ProgramSession.day_number < session.day_number,
        )
        .order_by(ProgramSession.day_number.desc())
        .first()
    )
    if not prev:
        return False
    return not is_session_completed(db, user_id, prev.id)


def get_session_steps(db: Session, user_id: int, session: ProgramSession) -> dict:
    """
    Estado de cada paso de la sesión: 'locked' | 'available' | 'completed'.
    quiz_status/activity_status son None si la sesión no tiene esos pasos cargados.
    """
    progress = get_session_progress(db, user_id, session.id)
    video_done = bool(progress and progress.completed)
    has_steps = get_active_quiz(db, session.id) is not None

    if video_done:
        video_status = COMPLETED
    elif is_session_locked(db, user_id, session):
        video_status = LOCKED
    else:
        video_status = AVAILABLE

    quiz_status = activity_status = None
    if has_steps:
        quiz_done = bool(progress and progress.quiz_completed_at)
        activity_done = bool(progress and progress.activity_completed_at)
        quiz_status = COMPLETED if quiz_done else (AVAILABLE if video_done else LOCKED)
        activity_status = COMPLETED if activity_done else (AVAILABLE if quiz_done else LOCKED)

    completed = video_done and (not has_steps or activity_status == COMPLETED)
    return {
        "video_status": video_status,
        "quiz_status": quiz_status,
        "activity_status": activity_status,
        "is_completed": completed,
        "is_locked": video_status == LOCKED,
    }
