"""
In-memory sliding window rate limiter for PhishShield API endpoints.
Provides protection against brute-force login and rapid analysis spamming.
"""
import time
from functools import wraps
from flask import request, jsonify


class InMemoryRateLimiter:
    def __init__(self):
        # Maps key -> list of timestamps
        self.records: dict[str, list[float]] = {}

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        
        # Prune old timestamps
        timestamps = [t for t in self.records.get(key, []) if t > cutoff]
        
        if len(timestamps) >= max_requests:
            retry_after = int(timestamps[0] + window_seconds - now) + 1
            self.records[key] = timestamps
            return False, max(1, retry_after)
            
        timestamps.append(now)
        self.records[key] = timestamps
        return True, 0

    def reset(self):
        self.records.clear()


limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int = 30, window_seconds: int = 60, key_prefix: str = ""):
    """Decorator to limit requests by client IP address."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            # Resolve client IP
            client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
            bucket_key = f"{key_prefix}:{client_ip}"
            
            allowed, retry_after = limiter.is_allowed(bucket_key, max_requests, window_seconds)
            if not allowed:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please wait {retry_after} seconds before trying again.",
                    "retry_after": retry_after
                }), 429
                
            return fn(*args, **kwargs)
        return wrapper
    return decorator
