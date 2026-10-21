
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

import logging

from backend.ai_service import (
    generate_follow_up,
    generate_lead_insights,
)

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend import models
from backend.auth import (
    CurrentUser,
    create_access_token,
    hash_password,
    verify_password,
)
from backend.database import get_db
from backend.schemas import (
    LeadCreate,
    LeadResponse,
    TokenResponse,
    UserRegister,
    UserResponse,
    AIFollowUpResponse,
    AILeadInsightsResponse,
)
from backend.scoring import score_lead


ALLOWED_STATUSES = {"new", "contacted", "qualified", "converted", "lost"}
ALLOWED_PRIORITIES = {"hot", "warm", "cold"}
ALLOWED_FOLLOW_UP_STATUSES = {"pending", "completed", "cancelled"}

logger = logging.getLogger(__name__)

DatabaseSession = Annotated[Session, Depends(get_db)]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Apply database migrations explicitly with `alembic upgrade head`.
    # Avoid mutating the production schema during application startup.
    yield


app = FastAPI(
    title="AI Lead Recovery & CRM Automation API",
    description="Lead management, qualification scoring, and follow-up tracking.",
    version="1.1.0",
    lifespan=lifespan,
)


class LeadUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    budget: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    budget_currency: str | None = Field(default=None, min_length=3, max_length=3)
    location: str | None = Field(default=None, max_length=150)
    timeline: str | None = Field(default=None, max_length=100)
    status: str | None = None
    notes: str | None = None


class FollowUpUpdate(BaseModel):
    follow_up_at: datetime | None = None
    follow_up_status: str | None = None
    follow_up_note: str | None = Field(default=None, max_length=2000)


def get_owned_lead(
    lead_id: int,
    user: models.User,
    db: Session,
) -> models.Lead:
    lead = db.scalar(
        select(models.Lead).where(
            models.Lead.id == lead_id,
            models.Lead.owner_id == user.id,
        )
    )

    if lead is None:
        # Same response for nonexistent and other users' leads.
        raise HTTPException(status_code=404, detail="Lead not found")

    return lead


