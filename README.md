<div align="center">

# 🏥 Medical Management System

### Multi-tenant healthcare management platform built for modern medical practices

<p>
  A full-stack SaaS project designed to centralize clinic operations, simplify administration,
  and provide a scalable foundation for medical practice management.
</p>

<p>
  <img src="https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL%2016-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Cache-Redis%207-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
</p>

<p>
  <img src="https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/Architecture-Multi--Tenant-7C3AED?style=flat-square" alt="Multi-Tenant" />
  <img src="https://img.shields.io/badge/Status-Active_Development-F59E0B?style=flat-square" alt="Status" />
</p>

</div>

---

## ✨ Overview

**Medical Management System** is a full-stack healthcare SaaS platform focused on building a clean, scalable and maintainable environment for medical practices.

The application is designed around a **multi-tenant architecture**, allowing multiple clinics to share the same platform while keeping their organizations, users and data logically isolated.

The current milestone focuses on the platform foundation: authentication, clinic provisioning, database infrastructure, doctor onboarding, internationalization and the technical building blocks required for future medical workflows.

---

## 🎯 Project Goals

The platform is being designed to provide a single environment for managing the operational side of a medical practice while keeping the architecture ready for future growth.

Key engineering goals include:

- secure tenant-aware application design
- scalable backend architecture
- clean separation between frontend, API and infrastructure
- responsive and multilingual user experience
- reliable database migrations and persistence
- containerized development and deployment workflow
- maintainable codebase for future healthcare modules

---

## ✅ Current Capabilities

| Area | Capability | Status |
|---|---|:---:|
| Architecture | Multi-tenant SaaS foundation | ✅ |
| Clinics | Medical practice / clinic provisioning | ✅ |
| Authentication | JWT-based authentication | ✅ |
| Users | Doctor registration workflow | ✅ |
| Database | PostgreSQL persistence | ✅ |
| Migrations | Alembic database migrations | ✅ |
| Cache / Services | Redis integration | ✅ |
| Frontend | React + TypeScript application | ✅ |
| UI | Responsive Tailwind CSS interface | ✅ |
| i18n | French and Arabic support | ✅ |
| RTL | Right-to-left layout for Arabic | ✅ |
| API | FastAPI REST API + Swagger documentation | ✅ |
| Infrastructure | Docker / Docker Compose environment | ✅ |
| Background processing | Dedicated backend worker service | ✅ |

---

## 🧭 Product Roadmap

The long-term vision is to evolve the platform into a complete medical practice management ecosystem.

```text
Core SaaS Foundation
        ↓
Clinic & User Management
        ↓
Patient Management
        ↓
Appointment Scheduling
        ↓
Medical Consultations
        ↓
Prescriptions & Documents
        ↓
Billing & Payments
        ↓
Notifications & Communication
        ↓
Advanced Practice Administration
```

Planned functional areas include patient records, appointments, consultations, prescriptions, medical documents, billing, notifications, multi-user workflows and patient communication.

---

## 🏗️ Architecture

```text
┌───────────────────────────────────────────────┐
│                 React Frontend                │
│        TypeScript · Tailwind · i18n           │
└──────────────────────┬────────────────────────┘
                       │ HTTP / REST
                       ▼
┌───────────────────────────────────────────────┐
│                  FastAPI API                  │
│     Auth · Tenant Logic · Business Layer      │
└───────────────┬─────────────────┬─────────────┘
                │                 │
                ▼                 ▼
┌────────────────────────┐  ┌───────────────────┐
│      PostgreSQL 16     │  │      Redis 7      │
│  Data + Alembic        │  │ Cache / Services  │
└────────────────────────┘  └───────────────────┘
                │
                ▼
┌───────────────────────────────────────────────┐
│            Background Worker Service          │
└───────────────────────────────────────────────┘
```

The Docker Compose environment orchestrates the frontend, backend API, PostgreSQL, Redis and a dedicated worker process.

---

## 🧰 Tech Stack

### Frontend

| Technology | Role |
|---|---|
| React 19 | User interface |
| TypeScript | Type-safe frontend development |
| Vite | Development server and build tooling |
| Tailwind CSS | Styling and responsive UI |
| i18next / react-i18next | Internationalization |
| Framer Motion | UI animations |
| FullCalendar | Calendar foundation |
| Leaflet / React Leaflet | Map support |
| Lucide React / React Icons | Interface icons |

### Backend

