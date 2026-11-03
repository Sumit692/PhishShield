"""
Shared lexical feature extraction and indicator explanation engine for PhishShield.
Extracts lexical, structural, and character-entropy indicators from submitted URLs.
Used identically during ML model training and live web predictions.
"""
import re
import math
import ipaddress
from urllib.parse import urlparse

SUSPICIOUS_KEYWORDS = [
    "login", "verify", "verification", "update", "secure", "security",
    "banking", "account", "signin", "confirm", "password", "credential",
    "wallet", "authenticate", "auth", "support", "billing", "recover"
]

TARGET_BRANDS = [
    "paypal", "google", "microsoft", "apple", "amazon", "netflix",
    "chase", "wellsfargo", "bankofamerica", "facebook", "instagram",
    "whatsapp", "dropbox", "ebay", "adobe", "outlook", "icloud"
]

COMMON_TLDS = [
    ".com", ".net", ".org", ".info", ".biz", ".xyz", ".top", ".club",
    ".online", ".site", ".ru", ".cn", ".tk", ".ml", ".ga", ".cf", ".gq"
]

MULTI_PART_TLDS = {
    "co.uk", "gov.uk", "ac.uk", "org.uk", "gov.in", "nic.in", "ac.in",
    "co.in", "com.au", "gov.au", "edu.au", "com.br", "gov.br", "co.jp",
    "ne.jp", "com.cn", "gov.cn", "com.tr", "edu.tr", "gov.tr"
}

# Globally verified authoritative domains with established reputation and enterprise security
HIGH_AUTHORITY_DOMAINS = {
    # Search, Cloud, AI & Major Tech Platforms
    "google.com", "google.co.in", "google.co.uk", "google.com.au", "google.ca",
    "google.de", "google.fr", "googleapis.com", "googleusercontent.com", "gstatic.com",
    "youtube.com", "youtu.be", "gmail.com",
    "microsoft.com", "microsoftonline.com", "live.com", "office.com", "office365.com",
    "azure.com", "bing.com", "msn.com",
    "apple.com", "icloud.com",
    "amazon.com", "amazon.co.uk", "amazon.in", "amazon.de", "aws.amazon.com", "cloudfront.net",
    "github.com", "github.io", "gitlab.com", "bitbucket.org",
    "cloudflare.com", "mozilla.org", "firefox.com", "wikipedia.org", "wikimedia.org",
    "openai.com", "chatgpt.com", "anthropic.com", "claude.ai",
    # Developer Standards, Academic & Software Repositories
    "stackoverflow.com", "stackexchange.com", "python.org", "pypi.org", "npmjs.com",
    "docker.com", "kernel.org", "w3.org", "ietf.org", "apache.org", "golang.org",
    "rust-lang.org", "react.dev", "reactjs.org", "android.com",
    # Communications, Social & Enterprise Services
    "linkedin.com", "twitter.com", "x.com", "facebook.com", "instagram.com",
    "whatsapp.com", "telegram.org", "zoom.us", "slack.com", "discord.com",
    "reddit.com", "spotify.com", "netflix.com", "notion.so",
    # Authentic Financial Institutions & Payment Gateways
    "paypal.com", "stripe.com", "chase.com", "bankofamerica.com", "wellsfargo.com",
    "citi.com", "americanexpress.com", "capitalone.com", "mastercard.com", "visa.com"
}

AUTHORITY_TLD_SUFFIXES = (
    ".gov", ".mil", ".edu", ".gov.in", ".nic.in", ".gov.uk", ".ac.uk",
    ".edu.au", ".gov.au", ".gov.br", ".edu.tr", ".gov.tr"
)


def is_trusted_authority_domain(hostname: str) -> tuple[bool, str]:
    """
    Check if hostname belongs to an authentic high-authority registered domain or institutional TLD.
    Returns (is_trusted, matched_domain).
    """
    if not hostname or is_ip_host(hostname):
        return False, ""
    clean_host = re.sub(r"^www\.", "", hostname.lower().strip("[]"))
    reg_domain = get_registered_domain(clean_host)

    if reg_domain in HIGH_AUTHORITY_DOMAINS:
        return True, reg_domain

    for suffix in AUTHORITY_TLD_SUFFIXES:
        if clean_host.endswith(suffix) or reg_domain.endswith(suffix):
            return True, reg_domain

    return False, ""


