import pytest
import os
import sys

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app
from app.config import Config
from app.extensions import db
from app.models.user import User
from app.models.analysis import Analysis
from app.security.rate_limiter import limiter


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False
    SECRET_KEY = "test-secret-key-do-not-use-in-production"


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    limiter.reset()
    return app.test_client()


@pytest.fixture
def auth_client(app, client):
    """Client authenticated as standard user."""
    with app.app_context():
        user = User(
            name="Alice Student",
            email="alice@example.com",
            role="user"
        )
        user.set_password("SecurePass123")
        db.session.add(user)
        db.session.commit()
        user_id = user.id

    # Log in
    client.post("/api/v1/auth/login", json={
        "email": "alice@example.com",
        "password": "SecurePass123"
    })
    return client, user_id


@pytest.fixture
def other_user(app):
    """Second user for IDOR and isolation tests."""
    with app.app_context():
        user = User(
            name="Bob Colleague",
            email="bob@example.com",
            role="user"
        )
        user.set_password("SecureBob456")
        db.session.add(user)
        db.session.commit()
        return user.id


@pytest.fixture
def admin_client(app, client):
    """Client authenticated as administrator."""
    with app.app_context():
        admin = User(
            name="Security Admin",
            email="admin@phishshield.local",
            role="admin"
        )
        admin.set_password("AdminSecure789")
        db.session.add(admin)
        db.session.commit()

    client.post("/api/v1/auth/login", json={
        "email": "admin@phishshield.local",
        "password": "AdminSecure789"
    })
    return client
