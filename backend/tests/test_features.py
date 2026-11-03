from ml.features import extract_features, extract_indicators, is_ip_host, calculate_entropy


def test_ip_host_detection():
    assert is_ip_host("192.168.1.1") is True
    assert is_ip_host("8.8.8.8") is True
    assert is_ip_host("example.com") is False
    assert is_ip_host("not.an.ip.address") is False


def test_feature_extraction_keys():
    features = extract_features("https://paypal.com.account-verify.info/login.php?user=urgent")
    expected_keys = [
        "url_length", "hostname_length", "path_length", "query_length",
        "num_dots", "num_hyphens", "num_subdomains", "is_ip_address",
        "has_punycode", "is_https", "has_suspicious_keywords", "has_brand_in_subdomain",
        "entropy"
    ]
    for key in expected_keys:
        assert key in features

    assert features["is_https"] == 1
    assert features["has_brand_in_subdomain"] == 1
    assert features["has_suspicious_keywords"] == 1


def test_entropy_calculation():
    # Uniform text has lower entropy than randomized characters
    low_entropy = calculate_entropy("aaaaaaaa")
    high_entropy = calculate_entropy("a8!kP$92zQ~_m0#x")
    assert high_entropy > low_entropy


def test_extract_indicators_structure():
    indicators = extract_indicators("http://192.168.1.100/paypal-update/login.php")
    assert len(indicators) > 0
    for ind in indicators:
        assert "id" in ind
        assert "title" in ind
        assert "severity" in ind
        assert "description" in ind
        assert ind["severity"] in ("high", "medium", "low", "info")