| Technology | Role |
|---|---|
| Python | Backend language |
| FastAPI | REST API framework |
| SQLAlchemy | ORM / database access |
| Alembic | Database migrations |
| python-jose | JWT handling |
| Passlib / bcrypt | Password hashing |
| APScheduler | Scheduled tasks |
| ReportLab | PDF generation foundation |
| OpenPyXL | Excel generation / processing |
| QRCode | QR code generation |

### Infrastructure

| Technology | Role |
|---|---|
| PostgreSQL 16 | Primary relational database |
| Redis 7 | Cache / service infrastructure |
| Docker | Containerization |
| Docker Compose | Local multi-service orchestration |

---

## 📁 Project Structure

```text
Medical-Management-System/
│
├── backend/
│   ├── alembic/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── workers/
│   ├── Dockerfile
│   ├── alembic.ini
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
│
├── docs/
│   ├── design-tokens.md
│   ├── multi-tenancy.md
│   └── backup-restore.md
│
├── docker-compose.yml
├── DECISIONS.md
└── README.md
```

---

## 🚀 Quick Start with Docker

### Prerequisites

Make sure you have installed:

- Docker
- Docker Compose
- Git

Clone the repository:

```bash
git clone https://github.com/admoujta/Medical-Management-System.git
cd Medical-Management-System
```

Start the complete environment:

```bash
docker compose up --build
```

### Local Services

| Service | Address |
|---|---|
| 🌐 Frontend | `http://127.0.0.1:5180` |
| ⚡ Backend API | `http://127.0.0.1:8001` |
| 📚 Swagger UI | `http://127.0.0.1:8001/docs` |
| 🐘 PostgreSQL | `127.0.0.1:5432` |
| 🔴 Redis | `127.0.0.1:6379` |

The backend container automatically applies Alembic migrations before starting the API.

---

## ⚙️ Backend Development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8001
```

On Windows PowerShell, activate the environment with:

```powershell
.\.venv\Scripts\Activate.ps1
```

Swagger documentation is available at:

```text
http://127.0.0.1:8001/docs
```

---

## 🎨 Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Default Vite development address:

```text
http://127.0.0.1:5173
```

Useful commands:

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
```

---

## 🌍 Internationalization

The frontend currently includes support for:

- 🇫🇷 French
- 🇲🇦 Arabic

Arabic mode includes native **RTL (Right-to-Left)** layout support so the interface can adapt naturally to Arabic-speaking users.

---

## 🏢 Multi-Tenant Design

Each medical practice is treated as an independent tenant inside the shared SaaS infrastructure.

The architecture is intended to keep clinic data and configuration isolated while allowing the application to reuse the same backend, database infrastructure and frontend platform.

More details are available in:

```text
docs/multi-tenancy.md
```

---

## 📚 Documentation

Additional technical notes are available inside the `docs` directory:

| Document | Purpose |
|---|---|
| `docs/multi-tenancy.md` | Multi-tenant architecture |
| `docs/design-tokens.md` | UI design system foundations |
| `docs/backup-restore.md` | Backup and restore strategy |

---

## 🔌 API

The FastAPI backend exposes interactive API documentation through Swagger.

Examples already documented in the project include:

```http
GET  /api/health
GET  /api/db-check
POST /api/auth/register-doctor
```

Explore the complete API locally through:

```text
http://127.0.0.1:8001/docs
```

---

## 🔐 Security & Engineering Principles

This project is developed with several engineering priorities in mind:

- authentication through JWT
- secure password hashing
- tenant-aware application logic
- environment-based configuration
- controlled database migrations
- separation of application layers
- persistent Docker volumes for operational data
- maintainable backend services and background workers

> **Note:** this repository is under active development and should not be considered production-ready healthcare software without a dedicated security, privacy and regulatory review.

---

## 📈 Development Status

<div align="center">

### 🚧 Active Development

**Current milestone:** `Core SaaS & Multi-Tenant Foundation`

</div>

The project is evolving incrementally, with the infrastructure and core platform being established before expanding into deeper clinical and administrative workflows.

---

## 👨‍💻 Author

<div align="center">

<img src="assets/profile.jpg" width="180" alt="Adam Moujtahid" />

### Adam Moujtahid

**Computer Engineering & Networks Student**  
Software Engineering · Big Data · Artificial Intelligence

[![GitHub](https://img.shields.io/badge/GitHub-admoujta-181717?style=for-the-badge&logo=github)](https://github.com/admoujta)

---

**Built with a focus on scalable architecture, clean engineering and modern healthcare management.**

</div>
