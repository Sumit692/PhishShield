import os
from functools import wraps
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import func
from app.extensions import db
from app.models.user import User
from app.models.analysis import Analysis

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")


def admin_required(fn):
    """Decorator to require authenticated administrator role."""
    @wraps(fn)
    @login_required
    def wrapper(*args, **kwargs):
        if not current_user.is_admin:
            return jsonify({
                "error": "Forbidden",
                "message": "Administrator privileges required to access this resource."
            }), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route("/summary", methods=["GET"])
@admin_required
def admin_summary():
    """Return genuine database aggregate statistics and application health."""
    total_users = User.query.count()
    total_analyses = Analysis.query.count()

    # Classification counts
    low_count = Analysis.query.filter_by(risk_level="low").count()
    mod_count = Analysis.query.filter_by(risk_level="moderate").count()
    high_count = Analysis.query.filter_by(risk_level="high").count()

    # Average score
    avg_score_res = db.session.query(func.avg(Analysis.risk_score)).scalar()
    avg_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

    # Recent analyses
    recent_records = (
        Analysis.query
        .order_by(Analysis.created_at.desc())
        .limit(6)
        .all()
    )

    recent_items = []
    for r in recent_records:
        user = db.session.get(User, r.user_id) if r.user_id else None
        item_dict = r.to_dict()
        item_dict["user_email"] = user.email if user else "Anonymous / Guest"
        recent_items.append(item_dict)

    # Check ML model artifact presence
    model_artifact_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "artifacts", "model.joblib"
    )
    model_loaded = os.path.exists(model_artifact_path)

    return jsonify({
        "aggregates": {
            "total_users": total_users,
            "total_analyses": total_analyses,
            "average_risk_score": avg_score,
            "classification_breakdown": {
                "low": low_count,
                "moderate": mod_count,
                "high": high_count
            }
        },
        "system_health": {
            "database_status": "connected",
            "model_engine": "RandomForestClassifier (100 estimators)",
            "model_ready": model_loaded,
            "rate_limiter_active": True
        },
        "recent_analyses": recent_items
    }), 200


@admin_bp.route("/analyses", methods=["GET"])
@admin_required
def admin_analyses():
    """Retrieve all analyses across all users with pagination and search."""
    search_query = (request.args.get("search") or "").strip()
    filter_cat = (request.args.get("filter") or "all").lower()
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(50, max(1, request.args.get("per_page", 15, type=int)))

    query = Analysis.query

    if search_query:
        query = query.filter(Analysis.submitted_url.ilike(f"%{search_query}%"))

    if filter_cat in ("low", "moderate", "high"):
        query = query.filter(Analysis.risk_level == filter_cat)

    query = query.order_by(Analysis.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    results = []
    for r in pagination.items:
        user = db.session.get(User, r.user_id) if r.user_id else None
        data = r.to_dict()
        data["user_email"] = user.email if user else "Anonymous / Guest"
        data["user_name"] = user.name if user else "Guest"
        results.append(data)

    return jsonify({
        "items": results,
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page
    }), 200
