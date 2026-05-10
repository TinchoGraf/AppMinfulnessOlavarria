# 🌿 Mindfulness Olavarría

Plataforma de bienestar emocional de la **Psicóloga Gabriela Ithurralde**.  
30 años de experiencia en psicología clínica y mindfulness. [@mindfulnessolavarria](https://instagram.com/mindfulnessolavarria) | [psicologaithurralde.com.ar](https://psicologaithurralde.com.ar)

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Python + FastAPI |
| Base de datos | SQLite (dev) → PostgreSQL (prod) |
| ORM | SQLAlchemy 2.0 |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Frontend | React + Tailwind CSS |
| Deploy | Railway / Render |

---

## Estructura del proyecto

```
mindfulness_olavarria/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── deps.py              ← Dependencies (auth, permisos)
│   │   │   └── v1/
│   │   │       ├── router.py        ← Router principal
│   │   │       └── endpoints/
│   │   │           ├── auth.py      ← Registro, login, perfil
│   │   │           ├── content.py   ← Audios, ejercicios, favoritos
│   │   │           └── programs.py  ← Programas, emociones, stats
│   │   ├── core/
│   │   │   ├── config.py            ← Configuración global (settings)
│   │   │   └── security.py          ← JWT y hashing de passwords
│   │   ├── db/
│   │   │   └── database.py          ← Conexión SQLAlchemy
│   │   ├── models/
│   │   │   └── models.py            ← Tablas de la BD
│   │   ├── schemas/
│   │   │   ├── user.py              ← Schemas Pydantic de usuarios
│   │   │   └── content.py           ← Schemas de contenido y programas
│   │   └── main.py                  ← Punto de entrada FastAPI
│   ├── seed.py                      ← Poblar BD con datos de ejemplo
│   ├── requirements.txt
│   └── .env.example
└── frontend/                        ← React (próximo paso)
```

---

## Instalación y arranque rápido

```bash
# 1. Entrar al backend
cd backend

# 2. Crear entorno virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Configurar variables de entorno
cp .env.example .env
# Editar .env si querés cambiar algo (opcional para desarrollo)

# 5. Poblar la base de datos con datos de ejemplo
python seed.py

# 6. Arrancar el servidor
uvicorn app.main:app --reload

# La API estará en: http://localhost:8000
# Documentación:   http://localhost:8000/docs
```

---

## Endpoints principales

### 🔐 Autenticación
| Método | URL | Descripción |
|--------|-----|-------------|
| POST | `/api/v1/auth/register` | Crear cuenta |
| POST | `/api/v1/auth/login` | Iniciar sesión → JWT |
| GET | `/api/v1/auth/me` | Perfil del usuario actual |
| PUT | `/api/v1/auth/me` | Actualizar perfil |
| POST | `/api/v1/auth/onboarding` | Guardar objetivos del onboarding |

### 🎵 Contenido
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/v1/content/` | Listar contenido (filtrable) |
| GET | `/api/v1/content/featured` | Contenido destacado para la home |
| GET | `/api/v1/content/categories` | Categorías disponibles |
| GET | `/api/v1/content/{id}` | Detalle de un ítem |
| POST | `/api/v1/content/{id}/favorite` | Marcar/desmarcar favorito |
| POST | `/api/v1/content/{id}/progress` | Guardar progreso de reproducción |

### 📚 Programas
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/v1/programs/` | Listar programas |
| GET | `/api/v1/programs/{id}` | Detalle con sesiones |
| POST | `/api/v1/programs/{id}/sessions/{sid}/complete` | Completar sesión |

### 💚 Registro Emocional
| Método | URL | Descripción |
|--------|-----|-------------|
| POST | `/api/v1/emotional/log` | Registrar cómo me siento hoy |
| GET | `/api/v1/emotional/history` | Historial emocional |
| GET | `/api/v1/emotional/recommend?state=ansiosa` | Recomendaciones por estado |

### 📊 Stats
| Método | URL | Descripción |
|--------|-----|-------------|
| GET | `/api/v1/stats/me` | Estadísticas del usuario |

---

## Modelos de datos

```
users
  ├── subscriptions      (plan: free/monthly/yearly)
  ├── emotional_logs     (estado emocional diario)
  ├── user_progress      (progreso en contenido y programas)
  └── favorites          (contenido guardado)

categories
  ├── content_items      (audios, ejercicios, meditaciones)
  └── programs
        └── program_sessions  (Día 1, Día 2, ...)
```

---

## Sistema Freemium

- **Registro** → 7 días de prueba premium automáticos
- **Contenido gratis** → Visible y accesible sin suscripción
- **Contenido premium** → Visible pero bloqueado (muestra paywall)
- **Programas** → La mayoría son premium

---

## Roadmap

- [x] **Etapa 1**: Arquitectura y modelos de datos
- [x] **Etapa 2**: Auth (registro, login, JWT)
- [x] **Etapa 3**: Endpoints de contenido, programas y emociones
- [ ] **Etapa 4**: Frontend React
- [ ] **Etapa 5**: Panel admin para subir contenido
- [ ] **Etapa 6**: Integración MercadoPago
- [ ] **Etapa 7**: Notificaciones y streaks
- [ ] **Etapa 8**: IA emocional conversacional

---

## Credenciales de desarrollo (seed.py)

```
Admin: admin@mindfulnessolavarria.com / admin1234
```
