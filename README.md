# MoSPI AI Competency Platform
## SIH 2024 — Problem Statement SIH 26101

AI-Enabled Adaptive Learning & Competency Gap Platform for Ministry of Statistics & Programme Implementation (MoSPI), Data Informatics & Innovation Division (DIID).

---

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Python 3.12+ (for local backend dev)

### 1. Clone & configure
```bash
cd infra
cp .env.example .env
# Edit .env — set your LLM API key (OpenAI) or switch to Ollama
```

### 2. Start with Docker Compose
```bash
cd infra
docker compose up -d
```

Services:
- PostgreSQL + pgvector: `localhost:5432`
- Redis: `localhost:6379`
- Backend API: `http://localhost:8000` (Swagger: `http://localhost:8000/docs`)
- Frontend: `http://localhost:3000`

### 3. Run migrations & seed data
```bash
# Wait for postgres to be healthy, then:
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.services.seed
```

### 4. Demo credentials
| Role    | Email                          | Password      |
|---------|-------------------------------|---------------|
| Learner | priya.sharma@mospi.gov.in     | Password@123  |
| Learner | rajesh.kumar@mospi.gov.in     | Password@123  |
| Admin   | admin@mospi.gov.in            | Admin@123     |

---

## Local Development

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp ../infra/.env.example .env  # adjust DATABASE_URL to localhost
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

---

## Architecture

```
mospi-competency-platform/
├── frontend/          Next.js 14 + Tailwind CSS + Recharts
├── backend/           Python FastAPI + SQLAlchemy + Alembic
│   └── app/
│       ├── api/routers/    auth, users, recommendations, materials, admin, igot
│       ├── models/         SQLAlchemy ORM models
│       ├── services/       competency_engine, recommendation_engine, quiz_generator, seed
│       └── core/           config, db, security
├── infra/             docker-compose.yml + .env.example
└── docs/              PRD
```

## Key Features

| Feature | Implementation |
|---------|---------------|
| Competency profiling | Role-based seed scores + Bayesian Knowledge Tracing |
| Gap analysis | Target vs. current score per skill, prioritised by gap size |
| Course recommendations | Sentence-transformers + pgvector cosine similarity |
| MCQ generation | LLM (OpenAI/Ollama) RAG pipeline with fallback rule-based generator |
| Employee dashboard | Radar chart, gap bar chart, recommendations, quiz launcher |
| Admin dashboard | KPI cards, domain bar chart, department × domain heatmap, officer table |
| iGOT integration | Clean adapter stub with 12 realistic mock courses |
| Auth | JWT access + refresh tokens, RBAC (learner/admin) |

## LLM Configuration

**OpenAI (default):**
```
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

**Ollama (local, free):**
```
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2
```

If no LLM is configured, the system falls back to a rule-based MCQ generator automatically.

---

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
