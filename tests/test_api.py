
def create_sample_lead(client, name="Ali Khan", email="ali@example.com"):
    return client.post(
        "/leads",
        json={
            "full_name": name,
            "email": email,
            "phone": "03001234567",
            "budget": 20000000,
            "budget_currency": "PKR",
            "location": "Islamabad",
            "timeline": "immediately",
            "notes": "Interested in buying a property",
        },
    )


def test_create_lead_and_calculate_score(client):
    response = create_sample_lead(client)

    assert response.status_code == 201

    data = response.json()
    assert data["full_name"] == "Ali Khan"
    assert data["score"] == 100
    assert data["priority"] == "hot"


def test_search_leads(client):
    create_sample_lead(client, "Ali Khan", "ali@example.com")
    create_sample_lead(client, "Sara Ahmed", "sara@example.com")

    response = client.get("/leads", params={"q": "Ali"})

    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["full_name"] == "Ali Khan"


def test_filter_by_priority(client):
    create_sample_lead(client)

    response = client.get("/leads", params={"priority": "hot"})

    assert response.status_code == 200
    assert all(lead["priority"] == "hot" for lead in response.json())


def test_pagination(client):
    create_sample_lead(client, "Ali Khan", "ali@example.com")
    create_sample_lead(client, "Sara Ahmed", "sara@example.com")

    response = client.get("/leads", params={"limit": 1, "offset": 0})

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_invalid_priority_returns_400(client):
    response = client.get("/leads", params={"priority": "invalid"})

    assert response.status_code == 400


def test_updating_required_field_to_null_is_rejected(client):
    created = create_sample_lead(client)
    lead_id = created.json()["id"]

    response = client.patch(
        f"/leads/{lead_id}",
        json={"full_name": None},
    )

    assert response.status_code == 422


def test_missing_lead_returns_404(client):
    response = client.get("/leads/999999/score")

    assert response.status_code == 404


def test_follow_up_can_be_scheduled(client):
    created = create_sample_lead(client)
    lead_id = created.json()["id"]

    response = client.patch(
        f"/leads/{lead_id}/follow-up",
        json={
            "follow_up_at": "2026-10-20T10:00:00+05:00",
            "follow_up_status": "pending",
            "follow_up_note": "Call to discuss property options",
        },
    )

    assert response.status_code == 200
    assert response.json()["follow_up_status"] == "pending"
    assert response.json()["follow_up_note"] == (
        "Call to discuss property options"
    )



def test_follow_up_history_records_schedule_and_completion(client):
    created = create_sample_lead(client)
    lead_id = created.json()["id"]

    scheduled = client.patch(
        f"/leads/{lead_id}/follow-up",
        json={
            "follow_up_at": "2026-10-20T10:00:00+05:00",
            "follow_up_status": "pending",
            "follow_up_note": "Call the lead",
        },
    )
    assert scheduled.status_code == 200

    completed = client.patch(
        f"/leads/{lead_id}/follow-up",
        json={"follow_up_status": "completed"},
    )
    assert completed.status_code == 200

    history = client.get(f"/leads/{lead_id}/follow-up-history")
    assert history.status_code == 200
    actions = [event["action"] for event in history.json()]
    assert actions == ["completed", "scheduled"]


def test_cancelled_follow_up_is_removed_from_pending_queue(client):
    created = create_sample_lead(client)
    lead_id = created.json()["id"]
    client.patch(
        f"/leads/{lead_id}/follow-up",
        json={
            "follow_up_at": "2026-10-20T10:00:00+05:00",
            "follow_up_status": "pending",
        },
    )

    cancelled = client.patch(
        f"/leads/{lead_id}/follow-up",
        json={"follow_up_status": "cancelled"},
    )
    assert cancelled.status_code == 200
    queue = client.get("/follow-ups")
    assert queue.status_code == 200
    assert all(item["lead_id"] != lead_id for item in queue.json())
