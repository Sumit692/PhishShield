"""
HTTP Security headers configuration for PhishShield.
"""
from flask import Response


def apply_security_headers(response: Response) -> Response:
    """Apply defense-in-depth HTTP security response headers."""
    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"
    
    # Prevent MIME-type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Referrer policy
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # Restrict device APIs
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=(), payment=()"
    
    # Content Security Policy (allows local Vite frontend and self assets)
    csp_directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: https:",
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'"
    ]
    response.headers["Content-Security-Policy"] = "; ".join(csp_directives)
    
    return response
