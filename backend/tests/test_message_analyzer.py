"""
Tests for message and email phishing analyzer.
"""
from app.security.message_analyzer import extract_urls_from_text, analyze_message_content


def test_extract_urls():
    text = "Visit https://chase.com.fake.co/login or www.paypal.com/test for info. Defanged: hxxps://evil.com/bad"
    urls = extract_urls_from_text(text)
    assert len(urls) >= 3
    assert any("fake.co" in u for u in urls)
    assert any("paypal.com" in u for u in urls)
    assert any("evil.com" in u for u in urls)


def test_analyze_smishing_message(client):
    res = client.post("/api/v1/analyze/message", json={
        "text": "ALERT: Your Chase Bank debit card has been temporarily locked due to 3 suspicious transactions. Verify your identity immediately at https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214 to prevent permanent closure.",
        "sender": "+1 (800) 555-0199"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["overall_risk_score"] >= 60
    assert data["overall_risk_level"] == "high"
    assert len(data["extracted_urls"]) == 1
    assert data["social_engineering"]["triggers_count"] >= 2


def test_analyze_sender_spoofing(client):
    res = client.post("/api/v1/analyze/message", json={
        "text": "Dear Netflix subscriber, your payment was declined. Update your billing method immediately to avoid account suspension.",
        "sender": "Netflix Support <billing@secure-customer-auth99.xyz>"
    })
    assert res.status_code == 200
    data = res.get_json()
    assert data["sender"]["mismatch_detected"] is True
    assert data["overall_risk_score"] >= 60


def test_get_sample_messages(client):
    res = client.get("/api/v1/analyze/message/samples")
    assert res.status_code == 200
    samples = res.get_json()["samples"]
    assert len(samples) >= 3
