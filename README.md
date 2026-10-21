# AI Lead Recovery & CRM Automation — LeadFlow

LeadFlow is a React/Vite frontend backed by FastAPI and PostgreSQL. It supports account-based access, lead qualification scoring, AI-generated drafts/insights, follow-up scheduling, follow-up queue actions, and an audit history of follow-up changes.

## Stack
- Frontend: React, Vite, Lucide, React Markdown
- Backend: FastAPI, SQLAlchemy, Pydantic
- Database: PostgreSQL
- Migrations: Alembic
- AI: Google Gemini (`google-genai`)
- Authentication: JWT bearer tokens and password hashing

## Important security note
Do not commit `.env`, API keys, database passwords, database dumps, `.venv`, or `node_modules`. The `.env.example` file contains placeholders only. Use synthetic lead data while testing AI integrations unless you have reviewed the provider's data handling terms.

## Local setup

### 1. Backend
Use Python 3.12 recommended for this project.

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` locally with your PostgreSQL connection string, a strong unique JWT secret, and Gemini API key. Never share the actual `.env` file.

Create the PostgreSQL database before migration, then run:

```powershell
python -m alembic upgrade head
python -m uvicorn backend.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

### 2. Frontend
In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite development proxy forwards `/api` requests to FastAPI.

### 3. Tests
From the project root with the virtual environment active:

```powershell
python -m pytest -q
```

Tests use an isolated SQLite database and do not need production records. Before deploying, also run `python -m alembic check` against a development database and validate the migration path against a recent backup.

## Follow-up behavior
- Scheduling and rescheduling update the lead's current follow-up fields.
- Completing or cancelling removes it from the pending queue.
- Follow-up changes are recorded in `follow_up_activities`.
- The migration seeds a history entry for existing leads with a scheduled follow-up and an assigned owner.
- Existing legacy leads without an owner remain inaccessible to other accounts by design.

## Deployment checklist
- Set secrets via the deployment platform's environment settings, not source control.
- Use HTTPS and a strong unique `JWT_SECRET_KEY`.
- Set `DATABASE_URL` to the managed PostgreSQL service.
- Run `python -m alembic upgrade head` as a deployment/release step before starting the app.
- Configure a production frontend build (`npm run build`) and serve `frontend/dist` from a static host or reverse proxy.
- Restrict database network access and keep backups.
- Add rate limiting and monitoring at the edge before public exposure.
- Confirm AI provider data policies before sending real customer information.

This is a development-ready foundation, not a claim of a fully security-audited or deployed production service. Complete a clean install, test suite, migration rehearsal, and deployment smoke test before handling real customer data.
