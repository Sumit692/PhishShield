import os
from flask import Flask, jsonify, request, send_from_directory
from app.config import Config
from app.extensions import db, login_manager, cors
from app.security.headers import apply_security_headers
from app.routes import auth_bp, analyze_bp, history_bp, admin_bp, health_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    cors.init_app(
        app,
        origins=app.config.get("CORS_ORIGINS", ["http://localhost:5173", "http://127.0.0.1:5173"]),
        supports_credentials=True
    )

    # Register blueprints
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(analyze_bp)
    app.register_blueprint(history_bp)
    app.register_blueprint(admin_bp)

    # Locate frontend dist directory (for production single-service hosting)
    dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))

    if os.path.exists(dist_dir):
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path):
            if path and os.path.exists(os.path.join(dist_dir, path)):
                return send_from_directory(dist_dir, path)
            return send_from_directory(dist_dir, "index.html")

    # Register security headers
    app.after_request(apply_security_headers)

    # Standardized error handlers (prevents leaking stack traces / internals)
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({
            "error": "Bad Request",
            "message": getattr(e, "description", "The server could not understand the request.")
        }), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({
            "error": "Unauthorized",
            "message": "Authentication is required to access this resource."
        }), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({
            "error": "Forbidden",
            "message": "You do not have permission to access this resource."
        }), 403

    @app.errorhandler(404)
    def not_found(e):
        if not request.path.startswith("/api/"):
            if os.path.exists(dist_dir):
                return send_from_directory(dist_dir, "index.html")
        return jsonify({
            "error": "Not Found",
            "message": "The requested API resource was not found."
        }), 404

    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify({
            "error": "Too Many Requests",
            "message": "Rate limit exceeded. Please slow down and retry shortly."
        }), 429

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({
            "error": "Internal Server Error",
            "message": "An unexpected server error occurred. Please try again later."
        }), 500

    # Ensure tables exist without resetting data
    with app.app_context():
        db.create_all()

    return app
