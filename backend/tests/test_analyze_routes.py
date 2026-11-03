def test_analyze_anonymous(client):
    res = client.post("/api/v1/analyze", json={
        "url": "https://www.google.com/search?q=test"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["saved"] is False
    assert data["analysis_id"] is None
    assert "risk_score" in data
    assert "classification" in data
    assert "indicators" in data


def test_analyze_authenticated_persists(auth_client):
    client, user_id = auth_client
    res = client.post("/api/v1/analyze", json={
        "url": "http://192.168.1.50/chase-verify"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["saved"] is True
    assert data["analysis_id"] is not None


def test_analyze_invalid_url_rejected(client):
    res = client.post("/api/v1/analyze", json={
        "url": "javascript:stealCookie()"
    })
    assert res.status_code == 400
    assert "error" in res.get_json()


def test_get_sample_urls(client):
    res = client.get("/api/v1/analyze/samples")
    assert res.status_code == 200
    samples = res.get_json()["samples"]
    assert len(samples) >= 3
    for s in samples:
        assert "url" in s
        assert "label" in s
        assert "description" in s
