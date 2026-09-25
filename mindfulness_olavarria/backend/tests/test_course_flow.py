"""
Tests del flujo por sesión: Video → Cuestionario → Registro emocional → Video siguiente.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.api.deps import get_current_active_user, get_current_admin
from app.models.models import User, UserRole, Program, ProgramSession

API = "/api/v1"


# ─── Fixtures ─────────────────────────────────────────────────────────────────

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
def users(db_session):
    ana = User(email="ana@example.com", full_name="Ana Test", hashed_password="x")
    admin = User(email="gabi@example.com", full_name="Gabriela", hashed_password="x", role=UserRole.admin)
    db_session.add_all([ana, admin])
    db_session.commit()
    return {"ana": ana, "admin": admin}


@pytest.fixture()
def program(db_session):
    """Programa gratis de 3 sesiones."""
    p = Program(title="Curso", is_premium=False, is_active=True)
    db_session.add(p)
    db_session.flush()
    for day in (1, 2, 3):
        db_session.add(ProgramSession(program_id=p.id, day_number=day, title=f"Clase {day}"))
    db_session.commit()
    db_session.refresh(p)
    return p


@pytest.fixture()
def client(db_session, users):
    state = {"user": users["ana"]}

    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_active_user] = lambda: state["user"]
    app.dependency_overrides[get_current_admin] = lambda: users["admin"]
    c = TestClient(app)
    c.state = state
    yield c
    app.dependency_overrides.clear()


# ─── Helpers ──────────────────────────────────────────────────────────────────

QUIZ_PAYLOAD = {
    "title": "Repaso clase 1",
    "questions": [
        {"question_text": "¿Pregunta A?", "order": 1, "options": [
            {"option_text": "A correcta", "is_correct": True, "order": 1},
            {"option_text": "A incorrecta", "order": 2},
        ]},
        {"question_text": "¿Pregunta B?", "order": 2, "options": [
            {"option_text": "B incorrecta", "order": 1},
            {"option_text": "B correcta", "is_correct": True, "order": 2},
        ]},
    ],
}


def create_quiz(client, session_id, payload=QUIZ_PAYLOAD):
    r = client.post(f"{API}/admin/sessions/{session_id}/quiz", json=payload)
    assert r.status_code == 201, r.text
    return r.json()


def sessions_of(client, program):
    r = client.get(f"{API}/programs/{program.id}")
    assert r.status_code == 200, r.text
    return r.json()["sessions"]


def base(program, session):
    return f"{API}/programs/{program.id}/sessions/{session.id}"


def complete_video(client, program, session):
    return client.post(f"{base(program, session)}/complete")


# ─── Tests ────────────────────────────────────────────────────────────────────

def test_full_flow_unlocks_step_by_step(client, program):
    s1, s2, _ = program.sessions
    quiz = create_quiz(client, s1.id)

    st = sessions_of(client, program)
    assert (st[0]["video_status"], st[0]["quiz_status"], st[0]["activity_status"]) == ("available", "locked", "locked")
    assert st[1]["video_status"] == "locked"
    # Sesiones sin quiz no muestran esos pasos
    assert st[1]["quiz_status"] is None and st[1]["activity_status"] is None

    # No se puede saltear el video
    assert client.get(f"{base(program, s1)}/quiz").status_code == 403
    assert complete_video(client, program, s2).status_code == 403

    assert complete_video(client, program, s1).status_code == 200
    st = sessions_of(client, program)
    assert (st[0]["video_status"], st[0]["quiz_status"], st[0]["activity_status"]) == ("completed", "available", "locked")
    assert st[1]["video_status"] == "locked"

    # El cuestionario no revela respuestas correctas
    r = client.get(f"{base(program, s1)}/quiz")
    assert r.status_code == 200
    assert "is_correct" not in r.text
    # No se puede registrar antes del cuestionario
    assert client.post(f"{base(program, s1)}/activity", json={"content": "hola"}).status_code == 403

    q = quiz["questions"]
    answers = [
        {"question_id": q[0]["id"], "option_id": q[0]["options"][0]["id"]},  # correcta
        {"question_id": q[1]["id"], "option_id": q[1]["options"][0]["id"]},  # incorrecta
    ]
    r = client.post(f"{base(program, s1)}/quiz/respond", json={"answers": answers})
    assert r.status_code == 200, r.text
    assert (r.json()["score"], r.json()["total"]) == (1, 2)

    result = client.get(f"{base(program, s1)}/quiz/result").json()
    assert [a["is_correct"] for a in result["answers"]] == [True, False]
    assert result["answers"][1]["correct_option_text"] == "B correcta"

    st = sessions_of(client, program)
    assert (st[0]["quiz_status"], st[0]["activity_status"]) == ("completed", "available")
    assert st[1]["video_status"] == "locked"

    r = client.post(f"{base(program, s1)}/activity", json={"content": "Me sentí tranquila"})
    assert r.status_code == 201, r.text
    assert "psicóloga" in r.json()["message"]

    st = sessions_of(client, program)
    assert st[0]["is_completed"] is True
    assert st[1]["video_status"] == "available"
    assert complete_video(client, program, s2).status_code == 200


def test_quiz_cannot_be_answered_twice(client, program):
    s1 = program.sessions[0]
    quiz = create_quiz(client, s1.id)
    complete_video(client, program, s1)
    q = quiz["questions"]
    answers = [{"question_id": x["id"], "option_id": x["options"][0]["id"]} for x in q]

    assert client.post(f"{base(program, s1)}/quiz/respond", json={"answers": answers}).status_code == 200
    assert client.post(f"{base(program, s1)}/quiz/respond", json={"answers": answers}).status_code == 409


def test_quiz_requires_all_questions_and_valid_options(client, program):
    s1 = program.sessions[0]
    quiz = create_quiz(client, s1.id)
    complete_video(client, program, s1)
    q = quiz["questions"]

    partial = [{"question_id": q[0]["id"], "option_id": q[0]["options"][0]["id"]}]
    assert client.post(f"{base(program, s1)}/quiz/respond", json={"answers": partial}).status_code == 400

    wrong_option = [
        {"question_id": q[0]["id"], "option_id": q[1]["options"][0]["id"]},
        {"question_id": q[1]["id"], "option_id": q[1]["options"][0]["id"]},
    ]
    assert client.post(f"{base(program, s1)}/quiz/respond", json={"answers": wrong_option}).status_code == 400
    assert client.get(f"{base(program, s1)}/quiz/result").status_code == 404


def test_session_without_quiz_goes_straight_to_next_video(client, program):
    s1, s2, _ = program.sessions
    assert client.get(f"{base(program, s1)}/quiz").status_code == 404
    complete_video(client, program, s1)
    st = sessions_of(client, program)
    assert st[0]["is_completed"] is True
    assert st[1]["video_status"] == "available"
    assert client.post(f"{base(program, s1)}/activity", json={"content": "x"}).status_code == 404


def test_multiple_activity_entries_per_session(client, program):
    s1 = program.sessions[0]
    quiz = create_quiz(client, s1.id)
    complete_video(client, program, s1)
    answers = [{"question_id": x["id"], "option_id": x["options"][0]["id"]} for x in quiz["questions"]]
    client.post(f"{base(program, s1)}/quiz/respond", json={"answers": answers})

    for text in ("primero", "segundo", "tercero"):
        assert client.post(f"{base(program, s1)}/activity", json={"content": text}).status_code == 201
    assert client.post(f"{base(program, s1)}/activity", json={"content": "   "}).status_code == 400

    r = client.get(f"{base(program, s1)}/activity").json()
    assert len(r["entries"]) == 3
    assert "psicóloga" in r["message"]


def test_admin_quiz_validation_and_update(client, program):
    s1 = program.sessions[0]
    bad = {"title": "x", "questions": [{"question_text": "?", "options": [
        {"option_text": "a", "is_correct": True}, {"option_text": "b", "is_correct": True}]}]}
    assert client.post(f"{API}/admin/sessions/{s1.id}/quiz", json=bad).status_code == 400

    quiz = create_quiz(client, s1.id)
    assert client.post(f"{API}/admin/sessions/{s1.id}/quiz", json=QUIZ_PAYLOAD).status_code == 409

    new_questions = {"questions": [{"question_text": "¿Nueva?", "options": [
        {"option_text": "sí", "is_correct": True}, {"option_text": "no"}]}]}
    r = client.put(f"{API}/admin/quiz/{quiz['id']}", json=new_questions)
    assert r.status_code == 200 and len(r.json()["questions"]) == 1

    # Con respuestas, ya no se pueden reemplazar las preguntas (sí el título)
    complete_video(client, program, s1)
    q = r.json()["questions"][0]
    client.post(f"{base(program, s1)}/quiz/respond",
                json={"answers": [{"question_id": q["id"], "option_id": q["options"][0]["id"]}]})
    assert client.put(f"{API}/admin/quiz/{quiz['id']}", json=new_questions).status_code == 409
    assert client.put(f"{API}/admin/quiz/{quiz['id']}", json={"title": "Otro"}).status_code == 200


def test_admin_sees_responses_and_activities(client, program):
    s1 = program.sessions[0]
    quiz = create_quiz(client, s1.id)
    complete_video(client, program, s1)
    q = quiz["questions"]
    answers = [{"question_id": x["id"], "option_id": x["options"][0]["id"]} for x in q]
    client.post(f"{base(program, s1)}/quiz/respond", json={"answers": answers})
    client.post(f"{base(program, s1)}/activity", json={"content": "Registro de Ana"})

    responses = client.get(f"{API}/admin/programs/{program.id}/responses").json()
    assert len(responses) == 1
    assert responses[0]["user_name"] == "Ana Test"
    assert (responses[0]["score"], responses[0]["total"]) == (1, 2)
    assert responses[0]["day_number"] == 1

    activities = client.get(f"{API}/admin/programs/{program.id}/activities").json()
    assert [a["content"] for a in activities] == ["Registro de Ana"]
    assert activities[0]["user_name"] == "Ana Test"
    assert activities[0]["session_title"] == "Clase 1"
