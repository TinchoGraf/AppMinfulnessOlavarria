"""
Migración: cuestionarios y registro emocional por sesión.

  - ALTER TABLE user_progress: agrega quiz_completed_at y activity_completed_at
  - Crea las tablas nuevas: quizzes, quiz_questions, quiz_options,
    quiz_responses, activity_logs

Es idempotente: se puede correr varias veces sin romper nada.

Uso (desde backend/):
    python migrate_quiz_activity.py
"""

from sqlalchemy import inspect, text

from app.db.database import engine, Base
from app.models import models  # noqa: F401  (registra los modelos en Base)

NEW_PROGRESS_COLUMNS = {
    "quiz_completed_at": "DATETIME",
    "activity_completed_at": "DATETIME",
}

NEW_TABLES = ["quizzes", "quiz_questions", "quiz_options", "quiz_responses", "activity_logs"]


def migrate():
    existing = {c["name"] for c in inspect(engine).get_columns("user_progress")}
    with engine.begin() as conn:
        for name, sql_type in NEW_PROGRESS_COLUMNS.items():
            if name in existing:
                print(f"  = user_progress.{name} ya existe")
                continue
            conn.execute(text(f"ALTER TABLE user_progress ADD COLUMN {name} {sql_type}"))
            print(f"  + user_progress.{name}")

    tables = [Base.metadata.tables[t] for t in NEW_TABLES]
    Base.metadata.create_all(bind=engine, tables=tables)
    print(f"  + tablas nuevas (si faltaban): {', '.join(NEW_TABLES)}")


if __name__ == "__main__":
    migrate()
    print("✅ Migración completa")
