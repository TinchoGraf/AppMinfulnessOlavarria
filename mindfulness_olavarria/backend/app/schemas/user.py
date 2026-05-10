"""
Schemas Pydantic para validación de datos de Usuario y Auth.
Separan lo que entra (Request) de lo que sale (Response).
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from app.models.models import UserRole


# ─── Auth ─────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    """Datos para registrar un nuevo usuario."""
    full_name: str = Field(..., min_length=2, max_length=100, example="María García")
    email: EmailStr = Field(..., example="maria@email.com")
    password: str = Field(..., min_length=8, example="mipassword123")


class UserLogin(BaseModel):
    """Datos para iniciar sesión."""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Respuesta con el JWT token."""
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ─── User ─────────────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    """Campos opcionales para actualizar el perfil."""
    full_name: Optional[str] = None
    onboarding_goals: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class UserResponse(UserBase):
    """Lo que devuelve la API sobre un usuario (sin contraseña)."""
    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    onboarding_completed: bool
    is_premium: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithSubscription(UserResponse):
    """Usuario con info de suscripción."""
    subscription_plan: Optional[str] = None
    subscription_ends_at: Optional[datetime] = None
