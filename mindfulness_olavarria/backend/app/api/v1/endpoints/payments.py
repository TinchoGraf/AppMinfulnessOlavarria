"""
Endpoints de pagos con MercadoPago — Suscripciones (Preapproval).

POST /payments/create-subscription → Crea una suscripción y devuelve la URL de autorización
POST /payments/webhook             → Recibe notificaciones de MercadoPago (altas y cobros recurrentes)
GET  /payments/confirm             → Confirma el estado de la suscripción al volver del checkout
GET  /payments/my-payments         → Historial de suscripciones/pagos del usuario
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


# ─── Configuración de planes ──────────────────────────────────────────────────
# frequency / frequency_type siguen el formato de "auto_recurring" de MercadoPago.
# period_days se usa para calcular el vencimiento local mientras llega el próximo
# webhook de cobro (MP hace el cobro recurrente automáticamente).

PLAN_CONFIG = {
    "monthly": {
        "label": "Plan Mensual",
        "frequency": 1,
        "period_days": 30,
        "payment_plan": PaymentPlan.monthly,
        "subscription_plan": SubscriptionPlan.monthly,
        "price_attr": "PRICE_MONTHLY_ARS",
    },
    "quarterly": {
        "label": "Plan Trimestral",
        "frequency": 3,
        "period_days": 90,
        "payment_plan": PaymentPlan.quarterly,
        "subscription_plan": SubscriptionPlan.quarterly,
        "price_attr": "PRICE_QUARTERLY_ARS",
    },
    "yearly": {
        "label": "Plan Anual",
        "frequency": 12,
        "period_days": 365,
        "payment_plan": PaymentPlan.yearly,
        "subscription_plan": SubscriptionPlan.yearly,
        "price_attr": "PRICE_YEARLY_ARS",
    },
}


# ─── Schema de entrada ────────────────────────────────────────────────────────

class CreateSubscriptionRequest(BaseModel):
    plan: str  # "monthly" | "quarterly" | "yearly"


# ─── Helper: inicializar SDK de MercadoPago ───────────────────────────────────

def get_mp_sdk():
    return mercadopago.SDK(settings.MP_ACCESS_TOKEN)


# ─── Crear suscripción (Preapproval) ──────────────────────────────────────────

@router.post("/create-subscription")
def create_subscription(
    body: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Crea una suscripción (Preapproval) en MercadoPago y devuelve la URL
    para que el usuario autorice el cobro recurrente.
    """
    plan_config = PLAN_CONFIG.get(body.plan)
    if not plan_config:
        raise HTTPException(
            status_code=400,
            detail="Plan inválido. Usar 'monthly', 'quarterly' o 'yearly'",
        )

    amount = getattr(settings, plan_config["price_attr"])

    # Registrar el intento de suscripción en la BD
    payment = Payment(
        user_id=current_user.id,
        plan=plan_config["payment_plan"],
        amount=amount,
        status=PaymentStatus.pending,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    sdk = get_mp_sdk()

    preapproval_data = {
        "reason": f"Serenalma — {plan_config['label']}",
        "external_reference": str(payment.id),
        "payer_email": current_user.email,
        # MP agrega sus propios parámetros (preapproval_id, status) a continuación de este back_url
        "back_url": f"{settings.MP_SUCCESS_URL}?payment_id={payment.id}",
        "auto_recurring": {
            "frequency": plan_config["frequency"],
            "frequency_type": "months",
            "transaction_amount": amount,
            "currency_id": "ARS",
        },
        "status": "pending",
    }

    try:
        preapproval_response = sdk.preapproval().create(preapproval_data)
        preapproval = preapproval_response["response"]

        if "id" not in preapproval:
            logger.error(f"Error MP: {preapproval}")
            raise HTTPException(status_code=500, detail="Error al crear la suscripción")

        payment.mp_preapproval_id = preapproval["id"]
        db.commit()

        return {
            "preapproval_id": preapproval["id"],
            "checkout_url": preapproval["init_point"],
            "payment_id": payment.id,
            "amount": amount,
            "plan": body.plan,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creando suscripción MP: {e}")
        raise HTTPException(status_code=500, detail="Error al conectar con MercadoPago")


# ─── Webhook de MercadoPago ───────────────────────────────────────────────────

@router.post("/webhook")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    """
    MercadoPago llama a este endpoint ante dos tipos de eventos:
      - "preapproval" / "subscription_preapproval": cambio de estado de la suscripción
        (pendiente → autorizada, pausada, cancelada).
      - "subscription_authorized_payment": se procesó un cobro recurrente del ciclo.
    """
    try:
        body = await request.json()
        logger.info(f"Webhook MP recibido: {body}")
    except Exception:
        return {"status": "ok"}

    topic = body.get("type") or body.get("topic")
    resource_id = body.get("data", {}).get("id") or body.get("id")

    if not resource_id:
        return {"status": "ok"}

    sdk = get_mp_sdk()

    try:
        if topic in ("preapproval", "subscription_preapproval"):
            _handle_preapproval_update(sdk, db, resource_id)
        elif topic == "subscription_authorized_payment":
            _handle_recurring_charge(sdk, db, resource_id)
        # Otros topics (merchant_order, point, etc.) se ignoran.
    except Exception as e:
        logger.error(f"Error procesando webhook MP: {e}")

    return {"status": "ok"}


def _handle_preapproval_update(sdk, db: Session, preapproval_id: str):
    """Sincroniza el estado de una suscripción (autorizada / pausada / cancelada)."""
    preapproval_info = sdk.preapproval().get(preapproval_id)
    mp_preapproval = preapproval_info["response"]

    external_ref = mp_preapproval.get("external_reference")
    mp_status = mp_preapproval.get("status")  # pending | authorized | paused | cancelled
    if not external_ref:
        return

    payment = db.query(Payment).filter(Payment.id == int(external_ref)).first()
    if not payment:
        return

    payment.mp_preapproval_id = str(preapproval_id)
    payment.mp_status = mp_status

    if mp_status == "authorized":
        payment.status = PaymentStatus.approved
        _activate_subscription(db, payment)
    elif mp_status in ("cancelled", "paused"):
        payment.status = PaymentStatus.cancelled
        _deactivate_subscription(db, payment)

    db.commit()


def _handle_recurring_charge(sdk, db: Session, authorized_payment_id: str):
    """Extiende el período de la suscripción con cada cobro recurrente aprobado."""
    # El SDK no envuelve el recurso "authorized_payments"; se consulta con el
    # cliente HTTP genérico que ya trae configurado el access token.
    result = sdk.http_client.get(
        f"https://api.mercadopago.com/authorized_payments/{authorized_payment_id}",
        headers={"Authorization": f"Bearer {settings.MP_ACCESS_TOKEN}"},
    )
    charge = result.get("response") or {}

    if charge.get("status") != "approved":
        return

    preapproval_id = charge.get("preapproval_id")
    if not preapproval_id:
        return

    payment = db.query(Payment).filter(Payment.mp_preapproval_id == str(preapproval_id)).first()
    if not payment:
        return

    payment.mp_payment_id = str(authorized_payment_id)
    payment.mp_status = "approved"
    payment.status = PaymentStatus.approved
    _activate_subscription(db, payment)
    db.commit()


# ─── Confirmar suscripción desde el frontend (back_url) ───────────────────────

@router.get("/confirm")
def confirm_payment(
    payment_id: int,
    preapproval_id: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    El frontend llama a este endpoint después de que MP redirige al usuario
    tras autorizar (o no) la suscripción.
    """
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.user_id == current_user.id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Suscripción no encontrada")

    # Si el webhook ya lo procesó, devolver estado actual
    if payment.status == PaymentStatus.approved:
        return {"status": "approved", "message": "Suscripción activada"}

    # Si el webhook todavía no llegó, consultamos el estado directamente
    lookup_id = preapproval_id or payment.mp_preapproval_id
    if lookup_id:
        try:
            sdk = get_mp_sdk()
            preapproval_info = sdk.preapproval().get(lookup_id)
            mp_data = preapproval_info["response"]

            if mp_data.get("status") == "authorized":
                payment.mp_preapproval_id = str(lookup_id)
                payment.mp_status = "authorized"
                payment.status = PaymentStatus.approved
                _activate_subscription(db, payment)
                db.commit()
                return {"status": "approved", "message": "Suscripción activada"}
        except Exception as e:
            logger.error(f"Error confirmando suscripción: {e}")

    return {
        "status": payment.status,
        "message": "Suscripción pendiente de confirmación"
    }


# ─── Historial de pagos del usuario ───────────────────────────────────────────

@router.get("/my-payments")
def my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Devuelve el historial de suscripciones/pagos del usuario autenticado."""
    payments = db.query(Payment).filter(
        Payment.user_id == current_user.id
    ).order_by(Payment.created_at.desc()).all()

    return [
        {
            "id": p.id,
            "plan": p.plan,
            "amount": p.amount,
            "status": p.status,
            "mp_preapproval_id": p.mp_preapproval_id,
            "created_at": p.created_at,
        }
        for p in payments
    ]


# ─── Helper: activar / desactivar suscripción ─────────────────────────────────

def _activate_subscription(db: Session, payment: Payment):
    """Activa o renueva la suscripción premium del usuario según el plan pagado."""
    user = db.query(User).filter(User.id == payment.user_id).first()
    if not user:
        return

    plan_config = PLAN_CONFIG[payment.plan.value]
    now = datetime.utcnow()
    period_end = now + timedelta(days=plan_config["period_days"])
    plan = plan_config["subscription_plan"]

    sub = user.subscription
    if sub:
        sub.plan = plan
        sub.is_active = True
        sub.current_period_start = now
        sub.current_period_end = period_end
        sub.payment_provider = "mercadopago"
        sub.external_subscription_id = payment.mp_preapproval_id
    else:
        sub = Subscription(
            user_id=user.id,
            plan=plan,
            is_active=True,
            current_period_start=now,
            current_period_end=period_end,
            payment_provider="mercadopago",
            external_subscription_id=payment.mp_preapproval_id,
        )
        db.add(sub)

    logger.info(f"Suscripción activada: user={user.email} plan={plan} hasta={period_end}")


def _deactivate_subscription(db: Session, payment: Payment):
    """Desactiva la suscripción cuando MP informa que fue pausada o cancelada."""
    user = db.query(User).filter(User.id == payment.user_id).first()
    if not user or not user.subscription:
        return

    user.subscription.is_active = False
    logger.info(f"Suscripción desactivada: user={user.email}")
