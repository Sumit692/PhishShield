"""
Automated ML regression tests for PhishShield.
Verifies generalization across legitimate search/developer/government sites,
reserved example domains, known phishing attacks, and malformed inputs.
Ensures zero hardcoding, separated confidence vs risk score, and accurate indicators.
"""
import pytest
from ml.predict import analyze_url
from app.security.url_validator import sanitize_and_validate_url, URLValidationError


LEGITIMATE_TEST_SITES = [
    ("https://www.google.com", "Google Search Portal"),
    ("https://gemini.google.com", "Google Gemini AI Home"),
    ("https://gemini.google.com/app", "Google Gemini AI Application"),
    ("https://github.com", "GitHub Developer Platform"),
    ("https://en.wikipedia.org/wiki/Computer_science", "Wikipedia Article"),
    ("https://developer.mozilla.org/en-US/docs/Web", "MDN Developer Documentation"),
    ("https://www.whitehouse.gov", "US Government Portal"),
    ("https://www.india.gov.in", "Indian National Portal"),
    ("https://www.mit.edu", "MIT Academic Portal"),
    ("https://example.com", "RFC 2606 Reserved Example Domain"),
    ("https://example.org", "RFC 2606 Reserved Example Domain"),
    ("https://test.example.net", "RFC 6761 Special-Use Domain"),
]

COMPLEX_LEGITIMATE_URLS = [
    "https://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-processing-an-unsorted-array",
    "https://docs.python.org/3/library/urllib.parse.html#urllib.parse.urlsplit",
    "https://aws.amazon.com/blogs/security/how-to-manage-identities-in-cloud-environments/",
]

PHISHING_ATTACK_URLS = [
    ("http://secure-login-paypal.com.account-update.xyz/login", "Brand Spoofing + Keywords"),
    ("https://chase.com.fraud-prevention-alert.co/verify-identity", "Subdomain Prepending"),
    ("http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run", "Raw IP + Non-Standard Port"),
    ("https://www.chase.com@secure-verify-banking.net/login.php", "@ Credential Embedding"),
    ("https://xn--pypal-4ve.com/account/login-verify", "Punycode Homograph"),
]


@pytest.mark.parametrize("url,label", LEGITIMATE_TEST_SITES)
def test_legitimate_sites_classified_as_low_risk(url, label):
    """Popular search, developer, government, and reserved domains must receive Low Risk (< 30)."""
    result = analyze_url(url)
    score = result["risk_score"]
    classification = result["classification"]
    risk_level = result["risk_level"]

    assert score <= 29, f"Failed for {label} ({url}): Score {score} exceeds Low Risk threshold of 29"
    assert classification == "Low Risk"
    assert risk_level == "low"

    # Must not contain severe threat indicators
    severe_threats = [i for i in result["indicators"] if i.get("severity") in ("high", "medium")]
    assert len(severe_threats) == 0, f"Unexpected severe threat indicators on legitimate site {url}: {severe_threats}"


@pytest.mark.parametrize("url", COMPLEX_LEGITIMATE_URLS)
def test_complex_legitimate_urls_not_flagged_as_high_risk(url):
    """Deep paths and query strings on authentic developer domains must not trigger false alarms."""
    result = analyze_url(url)
    assert result["risk_score"] <= 59, f"URL {url} exceeded Moderate Risk threshold: score {result['risk_score']}"
    assert result["classification"] in ("Low Risk", "Moderate Risk")
    assert result["risk_level"] != "high"


@pytest.mark.parametrize("url,attack_type", PHISHING_ATTACK_URLS)
def test_phishing_attacks_classified_as_high_risk(url, attack_type):
    """Actual phishing tactics must be accurately classified as High Risk (score >= 60)."""
    result = analyze_url(url)
    score = result["risk_score"]
    classification = result["classification"]
    risk_level = result["risk_level"]

    assert score >= 60, f"Failed for {attack_type} ({url}): Score {score} below High Risk threshold of 60"
    assert classification == "High Risk"
    assert risk_level == "high"

    # High risk explanations must reference real threats
    threat_indicators = [i for i in result["indicators"] if i.get("severity") in ("high", "medium")]
    assert len(threat_indicators) > 0, f"No threat indicators found for high-risk attack {url}"


def test_model_confidence_is_separated_from_risk_score():
    """Model confidence and application risk score must have distinct semantics."""
    legit_res = analyze_url("https://www.google.com")
    # For google.com, model is confident it is legitimate (> 65%), but risk score is low (< 25)
    assert legit_res["model_confidence"] >= 65.0
    assert legit_res["risk_score"] <= 25
    assert legit_res["risk_score"] != legit_res["model_confidence"]

    phish_res = analyze_url("http://secure-login-paypal.com.account-update.xyz/login")
    # Both are high for an obvious attack, but confidence represents statistical certainty
    assert phish_res["model_confidence"] > 50.0
    assert phish_res["risk_score"] >= 75
    assert "certainty" in phish_res["confidence_note"] or "confidence" in phish_res["confidence_note"]


def test_clean_explanations_when_no_indicators_found():
    """Clean URLs must not show generic phantom warning messages."""
    result = analyze_url("https://www.google.com")
    summary = result["summary"]
    # Should affirm clean structure rather than warning of credential harvesting
    assert "conforms to standard" in summary.lower() or "no deceptive" in summary.lower()
    assert "harvesting" not in summary.lower()


@pytest.mark.parametrize("bad_input", [
    "",
    "   ",
    "javascript:alert(1)",
    "file:///etc/passwd",
    "data:text/html,<script>alert(1)</script>",
    "http://example.com:99999",
    "https://example.com/test\nInjection:bad",
    "https://<bad-tag>.com",
])
def test_malformed_inputs_rejected_by_validator(bad_input):
    """Dangerous schemes, control characters, and out-of-range ports must be rejected."""
    with pytest.raises(URLValidationError):
        sanitize_and_validate_url(bad_input)
