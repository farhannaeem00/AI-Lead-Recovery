from decimal import Decimal, InvalidOperation
import re

def has_budget_information(budget) -> bool:
    """Support numeric budgets and legacy text budgets."""
    if budget is None:
        return False

    # New numeric budget format: Decimal, int, or float
    if isinstance(budget, (Decimal, int, float)):
        return budget > 0

    # Legacy text format, e.g. "PKR 20 million" or "High"
    if isinstance(budget, str):
        return bool(budget.strip())

    return False
def score_lead(lead) -> dict:
    score = 0
    reasons = []

    timeline = (lead.timeline or "").lower().strip()

    if any(term in timeline for term in ["within 30 days", "within 1 month", "immediately"]):
        score += 40
        reasons.append("Buying timeline is within 30 days")

    elif any(term in timeline for term in ["within 3 months", "1-3 months", "1 to 3 months"]):
        score += 25
        reasons.append("Buying timeline is within 3 months")

    elif any(term in timeline for term in ["within 6 months", "3-6 months", "3 to 6 months"]):
        score += 10
        reasons.append("Buying timeline is within 6 months")

    if has_budget_information(lead.budget):
        score += 20
        reasons.append("Budget provided")

    if lead.location and lead.location.strip():
        score += 20
        reasons.append("Preferred location provided")

    if lead.full_name and lead.email:
        score += 20
        reasons.append("Name and email provided")

    if score >= 75:
        priority = "hot"
    elif score >= 40:
        priority = "warm"
    else:
        priority = "cold"

    return {
        "score": min(score, 100),
        "priority": priority,
        "reasons": reasons,
    }
