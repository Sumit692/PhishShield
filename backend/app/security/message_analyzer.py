"""
Social engineering and message/email phishing detection engine for PhishShield.
Analyzes email text, SMS/smishing messages, extracts embedded hyperlinks,
detects urgency and coercion triggers, and checks sender-domain mismatches.
"""
import re
from typing import Dict, List, Any, Optional
from urllib.parse import urlparse
from ml.predict import analyze_url
from app.security.url_validator import sanitize_and_validate_url, URLValidationError


# Known high-value targeted brands and their authentic registered domains
KNOWN_BRANDS = {
    "netflix": ["netflix.com"],
    "paypal": ["paypal.com"],
    "microsoft": ["microsoft.com", "office.com", "live.com", "outlook.com"],
    "apple": ["apple.com", "icloud.com"],
    "google": ["google.com", "gmail.com"],
    "amazon": ["amazon.com", "amazon.co.uk", "amazon.in"],
    "chase": ["chase.com"],
    "bank of america": ["bankofamerica.com"],
    "wells fargo": ["wellsfargo.com"],
    "facebook": ["facebook.com", "meta.com"],
    "instagram": ["instagram.com"],
    "whatsapp": ["whatsapp.com"],
    "sbi": ["sbi.co.in", "onlinesbi.sbi"],
    "binance": ["binance.com"],
    "coinbase": ["coinbase.com"],
    "dhl": ["dhl.com"],
    "fedex": ["fedex.com"],
    "ups": ["ups.com"],
}

# Social engineering indicator patterns
URGENCY_PATTERNS = [
    (r"\b(immediately|immediate action required|urgent|urgently|within 24 hours?|within 12 hours?|within 48 hours?|hours? left)\b", "High Urgency Pressure", "high", "Imposes artificial, immediate deadlines to induce panic and prevent rational verification."),
    (r"\b(account (will be|has been) (suspended|locked|terminated|blocked|disabled|restricted))\b", "Account Suspension Threat", "high", "Threatens immediate disruption of account access to coerce prompt compliance."),
    (r"\b(unauthorized (access|transaction|login|charges?)|suspicious activity detected)\b", "Security Scare Lure", "high", "Falsely claims unauthorized security breaches or stolen funds to panic the victim."),
    (r"\b(final notice|last warning|legal action|arrest warrant|law enforcement|penalty fees?)\b", "Coercion / Legal Threat", "high", "Uses severe legal or penalty intimidation to bypass scrutiny."),
]

CREDENTIAL_FINANCIAL_PATTERNS = [
    (r"\b(verify your (identity|account|password|ssn|social security|credit card|card details|pin|passcode))\b", "Credential Harvesting Lure", "high", "Explicitly solicits private credentials, passwords, or identification numbers."),
    (r"\b(wire transfer|cryptocurrency|bitcoin|ethereum|gift cards?|prepaid voucher)\b", "Untraceable Payment Lure", "high", "Demands payments via irreversible or anonymous payment instruments."),
    (r"\b(refund of \$?[0-9,]+|claim (your )?(reward|prize|lottery|payout)|winner)\b", "Financial Enticement / Bait", "medium", "Lures target with unexpected financial windfalls or fake overdue refunds."),
    (r"\b(update (billing|payment) (method|information|details)|declined payment)\b", "Payment Method Trap", "high", "Prompts re-entry of sensitive credit card or banking information."),
]

CALL_TO_ACTION_PATTERNS = [
    (r"\b(click (here|the link below|this link)|tap here|follow (the )?link|open the attachment)\b", "Direct Link Pressure", "medium", "Pressures the recipient to click an unverified external link instead of navigating through official apps."),
    (r"\b(reset (password|credentials)|unlock your account now|restore access)\b", "Account Recovery Hook", "medium", "Exploits account recovery workflows to steal login tokens."),
]


