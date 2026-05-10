"""
Endpoints de autenticación y gestión de usuarios.

POST /auth/register  → Crear cuenta
POST /auth/login     → Obtener JWT token
GET  /auth/me        → Perfil del usuario actual
PUT  /auth/me        → Actualizar perfil
POST /auth/onboarding → Completar onboarding
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.models import User, Subscription, SubscriptionPlan
from app.schemas.user import (
    UserRegister, UserLogin, Token, UserResponse,
    UserUpdate, UserWithSubscription
)
from app.api.deps import get_current_active_user

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario y devuelve un JWT token.
    Crea automáticamente una suscripción free con 7 días de prueba.
    """
    # Verificar que el email no exista
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta con ese email"
        )

    # Crear usuario
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
    )
    db.add(user)
    db.flush()  # Para obtener el ID sin commit final

    # Crear suscripción free con período de prueba
    trial_end = datetime.utcnow() + timedelta(days=settings.FREE_TRIAL_DAYS)
    subscription = Subscription(
        user_id=user.id,
        plan=SubscriptionPlan.free,
        trial_ends_at=trial_end,
    )
    db.add(subscription)
    db.commit()
    db.refresh(user)

    # Generar token
    token = create_access_token(subject=user.id)

    return Token(
        access_token=token,
        user=_build_user_response(user)
    )


@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Inicia sesión con email y contraseña. Devuelve JWT token.
    """
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Cuenta desactivada")

    token = create_access_token(subject=user.id)

    return Token(
        access_token=token,
        user=_build_user_response(user)
    )


@router.get("/me", response_model=UserWithSubscription)
def get_me(current_user: User = Depends(get_current_active_user)):
    """Devuelve el perfil completo del usuario autenticado."""
    return _build_user_with_subscription(current_user)


@router.put("/me", response_model=UserResponse)
def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Actualiza el perfil del usuario."""
    update_data = user_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user)


@router.post("/onboarding", response_model=UserResponse)
def complete_onboarding(
    goals: list[str],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Guarda los objetivos del onboarding y lo marca como completado.
    
    goals: Lista de strings, ej: ["ansiedad", "sueño", "estrés"]
    """
    import json
    current_user.onboarding_goals = json.dumps(goals)
    current_user.onboarding_completed = True
    db.commit()
    db.refresh(current_user)
    return _build_user_response(current_user)


# ─── Helpers privados ─────────────────────────────────────────────────────────

def _build_user_response(user: User) -> UserResponse:
    is_premium = bool(user.subscription and user.subscription.is_premium)
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        onboarding_completed=user.onboarding_completed,
        is_premium=is_premium,
        created_at=user.created_at,
    )


def _build_user_with_subscription(user: User) -> UserWithSubscription:
    sub = user.subscription
    return UserWithSubscription(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        onboarding_completed=user.onboarding_completed,
        is_premium=bool(sub and sub.is_premium),
        created_at=user.created_at,
        subscription_plan=sub.plan if sub else None,
        subscription_ends_at=sub.current_period_end if sub else None,
    )
