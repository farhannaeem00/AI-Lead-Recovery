
from types import SimpleNamespace

from backend.scoring import score_lead


def make_lead(
    timeline=None,
    budget=None,
    location=None,
    full_name="Test User",
    email="test@example.com",
):
    return SimpleNamespace(
        timeline=timeline,
        budget=budget,
        location=location,
        full_name=full_name,
        email=email,
    )


def test_urgent_lead_gets_hot_priority():
    lead = make_lead(
        timeline="immediately",
        budget="PKR 20 million",
        location="Islamabad",
    )

    result = score_lead(lead)

    assert result["score"] == 100
    assert result["priority"] == "hot"


def test_missing_information_reduces_score():
    lead = make_lead()

    result = score_lead(lead)

    assert result["score"] == 20
    assert result["priority"] == "cold"


def test_three_month_timeline_is_scored():
    lead = make_lead(timeline="within 3 months")

    result = score_lead(lead)

    assert result["score"] == 45
    assert result["priority"] == "warm"


def test_score_never_exceeds_100():
    lead = make_lead(
        timeline="immediately",
        budget="High",
        location="Lahore",
    )

    result = score_lead(lead)

    assert 0 <= result["score"] <= 100


def test_scoring_returns_reasons():
    lead = make_lead(
        timeline="immediately",
        budget="PKR 10 million",
        location="Lahore",
    )

    result = score_lead(lead)

    assert isinstance(result["reasons"], list)
    assert len(result["reasons"]) > 0