@app.get("/")
def root():
    return {"message": "AI Lead Recovery & CRM Automation API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(payload: UserRegister, db: DatabaseSession):
    email = str(payload.email).strip().lower()

    existing_user = db.scalar(
        select(models.User).where(models.User.email == email)
    )
    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    user = models.User(
        email=email,
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    db.add(user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists",
        )

    db.refresh(user)
    return user


@app.post("/auth/login", response_model=TokenResponse)
def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DatabaseSession,
):
    email = form.username.strip().lower()
    user = db.scalar(
        select(models.User).where(models.User.email == email)
    )

    if (
        user is None
        or not verify_password(form.password, user.hashed_password)
        or not user.is_active
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"access_token": create_access_token(user.id), "token_type": "bearer"}


@app.get("/auth/me", response_model=UserResponse)
def read_current_user(user: CurrentUser):
    return user


@app.post(
    "/leads",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_lead(
    payload: LeadCreate,
    db: DatabaseSession,
    user: CurrentUser,
):
    lead = models.Lead(
        **payload.model_dump(),
        owner_id=user.id,
    )

    result = score_lead(lead)
    lead.score = result["score"]
    lead.priority = result["priority"]

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@app.get("/leads", response_model=list[LeadResponse])
def list_leads(
    db: DatabaseSession,
    user: CurrentUser,
    q: str | None = Query(default=None, max_length=150),
    priority: str | None = None,
    lead_status: str | None = Query(default=None, alias="status"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    statement = select(models.Lead).where(
        models.Lead.owner_id == user.id
    )

    if priority is not None:
        priority = priority.strip().lower()
        if priority not in ALLOWED_PRIORITIES:
            raise HTTPException(
                status_code=400,
                detail="Priority must be hot, warm, or cold",
            )
        statement = statement.where(models.Lead.priority == priority)

    if lead_status is not None:
        lead_status = lead_status.strip().lower()
        if lead_status not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid lead status")
        statement = statement.where(models.Lead.status == lead_status)

    if q and q.strip():
        search_term = f"%{q.strip()}%"
        statement = statement.where(
            or_(
                models.Lead.full_name.ilike(search_term),
                models.Lead.email.ilike(search_term),
                models.Lead.phone.ilike(search_term),
                models.Lead.location.ilike(search_term),
            )
        )

    statement = (
        statement
        .order_by(models.Lead.created_at.desc(), models.Lead.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return db.scalars(statement).all()


@app.get("/leads/{lead_id}/score")
def get_lead_score(
    lead_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    lead = get_owned_lead(lead_id, user, db)
    result = score_lead(lead)

    return {
        "lead_id": lead.id,
        "full_name": lead.full_name,
        "score": lead.score,
        "priority": lead.priority,
        "reasons": result["reasons"],
    }


@app.patch("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    lead = get_owned_lead(lead_id, user, db)
    updates = payload.model_dump(exclude_unset=True)

    for required_field in ("full_name", "email", "status"):
        if required_field in updates and updates[required_field] is None:
            raise HTTPException(
                status_code=422,
                detail=f"{required_field} cannot be null",
            )

    if "full_name" in updates and not updates["full_name"].strip():
        raise HTTPException(status_code=422, detail="Name cannot be blank")

    if "email" in updates:
        updates["email"] = str(updates["email"]).strip().lower()

    if "status" in updates:
        updates["status"] = updates["status"].strip().lower()
        if updates["status"] not in ALLOWED_STATUSES:
            raise HTTPException(status_code=400, detail="Invalid lead status")

    if "full_name" in updates:
        updates["full_name"] = updates["full_name"].strip()

    if "budget" in updates or "budget_currency" in updates:
        new_budget = updates.get("budget", lead.budget)
        new_currency = updates.get("budget_currency", lead.budget_currency)
        if new_budget is None and new_currency is not None:
            raise HTTPException(
                status_code=422,
                detail="Budget currency must be empty when budget is empty",
            )
        if new_budget is not None and not new_currency:
            raise HTTPException(
                status_code=422,
                detail="Budget currency is required when budget is provided",
            )
        if new_currency is not None:
            new_currency = new_currency.upper()
            if not new_currency.isalpha():
                raise HTTPException(status_code=422, detail="Invalid budget currency")
            updates["budget_currency"] = new_currency

    for field, value in updates.items():
        setattr(lead, field, value)

    scoring_fields = {"full_name", "email", "budget", "location", "timeline"}
    if scoring_fields.intersection(updates):
        result = score_lead(lead)
        lead.score = result["score"]
        lead.priority = result["priority"]

    db.commit()
    db.refresh(lead)
    return lead


@app.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(
    lead_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    lead = get_owned_lead(lead_id, user, db)
    db.delete(lead)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.patch("/leads/{lead_id}/follow-up", response_model=LeadResponse)
def update_follow_up(
    lead_id: int,
    payload: FollowUpUpdate,
    db: DatabaseSession,
    user: CurrentUser,
):
    lead = get_owned_lead(lead_id, user, db)
    previous_at = lead.follow_up_at
    updates = payload.model_dump(exclude_unset=True)

    if not updates:
        return lead

    if (
        "follow_up_status" in updates
        and updates["follow_up_status"] is not None
        and updates["follow_up_status"] not in ALLOWED_FOLLOW_UP_STATUSES
    ):
        raise HTTPException(
            status_code=400,
            detail="Follow-up status must be pending, completed, or cancelled",
        )

    for field, value in updates.items():
        setattr(lead, field, value)

    if lead.follow_up_status in {"completed", "cancelled"}:
        action = lead.follow_up_status
    elif previous_at is not None and lead.follow_up_at != previous_at:
        action = "rescheduled"
    else:
        action = "scheduled"

    db.add(
        models.FollowUpActivity(
            lead_id=lead.id,
            owner_id=user.id,
            action=action,
            scheduled_at=lead.follow_up_at,
            note=lead.follow_up_note,
            status=lead.follow_up_status,
        )
    )

    db.commit()
    db.refresh(lead)
    return lead


@app.get("/follow-ups")
def list_follow_ups(db: DatabaseSession, user: CurrentUser):
    statement = (
        select(models.Lead)
        .where(models.Lead.owner_id == user.id)
        .where(models.Lead.follow_up_status == "pending")
        .where(models.Lead.follow_up_at.is_not(None))
        .order_by(models.Lead.follow_up_at.asc())
    )

    leads = db.scalars(statement).all()
    def is_overdue(value: datetime) -> bool:
        normalized = value if value.tzinfo is not None else value.replace(tzinfo=timezone.utc)
        return normalized < datetime.now(timezone.utc)

    return [
        {
            "lead_id": lead.id,
            "full_name": lead.full_name,
            "phone": lead.phone,
            "email": lead.email,
            "follow_up_at": lead.follow_up_at,
            "follow_up_status": lead.follow_up_status,
            "follow_up_note": lead.follow_up_note,
            "priority": lead.priority,
            "is_overdue": is_overdue(lead.follow_up_at),
        }
        for lead in leads
    ]


@app.get("/leads/{lead_id}/follow-up-history")
def list_follow_up_history(
    lead_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    lead = get_owned_lead(lead_id, user, db)
    statement = (
        select(models.FollowUpActivity)
        .where(
            models.FollowUpActivity.lead_id == lead.id,
            models.FollowUpActivity.owner_id == user.id,
        )
        .order_by(models.FollowUpActivity.created_at.desc(), models.FollowUpActivity.id.desc())
    )
    activities = db.scalars(statement).all()
    return [
        {
            "id": item.id,
            "lead_id": item.lead_id,
            "action": item.action,
            "scheduled_at": item.scheduled_at,
            "note": item.note,
            "status": item.status,
            "created_at": item.created_at,
        }
        for item in activities
    ]



@app.post(
    "/leads/{lead_id}/ai/follow-up",
    response_model=AIFollowUpResponse,
)
def create_ai_follow_up(
    lead_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    # Check ownership before sending any lead information to the AI provider.
    lead = get_owned_lead(lead_id, user, db)

    try:
        draft = generate_follow_up(lead)
    except ValueError as exc:
        logger.error("AI service configuration is incomplete: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Check the server configuration.",
        ) from exc
    except Exception as exc:
        logger.exception("AI follow-up generation failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate a follow-up right now. Please try again.",
        ) from exc

    return {
        "lead_id": lead.id,
        "lead_name": lead.full_name,
        "draft": draft,
    }



@app.post(
    "/leads/{lead_id}/ai/insights",
    response_model=AILeadInsightsResponse,
)
def create_ai_lead_insights(
    lead_id: int,
    db: DatabaseSession,
    user: CurrentUser,
):
    # Only the lead's owner can request AI analysis.
    lead = get_owned_lead(lead_id, user, db)

    try:
        scoring_result = score_lead(lead)
        insights = generate_lead_insights(lead, scoring_result)
    except ValueError as exc:
        logger.error("AI service configuration is incomplete: %s", exc)
        raise HTTPException(
            status_code=503,
            detail="AI service is not configured. Check the server configuration.",
        ) from exc
    except Exception as exc:
        logger.exception("AI lead insights generation failed")
        raise HTTPException(
            status_code=502,
            detail="Unable to generate lead insights right now. Please try again.",
        ) from exc

    return {
        "lead_id": lead.id,
        "lead_name": lead.full_name,
        "score": lead.score,
        "priority": lead.priority,
        "insights": insights,
    }
