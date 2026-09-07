"""
Tests del flujo de suscripciones (Preapproval) de MercadoPago.

El SDK de MercadoPago se mockea en todos los casos: estos tests no
pegan contra la API real de MP.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.api.deps import get_current_active_user
from app.models.models import User, Payment, PaymentStatus, PaymentPlan
from app.api.v1.endpoints import payments as payments_module


# ─── Fixtures: BD en memoria + usuario autenticado fake ───────────────────────

@pytest.fixture()
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def test_user(db_session):
    user = User(email="ana@example.com", full_name="Ana Test", hashed_password="x")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def client(db_session, test_user):
    def override_get_db():
        yield db_session

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = override_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


# ─── create-subscription ───────────────────────────────────────────────────────

@pytest.mark.parametrize("plan,expected_frequency,expected_price_attr", [
    ("monthly", 1, "PRICE_MONTHLY_ARS"),
    ("quarterly", 3, "PRICE_QUARTERLY_ARS"),
    ("yearly", 12, "PRICE_YEARLY_ARS"),
])
def test_create_subscription_uses_correct_plan_config(
    client, db_session, plan, expected_frequency, expected_price_attr
):
    fake_sdk = MagicMock()
    fake_sdk.preapproval.return_value.create.return_value = {
        "response": {"id": "preapproval-123", "init_point": "https://mp.example/checkout"}
    }

    with patch.object(payments_module, "get_mp_sdk", return_value=fake_sdk):
        response = client.post("/api/v1/payments/create-subscription", json={"plan": plan})

    assert response.status_code == 200
    body = response.json()
    assert body["preapproval_id"] == "preapproval-123"
    assert body["checkout_url"] == "https://mp.example/checkout"
    assert body["plan"] == plan

    sent_data = fake_sdk.preapproval.return_value.create.call_args[0][0]
    assert sent_data["auto_recurring"]["frequency"] == expected_frequency
    assert sent_data["auto_recurring"]["frequency_type"] == "months"

    payment = db_session.query(Payment).filter(Payment.id == body["payment_id"]).first()
    assert payment.mp_preapproval_id == "preapproval-123"
    assert payment.plan == PaymentPlan(plan)


def test_create_subscription_rejects_invalid_plan(client):
    response = client.post("/api/v1/payments/create-subscription", json={"plan": "biannual"})
    assert response.status_code == 400


def test_create_subscription_handles_mp_error(client):
    fake_sdk = MagicMock()
    fake_sdk.preapproval.return_value.create.side_effect = Exception("network down")

    with patch.object(payments_module, "get_mp_sdk", return_value=fake_sdk):
        response = client.post("/api/v1/payments/create-subscription", json={"plan": "monthly"})

    assert response.status_code == 500


# ─── _activate_subscription ────────────────────────────────────────────────────

@pytest.mark.parametrize("plan,expected_days", [
    (PaymentPlan.monthly, 30),
    (PaymentPlan.quarterly, 90),
    (PaymentPlan.yearly, 365),
])
def test_activate_subscription_sets_period_by_plan(db_session, test_user, plan, expected_days):
    payment = Payment(
        user_id=test_user.id,
        plan=plan,
        amount=1000.0,
        status=PaymentStatus.approved,
        mp_preapproval_id="preapproval-abc",
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    payments_module._activate_subscription(db_session, payment)
    db_session.commit()
    db_session.refresh(test_user)

    sub = test_user.subscription
    assert sub is not None
    assert sub.is_active is True
    assert sub.external_subscription_id == "preapproval-abc"
    delta = sub.current_period_end - sub.current_period_start
    assert delta.days == expected_days


# ─── webhook ────────────────────────────────────────────────────────────────────

def test_webhook_authorized_preapproval_activates_subscription(client, db_session, test_user):
    payment = Payment(
        user_id=test_user.id, plan=PaymentPlan.monthly, amount=2990.0, status=PaymentStatus.pending,
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    fake_sdk = MagicMock()
    fake_sdk.preapproval.return_value.get.return_value = {
        "response": {
            "id": "preapproval-123",
            "status": "authorized",
            "external_reference": str(payment.id),
        }
    }

    with patch.object(payments_module, "get_mp_sdk", return_value=fake_sdk):
        response = client.post(
            "/api/v1/payments/webhook",
            json={"type": "subscription_preapproval", "data": {"id": "preapproval-123"}},
        )

    assert response.status_code == 200
    db_session.refresh(payment)
    assert payment.status == PaymentStatus.approved
    db_session.refresh(test_user)
    assert test_user.subscription.is_active is True


def test_webhook_cancelled_preapproval_deactivates_subscription(client, db_session, test_user):
    payment = Payment(
        user_id=test_user.id, plan=PaymentPlan.monthly, amount=2990.0,
        status=PaymentStatus.approved, mp_preapproval_id="preapproval-123",
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)
    payments_module._activate_subscription(db_session, payment)
    db_session.commit()

    fake_sdk = MagicMock()
    fake_sdk.preapproval.return_value.get.return_value = {
        "response": {
            "id": "preapproval-123",
            "status": "cancelled",
            "external_reference": str(payment.id),
        }
    }

    with patch.object(payments_module, "get_mp_sdk", return_value=fake_sdk):
        response = client.post(
            "/api/v1/payments/webhook",
            json={"type": "subscription_preapproval", "data": {"id": "preapproval-123"}},
        )

    assert response.status_code == 200
    db_session.refresh(test_user)
    assert test_user.subscription.is_active is False


def test_webhook_recurring_charge_extends_period(client, db_session, test_user):
    payment = Payment(
        user_id=test_user.id, plan=PaymentPlan.monthly, amount=2990.0,
        status=PaymentStatus.approved, mp_preapproval_id="preapproval-123",
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)
    payments_module._activate_subscription(db_session, payment)
    db_session.commit()
    first_period_end = test_user.subscription.current_period_end

    fake_sdk = MagicMock()
    fake_sdk.http_client.get.return_value = {
        "response": {
            "status": "approved",
            "preapproval_id": "preapproval-123",
        }
    }

    with patch.object(payments_module, "get_mp_sdk", return_value=fake_sdk):
        response = client.post(
            "/api/v1/payments/webhook",
            json={"type": "subscription_authorized_payment", "data": {"id": "charge-1"}},
        )

    assert response.status_code == 200
    db_session.refresh(test_user)
    assert test_user.subscription.current_period_end >= first_period_end


def test_webhook_ignores_unknown_topic(client):
    response = client.post(
        "/api/v1/payments/webhook",
        json={"type": "merchant_order", "data": {"id": "mo-1"}},
    )
    assert response.status_code == 200


# ─── confirm ────────────────────────────────────────────────────────────────────

def test_confirm_returns_approved_when_already_processed(client, db_session, test_user):
    payment = Payment(
        user_id=test_user.id, plan=PaymentPlan.monthly, amount=2990.0,
        status=PaymentStatus.approved, mp_preapproval_id="preapproval-123",
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    response = client.get(f"/api/v1/payments/confirm?payment_id={payment.id}")

    assert response.status_code == 200
    assert response.json()["status"] == "approved"


def test_confirm_falls_back_to_querying_mp(client, db_session, test_user):
    payment = Payment(
        user_id=test_user.id, plan=PaymentPlan.monthly, amount=2990.0, status=PaymentStatus.pending,
    )
    db_session.add(payment)
    db_session.commit()
    db_session.refresh(payment)

    fake_sdk = MagicMock()
    fake_sdk.preapproval.return_value.get.return_value = {
        "response": {"status": "authorized"}
    }

    with patch.object(payments_module, "get_mp_sdk", return_value=fake_sdk):
        response = client.get(
            f"/api/v1/payments/confirm?payment_id={payment.id}&preapproval_id=preapproval-999"
        )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
