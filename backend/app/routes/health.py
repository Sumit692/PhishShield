import os
from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__, url_prefix="/api/v1")


@health_bp.route("/health", methods=["GET"])
def health_check():
    """Safe public health check endpoint without exposing sensitive internal state."""
    model_artifact = os.path.join(
        os.path.dirname(__file__), "..", "..", "ml", "artifacts", "model.joblib"
    )
    is_model_present = os.path.exists(model_artifact)

    return jsonify({
        "status": "healthy",
        "service": "PhishShield API",
        "version": "1.0.0",
        "ml_engine_ready": is_model_present
    }), 200
