"""
Endpoints de contenido (audios, ejercicios, meditaciones).

GET  /content/               → Lista de contenido (filtrable, gratis primero)
GET  /content/{id}           → Detalle de un ítem
POST /content/{id}/favorite  → Marcar/desmarcar favorito
POST /content/{id}/progress  → Guardar progreso de reproducción
GET  /content/categories     → Categorías disponibles
GET  /content/featured       → Contenido destacado para la home
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
import json

from app.db.database import get_db
from app.models.models import (
    ContentItem, Category, Favorite, UserProgress, User
)
from app.schemas.content import (
    ContentItemResponse, ContentItemDetail,
    CategoryResponse, ProgressCreate, ProgressResponse
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/content", tags=["Contenido"])


@router.get("/categories", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Lista todas las categorías activas."""
    return db.query(Category).filter(Category.is_active == True).order_by(Category.order).all()


@router.get("/featured", response_model=list[ContentItemResponse])
def get_featured(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Contenido destacado para la home (máx 6 ítems)."""
    items = (
        db.query(ContentItem)
        .filter(ContentItem.is_featured == True, ContentItem.is_active == True)
        .order_by(ContentItem.order)
        .limit(6)
        .all()
    )
    return [_enrich_item(item, current_user, db) for item in items]


@router.get("/", response_model=list[ContentItemResponse])
def list_content(
    category_slug: Optional[str] = Query(None, description="Filtrar por categoría"),
    content_type: Optional[str] = Query(None, description="audio, exercise, breathing"),
    premium_only: bool = Query(False),
    free_only: bool = Query(False),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """
    Lista contenido con filtros opcionales.
    - Sin auth: solo muestra contenido gratuito.
    - Con auth: muestra todo (pero los premium requieren suscripción para reproducir).
    """
    query = db.query(ContentItem).filter(ContentItem.is_active == True)

    if category_slug:
        category = db.query(Category).filter(Category.slug == category_slug).first()
        if category:
            query = query.filter(ContentItem.category_id == category.id)

    if content_type:
        query = query.filter(ContentItem.content_type == content_type)

    if free_only:
        query = query.filter(ContentItem.is_premium == False)

    if premium_only:
        query = query.filter(ContentItem.is_premium == True)

    items = query.order_by(ContentItem.order, ContentItem.id).offset(offset).limit(limit).all()
    return [_enrich_item(item, current_user, db) for item in items]


@router.get("/{item_id}", response_model=ContentItemDetail)
def get_content_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Devuelve el detalle completo de un ítem.
    Si es premium y el usuario no tiene suscripción, devuelve el ítem
    pero sin el audio_url (para mostrar el paywall en el frontend).
    """
    item = db.query(ContentItem).filter(
        ContentItem.id == item_id,
        ContentItem.is_active == True
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Contenido no encontrado")

    enriched = _enrich_item(item, current_user, db)

    # Determinar si el usuario puede acceder al audio
    is_premium_user = bool(current_user.subscription and current_user.subscription.is_premium)
    can_access = not item.is_premium or is_premium_user

    return ContentItemDetail(
        **enriched.__dict__,
        body_text=item.body_text if can_access else None,
        audio_url=f"/api/v1/media/{item.audio_file}" if (item.audio_file and can_access) else None,
    )


@router.post("/{item_id}/favorite")
def toggle_favorite(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Agrega o quita un ítem de favoritos. Devuelve el estado actual."""
    item = db.query(ContentItem).filter(ContentItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contenido no encontrado")

    favorite = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.content_item_id == item_id
    ).first()

    if favorite:
        db.delete(favorite)
        db.commit()
        return {"is_favorite": False, "message": "Eliminado de favoritos"}
    else:
        new_fav = Favorite(user_id=current_user.id, content_item_id=item_id)
        db.add(new_fav)
        db.commit()
        return {"is_favorite": True, "message": "Agregado a favoritos"}


@router.post("/{item_id}/progress", response_model=ProgressResponse)
def save_progress(
    item_id: int,
    progress_data: ProgressCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Guarda o actualiza el progreso de reproducción de un ítem."""
    from datetime import datetime

    # Buscar progreso existente
    prog = db.query(UserProgress).filter(
        UserProgress.user_id == current_user.id,
        UserProgress.content_item_id == item_id
    ).first()

    if prog:
        prog.progress_seconds = progress_data.progress_seconds
        prog.completed = progress_data.completed
        if progress_data.completed and not prog.completed_at:
            prog.completed_at = datetime.utcnow()
    else:
        prog = UserProgress(
            user_id=current_user.id,
            content_item_id=item_id,
            progress_seconds=progress_data.progress_seconds,
            completed=progress_data.completed,
            completed_at=datetime.utcnow() if progress_data.completed else None,
        )
        db.add(prog)

        # Incrementar contador de reproducciones
        item = db.query(ContentItem).filter(ContentItem.id == item_id).first()
        if item:
            item.plays_count += 1

    db.commit()
    db.refresh(prog)
    return prog


# ─── Helper privado ───────────────────────────────────────────────────────────

def _enrich_item(item: ContentItem, user: Optional[User], db: Session) -> ContentItemResponse:
    """Agrega campos is_completed e is_favorite al ítem según el usuario."""
    is_completed = False
    is_favorite = False

    if user:
        progress = db.query(UserProgress).filter(
            UserProgress.user_id == user.id,
            UserProgress.content_item_id == item.id,
            UserProgress.completed == True
        ).first()
        is_completed = bool(progress)

        fav = db.query(Favorite).filter(
            Favorite.user_id == user.id,
            Favorite.content_item_id == item.id
        ).first()
        is_favorite = bool(fav)

    return ContentItemResponse(
        id=item.id,
        title=item.title,
        description=item.description,
        content_type=item.content_type,
        duration_seconds=item.duration_seconds,
        is_premium=item.is_premium,
        tags=item.tags,
        category=item.category,
        thumbnail=item.thumbnail,
        is_featured=item.is_featured,
        plays_count=item.plays_count,
        created_at=item.created_at,
        is_completed=is_completed,
        is_favorite=is_favorite,
    )
