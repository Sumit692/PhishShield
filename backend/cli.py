"""
Command-line interface for PhishShield.
Provides administrator bootstrapping, database initialization, and maintenance utilities.
"""
import sys
import click
from app import create_app
from app.extensions import db
from app.models.user import User
from app.routes.auth import validate_password_strength, EMAIL_REGEX
from ml.train import train_pipeline

app = create_app()


@app.cli.command("init-db")
def init_db():
    """Initialize database tables without wiping existing records."""
    with app.app_context():
        db.create_all()
        click.echo("Database initialized successfully.")


@app.cli.command("create-admin")
@click.option("--name", prompt=True, help="Full name of administrator")
@click.option("--email", prompt=True, help="Email address of administrator")
@click.option("--password", prompt=True, hide_input=True, confirmation_prompt=True, help="Secure password")
def create_admin(name, email, password):
    """Safely bootstrap an administrator account."""
    clean_name = name.strip()
    clean_email = email.strip().lower()

    if not clean_name or len(clean_name) < 2:
        click.echo("Error: Name must be at least 2 characters.", err=True)
        sys.exit(1)

    if not EMAIL_REGEX.match(clean_email):
        click.echo("Error: Invalid email format.", err=True)
        sys.exit(1)

    is_strong, msg = validate_password_strength(password)
    if not is_strong:
        click.echo(f"Error: {msg}", err=True)
        sys.exit(1)

    with app.app_context():
        existing = User.query.filter_by(email=clean_email).first()
        if existing:
            click.echo(f"Account with email '{clean_email}' already exists. Promoting to admin...")
            existing.role = "admin"
            existing.set_password(password)
            db.session.commit()
            click.echo(f"User '{clean_email}' updated and promoted to administrator.")
            return

        admin_user = User(
            name=clean_name,
            email=clean_email,
            role="admin"
        )
        admin_user.set_password(password)
        db.session.add(admin_user)
        db.session.commit()
        click.echo(f"Administrator account '{clean_email}' created successfully.")


@app.cli.command("list-users")
def list_users():
    """List registered user accounts (safe fields only)."""
    with app.app_context():
        users = User.query.all()
        if not users:
            click.echo("No users registered.")
            return
        click.echo(f"{'ID':<5} {'Role':<10} {'Name':<20} {'Email':<30}")
        click.echo("-" * 65)
        for u in users:
            click.echo(f"{u.id:<5} {u.role:<10} {u.name:<20} {u.email:<30}")


@app.cli.command("train-ml")
def train_ml():
    """Run model training and export artifacts."""
    click.echo("Starting ML training pipeline...")
    train_pipeline()
    click.echo("Training complete.")


if __name__ == "__main__":
    app.cli()
