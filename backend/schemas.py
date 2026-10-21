
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from decimal import Decimal
from typing import Literal
from pydantic import model_validator

class LeadCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str | None = None
    budget: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    budget_currency: str | None = Field(default=None, min_length=3, max_length=3)
    location: str | None = None
    timeline: str | None = None
    notes: str | None = None

    @model_validator(mode="after")
    def validate_budget_currency(self):
        if self.budget is not None and self.budget_currency is None:
            raise ValueError("budget_currency is required when budget is provided")
        if self.budget is None and self.budget_currency is not None:
            raise ValueError("budget is required when budget_currency is provided")
        if self.budget_currency is not None:
            self.budget_currency = self.budget_currency.upper()
            if not self.budget_currency.isalpha():
                raise ValueError("budget_currency must contain three letters")
        return self


class LeadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: str
    email: str
    phone: str | None
    budget: Decimal | None
    budget_currency: str | None
    location: str | None
    timeline: str | None
    status: str
    score: int
    priority: str
    notes: str | None
    follow_up_at: datetime | None
    follow_up_status: str
    follow_up_note: str | None
    created_at: datetime



class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AIFollowUpResponse(BaseModel):
    lead_id: int
    lead_name: str
    draft: str


class AILeadInsightsResponse(BaseModel):
    lead_id: int
    lead_name: str
    score: int
    priority: str
    insights: str
