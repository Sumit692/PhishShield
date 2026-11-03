from ml.predict import analyze_url, calculate_risk_score, determine_classification


def test_analyze_url_benign():
    result = analyze_url("https://www.google.com/search?q=test")
    assert 0 <= result["risk_score"] <= 100
    assert result["classification"] in ("Low Risk", "Moderate Risk", "High Risk")
    assert result["risk_level"] in ("low", "moderate", "high")
    assert isinstance(result["indicators"], list)
    assert "disclaimer" in result
    assert "summary" in result
    assert "recommendation" in result
    assert result["risk_score"] < 40


def test_analyze_url_high_risk_ip():
    result = analyze_url("http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login")
    assert result["risk_score"] >= 60
    assert result["classification"] == "High Risk"
    assert result["risk_level"] == "high"
    assert any(ind["id"] == "ip_host" for ind in result["indicators"])


def test_score_and_classification_bounds():
    low_title, low_slug = determine_classification(15)
    assert low_title == "Low Risk" and low_slug == "low"

    mod_title, mod_slug = determine_classification(45)
    assert mod_title == "Moderate Risk" and mod_slug == "moderate"

    high_title, high_slug = determine_classification(85)
    assert high_title == "High Risk" and high_slug == "high"
