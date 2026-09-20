# Healthcare Management Platform

> A multi-tenant SaaS platform designed to centralize and simplify medical practice management.

The **Healthcare Management Platform** is a full-stack SaaS application built for medical practices and healthcare professionals.

The project aims to provide a scalable environment where multiple clinics can independently manage their organization, users, patients, appointments, and administrative workflows from a single platform.

The current development phase focuses on the core multi-tenant architecture, authentication, clinic provisioning, database infrastructure, and doctor registration experience.

---

## Features

### Current Phase

- Multi-tenant SaaS architecture
- Medical practice / clinic provisioning
- JWT-based authentication
- Doctor registration workflow
- PostgreSQL database
- Database migrations with Alembic
- Redis integration
- Dockerized development environment
- React + TypeScript frontend
- Responsive interface with Tailwind CSS
- French and Arabic internationalization
- Right-to-left interface support for Arabic
- REST API documentation with Swagger

---

## Tech Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- i18n
- RTL Support

### Backend

- Python
- FastAPI
- JWT Authentication
- Alembic
- REST API

### Infrastructure

- PostgreSQL
- Redis
- Docker
- Docker Compose

---

## Project Structure

```text
.
├── backend
│   ├── alembic
│   ├── app
│   ├── Dockerfile
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend
│   ├── src
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
│
├── docs
│   ├── design-tokens.md
│   ├── multi-tenancy.md
│   └── backup-restore.md
│
└── docker-compose.yml
```

---

## Getting Started

### Run the complete application with Docker

```bash
docker compose up --build
```

Available services:

| Service | URL |
|---|---|
| Frontend | http://127.0.0.1:5180 |
| Backend API | http://127.0.0.1:8001 |
| Swagger | http://127.0.0.1:8001/docs |
| PostgreSQL | 127.0.0.1:5432 |
| Redis | 127.0.0.1:6379 |

---

## Database Only

To start PostgreSQL independently:

```bash
docker compose up -d postgres
```

---

## Backend Setup

Move into the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python3 -m venv .venv
```

Activate it:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run database migrations:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload --port 8001
```

Backend:

```text
http://127.0.0.1:8001
```

Swagger documentation:

```text
http://127.0.0.1:8001/docs
```

---

## API Endpoints

Some of the currently available endpoints:

```http
GET  /api/health
GET  /api/db-check
POST /api/auth/register-doctor
```

More endpoints can be explored directly through Swagger.

---

## Frontend Setup

Move into the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Application:

```text
http://127.0.0.1:5173
```

---

## Internationalization

The frontend includes an internationalization foundation for:

- French
- Arabic

Arabic interfaces include native **RTL — Right-to-Left** layout support.

---

## Multi-Tenant Architecture

The platform is designed around a multi-tenant architecture.

Each medical practice operates as an independent tenant, allowing the application to securely isolate data and configuration between clinics while sharing the same SaaS infrastructure.

More information:

```text
docs/multi-tenancy.md
```

---

## Documentation

Technical documentation is available inside the `docs` directory:

```text
docs/design-tokens.md
docs/multi-tenancy.md
docs/backup-restore.md
```

---

## Project Vision

The long-term objective is to build a complete medical practice management ecosystem covering areas such as:

- Patient management
- Appointment scheduling
- Medical consultations
- Prescriptions
- Medical documents
- Billing and payments
- Administrative workflows
- Notifications
- Multi-user access
- Clinic management
- Patient communication

The platform is being designed with scalability, maintainability, security, and user experience in mind.

---

## Status

**Under active development**

Current milestone:

```text
Phase 1 — Core SaaS & Multi-Tenant Foundation
```

---

## Author

**Adam Moujtahid**

Computer Engineering & Networks student  
Software Engineering · Big Data · Artificial Intelligence

---

<p align="center">
  Built with a focus on scalable software architecture and modern healthcare management.
</p>