def calculate_entropy(text: str) -> float:
    """Calculate Shannon entropy of a string in bits per character."""
    if not text:
        return 0.0
    prob_map = {}
    for char in text:
        prob_map[char] = prob_map.get(char, 0) + 1
    length = len(text)
    entropy = 0.0
    for count in prob_map.values():
        p = count / length
        entropy -= p * math.log2(p)
    return round(entropy, 4)


def is_ip_host(hostname: str) -> bool:
    """Check if hostname is a valid IPv4 or IPv6 address."""
    if not hostname:
        return False
    clean_host = hostname.strip("[]")
    try:
        ipaddress.ip_address(clean_host)
        return True
    except ValueError:
        return False


def get_registered_domain(hostname: str) -> str:
    """Extract registered domain (e.g., example.com, service.gov.in) ignoring www."""
    if not hostname or is_ip_host(hostname):
        return hostname or ""
    clean_host = re.sub(r"^www\.", "", hostname.lower().strip("[]"))
    parts = clean_host.split(".")
    if len(parts) <= 2:
        return clean_host
    if len(parts) >= 3 and ".".join(parts[-2:]) in MULTI_PART_TLDS:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def get_subdomains(hostname: str) -> list[str]:
    """Extract true subdomain parts from hostname, excluding www and registered domain."""
    if not hostname or is_ip_host(hostname):
        return []
    clean_host = re.sub(r"^www\.", "", hostname.lower().strip("[]"))
    reg_domain = get_registered_domain(clean_host)
    if not reg_domain or clean_host == reg_domain:
        return []
    if clean_host.endswith("." + reg_domain):
        prefix = clean_host[:-len(reg_domain) - 1]
        return [p for p in prefix.split(".") if p]
    return []


