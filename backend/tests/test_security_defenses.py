def test_security_headers_present(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.headers.get("X-Frame-Options") == "DENY"
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert "Content-Security-Policy" in res.headers
    assert "default-src 'self'" in res.headers.get("Content-Security-Policy")


def test_health_check_no_secret_leaks(client):
    res = client.get("/api/v1/health")
    data = res.get_json()
    assert res.status_code == 200
    assert "secret" not in str(data).lower()
    assert "password" not in str(data).lower()
    assert "c:\\" not in str(data).lower()
    assert "/home" not in str(data).lower()


def test_xss_in_url_rejected_or_sanitized(client):
    res = client.post("/api/v1/analyze", json={
        "url": "<script>alert('xss')</script>"
    })
    # Must fail validation
    assert res.status_code == 400


def test_sql_injection_attempt_in_auth(client):
    res = client.post("/api/v1/auth/login", json={
        "email": "' OR '1'='1' --",
        "password": "' OR '1'='1' --"
    })
    # Should safely return 401 without SQL syntax error (500)
    assert res.status_code == 401


def test_rate_limiting_trigger(client):
    # Send rapid requests exceeding rate limit (max 30 requests/min for analyze)
    hit_limit = False
    for _ in range(35):
        res = client.post("/api/v1/analyze", json={"url": "https://example.com"})
        if res.status_code == 429:
            hit_limit = True
            assert "Rate limit exceeded" in res.get_json()["error"]
            break
    assert hit_limit is True
