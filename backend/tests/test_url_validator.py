import pytest
from app.security.url_validator import sanitize_and_validate_url, URLValidationError


def test_valid_standard_urls():
    url, host = sanitize_and_validate_url("https://www.example.com/index.html?ref=1")
    assert url == "https://www.example.com/index.html?ref=1"
    assert host == "www.example.com"

    url2, host2 = sanitize_and_validate_url("http://sub.domain.org/path")
    assert url2 == "http://sub.domain.org/path"
    assert host2 == "sub.domain.org"


def test_auto_prepend_https():
    url, host = sanitize_and_validate_url("github.com/torvalds/linux")
    assert url.startswith("https://")
    assert host == "github.com"


def test_reject_dangerous_schemes():
    with pytest.raises(URLValidationError, match="Unsupported scheme"):
        sanitize_and_validate_url("javascript:alert(document.cookie)")

    with pytest.raises(URLValidationError, match="Unsupported scheme"):
        sanitize_and_validate_url("file:///etc/passwd")

    with pytest.raises(URLValidationError, match="Unsupported scheme"):
        sanitize_and_validate_url("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")

    with pytest.raises(URLValidationError, match="Unsupported scheme"):
        sanitize_and_validate_url("ftp://ftp.example.com/file.zip")


def test_reject_control_characters_and_newlines():
    with pytest.raises(URLValidationError, match="control characters"):
        sanitize_and_validate_url("https://example.com/\r\nSet-Cookie:admin=1")

    with pytest.raises(URLValidationError, match="control characters"):
        sanitize_and_validate_url("https://example.com/\x00malicious")


def test_reject_oversized_url():
    oversized = "https://example.com/" + "a" * 2050
    with pytest.raises(URLValidationError, match="exceeds maximum allowed length"):
        sanitize_and_validate_url(oversized)


def test_valid_ip_hosts():
    url, host = sanitize_and_validate_url("http://192.168.1.1:8080/admin")
    assert host == "192.168.1.1"
    assert "8080" in url


def test_invalid_ports():
    with pytest.raises(URLValidationError, match="Invalid port number"):
        sanitize_and_validate_url("http://example.com:99999/path")
