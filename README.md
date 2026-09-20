# FADAA Sante

Plateforme SaaS de gestion medicale multi-cabinets. Phase 1: socle multi-tenant, PostgreSQL, auth JWT, provisioning d'un cabinet et formulaire d'inscription React.

## Structure

```text
.
├── backend
│   ├── alembic
│   ├── app
│   ├── Dockerfile
│   ├── alembic.ini
│   └── requirements.txt
├── frontend
│   ├── src
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
├── docs
└── docker-compose.yml
```

## Lancer tout avec Docker

```bash
docker compose up --build
```

Services:

```text
Frontend: http://127.0.0.1:5180
Backend:  http://127.0.0.1:8001
Swagger:  http://127.0.0.1:8001/docs
Postgres: 127.0.0.1:5432
Redis:    127.0.0.1:6379
```

## Lancer PostgreSQL seul

```bash
docker compose up -d postgres
```

## Lancer le backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

API: `http://127.0.0.1:8001`  
Swagger: `http://127.0.0.1:8001/docs`

Endpoints utiles:

```text
GET  /api/health
GET  /api/db-check
POST /api/auth/register-doctor
```

## Lancer le frontend

```bash
cd frontend
npm install
npm run dev
```

Application: `http://127.0.0.1:5173`

Le frontend est en React + TypeScript + Tailwind CSS, avec une base i18n FR/AR et support RTL.

## Documentation

- `docs/design-tokens.md`
- `docs/multi-tenancy.md`
- `docs/backup-restore.md`
