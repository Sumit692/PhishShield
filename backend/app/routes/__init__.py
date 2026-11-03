from app.routes.auth import auth_bp
from app.routes.analyze import analyze_bp
from app.routes.history import history_bp
from app.routes.admin import admin_bp
from app.routes.health import health_bp

__all__ = ["auth_bp", "analyze_bp", "history_bp", "admin_bp", "health_bp"]
