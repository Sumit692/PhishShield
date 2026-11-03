import re
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, current_user, login_required
from app.extensions import db
from app.models.user import User
from app.security.rate_limiter import rate_limit

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+(\.[a-zA-Z0-9\-]+)+$")


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter."
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number."
    return True, ""


@auth_bp.route("/register", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=60, key_prefix="register")
def register():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    confirm_password = data.get("confirm_password") or ""

    if not name or len(name) < 2 or len(name) > 100:
        return jsonify({"error": "Validation error", "message": "Name must be between 2 and 100 characters."}), 400

    if not email or not EMAIL_REGEX.match(email):
        return jsonify({"error": "Validation error", "message": "Please provide a valid email address."}), 400

    if password != confirm_password:
        return jsonify({"error": "Validation error", "message": "Passwords do not match."}), 400

    is_strong, msg = validate_password_strength(password)
    if not is_strong:
        return jsonify({"error": "Validation error", "message": msg}), 400

    # Duplicate check
    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({
            "error": "Conflict",
            "message": "An account with this email address already exists."
        }), 409

    # Determine role: first registered user or specific env admin can be admin
    role = "admin" if User.query.count() == 0 else "user"

    new_user = User(
        name=name,
        email=email,
        role=role
    )
    new_user.set_password(password)

    db.session.add(new_user)
    db.session.commit()

    # Session regeneration & login
    session.clear()
    login_user(new_user, remember=True)

    return jsonify({
        "message": "Account created successfully.",
        "user": new_user.to_dict()
    }), 201


@auth_bp.route("/login", methods=["POST"])
@rate_limit(max_requests=15, window_seconds=60, key_prefix="login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Validation error", "message": "Email and password are required."}), 400

    user = User.query.filter_by(email=email).first()

    # Mitigate timing attack & check credentials
    if not user or not user.check_password(password):
        return jsonify({
            "error": "Unauthorized",
            "message": "Invalid email or password."
        }), 401

    if not user.is_active:
        return jsonify({
            "error": "Forbidden",
            "message": "This account is inactive. Please contact support."
        }), 403

    session.clear()
    login_user(user, remember=True)

    return jsonify({
        "message": "Login successful.",
        "user": user.to_dict()
    }), 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    session.clear()
    return jsonify({"message": "Successfully logged out."}), 200


@auth_bp.route("/me", methods=["GET"])
def get_current_user():
    if current_user.is_authenticated:
        return jsonify({
            "authenticated": True,
            "user": current_user.to_dict()
        }), 200
    return jsonify({
        "authenticated": False,
        "user": None
    }), 200
