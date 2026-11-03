import json
from datetime import datetime, timezone
from app.extensions import db


class Analysis(db.Model):
    __tablename__ = "analyses"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    submitted_url = db.Column(db.String(2048), nullable=False)
    normalized_url = db.Column(db.String(2048), nullable=False, index=True)
    risk_score = db.Column(db.Integer, nullable=False, index=True)
    classification = db.Column(db.String(50), nullable=False, index=True)
    risk_level = db.Column(db.String(20), nullable=False)
    model_confidence = db.Column(db.Float, nullable=False)
    explanation_summary = db.Column(db.Text, nullable=False)
    recommendation = db.Column(db.Text, nullable=False)
    indicators_json = db.Column(db.Text, nullable=False, default="[]")
    features_json = db.Column(db.Text, nullable=False, default="{}")
    model_version = db.Column(db.String(50), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False, index=True)

    @property
    def indicators(self) -> list:
        try:
            return json.loads(self.indicators_json)
        except Exception:
            return []

    @indicators.setter
    def indicators(self, val: list):
        self.indicators_json = json.dumps(val)

    @property
    def features(self) -> dict:
        try:
            return json.loads(self.features_json)
        except Exception:
            return {}

    @features.setter
    def features(self, val: dict):
        self.features_json = json.dumps(val)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "submitted_url": self.submitted_url,
            "normalized_url": self.normalized_url,
            "risk_score": self.risk_score,
            "classification": self.classification,
            "risk_level": self.risk_level,
            "model_confidence": self.model_confidence,
            "summary": self.explanation_summary,
            "recommendation": self.recommendation,
            "indicators": self.indicators,
            "features": self.features,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }
