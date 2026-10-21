
from unittest.mock import patch

from backend.models import Lead, User


def create_test_lead(client, email="lead@example.com"):
    """Create a lead owned by the currently authenticated test user."""
    response = client.post(
        "/leads",
        json={
            "full_name": "AI Test Lead",
            "email": email,
            "location": "Test Location",
            "timeline": "Within 30 days",
            "status": "new",
            "notes": "Interested in learning more about the service.",
        },
    )
    assert response.status_code in (200, 201), response.text
    return response.json()


def test_ai_follow_up_generation(client):
    lead = create_test_lead(client)

    with patch(
        "backend.main.generate_follow_up",
        return_value="Hello! I am following up on your interest.",
    ) as mock_ai:
        response = client.post(
            f"/leads/{lead['id']}/ai/follow-up"
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["lead_id"] == lead["id"]
    assert data["lead_name"] == "AI Test Lead"
    assert "following up" in data["draft"]
    mock_ai.assert_called_once()


def test_ai_lead_insights_generation(client):
    lead = create_test_lead(client)

    with (
        patch(
            "backend.main.score_lead",
            return_value={
                "score": 75,
                "priority": "hot",
                "reasons": ["Timeline within 30 days"],
            },
        ),
        patch(
            "backend.main.generate_lead_insights",
            return_value="### Recommended actions\n1. Confirm requirements.",
        ) as mock_ai,
    ):
        response = client.post(
            f"/leads/{lead['id']}/ai/insights"
        )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["lead_id"] == lead["id"]
    assert data["lead_name"] == "AI Test Lead"
    assert data["insights"].startswith("### Recommended actions")
    mock_ai.assert_called_once()


def test_other_user_cannot_generate_ai_follow_up(client):
    lead = create_test_lead(client)

    TestSessionLocal = client.test_session_local
    db = TestSessionLocal()
    try:
        other_user = User(
            email="other@example.com",
            hashed_password="not-used-for-login",
            is_active=True,
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        other_user_id = other_user.id
    finally:
        db.close()

    # Use the API with a token for the second user to verify ownership.
    from backend.auth import create_access_token

    other_token = create_access_token(other_user_id)
    headers = {"Authorization": f"Bearer {other_token}"}

    with patch("backend.main.generate_follow_up") as mock_ai:
        response = client.post(
            f"/leads/{lead['id']}/ai/follow-up",
            headers=headers,
        )

    assert response.status_code == 404
    mock_ai.assert_not_called()


def test_other_user_cannot_generate_ai_insights(client):
    lead = create_test_lead(client)

    from backend.auth import create_access_token

    TestSessionLocal = client.test_session_local
    db = TestSessionLocal()
    try:
        other_user = User(
            email="another@example.com",
            hashed_password="not-used-for-login",
            is_active=True,
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        other_user_id = other_user.id
    finally:
        db.close()

    other_token = create_access_token(other_user_id)

    with (
        patch("backend.main.score_lead") as mock_score,
        patch("backend.main.generate_lead_insights") as mock_ai,
    ):
        response = client.post(
            f"/leads/{lead['id']}/ai/insights",
            headers={"Authorization": f"Bearer {other_token}"},
        )

    assert response.status_code == 404
    mock_score.assert_not_called()
    mock_ai.assert_not_called()
