from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from app.extensions import db
from app.models.analysis import Analysis

history_bp = Blueprint("history", __name__, url_prefix="/api/v1/history")


@history_bp.route("", methods=["GET"])
@login_required
def list_history():
    """Retrieve paginated detection history isolated to the authenticated user."""
    search_query = (request.args.get("search") or "").strip()
    filter_cat = (request.args.get("filter") or "all").lower()
    sort_by = (request.args.get("sort") or "date_desc").lower()
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(50, max(1, request.args.get("per_page", 10, type=int)))

    # Strictly isolate query to current user
    query = Analysis.query.filter_by(user_id=current_user.id)

    # Search filter
    if search_query:
        query = query.filter(Analysis.submitted_url.ilike(f"%{search_query}%"))

    # Category filter
    if filter_cat in ("low", "moderate", "high"):
        query = query.filter(Analysis.risk_level == filter_cat)

    # Sorting
    if sort_by == "date_asc":
        query = query.order_by(Analysis.created_at.asc())
    elif sort_by == "score_desc":
        query = query.order_by(Analysis.risk_score.desc())
    elif sort_by == "score_asc":
        query = query.order_by(Analysis.risk_score.asc())
    else:  # default date_desc
        query = query.order_by(Analysis.created_at.desc())

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "items": [item.to_dict() for item in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": per_page
    }), 200


@history_bp.route("/<int:analysis_id>", methods=["GET"])
@login_required
def get_analysis_detail(analysis_id: int):
    """Retrieve full analysis details with strict ownership verification."""
    analysis = db.session.get(Analysis, analysis_id)
    if not analysis:
        return jsonify({
            "error": "Not Found",
            "message": "Analysis record not found."
        }), 404

    # Enforce strict IDOR ownership check
    if analysis.user_id != current_user.id and not current_user.is_admin:
        return jsonify({
            "error": "Forbidden",
            "message": "You do not have permission to view this analysis record."
        }), 403

    return jsonify(analysis.to_dict()), 200


@history_bp.route("/<int:analysis_id>", methods=["DELETE"])
@login_required
def delete_analysis(analysis_id: int):
    """Delete an analysis record with ownership check."""
    analysis = db.session.get(Analysis, analysis_id)
    if not analysis:
        return jsonify({
            "error": "Not Found",
            "message": "Analysis record not found."
        }), 404

    if analysis.user_id != current_user.id and not current_user.is_admin:
        return jsonify({
            "error": "Forbidden",
            "message": "You do not have permission to delete this analysis record."
        }), 403

    db.session.delete(analysis)
    db.session.commit()

    return jsonify({"message": "Record deleted successfully."}), 200
