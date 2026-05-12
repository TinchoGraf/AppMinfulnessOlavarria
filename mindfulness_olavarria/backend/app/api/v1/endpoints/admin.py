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
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from pydantic import BaseModel
import os, shutil, uuid

from app.db.database import get_db
from app.core.config import settings
from app.models.models import (
    User, ContentItem, ContentType, Category,
    Program, ProgramSession, Subscription
)
from app.api.deps import get_current_admin

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
