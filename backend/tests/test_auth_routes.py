def test_register_success(client):
    res = client.post("/api/v1/auth/register", json={
        "name": "David Tester",
        "email": "david@example.com",
        "password": "Password123",
        "confirm_password": "Password123"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert "user" in data
    assert data["user"]["email"] == "david@example.com"
    assert "password_hash" not in data["user"]


def test_register_duplicate_email(client):
    payload = {
        "name": "David Tester",
        "email": "duplicate@example.com",
        "password": "Password123",
        "confirm_password": "Password123"
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409


def test_register_password_validation(client):
    # Short password
    res1 = client.post("/api/v1/auth/register", json={
        "name": "Short",
        "email": "short@example.com",
        "password": "pass",
        "confirm_password": "pass"
    })
    assert res1.status_code == 400

    # No number
    res2 = client.post("/api/v1/auth/register", json={
        "name": "NoNum",
        "email": "nonum@example.com",
        "password": "PasswordOnly",
        "confirm_password": "PasswordOnly"
    })
    assert res2.status_code == 400

    # Mismatch
    res3 = client.post("/api/v1/auth/register", json={
        "name": "Mismatch",
        "email": "mismatch@example.com",
        "password": "Password123",
        "confirm_password": "Different123"
    })
    assert res3.status_code == 400


def test_login_and_logout(client):
    # Register first
    client.post("/api/v1/auth/register", json={
        "name": "Login User",
        "email": "loginuser@example.com",
        "password": "Password123",
        "confirm_password": "Password123"
    })

    # Logout
    logout_res = client.post("/api/v1/auth/logout")
    assert logout_res.status_code == 200

    # Check /me when logged out
    me_res = client.get("/api/v1/auth/me")
    assert me_res.status_code == 200
    assert me_res.get_json()["authenticated"] is False

    # Valid Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "loginuser@example.com",
        "password": "Password123"
    })
    assert login_res.status_code == 200
    assert login_res.get_json()["user"]["email"] == "loginuser@example.com"

    # Check /me when logged in
    me_res2 = client.get("/api/v1/auth/me")
    assert me_res2.get_json()["authenticated"] is True
    assert me_res2.get_json()["user"]["name"] == "Login User"


def test_login_invalid_credentials(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "WrongPassword1"
    })
    assert res.status_code == 401
