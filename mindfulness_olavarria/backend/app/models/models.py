"""
Modelos de base de datos para Mindfulness Olavarría.

Tablas:
  - users: Usuarios registrados
  - subscriptions: Suscripciones premium
  - categories: Categorías de contenido (ansiedad, sueño, etc.)
  - content_items: Audios, ejercicios, meditaciones
  - programs: Programas guiados (ej: "21 días para la ansiedad")
  - program_sessions: Sesiones dentro de un programa
  - user_progress: Progreso del usuario en contenido y programas
  - emotional_logs: Registro emocional diario ("¿Cómo te sentís hoy?")
  - favorites: Contenido marcado como favorito
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime,
    ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.orm import relationship
import enum
from app.db.database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class SubscriptionPlan(str, enum.Enum):
    free = "free"
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"


class ContentType(str, enum.Enum):
    audio = "audio"          # Meditaciones guiadas
    exercise = "exercise"    # Ejercicios escritos / interactivos
    breathing = "breathing"  # Técnicas de respiración
    video = "video"          # Videos (a futuro)
    text = "text"            # Artículos / reflexiones


class EmotionalState(str, enum.Enum):
    ansiosa = "ansiosa"
    acelerada = "acelerada"
    triste = "triste"
    saturada = "saturada"
    desconectada = "desconectada"
    cansada = "cansada"
    en_calma = "en_calma"
    contenta = "contenta"


# ─── Modelos ──────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Null si usa OAuth
    role = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Onboarding: qué quiere trabajar el usuario
    onboarding_goals = Column(Text, nullable=True)  # JSON string con lista de goals
    onboarding_completed = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    subscription = relationship("Subscription", back_populates="user", uselist=False)
    progress = relationship("UserProgress", back_populates="user")
    emotional_logs = relationship("EmotionalLog", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    plan = Column(SAEnum(SubscriptionPlan), default=SubscriptionPlan.free)
    is_active = Column(Boolean, default=True)
    trial_ends_at = Column(DateTime, nullable=True)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    payment_provider = Column(String(50), nullable=True)   # mercadopago, stripe
    external_subscription_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="subscription")

    @property
    def is_premium(self) -> bool:
        """Retorna True si el usuario tiene acceso premium activo."""
        now = datetime.utcnow()
        if self.plan == SubscriptionPlan.free:
            # Puede estar en período de prueba
            if self.trial_ends_at and self.trial_ends_at > now:
                return True
            return False
        return self.is_active and (
            self.current_period_end is None or self.current_period_end > now
        )


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)      # "Ansiedad"
    slug = Column(String(100), unique=True, nullable=False)      # "ansiedad"
    description = Column(Text, nullable=True)
    icon = Column(String(50), nullable=True)                     # Nombre de ícono
    color = Column(String(7), nullable=True)                     # Hex: "#7CB5A0"
    order = Column(Integer, default=0)                           # Para ordenar en UI
    is_active = Column(Boolean, default=True)

    # Relaciones
    content_items = relationship("ContentItem", back_populates="category")
    programs = relationship("Program", back_populates="category")


class ContentItem(Base):
    __tablename__ = "content_items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content_type = Column(SAEnum(ContentType), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    # Archivo / contenido
    audio_file = Column(String(500), nullable=True)     # Path relativo al archivo
    duration_seconds = Column(Integer, nullable=True)    # Duración del audio
    body_text = Column(Text, nullable=True)              # Para ejercicios de texto
    thumbnail = Column(String(500), nullable=True)       # Imagen de portada

    # Acceso
    is_premium = Column(Boolean, default=False)          # False = gratis
    is_active = Column(Boolean, default=True)
    is_featured = Column(Boolean, default=False)         # Para destacar en home

    # Metadatos
    tags = Column(Text, nullable=True)                   # JSON string: ["ansiedad","respiración"]
    order = Column(Integer, default=0)
    plays_count = Column(Integer, default=0)             # Contador de reproducciones

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    category = relationship("Category", back_populates="content_items")
    progress = relationship("UserProgress", back_populates="content_item")
    favorites = relationship("Favorite", back_populates="content_item")


class Program(Base):
    """Programas guiados: 'Regular la ansiedad en 21 días', etc."""
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    thumbnail = Column(String(500), nullable=True)
    duration_days = Column(Integer, nullable=True)       # Ej: 21
    is_premium = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    category = relationship("Category", back_populates="programs")
    sessions = relationship("ProgramSession", back_populates="program", order_by="ProgramSession.day_number")


class ProgramSession(Base):
    """Sesión individual dentro de un programa (Día 1, Día 2, etc.)"""
    __tablename__ = "program_sessions"

    id = Column(Integer, primary_key=True, index=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=False)
    day_number = Column(Integer, nullable=False)           # Día 1, 2, 3...
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    content_item_id = Column(Integer, ForeignKey("content_items.id"), nullable=True)
    duration_minutes = Column(Integer, nullable=True)

    # Relaciones
    program = relationship("Program", back_populates="sessions")
    content_item = relationship("ContentItem")


class UserProgress(Base):
    """Registra qué contenido/programas completó cada usuario."""
    __tablename__ = "user_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_item_id = Column(Integer, ForeignKey("content_items.id"), nullable=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=True)
    program_session_id = Column(Integer, ForeignKey("program_sessions.id"), nullable=True)

    completed = Column(Boolean, default=False)
    progress_seconds = Column(Integer, default=0)   # Segundos reproducidos
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="progress")
    content_item = relationship("ContentItem", back_populates="progress")


class EmotionalLog(Base):
    """Registro diario: '¿Cómo te sentís hoy?'"""
    __tablename__ = "emotional_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    state = Column(SAEnum(EmotionalState), nullable=False)
    note = Column(Text, nullable=True)                 # Nota libre opcional
    logged_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="emotional_logs")


class Favorite(Base):
    """Contenido marcado como favorito por el usuario."""
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content_item_id = Column(Integer, ForeignKey("content_items.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    user = relationship("User", back_populates="favorites")
    content_item = relationship("ContentItem", back_populates="favorites")


# ─── Pagos ────────────────────────────────────────────────────────────────────

class PaymentStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"


class PaymentPlan(str, enum.Enum):
    monthly = "monthly"
    quarterly = "quarterly"
    yearly = "yearly"


class Payment(Base):
    """Registro de cada intento/pago de suscripción."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    mp_preapproval_id = Column(String(255), nullable=True)  # ID de la suscripcion (Preapproval) en MP
    mp_payment_id = Column(String(255), nullable=True)
    mp_status = Column(String(50), nullable=True)
    plan = Column(SAEnum(PaymentPlan), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(SAEnum(PaymentStatus), default=PaymentStatus.pending)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User")
