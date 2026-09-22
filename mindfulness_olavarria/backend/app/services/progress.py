"""
Lógica de desbloqueo progresivo de sesiones de un Program.

Regla: la sesión con el day_number más bajo de un programa siempre está
disponible; cualquier otra sesión se desbloquea recién cuando la sesión
inmediatamente anterior (por day_number) fue completada por ese usuario.
Una vez completada, una sesión queda accesible para siempre.
"""

from sqlalchemy.orm import Session
from app.models.models import ProgramSession, UserProgress


def is_session_completed(db: Session, user_id: int, session_id: int) -> bool:
    return bool(
        db.query(UserProgress)
        .filter(
            UserProgress.user_id == user_id,
            UserProgress.program_session_id == session_id,
            UserProgress.completed == True,
        )
        .first()
    )


def is_session_locked(db: Session, user_id: int, session: ProgramSession) -> bool:
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
