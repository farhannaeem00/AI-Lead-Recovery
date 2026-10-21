
def register_user(client, email, password="AnotherPassword123!"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )


def login_user(client, email, password):
    return client.post(
        "/auth/login",
        data={"username": email, "password": password},
    )


def test_protected_endpoint_rejects_missing_token(client):
    client.headers.pop("Authorization", None)

    response = client.get("/leads")

    assert response.status_code == 401


def test_register_and_login(client):
    response = register_user(client, "newuser@example.com")
    assert response.status_code == 201
    assert "hashed_password" not in response.json()

    login_response = login_user(
        client,
        "newuser@example.com",
        "AnotherPassword123!",
    )
    assert login_response.status_code == 200
    assert login_response.json()["token_type"] == "bearer"
    assert login_response.json()["access_token"]


def test_duplicate_registration_is_rejected(client):
    first = register_user(client, "duplicate@example.com")
    second = register_user(client, "duplicate@example.com")

    assert first.status_code == 201
    assert second.status_code == 409


def test_user_cannot_access_another_users_lead(client):
    # Create a lead owned by the fixture's first user.
    first_lead = client.post(
        "/leads",
        json={
            "full_name": "First User Lead",
            "email": "lead1@example.com",
        },
    )
    assert first_lead.status_code == 201
    first_lead_id = first_lead.json()["id"]

    # Register and log in a second user.
    registration = register_user(client, "seconduser@example.com")
    assert registration.status_code == 201

    login_response = login_user(
        client,
        "seconduser@example.com",
        "AnotherPassword123!",
    )
    assert login_response.status_code == 200

    second_token = login_response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {second_token}"

    # The second user cannot read or modify the first user's lead.
    response = client.get(f"/leads/{first_lead_id}/score")
    assert response.status_code == 404

    response = client.patch(
        f"/leads/{first_lead_id}",
        json={"full_name": "Unauthorized Change"},
    )
    assert response.status_code == 404

    response = client.delete(f"/leads/{first_lead_id}")
    assert response.status_code == 404

    # The second user must not see the first user's lead in the list.
    response = client.get("/leads")
    assert response.status_code == 200
    assert all(
        lead["id"] != first_lead_id
        for lead in response.json()
    )
