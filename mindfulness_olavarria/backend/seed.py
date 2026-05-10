"""
Script para inicializar la base de datos con:
- Usuario admin
- Categorías base
- Contenido de ejemplo (gratis y premium)
- Programas de ejemplo

Ejecutar: python seed.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, create_tables
from app.models.models import (
    User, UserRole, Subscription, SubscriptionPlan,
    Category, ContentItem, ContentType, Program, ProgramSession
)
from app.core.security import get_password_hash
from datetime import datetime


def seed():
    create_tables()
    db = SessionLocal()

    try:
        # ── Admin ──────────────────────────────────────────────────────────────
        if not db.query(User).filter(User.email == "admin@mindfulnessolavarria.com").first():
            admin = User(
                email="admin@mindfulnessolavarria.com",
                full_name="Gabriela Ithurralde",
                hashed_password=get_password_hash("admin1234"),
                role=UserRole.admin,
                is_active=True,
                is_verified=True,
                onboarding_completed=True,
            )
            db.add(admin)
            db.flush()

            sub = Subscription(user_id=admin.id, plan=SubscriptionPlan.yearly, is_active=True)
            db.add(sub)
            print("✅ Admin creado: admin@mindfulnessolavarria.com / admin1234")

        # ── Categorías ─────────────────────────────────────────────────────────
        categories_data = [
            {"name": "Ansiedad", "slug": "ansiedad", "icon": "heart-pulse", "color": "#C8A4A4", "order": 1,
             "description": "Herramientas para calmar y regular la ansiedad"},
            {"name": "Respiración", "slug": "respiracion", "icon": "wind", "color": "#A4C8B4", "order": 2,
             "description": "Técnicas de respiración consciente"},
            {"name": "Mindfulness", "slug": "mindfulness", "icon": "lotus", "color": "#A4B4C8", "order": 3,
             "description": "Presencia plena en el momento actual"},
            {"name": "Regulación Emocional", "slug": "regulacion-emocional", "icon": "brain", "color": "#C8C4A4", "order": 4,
             "description": "Reconocer y gestionar las emociones"},
            {"name": "Inteligencia Emocional", "slug": "inteligencia-emocional", "icon": "star", "color": "#B4A4C8", "order": 5,
             "description": "Desarrollar habilidades emocionales"},
            {"name": "Vínculos", "slug": "vinculos", "icon": "users", "color": "#C8B4A4", "order": 6,
             "description": "Relaciones y comunicación consciente"},
            {"name": "Sueño", "slug": "sueno", "icon": "moon", "color": "#A4A8C8", "order": 7,
             "description": "Mejorar el descanso y bajar las revoluciones"},
            {"name": "Alimentación Consciente", "slug": "alimentacion-consciente", "icon": "apple", "color": "#A4C8A8", "order": 8,
             "description": "Relación sana con la alimentación"},
            {"name": "Pausas", "slug": "pausas", "icon": "pause-circle", "color": "#C8A4C4", "order": 9,
             "description": "Paradas breves para volver al presente"},
        ]

        cats = {}
        for cat_data in categories_data:
            cat = db.query(Category).filter(Category.slug == cat_data["slug"]).first()
            if not cat:
                cat = Category(**cat_data)
                db.add(cat)
                db.flush()
                print(f"  📁 Categoría: {cat.name}")
            cats[cat_data["slug"]] = cat

        # ── Contenido de ejemplo ───────────────────────────────────────────────
        content_data = [
            # GRATIS
            {
                "title": "Respiración 4-7-8 para la ansiedad",
                "description": "Una de las técnicas más efectivas para calmar el sistema nervioso en minutos.",
                "content_type": ContentType.breathing,
                "category_slug": "respiracion",
                "duration_seconds": 180,
                "is_premium": False,
                "is_featured": True,
                "order": 1,
                "body_text": "Inhala 4 segundos → retén 7 segundos → exhala 8 segundos. Repetí 4 veces.",
            },
            {
                "title": "Meditación de 5 minutos: Volver al presente",
                "description": "Una pausa breve para reconectar con el momento actual.",
                "content_type": ContentType.audio,
                "category_slug": "mindfulness",
                "duration_seconds": 300,
                "is_premium": False,
                "is_featured": True,
                "order": 2,
            },
            {
                "title": "Grounding 5-4-3-2-1",
                "description": "Técnica de anclaje para salir de pensamientos ansiosos.",
                "content_type": ContentType.exercise,
                "category_slug": "ansiedad",
                "duration_seconds": 240,
                "is_premium": False,
                "is_featured": True,
                "order": 3,
                "body_text": "Nombrá: 5 cosas que ves → 4 que podés tocar → 3 que escuchás → 2 que olés → 1 que saboreás.",
            },
            {
                "title": "Pausa consciente de 1 minuto",
                "description": "Para los momentos en que todo se acelera.",
                "content_type": ContentType.breathing,
                "category_slug": "pausas",
                "duration_seconds": 60,
                "is_premium": False,
                "is_featured": False,
                "order": 4,
            },
            {
                "title": "¿Qué sentís ahora? Ejercicio de reconocimiento emocional",
                "description": "Aprendé a identificar y nombrar tus emociones.",
                "content_type": ContentType.exercise,
                "category_slug": "regulacion-emocional",
                "duration_seconds": 300,
                "is_premium": False,
                "is_featured": True,
                "order": 5,
            },
            # PREMIUM
            {
                "title": "Meditación para dormir: Soltar el día",
                "description": "Guía de 20 minutos para bajar las revoluciones y preparar el cuerpo para el descanso.",
                "content_type": ContentType.audio,
                "category_slug": "sueno",
                "duration_seconds": 1200,
                "is_premium": True,
                "is_featured": True,
                "order": 1,
            },
            {
                "title": "Gestión de pensamientos catastróficos",
                "description": "Técnica cognitiva para identificar y transformar pensamientos ansiosos.",
                "content_type": ContentType.exercise,
                "category_slug": "ansiedad",
                "duration_seconds": 900,
                "is_premium": True,
                "is_featured": False,
                "order": 2,
            },
            {
                "title": "Alimentación consciente: La primera mordida",
                "description": "Ejercicio guiado para reconectar con la experiencia de comer.",
                "content_type": ContentType.audio,
                "category_slug": "alimentacion-consciente",
                "duration_seconds": 600,
                "is_premium": True,
                "is_featured": True,
                "order": 1,
            },
            {
                "title": "Comunicación en vínculos: Decir lo que sentís",
                "description": "Herramientas prácticas para expresar emociones en las relaciones.",
                "content_type": ContentType.exercise,
                "category_slug": "vinculos",
                "duration_seconds": 720,
                "is_premium": True,
                "is_featured": False,
                "order": 1,
            },
        ]

        for item_data in content_data:
            slug = item_data.pop("category_slug")
            cat = cats.get(slug)
            item = ContentItem(**item_data, category_id=cat.id if cat else None)
            db.add(item)

        db.flush()
        print(f"  🎵 {len(content_data)} ítems de contenido creados")

        # ── Programa de ejemplo ────────────────────────────────────────────────
        if not db.query(Program).filter(Program.title == "Regular la ansiedad en 21 días").first():
            program = Program(
                title="Regular la ansiedad en 21 días",
                description="Un recorrido guiado para aprender a reconocer, entender y regular la ansiedad con herramientas de mindfulness y psicología cognitiva.",
                category_id=cats["ansiedad"].id,
                duration_days=21,
                is_premium=True,
                order=1,
            )
            db.add(program)
            db.flush()

            sessions = [
                ("Reconocer la ansiedad en el cuerpo", "¿Dónde sentís la ansiedad? Aprendemos a identificarla.", 15),
                ("Respiración reguladora", "La técnica 4-7-8 y cuándo usarla.", 10),
                ("Pensamientos automáticos", "Qué son y cómo identificarlos.", 20),
                ("Ansiedad anticipatoria", "El miedo al futuro que no llegó.", 15),
                ("Grounding: volver al cuerpo", "Técnicas de anclaje en el presente.", 10),
                ("Diálogo interno compasivo", "Cómo hablarte con menos exigencia.", 20),
                ("Revisión semana 1", "Integramos lo aprendido.", 15),
            ]

            for i, (title, desc, mins) in enumerate(sessions, 1):
                s = ProgramSession(
                    program_id=program.id,
                    day_number=i,
                    title=title,
                    description=desc,
                    duration_minutes=mins,
                )
                db.add(s)

            print(f"  📚 Programa '21 días' creado con {len(sessions)} sesiones")

        db.commit()
        print("\n🌿 Base de datos inicializada correctamente.")
        print("   Podés arrancar el servidor con: uvicorn app.main:app --reload")

    except Exception as e:
        db.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