def parse_url_components(url: str):
    """Safely parse clean lexical body, hostname, path, and query."""
    clean_url = str(url).strip()
    lexical_body = re.sub(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", "", clean_url)
    parse_target = "http://" + lexical_body

    try:
        parsed = urlparse(parse_target)
    except Exception:
        try:
            parsed = urlparse(parse_target.replace("[", "").replace("]", ""))
        except Exception:
            from collections import namedtuple
            FallbackResult = namedtuple("FallbackResult", ["hostname", "path", "query", "netloc", "port", "scheme"])
            parsed = FallbackResult(hostname="", path=lexical_body, query="", netloc="", port=None, scheme="http")

    raw_host = (parsed.hostname or "").lower()
    clean_host = re.sub(r"^www\.", "", raw_host)
    path = parsed.path or ""
    query = parsed.query or ""
    try:
        port = parsed.port
    except ValueError:
        port = -1

    return clean_url, lexical_body, raw_host, clean_host, path, query, port


def extract_features(url: str) -> dict:
    """
    Extract a dictionary of numerical features suitable for machine-learning models.
    All features are strictly reproducible between training and live inference.
    """
    clean_url, lexical_body, raw_host, clean_host, path, query, port = parse_url_components(url)

    url_len = len(lexical_body)
    host_len = len(clean_host)
    path_len = len(path)
    query_len = len(query)

    num_dots_host = clean_host.count(".")
    num_dots_path = path.count(".")
    num_hyphens_host = clean_host.count("-")
    num_hyphens_path = path.count("-")
    num_digits_host = sum(c.isdigit() for c in clean_host)
    num_digits_path = sum(c.isdigit() for c in path)
    total_digits = sum(c.isdigit() for c in lexical_body)
    digit_ratio = round(total_digits / max(url_len, 1), 4)

    num_slashes = lexical_body.count("/")
    num_at_symbols = lexical_body.count("@")
    num_percent_signs = lexical_body.count("%")
    num_equal_signs = query.count("=")

    subdomains = get_subdomains(clean_host)
    num_subdomains = len(subdomains)

    ip_flag = 1 if is_ip_host(clean_host) else 0
    punycode_flag = 1 if ("xn--" in clean_host or any(ord(c) > 127 for c in lexical_body)) else 0

    has_non_standard_port = 0
    if port and port not in (80, 443):
        has_non_standard_port = 1

    lower_comb = (clean_host + path + "?" + query).lower()
    keyword_count = sum(1 for kw in SUSPICIOUS_KEYWORDS if kw in lower_comb)
    has_suspicious_keywords = 1 if keyword_count > 0 else 0

    registered_domain = get_registered_domain(clean_host)
    has_brand_in_subdomain = 0
    for brand in TARGET_BRANDS:
        if any(brand in sub for sub in subdomains) and brand not in registered_domain:
            has_brand_in_subdomain = 1
            break

    host_entropy = calculate_entropy(clean_host)
    url_entropy = calculate_entropy(lexical_body)
    tld_in_path = 1 if any(tld in path.lower() for tld in COMMON_TLDS) else 0
    has_double_slash_in_path = 1 if "//" in path else 0

    return {
        "url_length": url_len,
        "hostname_length": host_len,
        "path_length": path_len,
        "query_length": query_len,
        "num_dots": num_dots_host + num_dots_path,
        "num_dots_host": num_dots_host,
        "num_dots_path": num_dots_path,
        "num_hyphens": num_hyphens_host + num_hyphens_path,
        "num_hyphens_host": num_hyphens_host,
        "num_hyphens_path": num_hyphens_path,
        "num_digits": num_digits_host + num_digits_path,
        "num_digits_host": num_digits_host,
        "num_digits_path": num_digits_path,
        "digit_ratio": digit_ratio,
        "num_slashes": num_slashes,
        "num_subdomains": num_subdomains,
        "num_at_symbols": num_at_symbols,
        "num_percent_signs": num_percent_signs,
        "num_equal_signs": num_equal_signs,
        "is_ip_address": ip_flag,
        "has_punycode": punycode_flag,
        "is_https": 1 if clean_url.lower().startswith("https://") else 0,
        "has_non_standard_port": has_non_standard_port,
        "has_suspicious_keywords": has_suspicious_keywords,
        "keyword_count": keyword_count,
        "has_brand_in_subdomain": has_brand_in_subdomain,
        "entropy": url_entropy,
        "host_entropy": host_entropy,
        "url_entropy": url_entropy,
        "tld_in_path": tld_in_path,
        "has_double_slash_in_path": has_double_slash_in_path,
    }


def extract_indicators(url: str, features: dict | None = None) -> list[dict]:
    """
    Extract human-readable explanations and severity for indicators found.
    Reflects strictly real detected features and suppresses false warnings.
    """
    clean_url = str(url).strip()
    if features is None:
        features = extract_features(clean_url)

    indicators = []

    # High Severity Indicators
    if features.get("is_ip_address", 0) == 1:
        indicators.append({
            "id": "ip_host",
            "title": "Direct IP Address Host",
            "severity": "high",
            "description": "Host uses a raw numerical IP address instead of a registered domain name, commonly used to bypass domain reputation checks.",
            "value": "Detected"
        })

    if features.get("has_brand_in_subdomain", 0) == 1:
        indicators.append({
            "id": "brand_spoofing",
            "severity": "high",
            "title": "Target Brand Name in Subdomain",
            "description": "A well-known brand keyword was found in an untrusted subdomain prefix, suggesting brand impersonation.",
            "value": "Detected"
        })

    if features.get("num_at_symbols", 0) > 0:
        indicators.append({
            "id": "at_symbol",
            "severity": "high",
            "title": "Embedded User-Info (@) Symbol",
            "description": "The '@' character instructs browsers to treat preceding characters as credentials, disguising the true destination domain.",
            "value": f"{features['num_at_symbols']} occurrence(s)"
        })

    if features.get("has_punycode", 0) == 1:
        indicators.append({
            "id": "punycode",
            "severity": "high",
            "title": "Punycode or Non-ASCII Characters",
            "description": "URL contains internationalized encoding (IDN) or Cyrillic/homoglyph characters that visually imitate standard Latin letters.",
            "value": "Detected"
        })

    # Medium Severity Indicators
    if features.get("has_non_standard_port", 0) == 1:
        indicators.append({
            "id": "non_standard_port",
            "severity": "medium",
            "title": "Non-Standard Port",
            "description": "The URL specifies a custom communication port other than standard web ports (80 / 443).",
            "value": "Specified"
        })

    if features.get("num_subdomains", 0) >= 2:
        indicators.append({
            "id": "multiple_subdomains",
            "severity": "medium",
            "title": "Multiple Subdomains",
            "description": f"Domain contains {features['num_subdomains']} nested subdomains, frequently used in domain squatting and multi-tenant abuse.",
            "value": str(features['num_subdomains'])
        })

    if features.get("has_suspicious_keywords", 0) == 1:
        indicators.append({
            "id": "sensitive_keywords",
            "severity": "medium",
            "title": "Sensitive Action Keywords",
            "description": f"URL contains keywords frequently associated with phishing targets ({features.get('keyword_count', 0)} found, e.g. login, verify, banking).",
            "value": f"{features.get('keyword_count', 0)} keyword(s)"
        })

    if features.get("tld_in_path", 0) == 1:
        indicators.append({
            "id": "tld_in_path",
            "severity": "medium",
            "title": "Domain Suffix in Path",
            "description": "A top-level domain suffix (e.g. '.com') was found inside the path segment, often used to deceive users.",
            "value": "Detected"
        })

    if features.get("has_double_slash_in_path", 0) == 1:
        indicators.append({
            "id": "double_slash",
            "severity": "medium",
            "title": "Double Slashes in Path",
            "description": "Path contains consecutive slashes ('//') frequently used for open-redirect obfuscation.",
            "value": "Detected"
        })

    # Low Severity Indicators
    if features.get("num_hyphens_host", 0) >= 2:
        indicators.append({
            "id": "many_hyphens_host",
            "severity": "low",
            "title": "Multiple Hyphens in Hostname",
            "description": f"The domain name contains {features['num_hyphens_host']} hyphens, a technique frequently observed in deceptive domain registration.",
            "value": str(features['num_hyphens_host'])
        })

    if features.get("host_entropy", 0.0) >= 4.2:
        indicators.append({
            "id": "high_host_entropy",
            "severity": "low",
            "title": "Elevated Domain Entropy",
            "description": f"Domain character randomness ({features['host_entropy']} bits) indicates algorithmic token generation or DGA domain patterns.",
            "value": f"{features['host_entropy']} bits"
        })

    if features.get("url_length", 0) > 100:
        indicators.append({
            "id": "excessive_length",
            "severity": "low",
            "title": "Unusually Long URL",
            "description": f"The full URL length is {features['url_length']} characters, commonly seen in token padding and redirection chains.",
            "value": f"{features['url_length']} chars"
        })

    # Transport / Scheme Check (Informational or Warning)
    is_https = 1 if clean_url.lower().startswith("https://") else 0
    if is_https == 1:
        indicators.append({
            "id": "https_present",
            "severity": "info",
            "title": "HTTPS Encryption Present",
            "description": "TLS connection protocol detected. Note: HTTPS encrypts traffic but does not guarantee the destination is legitimate.",
            "value": "HTTPS"
        })
    elif clean_url.lower().startswith("http://"):
        indicators.append({
            "id": "unencrypted_http",
            "severity": "medium" if features.get("has_suspicious_keywords", 0) == 1 else "low",
            "title": "Unencrypted HTTP Scheme",
            "description": "Connection is not secured with TLS/HTTPS. All transmitted data is susceptible to eavesdropping and interception.",
            "value": "HTTP"
        })

    # Positive Clean Indicator if zero threat indicators were found
    threat_indicators = [i for i in indicators if i["severity"] in ("high", "medium", "low")]
    if not threat_indicators:
        indicators.insert(0, {
            "id": "clean_structure",
            "severity": "info",
            "title": "Clean Lexical Structure",
            "description": "No deceptive brand tokens, excessive subdomains, or obfuscated characters were found in the URL.",
            "value": "Standard"
        })

    # Verified High-Reputation Domain Indicator (if authentic authority and no severe spoofing)
    clean_host = parse_url_components(clean_url)[3]
    is_trusted, matched_domain = is_trusted_authority_domain(clean_host)
    has_severe_threat = (
        features.get("is_ip_address", 0) == 1
        or features.get("has_brand_in_subdomain", 0) == 1
        or features.get("num_at_symbols", 0) > 0
        or features.get("has_punycode", 0) == 1
        or features.get("has_non_standard_port", 0) == 1
    )
    if is_trusted and not has_severe_threat:
        indicators.insert(0, {
            "id": "verified_domain",
            "severity": "info",
            "title": "Verified High-Reputation Domain",
            "description": (
                f"The destination domain ({matched_domain}) is an authentic, globally recognized "
                "organization with verified enterprise infrastructure and security controls."
            ),
            "value": matched_domain
        })

    return indicators
