def test_unauthenticated_admin_access_rejected(client):
    res1 = client.get("/api/v1/admin/summary")
    # Login required returns 401
    assert res1.status_code in (401, 302)

    res2 = client.get("/api/v1/admin/analyses")
    assert res2.status_code in (401, 302)


def test_standard_user_admin_access_forbidden(auth_client):
    client, user_id = auth_client
    res = client.get("/api/v1/admin/summary")
    assert res.status_code == 403
    assert "Forbidden" in res.get_json()["error"]

    res2 = client.get("/api/v1/admin/analyses")
    assert res2.status_code == 403


def test_admin_authorized_summary(admin_client):
    res = admin_client.get("/api/v1/admin/summary")
    assert res.status_code == 200
    data = res.get_json()
    assert "aggregates" in data
    assert "system_health" in data
    assert "total_users" in data["aggregates"]
    assert "classification_breakdown" in data["aggregates"]
    assert data["aggregates"]["total_users"] >= 1


def test_admin_authorized_analyses_list(admin_client):
    res = admin_client.get("/api/v1/admin/analyses")
    assert res.status_code == 200
    data = res.get_json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
