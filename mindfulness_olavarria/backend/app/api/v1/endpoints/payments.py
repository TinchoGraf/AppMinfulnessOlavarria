"""
Endpoints de pagos con MercadoPago.

POST /payments/create-preference  → Crea preferencia y devuelve URL de pago
POST /payments/webhook            → Recibe notificaciones de MercadoPago
GET  /payments/status/{payment_id} → Consulta estado de un pago
GET  /payments/my-payments        → Historial de pagos del usuario
"""

import mercadopago
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from pydantic import BaseModel
import logging

from app.db.database import get_db
from app.core.config import settings
from app.models.models import User, Subscription, SubscriptionPlan
from app.models.models import Payment, PaymentStatus, PaymentPlan
from app.api.deps import get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/payments", tags=["Pagos"])


# ─── Schema de entrada ────────────────────────────────────────────────────────

class CreatePreferenceRequest(BaseModel):
    plan: str  # "monthly" o "yearly"


# ─── Helper: inicializar SDK de MercadoPago ───────────────────────────────────

def get_mp_sdk():
    sdk = mercadopago.SDK(settings.MP_ACCESS_TOKEN)
    return sdk


# ─── Crear preferencia de pago ────────────────────────────────────────────────

@router.post("/create-preference")
def create_preference(
    body: CreatePreferenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Crea una preferencia de pago en MercadoPago y devuelve la URL
    para redirigir al usuario al checkout.
    """
    # Validar plan
    if body.plan not in ["monthly", "yearly"]:
        raise HTTPException(status_code=400, detail="Plan inválido. Usar 'monthly' o 'yearly'")

    # Determinar precio y descripción
    if body.plan == "monthly":
        amount = settings.PRICE_MONTHLY_ARS
        title = "Mindfulness Olavarría — Plan Mensual"
        plan_enum = PaymentPlan.monthly
    else:
        amount = settings.PRICE_YEARLY_ARS
        title = "Mindfulness Olavarría — Plan Anual"
        plan_enum = PaymentPlan.yearly

    # Registrar el intento de pago en la BD
    payment = Payment(
        user_id=current_user.id,
        plan=plan_enum,
        amount=amount,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Crear preferencia en MercadoPago
    sdk = get_mp_sdk()

    preference_data = {
        "items": [
            {
                "id": f"plan_{body.plan}",
                "title": title,
                "quantity": 1,
                "currency_id": "ARS",
                "unit_price": amount,
            }
        ],
        "payer": {
            "email": current_user.email,
            "name": current_user.full_name,
        },
        "back_urls": {
            "success": f"{settings.MP_SUCCESS_URL}?payment_id={payment.id}&plan={body.plan}",
            "failure": f"{settings.MP_FAILURE_URL}?payment_id={payment.id}",
            "pending": f"{settings.MP_PENDING_URL}?payment_id={payment.id}",
        },
        "auto_return": "approved",
        "external_reference": str(payment.id),  # Nuestro ID interno
        "notification_url": settings.MP_WEBHOOK_URL,
        "statement_descriptor": "Mindfulness Olavarría",
    }

    try:
        preference_response = sdk.preference().create(preference_data)
        preference = preference_response["response"]

        if "id" not in preference:
            logger.error(f"Error MP: {preference}")
            raise HTTPException(status_code=500, detail="Error al crear preferencia de pago")

        # Guardar el ID de preferencia
        payment.mp_preference_id = preference["id"]
        db.commit()

        return {
            "preference_id": preference["id"],
            "checkout_url": preference["init_point"],         # URL producción
            "sandbox_url": preference["sandbox_init_point"],  # URL sandbox (pruebas)
            "payment_id": payment.id,
            "amount": amount,
            "plan": body.plan,
        }

    except Exception as e:
        logger.error(f"Error creando preferencia MP: {e}")
        raise HTTPException(status_code=500, detail="Error al conectar con MercadoPago")


# ─── Webhook de MercadoPago ───────────────────────────────────────────────────

@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    MercadoPago llama a este endpoint cuando un pago cambia de estado.
    Aquí activamos la suscripción premium del usuario.
    """
    try:
        body = await request.json()
        logger.info(f"Webhook MP recibido: {body}")
    except Exception:
        return {"status": "ok"}

    # MP envía diferentes tipos de notificaciones
    topic = body.get("type") or body.get("topic")
    resource_id = None

    if topic == "payment":
        resource_id = body.get("data", {}).get("id") or body.get("id")
    elif topic == "merchant_order":
        return {"status": "ok"}  # Ignorar merchant_order por ahora

    if not resource_id:
        return {"status": "ok"}

    # Consultar el pago a la API de MP
    try:
        sdk = get_mp_sdk()
        payment_info = sdk.payment().get(resource_id)
        mp_payment = payment_info["response"]

        mp_status = mp_payment.get("status")
        external_ref = mp_payment.get("external_reference")  # Nuestro payment.id

        if not external_ref:
            return {"status": "ok"}

        # Buscar el pago en nuestra BD
        payment = db.query(Payment).filter(Payment.id == int(external_ref)).first()
        if not payment:
            return {"status": "ok"}

        # Actualizar estado del pago
        payment.mp_payment_id = str(resource_id)
        payment.mp_status = mp_status

        if mp_status == "approved":
            payment.status = PaymentStatus.approved
            # Activar suscripción premium del usuario
            _activate_subscription(db, payment)
        elif mp_status in ["rejected", "cancelled"]:
            payment.status = PaymentStatus.rejected

        db.commit()

    except Exception as e:
        logger.error(f"Error procesando webhook MP: {e}")

    return {"status": "ok"}


# ─── Confirmar pago desde el frontend (back_url) ──────────────────────────────

@router.get("/confirm")
def confirm_payment(
    payment_id: int,
    mp_payment_id: str = None,
    mp_status: str = None,
    plan: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    El frontend llama a este endpoint después de que MP redirige al usuario.
    Verifica el estado y activa la suscripción si corresponde.
    """
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    # Si el webhook ya lo procesó, devolver estado actual
    if payment.status == PaymentStatus.approved:
        return {"status": "approved", "message": "Suscripción activada"}

    # Si MP nos pasó el payment_id, consultamos directamente
    if mp_payment_id and mp_status == "approved":
        try:
            sdk = get_mp_sdk()
            payment_info = sdk.payment().get(mp_payment_id)
            mp_data = payment_info["response"]

            if mp_data.get("status") == "approved":
                payment.mp_payment_id = mp_payment_id
                payment.mp_status = "approved"
                payment.status = PaymentStatus.approved
                _activate_subscription(db, payment)
                db.commit()
                return {"status": "approved", "message": "Suscripción activada"}
        except Exception as e:
            logger.error(f"Error confirmando pago: {e}")

    return {
        "status": payment.status,
        "message": "Pago pendiente de confirmación"
    }


# ─── Historial de pagos del usuario ───────────────────────────────────────────

@router.get("/my-payments")
def my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Devuelve el historial de pagos del usuario autenticado."""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()

    return [
        {
            "id": p.id,
            "plan": p.plan,
            "amount": p.amount,
            "status": p.status,
            "mp_payment_id": p.mp_payment_id,
            "created_at": p.created_at,
        }
        for p in payments
    ]


# ─── Helper: activar suscripción ──────────────────────────────────────────────

def _activate_subscription(db: Session, payment: Payment):
    """
    Activa o actualiza la suscripción premium del usuario
    según el plan pagado.
    """
    user = db.query(User).filter(User.id == payment.user_id).first()
    if not user:
        return

    now = datetime.utcnow()

    # Calcular vencimiento según plan
    if payment.plan == PaymentPlan.monthly:
        period_end = now + timedelta(days=30)
        plan = SubscriptionPlan.monthly
    else:
        period_end = now + timedelta(days=365)
        plan = SubscriptionPlan.yearly

    # Actualizar o crear suscripción
    sub = user.subscription
    if sub:
        sub.plan = plan
        sub.is_active = True
        sub.current_period_start = now
        sub.current_period_end = period_end
        sub.payment_provider = "mercadopago"
        sub.external_subscription_id = payment.mp_payment_id
    else:
        from app.models.models import Subscription
        sub = Subscription(
            user_id=user.id,
            plan=plan,
            is_active=True,
            current_period_start=now,
            current_period_end=period_end,
            payment_provider="mercadopago",
            external_subscription_id=payment.mp_payment_id,
        )
        db.add(sub)

    logger.info(f"Suscripción activada: user={user.email} plan={plan} hasta={period_end}")
