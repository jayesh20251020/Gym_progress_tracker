import re

from flask import Blueprint, request, jsonify, session
from flask_bcrypt import Bcrypt
from database import get_connection

auth = Blueprint("auth", __name__)
bcrypt = Bcrypt()
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def read_credentials():
    payload = request.get_json(silent=True)

    if not isinstance(payload, dict):
        return None, None

    email = payload.get("email", "")
    password = payload.get("password", "")

    if not isinstance(email, str) or not isinstance(password, str):
        return None, None

    return email.strip().lower(), password


@auth.route("/api/register", methods=["POST"])
def register():
    email, password = read_credentials()

    if not email or not password or not EMAIL_PATTERN.fullmatch(email):
        return jsonify({"error": "Email and password are required"}), 400

    if not 8 <= len(password) <= 72:
        return jsonify({"error": "Password must be 8 to 72 characters"}), 400

    password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO users (email, password_hash)
                VALUES (%s, %s)
                RETURNING id, email
                """,
                (email, password_hash)
            )

            user = cursor.fetchone()

        connection.commit()
        return jsonify({
            "message": "Account created successfully",
            "user": {
                "id": user[0],
                "email": user[1]
            }
        }), 201

    except Exception:
        if connection:
            connection.rollback()
        return jsonify({"error": "Email may already be registered"}), 409
    finally:
        if connection:
            connection.close()


@auth.route("/api/login", methods=["POST"])
def login():
    email, password = read_credentials()

    if not email or not password or not EMAIL_PATTERN.fullmatch(email):
        return jsonify({"error": "Email and password are required"}), 400

    if len(password) > 72:
        return jsonify({"error": "Invalid email or password"}), 401

    connection = get_connection()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, email, password_hash
            FROM users
            WHERE email = %s
            """,
            (email,)
        )

        user = cursor.fetchone()

    connection.close()

    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not bcrypt.check_password_hash(user[2], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Discard any pre-authentication state before creating this session.
    session.clear()
    session["user_id"] = user[0]
    session["user_email"] = user[1]
    session.permanent = True

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user[0],
            "email": user[1]
        }
    })


@auth.route("/api/me", methods=["GET"])
def me():
    user_id = session.get("user_id")

    if not user_id:
        return jsonify({"error": "Not logged in"}), 401

    connection = get_connection()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, email
            FROM users
            WHERE id = %s
            """,
            (user_id,)
        )

        user = cursor.fetchone()

    connection.close()

    if not user:
        session.clear()
        return jsonify({"error": "User not found"}), 401

    return jsonify({
        "user": {
            "id": user[0],
            "email": user[1]
        }
    })


@auth.route("/api/logout", methods=["POST"])
def logout():
    session.clear()

    return jsonify({
        "message": "Logged out successfully"
    })
