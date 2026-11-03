"""
Inference and risk scoring engine for PhishShield.
Combines calibrated statistical ML predictions with structural deterministic indicators.
Separates statistical model confidence from the application's composite 0-100 risk score.
"""
import os
import json
import joblib
import pandas as pd
from urllib.parse import urlparse

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ml.features import extract_features, extract_indicators, parse_url_components, is_trusted_authority_domain


ARTIFACTS_DIR = os.path.join(os.path.dirname(__file__), "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "model.joblib")
FEATURES_PATH = os.path.join(ARTIFACTS_DIR, "features.json")
METRICS_PATH = os.path.join(ARTIFACTS_DIR, "metrics.json")

LOW_RISK_MAX = 29
MODERATE_RISK_MAX = 59

DISCLAIMER_TEXT = (
    "This automated assessment evaluates lexical and structural indicators of the submitted URL. "
    "It is an educational and analytical aid, not an absolute guarantee of safety. "
    "Never submit sensitive credentials to unverified websites."
)

_cached_model = None
_cached_features = None


def get_model():
    """Load and cache the trained ML model pipeline and feature schema."""
    global _cached_model, _cached_features
    if _cached_model is not None:
        return _cached_model, _cached_features

    if not os.path.exists(MODEL_PATH) or not os.path.exists(FEATURES_PATH):
        raise FileNotFoundError(
            f"Trained model artifact not found at {MODEL_PATH}. "
            "Please run 'python backend/ml/train.py' to generate artifacts."
        )

    _cached_model = joblib.load(MODEL_PATH)
    with open(FEATURES_PATH, "r", encoding="utf-8") as f:
        _cached_features = json.load(f)["features"]

    return _cached_model, _cached_features


def calculate_risk_score(
    p_malicious: float,
    features: dict,
    indicators: list[dict],
    is_trusted: bool = False,
    matched_domain: str = ""
) -> int:
    """
    Calculate composite 0-100 risk score.
    Keeps model confidence separate from threat score and incorporates structural heuristics.
    Never returns 0 (per 'never declare 100% safe' security invariant).
    """
    # 1. Base statistical score derived from calibrated P(malicious)
    if p_malicious <= 0.25:
        base_score = 5 + int(round(p_malicious * 40))   # Maps 0.0 -> 5, 0.25 -> 15
    elif p_malicious <= 0.50:
        base_score = 15 + int(round((p_malicious - 0.25) * 60)) # Maps 0.25 -> 15, 0.50 -> 30
    elif p_malicious <= 0.75:
        base_score = 30 + int(round((p_malicious - 0.50) * 100)) # Maps 0.50 -> 30, 0.75 -> 55
    else:
        base_score = 55 + int(round((p_malicious - 0.75) * 120)) # Maps 0.75 -> 55, 1.0 -> 85

    # 2. Critical deterministic red flag floors and adjustments
    floor_score = base_score

    if features.get("is_ip_address", 0) == 1:
        floor_score = max(floor_score, 78)

    if features.get("has_brand_in_subdomain", 0) == 1:
        floor_score = max(floor_score, 75)

    if features.get("num_at_symbols", 0) > 0:
        floor_score = max(floor_score, 72)

    if features.get("has_punycode", 0) == 1:
        floor_score = max(floor_score, 65)

    if features.get("has_non_standard_port", 0) == 1 and features.get("has_suspicious_keywords", 0) == 1:
        floor_score = max(floor_score, 68)
    elif features.get("has_non_standard_port", 0) == 1:
        floor_score = max(floor_score, 45)

    if features.get("tld_in_path", 0) == 1 and features.get("has_suspicious_keywords", 0) == 1:
        floor_score = max(floor_score, 62)

    has_severe_threat = (
        features.get("is_ip_address", 0) == 1
        or features.get("has_brand_in_subdomain", 0) == 1
        or features.get("num_at_symbols", 0) > 0
        or features.get("has_punycode", 0) == 1
        or features.get("has_non_standard_port", 0) == 1
    )

    # 3. Verified High-Reputation Domain Protection
    if is_trusted and not has_severe_threat:
        # Established global enterprise/academic/government domain
        if features.get("is_https", 1) == 1:
            floor_score = min(floor_score, 12)
        else:
            floor_score = min(floor_score, 18)

    # 4. Clean Low-Risk Mitigation (No high or medium severity threat indicators found)
    threat_indicators = [i for i in indicators if i.get("severity") in ("high", "medium")]
    if not threat_indicators:
        # URL has zero severe or medium threat indicators.
        # Prevent false-positive alarms caused by dataset path/slash artifacts.
        if features.get("is_https", 1) == 1:
            floor_score = min(floor_score, 22)
        else:
            floor_score = min(floor_score, 32)

    # Enforce minimum score of 5 (never 0 / 100% safe) and maximum 99
    final_score = max(5, min(99, floor_score))
    return int(final_score)


def determine_classification(score: int) -> tuple[str, str]:
    """Return category title and semantic slug."""
    if score <= LOW_RISK_MAX:
        return "Low Risk", "low"
    elif score <= MODERATE_RISK_MAX:
        return "Moderate Risk", "moderate"
    else:
        return "High Risk", "high"


def generate_explanation(
    risk_slug: str,
    indicators: list[dict],
    p_malicious: float,
    is_trusted: bool = False,
    matched_domain: str = ""
) -> tuple[str, str]:
    """Generate accurate explanations matching real extracted indicators and domain authority."""
    high_threats = [i["title"] for i in indicators if i.get("severity") == "high"]
    medium_threats = [i["title"] for i in indicators if i.get("severity") == "medium"]

    if is_trusted and not high_threats and not medium_threats:
        summary = (
            f"The URL belongs to the verified, high-reputation domain '{matched_domain}'. "
            "No deceptive brand spoofing, credential traps, or structural obfuscations were detected."
        )
        recommendation = (
            "This link connects to an authentic, recognized service with established infrastructure. "
            "Always confirm your browser displays a valid TLS lock icon."
        )
        return summary, recommendation

    if risk_slug == "high":
        if high_threats:
            summary = (
                f"Critical phishing characteristics detected: {', '.join(high_threats[:3])}. "
                "These structural traits strongly match deceptive credential-harvesting campaigns."
            )
        elif medium_threats:
            summary = (
                f"Multiple suspicious signals identified: {', '.join(medium_threats[:3])}. "
                "The lexical pattern presents an elevated phishing probability."
            )
        else:
            summary = (
                "The statistical model identified lexical patterns strongly correlated with "
                "malicious URL structures and credential-theft campaigns."
            )
        recommendation = (
            "Do not click this link, download attachments, or enter usernames or passwords. "
            "If received via an unexpected email, SMS, or message, treat with high suspicion."
        )

    elif risk_slug == "moderate":
        if medium_threats:
            summary = (
                f"The URL contains notable suspicious indicators: {', '.join(medium_threats[:2])}. "
                "While not definitively confirmed as malicious, caution is advised."
            )
        else:
            summary = (
                "The URL exhibits minor irregular lexical characteristics such as non-standard formatting "
                "or keyword density that warrant user caution."
            )
        recommendation = (
            "Exercise caution before proceeding. Inspect the destination domain carefully in the browser "
            "address bar and avoid providing sensitive credentials."
        )

    else:
        summary = (
            "The URL conforms to standard lexical conventions. No deceptive brand squatting, "
            "credential keywords, or structural obfuscation patterns were detected."
        )
        recommendation = (
            "While automated lexical analysis cannot guarantee complete safety, this link exhibits "
            "normal structure. Always verify that your browser displays a valid TLS certificate for the intended domain."
        )

    return summary, recommendation


def analyze_url(url: str) -> dict:
    """
    Perform complete ML-based analysis of a URL.
    Returns structured analysis payload conforming to PhishShield API schema.
    """
    clean_url = str(url).strip()
    features = extract_features(clean_url)
    indicators = extract_indicators(clean_url, features)

    # Check high-authority domain reputation status
    _, _, _, clean_host, _, _, _ = parse_url_components(clean_url)
    is_trusted, matched_domain = is_trusted_authority_domain(clean_host)

    has_severe_threat = (
        features.get("is_ip_address", 0) == 1
        or features.get("has_brand_in_subdomain", 0) == 1
        or features.get("num_at_symbols", 0) > 0
        or features.get("has_punycode", 0) == 1
        or features.get("has_non_standard_port", 0) == 1
    )

    threat_indicators = [i for i in indicators if i.get("severity") in ("high", "medium")]

    model, feature_names = get_model()

    # Align DataFrame with exact feature names and order
    feature_df = pd.DataFrame([features])[feature_names]

    probs = model.predict_proba(feature_df)[0]
    classes = list(model.classes_)

    if 1 in classes:
        malicious_idx = classes.index(1)
        raw_p_malicious = float(probs[malicious_idx])
    else:
        raw_p_malicious = float(probs[0])

    # Calibrate statistical probability based on domain reputation and real threat evidence
    if is_trusted and not has_severe_threat:
        p_malicious = min(raw_p_malicious, 0.04)
    elif not threat_indicators:
        # URL has completely clean syntax without a single threat indicator:
        # Cap statistical probability below decision boundary to prevent dataset path-length artifacts
        p_malicious = min(raw_p_malicious, 0.20)
    else:
        p_malicious = raw_p_malicious

    p_legitimate = 1.0 - p_malicious

    # Model confidence: statistical certainty in predicted class
    predicted_class = "malicious" if p_malicious >= 0.50 else "legitimate"
    model_confidence = round(max(p_legitimate, p_malicious) * 100, 1)

    score = calculate_risk_score(
        p_malicious,
        features,
        indicators,
        is_trusted=is_trusted,
        matched_domain=matched_domain
    )
    classification, risk_slug = determine_classification(score)
    summary, recommendation = generate_explanation(
        risk_slug,
        indicators,
        p_malicious,
        is_trusted=is_trusted,
        matched_domain=matched_domain
    )

    model_metadata = {}
    if os.path.exists(METRICS_PATH):
        try:
            with open(METRICS_PATH, "r", encoding="utf-8") as f:
                model_metadata = json.load(f)
        except Exception:
            pass

    confidence_note = (
        f"Statistical confidence of the model ({model_confidence}% certainty in {predicted_class} classification)."
    )

    return {
        "submitted_url": clean_url,
        "normalized_url": clean_url.lower(),
        "risk_score": score,
        "classification": classification,
        "risk_level": risk_slug,
        "model_confidence": model_confidence,
        "confidence_note": confidence_note,
        "summary": summary,
        "recommendation": recommendation,
        "indicators": indicators,
        "features": features,
        "model_version": model_metadata.get("model_version", "3.0.0-rf-malicious-urls"),
        "disclaimer": DISCLAIMER_TEXT
    }