def extract_urls_from_text(text: str) -> List[str]:
    """
    Extract all URLs from plain text, handling standard, defanged, and markdown links.
    """
    # Clean defanged URLs: hxxp:// -> http://, [.] -> .
    normalized_text = re.sub(r"\bhxxps?://", lambda m: "http" + m.group(0)[4:], text, flags=re.IGNORECASE)
    normalized_text = normalized_text.replace("[.]", ".").replace("(.)", ".")

    # Standard URL pattern matching http(s) and www URLs
    url_pattern = r"(?:https?://|www\.)[^\s<>'\"`()\[\]{}]+"
    raw_matches = re.findall(url_pattern, normalized_text, flags=re.IGNORECASE)

    extracted = []
    seen = set()

    for url in raw_matches:
        # Strip trailing punctuation often caught in sentences
        cleaned = re.sub(r"[.,;:!?)]+$", "", url)
        if not cleaned.startswith(("http://", "https://")):
            cleaned = "https://" + cleaned

        if cleaned.lower() not in seen:
            seen.add(cleaned.lower())
            extracted.append(cleaned)

    return extracted


def extract_sender_info(raw_sender: Optional[str]) -> Dict[str, Any]:
    """Extract display name, email, and root domain from sender string."""
    if not raw_sender or not raw_sender.strip():
        return {
            "raw": "",
            "display_name": "",
            "email": "",
            "domain": "",
            "is_valid": False
        }

    sender = raw_sender.strip()
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", sender)
    email = email_match.group(0).lower() if email_match else ""

    display_name = sender
    if "<" in sender and ">" in sender:
        display_name = sender.split("<")[0].strip().strip('"').strip("'")
    elif email:
        display_name = email.split("@")[0]

    domain = email.split("@")[1].lower() if "@" in email else ""

    return {
        "raw": sender,
        "display_name": display_name,
        "email": email,
        "domain": domain,
        "is_valid": bool(domain)
    }


