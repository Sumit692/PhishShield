from app.extensions import db
from app.models.analysis import Analysis


def test_user_history_isolation_and_idor(app, auth_client, other_user):
    client, user_id = auth_client

    # Create record owned by Alice
    res1 = client.post("/api/v1/analyze", json={
        "url": "https://alice-private-check.com"
    })
    alice_record_id = res1.get_json()["analysis_id"]

    # Verify Alice sees her record in list
    history_res = client.get("/api/v1/history")
    assert history_res.status_code == 200
    items = history_res.get_json()["items"]
    assert any(item["id"] == alice_record_id for item in items)

    # Now create record owned by Bob (other_user)
    with app.app_context():
        bob_record = Analysis(
            user_id=other_user,
            submitted_url="https://bob-secret-site.org",
            normalized_url="https://bob-secret-site.org",
            risk_score=20,
            classification="Low Risk",
            risk_level="low",
            model_confidence=12.0,
            explanation_summary="Standard site",
            recommendation="Safe to proceed",
            model_version="1.0.0"
        )
        db.session.add(bob_record)
        db.session.commit()
        bob_record_id = bob_record.id

    # Alice lists history -> MUST NOT see Bob's record
    history_res2 = client.get("/api/v1/history")
    alice_items = history_res2.get_json()["items"]
    assert not any(item["id"] == bob_record_id for item in alice_items)

    # Alice tries direct IDOR access to Bob's record -> MUST BE 403 Forbidden
    idor_res = client.get(f"/api/v1/history/{bob_record_id}")
    assert idor_res.status_code == 403

    # Alice tries to DELETE Bob's record -> MUST BE 403 Forbidden
    delete_res = client.delete(f"/api/v1/history/{bob_record_id}")
    assert delete_res.status_code == 403


def test_history_search_and_filter(auth_client):
    client, user_id = auth_client

    client.post("/api/v1/analyze", json={"url": "https://search-target-alpha.com"})
    client.post("/api/v1/analyze", json={"url": "http://192.168.1.1/phish-beta"})

    # Search for alpha
    res_search = client.get("/api/v1/history?search=alpha")
    assert res_search.status_code == 200
    items = res_search.get_json()["items"]
    assert len(items) == 1
    assert "alpha" in items[0]["submitted_url"]

    # Filter for high risk
    res_filter = client.get("/api/v1/history?filter=high")
    assert res_filter.status_code == 200
    high_items = res_filter.get_json()["items"]
    for it in high_items:
        assert it["risk_level"] == "high"
