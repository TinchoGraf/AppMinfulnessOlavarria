"""
Endpoints de administración.

GET  /admin/stats              → Estadísticas generales
GET  /admin/users              → Lista de usuarios
GET  /admin/content            → Lista todo el contenido
POST /admin/content            → Crear nuevo ítem
PUT  /admin/content/{id}       → Editar ítem
DELETE /admin/content/{id}     → Eliminar ítem
POST /admin/content/{id}/audio → Subir archivo de audio
GET  /admin/programs           → Lista programas
POST /admin/programs           → Crear programa
PUT  /admin/programs/{id}      → Editar programa
POST /admin/programs/{id}/sessions → Agregar sesión
GET  /admin/sessions/{id}/quiz     → Ver el cuestionario de una sesión (con correctas)
POST /admin/sessions/{id}/quiz     → Crear cuestionario con preguntas y opciones
PUT  /admin/quiz/{id}              → Editar cuestionario
GET  /admin/programs/{id}/responses  → Respuestas de todos los usuarios a los cuestionarios
GET  /admin/programs/{id}/activities → Registros emocionales de todos los usuarios
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from pydantic import BaseModel, Field
import os, shutil, uuid

from app.db.database import get_db
from app.core.config import settings
from app.models.models import (
    User, ContentItem, ContentType, Category,
    Program, ProgramSession, Subscription,
    Quiz, QuizQuestion, QuizOption, QuizResponse, ActivityLog,
)
from app.api.deps import get_current_admin
from app.services import b2_storage

router = APIRouter(prefix="/admin", tags=["Admin"])


# ─── Schemas admin ────────────────────────────────────────────────────────────

class ContentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    content_type: ContentType
    category_id: Optional[int] = None
    duration_seconds: Optional[int] = None
    body_text: Optional[str] = None
    is_premium: bool = False
    is_featured: bool = False
    is_active: bool = True
    order: int = 0
    tags: Optional[str] = None


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content_type: Optional[ContentType] = None
    category_id: Optional[int] = None
    duration_seconds: Optional[int] = None
    body_text: Optional[str] = None
    is_premium: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    tags: Optional[str] = None


class ProgramCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    duration_days: Optional[int] = None
    is_premium: bool = True
    is_active: bool = True
    order: int = 0


class SessionCreate(BaseModel):
    day_number: int
    title: str
    description: Optional[str] = None
    content_item_id: Optional[int] = None
    duration_minutes: Optional[int] = None


class QuizOptionIn(BaseModel):
    option_text: str = Field(..., min_length=1)
    is_correct: bool = False
    order: int = 0


class QuizQuestionIn(BaseModel):
    question_text: str = Field(..., min_length=1)
    order: int = 0
    options: List[QuizOptionIn]


class QuizCreate(BaseModel):
    title: str = Field(..., min_length=1)
    is_active: bool = True
    questions: List[QuizQuestionIn] = Field(..., min_length=1)


class QuizUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    questions: Optional[List[QuizQuestionIn]] = Field(None, min_length=1)


# ─── Stats generales ──────────────────────────────────────────────────────────

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Dashboard de estadísticas para el admin."""
    total_users = db.query(func.count(User.id)).scalar()
    premium_users = db.query(func.count(Subscription.id)).filter(
        Subscription.plan != 'free',
        Subscription.is_active == True
    ).scalar()
    total_content = db.query(func.count(ContentItem.id)).scalar()
    total_programs = db.query(func.count(Program.id)).scalar()

    return {
        "total_users": total_users,
        "premium_users": premium_users,
        "free_users": total_users - premium_users,
        "total_content": total_content,
        "total_programs": total_programs,
    }


# ─── Usuarios ─────────────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "is_premium": bool(u.subscription and u.subscription.is_premium),
            "plan": u.subscription.plan if u.subscription else "free",
            "created_at": u.created_at,
        }
        for u in users
    ]


# ─── Contenido ────────────────────────────────────────────────────────────────