def analyze_message_content(text: str, sender: Optional[str] = None) -> Dict[str, Any]:
    """
    Analyze message/email body for social engineering indicators,
    sender spoofing, and embedded URL threats.
    """
    if not text or not text.strip():
        raise ValueError("Message content cannot be empty.")

    clean_text = text.strip()
    sender_info = extract_sender_info(sender)

    triggers: List[Dict[str, Any]] = []
    social_score = 10  # Baseline low score

    # 1. Analyze Urgency & Coercion
    for pattern, name, severity, desc in URGENCY_PATTERNS:
        match = re.search(pattern, clean_text, flags=re.IGNORECASE)
        if match:
            triggers.append({
                "name": name,
                "severity": severity,
                "description": desc,
                "matched_text": match.group(0)
            })
            social_score += 25 if severity == "high" else 15

    # 2. Analyze Credential & Financial Lures
    for pattern, name, severity, desc in CREDENTIAL_FINANCIAL_PATTERNS:
        match = re.search(pattern, clean_text, flags=re.IGNORECASE)
        if match:
            triggers.append({
                "name": name,
                "severity": severity,
                "description": desc,
                "matched_text": match.group(0)
            })
            social_score += 25 if severity == "high" else 15

    # 3. Analyze Call to Action Pressure
    for pattern, name, severity, desc in CALL_TO_ACTION_PATTERNS:
        match = re.search(pattern, clean_text, flags=re.IGNORECASE)
        if match:
            triggers.append({
                "name": name,
                "severity": severity,
                "description": desc,
                "matched_text": match.group(0)
            })
            social_score += 15

    # 4. Detect Claimed Brand & Sender Domain Mismatch
    claimed_brands = []
    for brand, official_domains in KNOWN_BRANDS.items():
        if re.search(rf"\b{re.escape(brand)}\b", clean_text, flags=re.IGNORECASE) or \
           re.search(rf"\b{re.escape(brand)}\b", sender_info.get("display_name", ""), flags=re.IGNORECASE):
            claimed_brands.append((brand, official_domains))

    sender_mismatch = False
    sender_warning = ""

    if claimed_brands and sender_info["domain"]:
        for brand, official_domains in claimed_brands:
            domain_matched = any(
                sender_info["domain"] == off or sender_info["domain"].endswith("." + off)
                for off in official_domains
            )
            if not domain_matched:
                sender_mismatch = True
                sender_warning = f"Message references '{brand.title()}', but sender domain is '{sender_info['domain']}' instead of official {official_domains[0]}."
                triggers.append({
                    "name": "Sender Domain Mismatch (Brand Spoofing)",
                    "severity": "high",
                    "description": sender_warning,
                    "matched_text": sender_info["email"]
                })
                social_score += 40
                break

    # 5. Extract and analyze embedded URLs
    extracted_urls = extract_urls_from_text(clean_text)
    url_results = []
    max_url_score = 0

    for raw_url in extracted_urls[:6]:  # Limit to first 6 URLs for performance
        try:
            clean_url, _ = sanitize_and_validate_url(raw_url)
            analysis = analyze_url(clean_url)
            url_score = analysis.get("risk_score", 0)
            max_url_score = max(max_url_score, url_score)
            url_results.append({
                "url": raw_url,
                "risk_score": url_score,
                "risk_level": analysis.get("risk_level", "low"),
                "classification": analysis.get("classification", "Legitimate"),
                "indicators": analysis.get("indicators", [])[:3],
                "valid": True
            })
        except URLValidationError as e:
            url_results.append({
                "url": raw_url,
                "risk_score": 75,
                "risk_level": "high",
                "classification": "Suspicious",
                "indicators": [{"name": "Invalid or Prohibited Scheme", "severity": "high", "description": str(e)}],
                "valid": False
            })
            max_url_score = max(max_url_score, 75)
        except Exception:
            # Fallback for unexpected URL parsing
            continue

    # Cap social score between 5 and 95
    social_score = max(5, min(95, social_score))

    # Calculate Overall Composite Message Risk Score
    if url_results:
        # Heavily weigh the most dangerous link present in the message
        overall_score = max(social_score, max_url_score)
        if max_url_score >= 60 and social_score >= 50:
            overall_score = min(99, overall_score + 10)
    else:
        # Message has no links - relies solely on social engineering lures
        overall_score = social_score

    # Determine classification and risk tier
    if overall_score >= 60:
        risk_level = "high"
        classification = "Phishing / Smishing Attack"
        recommendation = "Do NOT click any links, open attachments, or reply with credentials. Immediately report and delete this message."
    elif overall_score >= 30:
        risk_level = "moderate"
        classification = "Suspicious Message"
        recommendation = "Exercise caution. Confirm this communication directly with the sender via an independent, verified channel (e.g. official mobile app)."
    else:
        risk_level = "low"
        classification = "Low Risk / Likely Benign"
        recommendation = "No prominent social engineering triggers or malicious links detected. Always maintain standard cybersecurity awareness."

    # Generate human-readable summary
    threat_count = len([t for t in triggers if t["severity"] == "high"])
    if risk_level == "high":
        summary = f"High-risk deception detected with {threat_count} severe social engineering red flags"
        if url_results and max_url_score >= 60:
            summary += " and dangerous phishing links."
        else:
            summary += "."
    elif risk_level == "moderate":
        summary = f"Elevated caution advised: detected {len(triggers)} suspicious phrasing or promotional lures."
    else:
        summary = "No immediate phishing indicators or deceptive link structures detected."

    return {
        "overall_risk_score": overall_score,
        "overall_risk_level": risk_level,
        "classification": classification,
        "summary": summary,
        "recommendation": recommendation,
        "social_engineering": {
            "score": social_score,
            "triggers_count": len(triggers),
            "urgency_level": "critical" if social_score >= 70 else ("moderate" if social_score >= 40 else "low"),
            "triggers": triggers,
        },
        "sender": {
            "raw": sender_info.get("raw", ""),
            "email": sender_info.get("email", ""),
            "domain": sender_info.get("domain", ""),
            "mismatch_detected": sender_mismatch,
            "warning": sender_warning,
        },
        "extracted_urls": url_results,
        "urls_count": len(extracted_urls),
        "message_preview": (clean_text[:280] + "...") if len(clean_text) > 280 else clean_text
    }
