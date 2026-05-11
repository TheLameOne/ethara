# Ethara — Team Task Management

A full-stack team task management application built with **React 19**, **FastAPI**, and **PostgreSQL**. Features role-based access control, JWT authentication, and a real-time dashboard for project and task tracking.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Docker (Recommended)](#docker-recommended)
  - [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Deployment](#deployment)
- [Role-Based Access](#role-based-access)

---

## Features

- User authentication with JWT (sign up, log in, protected routes)
- Project management with admin/member roles
- Task creation, assignment, and status tracking
- Dashboard with aggregated statistics
- Fully typed frontend (TypeScript) and backend (Pydantic v2)
- Containerised with Docker Compose for one-command local setup

---

## Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4        |
| State    | TanStack Query v5 (server), Zustand v5 (client)   |
| Forms    | React Hook Form + Zod                             |
| UI       | Framer Motion, Lucide React, Sonner               |
| Backend  | FastAPI 0.111, SQLAlchemy 2, Pydantic v2, Alembic |
| Auth     | JWT (python-jose), bcrypt (passlib)               |
| Database | PostgreSQL 16                                     |
| Infra    | Docker Compose, Nginx (SPA serving), Railway      |

---

## Prerequisites

| Tool           | Minimum Version | Notes                            |
| -------------- | --------------- | -------------------------------- |
| Docker Desktop | 24+             | Required for the Docker workflow |
| Node.js        | 20 LTS          | Required for local frontend dev  |
| Python         | 3.12            | Required for local backend dev   |
| PostgreSQL     | 16              | Required for local backend dev   |

---

## Getting Started

### Docker (Recommended)

This is the fastest way to run the full stack with a single command.

**1. Create the backend environment file**

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum a strong `SECRET_KEY`:

```env
DATABASE_URL=postgresql://ethara:ethara_secret@postgres:5432/ethara_db
SECRET_KEY=change-me-to-a-long-random-string
```

> The `DATABASE_URL` above is pre-configured for the Docker Compose network and does not need to change.

**2. Build and start all services**

```bash
docker compose up --build
```

| Service      | URL                          |
| ------------ | ---------------------------- |
| Frontend     | http://localhost:5173        |
| Backend API  | http://localhost:8000        |
| API Docs     | http://localhost:8000/docs   |
| Health Check | http://localhost:8000/health |

**3. Stop all services**

```bash
docker compose down
```

To also remove the persistent database volume:

```bash
docker compose down -v
```

---

### Local Development

Use this workflow when you need hot-reload for both the frontend and backend simultaneously.

#### Backend

**1. Create and activate a virtual environment**

```bash
cd backend

python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate
```

**2. Install dependencies**

```bash
pip install -r requirements.txt
```

**3. Configure environment variables**

Create `backend/.env` and point `DATABASE_URL` at a running PostgreSQL instance:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<dbname>
SECRET_KEY=change-me-to-a-long-random-string
CORS_ORIGINS=http://localhost:5173
```

**4. Start the development server**

```bash
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

> Database tables are created automatically on startup via SQLAlchemy's `create_all`.

---

#### Frontend

**1. Install dependencies**

```bash
cd frontend
npm install
```

**2. Start the development server**

```bash
npm run dev
```

The app is available at `http://localhost:5173`.

**Other available scripts:**

```bash
npm run build    # Production build (outputs to dist/)
npm run preview  # Preview the production build locally
npm run lint     # Run ESLint
```

---

## Environment Variables

All backend configuration is managed through `backend/.env`.

| Variable                      | Required | Default                                       | Description                             |
| ----------------------------- | -------- | --------------------------------------------- | --------------------------------------- |
| `DATABASE_URL`                | Yes      | —                                             | PostgreSQL connection string            |
| `SECRET_KEY`                  | Yes      | —                                             | Secret used to sign JWT tokens          |
| `ALGORITHM`                   | No       | `HS256`                                       | JWT signing algorithm                   |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No       | `60`                                          | JWT token lifetime in minutes           |
| `CORS_ORIGINS`                | No       | `http://localhost:5173,http://localhost:3000` | Comma-separated list of allowed origins |

---

## Project Structure

```
ethara/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── railway.toml
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI application entry point
│       ├── core/
│       │   ├── config.py      # Pydantic settings
│       │   ├── deps.py        # Dependency injection (auth, DB)
│       │   └── security.py    # Password hashing, JWT utilities
│       ├── db/
│       │   ├── base.py        # SQLAlchemy declarative base
│       │   └── session.py     # Database engine & session factory
│       ├── models/            # SQLAlchemy ORM models
│       ├── routers/           # FastAPI route handlers
│       └── schemas/           # Pydantic request/response schemas
└── frontend/
    ├── Dockerfile
    ├── nginx.conf             # Nginx SPA configuration
    ├── railway.toml
    ├── vite.config.ts
    └── src/
        ├── api/               # Axios API client functions
        ├── components/        # Shared UI components
        ├── pages/             # Route-level page components
        ├── store/             # Zustand state stores
        └── types/             # Shared TypeScript types
```

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Path             | Auth     | Description              |
| ------ | ---------------- | -------- | ------------------------ |
| POST   | /api/auth/signup | Public   | Register a new user      |
| POST   | /api/auth/login  | Public   | Authenticate and get JWT |
| GET    | /api/auth/me     | Required | Get current user profile |

### Projects

| Method | Path                           | Role    | Description                    |
| ------ | ------------------------------ | ------- | ------------------------------ |
| GET    | /api/projects                  | Member+ | List projects for current user |
| POST   | /api/projects                  | Member+ | Create a new project           |
| GET    | /api/projects/:id              | Member+ | Get project details            |
| PUT    | /api/projects/:id              | Admin   | Update project settings        |
| DELETE | /api/projects/:id              | Admin   | Delete a project               |
| POST   | /api/projects/:id/members      | Admin   | Add a member to the project    |
| DELETE | /api/projects/:id/members/:uid | Admin   | Remove a member                |

### Tasks

| Method | Path                    | Role                          | Description                 |
| ------ | ----------------------- | ----------------------------- | --------------------------- |
| GET    | /api/projects/:id/tasks | Member+                       | List all tasks in a project |
| POST   | /api/projects/:id/tasks | Admin                         | Create a task               |
| GET    | /api/tasks/:id          | Member+                       | Get task details            |
| PUT    | /api/tasks/:id          | Admin (all) / Member (status) | Update a task               |
| DELETE | /api/tasks/:id          | Admin                         | Delete a task               |

### Dashboard

| Method | Path           | Auth     | Description              |
| ------ | -------------- | -------- | ------------------------ |
| GET    | /api/dashboard | Required | Aggregated project stats |

---

## Deployment

Both services are configured for deployment on **Railway** via `railway.toml` files.

### Backend (Railway)

The backend Dockerfile builds a Python 3.12 slim image. Railway reads `backend/railway.toml` to configure the start command and health check.

Set the following environment variables in the Railway service dashboard:

```
DATABASE_URL   → your Railway PostgreSQL connection string
SECRET_KEY     → a securely generated random string
CORS_ORIGINS   → your deployed frontend URL
```

The health check endpoint is available at `GET /health`.

### Frontend (Railway)

The frontend Dockerfile produces a multi-stage build: Vite compiles static assets, which are then served by Nginx on the port exposed by Railway (`$PORT`). Railway reads `frontend/railway.toml` for configuration.

No additional environment variables are required for the frontend at runtime.

---

## Role-Based Access

| Action                            | Admin | Member |
| --------------------------------- | :---: | :----: |
| View projects and tasks           |   ✓   |   ✓    |
| Update task status                |   ✓   |   ✓    |
| Create / edit / delete tasks      |   ✓   |   ✗    |
| Add / remove project members      |   ✓   |   ✗    |
| Update or delete project settings |   ✓   |   ✗    |

The **first user to create a project** is automatically assigned the **Admin** role for that project. Subsequent users added via the members endpoint receive the **Member** role.