@router.get("/content")
def list_all_content(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    items = db.query(ContentItem).order_by(ContentItem.id.desc()).all()
    return [
        {
            "id": i.id,
            "title": i.title,
            "content_type": i.content_type,
            "category": i.category.name if i.category else None,
            "category_id": i.category_id,
            "is_premium": i.is_premium,
            "is_featured": i.is_featured,
            "is_active": i.is_active,
            "duration_seconds": i.duration_seconds,
            "audio_file": i.audio_file,
            "video_file": i.video_file,
            "plays_count": i.plays_count,
            "order": i.order,
            "body_text": i.body_text,
            "description": i.description,
            "tags": i.tags,
            "created_at": i.created_at,
        }
        for i in items
    ]


@router.post("/content", status_code=201)
def create_content(
    data: ContentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    item = ContentItem(**data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id, "message": "Contenido creado"}


@router.put("/content/{item_id}")
def update_content(
    item_id: int,
    data: ContentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    item = db.query(ContentItem).filter(ContentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    return {"message": "Actualizado"}


@router.delete("/content/{item_id}")
def delete_content(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    item = db.query(ContentItem).filter(ContentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(item)
    db.commit()
    return {"message": "Eliminado"}


@router.post("/content/{item_id}/audio")
async def upload_audio(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Sube un archivo de audio y lo asocia al ítem de contenido."""
    item = db.query(ContentItem).filter(ContentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contenido no encontrado")

    # Validar tipo de archivo
    allowed = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Solo se permiten archivos de audio (mp3, wav, ogg, m4a)")

    # Guardar archivo con nombre único
    ext = file.filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.MEDIA_DIR, filename)

    os.makedirs(settings.MEDIA_DIR, exist_ok=True)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Si había un audio anterior, eliminarlo
    if item.audio_file:
        old_path = os.path.join(settings.MEDIA_DIR, item.audio_file)
        if os.path.exists(old_path):
            os.remove(old_path)

    item.audio_file = filename
    db.commit()

    return {"message": "Audio subido", "filename": filename, "url": f"/media/{filename}"}


@router.post("/content/{item_id}/video")
async def upload_video(
    item_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """
    Sube un video mp4 al bucket PRIVADO de Backblaze B2 y lo asocia al ítem.
    El archivo nunca queda accesible públicamente: solo se sirve a través
    de GET /api/v1/media/video/{item_id}, que exige suscripción premium.
    """
    item = db.query(ContentItem).filter(ContentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contenido no encontrado")

    allowed = ["video/mp4"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Solo se permiten archivos .mp4")

    filename = f"{uuid.uuid4().hex}.mp4"

    try:
        b2_storage.upload_video(file.file, filename, content_type=file.content_type)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error subiendo el video a Backblaze: {e}")

    # Si había un video anterior, eliminarlo del bucket
    if item.video_file:
        try:
            b2_storage.delete_video(item.video_file)
        except Exception:
            pass

    item.video_file = filename
    db.commit()

    return {"message": "Video subido", "filename": filename}


# ─── Categorías ───────────────────────────────────────────────────────────────

@router.get("/categories")
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    return db.query(Category).order_by(Category.order).all()


# ─── Programas ────────────────────────────────────────────────────────────────

@router.get("/programs")
def list_all_programs(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    programs = db.query(Program).order_by(Program.id.desc()).all()
    return [
        {
            "id": p.id,
            "title": p.title,
            "description": p.description,
            "category": p.category.name if p.category else None,
            "category_id": p.category_id,
            "duration_days": p.duration_days,
            "is_premium": p.is_premium,
            "is_active": p.is_active,
            "sessions_count": len(p.sessions),
            "order": p.order,
        }
        for p in programs
    ]


@router.post("/programs", status_code=201)
def create_program(
    data: ProgramCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    program = Program(**data.model_dump())
    db.add(program)
    db.commit()
    db.refresh(program)
    return {"id": program.id, "message": "Programa creado"}


@router.put("/programs/{program_id}")
def update_program(
    program_id: int,
    data: ProgramCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="No encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(program, field, value)
    db.commit()
    return {"message": "Actualizado"}


@router.post("/programs/{program_id}/sessions", status_code=201)
def add_session(
    program_id: int,
    data: SessionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")

    session = ProgramSession(program_id=program_id, **data.model_dump())
    db.add(session)
    db.commit()
    return {"message": "Sesión agregada"}


@router.delete("/programs/{program_id}/sessions/{session_id}")
def delete_session(
    program_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    session = db.query(ProgramSession).filter(
        ProgramSession.id == session_id,
        ProgramSession.program_id == program_id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="No encontrado")
    db.delete(session)
    db.commit()
    return {"message": "Sesión eliminada"}


# ─── Cuestionarios ────────────────────────────────────────────────────────────

def _validate_questions(questions: List[QuizQuestionIn]):
    for i, q in enumerate(questions, start=1):
        if len(q.options) < 2:
            raise HTTPException(status_code=400, detail=f"La pregunta {i} necesita al menos 2 opciones")
        if sum(o.is_correct for o in q.options) != 1:
            raise HTTPException(status_code=400, detail=f"La pregunta {i} debe tener exactamente una opción correcta")


def _build_questions(questions: List[QuizQuestionIn]) -> list[QuizQuestion]:
    return [
        QuizQuestion(
            question_text=q.question_text,
            order=q.order,
            options=[QuizOption(**o.model_dump()) for o in q.options],
        )
        for q in questions
    ]


def _serialize_quiz(quiz: Quiz) -> dict:
    return {
        "id": quiz.id,
        "program_session_id": quiz.program_session_id,
        "title": quiz.title,
        "is_active": quiz.is_active,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "order": q.order,
                "options": [
                    {"id": o.id, "option_text": o.option_text, "is_correct": o.is_correct, "order": o.order}
                    for o in q.options
                ],
            }
            for q in quiz.questions
        ],
    }


@router.get("/sessions/{session_id}/quiz")
def get_session_quiz_admin(
    session_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    quiz = db.query(Quiz).filter(Quiz.program_session_id == session_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Esta sesión no tiene cuestionario")
    return _serialize_quiz(quiz)


@router.post("/sessions/{session_id}/quiz", status_code=201)
def create_session_quiz(
    session_id: int,
    data: QuizCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    session = db.query(ProgramSession).filter(ProgramSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    if db.query(Quiz).filter(Quiz.program_session_id == session_id).first():
        raise HTTPException(status_code=409, detail="La sesión ya tiene un cuestionario; editalo con PUT /admin/quiz/{id}")
    _validate_questions(data.questions)

    quiz = Quiz(
        program_session_id=session_id,
        title=data.title,
        is_active=data.is_active,
        questions=_build_questions(data.questions),
    )
    db.add(quiz)
    db.commit()
    db.refresh(quiz)
    return _serialize_quiz(quiz)


@router.put("/quiz/{quiz_id}")
def update_quiz(
    quiz_id: int,
    data: QuizUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """
    Edita título/estado. Si se envían `questions`, reemplaza todas las preguntas
    y opciones; eso solo se permite si nadie respondió todavía el cuestionario.
    """
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Cuestionario no encontrado")

    if data.questions is not None:
        has_responses = db.query(QuizResponse).filter(QuizResponse.quiz_id == quiz_id).first()
        if has_responses:
            raise HTTPException(
                status_code=409,
                detail="El cuestionario ya tiene respuestas: solo se puede editar el título y si está activo",
            )
        _validate_questions(data.questions)
        quiz.questions = _build_questions(data.questions)

    if data.title is not None:
        quiz.title = data.title
    if data.is_active is not None:
        quiz.is_active = data.is_active

    db.commit()
    db.refresh(quiz)
    return _serialize_quiz(quiz)


# ─── Respuestas y registros de los usuarios ───────────────────────────────────

def _get_program_or_404(db: Session, program_id: int) -> Program:
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa no encontrado")
    return program


@router.get("/programs/{program_id}/responses")
def list_program_quiz_responses(
    program_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Respuestas a los cuestionarios del programa, una entrada por (usuario, sesión)."""
    _get_program_or_404(db, program_id)
    rows = (
        db.query(QuizResponse)
        .join(Quiz, Quiz.id == QuizResponse.quiz_id)
        .join(ProgramSession, ProgramSession.id == Quiz.program_session_id)
        .filter(ProgramSession.program_id == program_id)
        .order_by(ProgramSession.day_number, QuizResponse.user_id)
        .all()
    )

    grouped: dict[tuple[int, int], dict] = {}
    for r in rows:
        quiz = r.question.quiz
        session = quiz.program_session
        key = (r.user_id, session.id)
        if key not in grouped:
            grouped[key] = {
                "user_id": r.user_id,
                "user_name": r.user.full_name,
                "user_email": r.user.email,
                "session_id": session.id,
                "day_number": session.day_number,
                "session_title": session.title,
                "quiz_id": quiz.id,
                "quiz_title": quiz.title,
                "answered_at": r.answered_at,
                "score": 0,
                "total": len(quiz.questions),
                "answers": [],
            }
        entry = grouped[key]
        entry["answered_at"] = max(entry["answered_at"], r.answered_at)
        entry["score"] += int(bool(r.option.is_correct))
        entry["answers"].append({
            "question_id": r.question_id,
            "question_order": r.question.order,
            "question_text": r.question.question_text,
            "option_text": r.option.option_text,
            "is_correct": bool(r.option.is_correct),
        })

    for entry in grouped.values():
        entry["answers"].sort(key=lambda a: (a["question_order"], a["question_id"]))
    return list(grouped.values())


@router.get("/programs/{program_id}/activities")
def list_program_activities(
    program_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin)
):
    """Registros emocionales de todos los usuarios en las sesiones del programa."""
    _get_program_or_404(db, program_id)
    rows = (
        db.query(ActivityLog)
        .join(ProgramSession, ProgramSession.id == ActivityLog.program_session_id)
        .filter(ProgramSession.program_id == program_id)
        .order_by(ProgramSession.day_number, ActivityLog.logged_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "user_id": a.user_id,
            "user_name": a.user.full_name,
            "user_email": a.user.email,
            "session_id": a.program_session_id,
            "day_number": a.program_session.day_number,
            "session_title": a.program_session.title,
            "content": a.content,
            "logged_at": a.logged_at,
        }
        for a in rows
    ]
