from flask import Blueprint, request, jsonify
from flask_login import current_user
from app.extensions import db
from app.models.analysis import Analysis
from app.security.url_validator import sanitize_and_validate_url, URLValidationError
from app.security.rate_limiter import rate_limit
from ml.predict import analyze_url

analyze_bp = Blueprint("analyze", __name__, url_prefix="/api/v1")

SAMPLE_URLS = [
    {
        "id": "legit-edu",
        "label": "Legitimate University Portal",
        "category": "Legitimate",
        "url": "https://www.mit.edu/education/schools-and-departments",
        "description": "Standard university academic directory with proper HTTPS encryption and authentic domain structure."
    },
    {
        "id": "legit-dev",
        "label": "Legitimate Developer Docs",
        "category": "Legitimate",
        "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
        "description": "Established technical documentation portal with standard HTTPS and clean path structure."
    },
    {
        "id": "phish-ip",
        "label": "Phishing via Raw IP & Credential Path",
        "category": "Phishing",
        "url": "http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run",
        "description": "Raw IP address host with non-standard port and path designed to mimic PayPal's login processor."
    },
    {
        "id": "phish-subdomain",
        "label": "Subdomain Brand Impersonation",
        "category": "Phishing",
        "url": "https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214",
        "description": "Deceptive subdomain prepending 'chase.com' onto an untrusted root domain with urgent verification wording."
    },
    {
        "id": "phish-at-symbol",
        "label": "Credential Trick via '@' Symbol",
        "category": "Phishing",
        "url": "https://www.chase.com@secure-verify-banking.net/login.php",
        "description": "Uses '@' character to trick human readers into believing the link points to chase.com when the actual destination is secure-verify-banking.net."
    },
    {
        "id": "phish-punycode",
        "label": "Homograph / Punycode Deception",
        "category": "Phishing",
        "url": "https://xn--pypal-4ve.com/account/login-verify",
        "description": "Internationalized domain name (IDN) that visually imitates paypal.com using Cyrillic or accented characters."
    }
]


@analyze_bp.route("/analyze", methods=["POST"])
@rate_limit(max_requests=30, window_seconds=60, key_prefix="analyze")
def analyze():
    data = request.get_json(silent=True) or {}
    raw_url = data.get("url")

    if not raw_url:
        return jsonify({
            "error": "Bad Request",
            "message": "Please enter a URL to analyze."
        }), 400

    try:
        clean_url, hostname = sanitize_and_validate_url(raw_url)
    except URLValidationError as e:
        return jsonify({
            "error": "Validation Error",
            "message": str(e)
        }), 400

    try:
        result = analyze_url(clean_url)
    except Exception as e:
        return jsonify({
            "error": "Analysis Error",
            "message": "An error occurred while evaluating the URL. Please try again."
        }), 500

    saved = False
    analysis_id = None

    # Persist analysis if user is authenticated
    if current_user.is_authenticated:
        record = Analysis(
            user_id=current_user.id,
            submitted_url=result["submitted_url"],
            normalized_url=result["normalized_url"],
            risk_score=result["risk_score"],
            classification=result["classification"],
            risk_level=result["risk_level"],
            model_confidence=result["model_confidence"],
            explanation_summary=result["summary"],
            recommendation=result["recommendation"],
            model_version=result["model_version"]
        )
        record.indicators = result["indicators"]
        record.features = result["features"]

        db.session.add(record)
        db.session.commit()

        saved = True
        analysis_id = record.id

    result["saved"] = saved
    result["analysis_id"] = analysis_id
    if not saved:
        result["save_note"] = "Analysis performed in guest mode. Sign in or register to persist checks to your history."

    return jsonify(result), 200


@analyze_bp.route("/analyze/samples", methods=["GET"])
def get_sample_urls():
    """Return demonstration sample URLs for exhibition testing."""
    return jsonify({
        "samples": SAMPLE_URLS
    }), 200


SAMPLE_MESSAGES = [
    {
        "id": "smishing-bank",
        "label": "Bank Suspension SMS (Smishing)",
        "type": "SMS / Smishing",
        "sender": "+1 (800) 555-0199",
        "text": "ALERT: Your Chase Bank debit card has been temporarily locked due to 3 suspicious transactions. Verify your identity immediately at https://chase.com.fraud-prevention-alert.co/verify-identity?acc=98214 to prevent permanent closure.",
        "description": "Urgent SMS claiming debit card lock with a deceptive brand-subdomain phishing link."
    },
    {
        "id": "phish-mfa-email",
        "label": "Microsoft 365 Password Expiry Email",
        "type": "Email",
        "sender": "IT Support <admin@global-cloud-auth24.net>",
        "text": "Dear Employee,\n\nYour Microsoft 365 domain credentials will expire in 12 hours. All access to Outlook and corporate intranet will be terminated immediately unless you update your password now.\n\nPlease verify your credentials here: http://192.168.1.105:8080/paypal.com/webscr.php?cmd=_login-run\n\nSecurity Operations Team",
        "description": "Sender domain mismatch spear-phishing email impersonating Microsoft IT with an IP address credential trap."
    },
    {
        "id": "legit-github-email",
        "label": "Legitimate GitHub Security Alert",
        "type": "Email",
        "sender": "GitHub <notifications@github.com>",
        "text": "Hi developer,\n\nA new SSH key was added to your account. If you added this key, you can safely ignore this email.\n\nReview your public keys: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview\n\nThanks,\nThe GitHub Team",
        "description": "Authentic notification from verified github.com domain with zero social engineering pressure."
    }
]


@analyze_bp.route("/analyze/message", methods=["POST"])
@rate_limit(max_requests=25, window_seconds=60, key_prefix="analyze_message")
def analyze_message():
    """Inspect email or SMS text for social engineering, sender spoofing, and embedded phishing links."""
    data = request.get_json(silent=True) or {}
    text = data.get("text", "")
    sender = data.get("sender", "")

    if not text or not text.strip():
        return jsonify({
            "error": "Bad Request",
            "message": "Please enter email or SMS content to analyze."
        }), 400

    try:
        from app.security.message_analyzer import analyze_message_content
        result = analyze_message_content(text=text, sender=sender)
        return jsonify(result), 200
    except ValueError as e:
        return jsonify({
            "error": "Validation Error",
            "message": str(e)
        }), 400
    except Exception as e:
        return jsonify({
            "error": "Analysis Error",
            "message": "An error occurred while evaluating the message. Please try again."
        }), 500


@analyze_bp.route("/analyze/message/samples", methods=["GET"])
def get_sample_messages():
    """Return demonstration sample messages for exhibition testing."""
    return jsonify({
        "samples": SAMPLE_MESSAGES
    }), 200

