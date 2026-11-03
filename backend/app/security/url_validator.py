"""
Safe URL parsing, validation, and sanitation for PhishShield.
Prevents SSRF, non-web schemes, control character injections, and malformed inputs.
"""
import re
import ipaddress
from urllib.parse import urlparse, urlunparse

MAX_URL_LENGTH = 2048
ALLOWED_SCHEMES = {"http", "https"}
DISALLOWED_SCHEMES = {
    "javascript", "file", "data", "vbscript", "ftp", "ftps", "gopher",
    "tel", "mailto", "ssh", "ldap", "dict", "sftp", "tftp", "blob"
}


class URLValidationError(ValueError):
    """Raised when submitted URL fails validation."""
    pass


def sanitize_and_validate_url(raw_input: str) -> tuple[str, str]:
    """
    Validate, sanitize, and normalize the candidate URL.
    Returns:
        tuple (validated_url, clean_hostname)
    Raises:
        URLValidationError on any invalid or dangerous inputs.
    """
    if not raw_input or not isinstance(raw_input, str):
        raise URLValidationError("Please enter a valid URL.")

    url_str = raw_input.strip()

    # Length check
    if len(url_str) < 3:
        raise URLValidationError("The provided URL is too short to be valid.")
    if len(url_str) > MAX_URL_LENGTH:
        raise URLValidationError(f"URL exceeds maximum allowed length of {MAX_URL_LENGTH} characters.")

    # Control character and whitespace rejection (prevention against injection / header splitting)
    if any(ord(c) < 32 or ord(c) == 127 for c in url_str):
        raise URLValidationError("URL contains invalid control characters or line breaks.")

    # Reject HTML tags, quotes, backticks (XSS prevention)
    if any(c in url_str for c in ("<", ">", '"', "'", "`")):
        raise URLValidationError("URL contains invalid characters (<, >, or quotes).")

    # Check for explicitly disallowed dangerous schemes (e.g., javascript:, file:, data:)
    lower_raw = url_str.lower()
    for scheme in DISALLOWED_SCHEMES:
        if lower_raw.startswith(f"{scheme}:") or f"{scheme}:" in lower_raw[:30]:
            raise URLValidationError(
                f"Unsupported scheme '{scheme}:'. Only HTTP and HTTPS web URLs are permitted."
            )

    # Prepend https:// if no scheme is specified (user convenience)
    if not (lower_raw.startswith("http://") or lower_raw.startswith("https://")):
        # If it looks like another scheme (e.g. scheme://)
        if re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*://", url_str):
            raise URLValidationError("Only 'http://' and 'https://' URLs are supported.")
        url_str = "https://" + url_str

    try:
        parsed = urlparse(url_str)
    except Exception as e:
        raise URLValidationError(f"Malformed URL structure: {str(e)}")

    scheme = (parsed.scheme or "").lower()
    if scheme not in ALLOWED_SCHEMES:
        raise URLValidationError(f"Scheme '{scheme}' is not permitted. Use HTTP or HTTPS.")

    netloc = parsed.netloc
    if not netloc:
        raise URLValidationError("URL is missing a valid destination hostname.")

    hostname = (parsed.hostname or "").lower()
    if not hostname:
        raise URLValidationError("Could not determine a valid hostname from the URL.")

    # Validate port if explicitly present
    try:
        port = parsed.port
        if port is not None and not (1 <= port <= 65535):
            raise URLValidationError(f"Invalid port number {port}. Ports must be between 1 and 65535.")
    except ValueError:
        raise URLValidationError("Invalid port number. Ports must be between 1 and 65535.")

    # Check if host is valid IP or valid domain name format
    is_ip = False
    try:
        ipaddress.ip_address(hostname.strip("[]"))
        is_ip = True
    except ValueError:
        pass

    if not is_ip:
        # Hostname structure checks: cannot contain spaces, must contain standard domain characters
        # IDN / punycode will be represented either as unicode or xn--
        if " " in hostname or "\\" in hostname:
            raise URLValidationError("Hostname contains illegal space or backslash characters.")
        
        # Must have at least a label
        labels = hostname.split(".")
        if any(len(label) == 0 for label in labels):
            raise URLValidationError("Hostname contains empty dot segments.")
        if any(len(label) > 63 for label in labels):
            raise URLValidationError("Domain label exceeds standard 63 character limit.")

    # Construct clean sanitized URL
    clean_url = urlunparse((
        scheme,
        netloc,
        parsed.path or "",
        parsed.params or "",
        parsed.query or "",
        ""  # strip client-side fragment for server-side analysis
    ))

    return clean_url, hostname
