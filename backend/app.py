import os
import secrets
from datetime import timedelta
from pathlib import Path, PurePosixPath

from flask import Flask, abort, jsonify, request, send_from_directory
from flask_cors import CORS
from auth import auth, bcrypt
from data import data
from database import get_connection

app = Flask(__name__)

is_production = os.getenv("FLASK_ENV") == "production"
secret_key = os.getenv("SECRET_KEY")

if is_production and not secret_key:
    raise RuntimeError("SECRET_KEY must be set in production.")

# A random local-development key is safer than committing a reusable secret.
app.config.update(
    SECRET_KEY=secret_key or secrets.token_urlsafe(32),
    MAX_CONTENT_LENGTH=1 * 1024 * 1024,
    SESSION_COOKIE_NAME="ironlog_session",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=is_production,
    SESSION_COOKIE_SAMESITE="Lax",
    PERMANENT_SESSION_LIFETIME=timedelta(hours=8),
)

allowed_origins = {
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://127.0.0.1:5000,http://localhost:5000,http://127.0.0.1:5500,http://localhost:5500",
    ).split(",")
    if origin.strip()
}

CORS(
    app,
    origins=sorted(allowed_origins),
    supports_credentials=True,
    methods=["GET", "POST", "PUT", "OPTIONS"],
    allow_headers=["Content-Type"],
)

bcrypt.init_app(app)

app.register_blueprint(auth)
app.register_blueprint(data)

PROJECT_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_ROOT_FILES = {"index.html", "auth.html"}
PUBLIC_ASSET_DIRECTORIES = {"css", "js"}


def serve_public_file(filename):
    """Serve only the app's public HTML, CSS, and JavaScript files."""
    parts = PurePosixPath(filename).parts

    if not parts or ".." in parts or any(part.startswith(".") for part in parts):
        abort(404)

    is_root_file = filename in PUBLIC_ROOT_FILES
    is_public_asset = (
        len(parts) > 1
        and parts[0] in PUBLIC_ASSET_DIRECTORIES
        and Path(filename).suffix in {".css", ".js"}
    )

    if not (is_root_file or is_public_asset):
        abort(404)

    return send_from_directory(PROJECT_ROOT, filename)


@app.before_request
def reject_untrusted_write_origins():
    """Block browser-based cross-site writes for cookie-authenticated APIs."""
    if request.method not in {"POST", "PUT", "PATCH", "DELETE"}:
        return None

    origin = request.headers.get("Origin")
    request_origin = origin.rstrip("/") if origin else None
    same_origin = request.host_url.rstrip("/")

    if request_origin and request_origin not in allowed_origins | {same_origin}:
        return jsonify({"error": "Untrusted request origin"}), 403

    return None


@app.after_request
def add_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"

    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response


@app.route("/")
def home():
    return send_from_directory(PROJECT_ROOT, "index.html")


@app.route("/index.html")
def index_page():
    return serve_public_file("index.html")


@app.route("/auth.html")
def auth_page():
    return serve_public_file("auth.html")


@app.route("/css/<path:filename>")
def css_file(filename):
    return serve_public_file(f"css/{filename}")


@app.route("/js/<path:filename>")
def javascript_file(filename):
    return serve_public_file(f"js/{filename}")


@app.route("/api/health")
def health_check():
    try:
        connection = get_connection()
        connection.close()
        return jsonify({"status": "ok"})
    except Exception:
        return jsonify({"status": "database unavailable"}), 503


if __name__ == "__main__":
    app.run(debug=not is_production)
