"""
seed.py — Reset and create a known admin account for local development.

Run this any time you want guaranteed, known admin credentials instead of
guessing what password was used during a previous bootstrap/test run.

Usage:
    python seed.py
    python seed.py --email admin@classconnect.edu --password MyNewPassword123

This connects directly to MongoDB (bypassing the API), deletes any existing
user with the given email, and inserts a fresh admin account with the given
password — hashed the same way attendance/auth.py hashes it (raw bcrypt),
so it will work correctly with POST /auth/login afterwards.

Does NOT touch students, teachers, classes, or attendance records — only
the single admin user identified by --email.
"""

import argparse
import os
from datetime import datetime, timezone

import bcrypt
from pymongo import MongoClient

DB_NAME = "classconnect"
DEFAULT_EMAIL = "admin@classconnect.edu"
DEFAULT_PASSWORD = "admin123"


def hash_password(plain: str) -> str:
    """Must match attendance/auth.py's hash_password() exactly."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode("utf-8"), salt).decode("utf-8")


def main():
    parser = argparse.ArgumentParser(description="Seed/reset a known admin account.")
    parser.add_argument("--email", default=DEFAULT_EMAIL,
                         help=f"Admin email (default: {DEFAULT_EMAIL})")
    parser.add_argument("--password", default=DEFAULT_PASSWORD,
                         help=f"Admin password (default: {DEFAULT_PASSWORD})")
    parser.add_argument("--uri", default=os.getenv("MONGODB_URI", "mongodb://localhost:27017"),
                         help="MongoDB connection URI (default: from MONGODB_URI env or localhost)")
    args = parser.parse_args()

    print(f"Connecting to {args.uri} ...")
    client = MongoClient(args.uri)
    db = client[DB_NAME]

    normalized_email = args.email.strip().lower()

    # Remove any existing user with this email (admin or otherwise) so this
    # script is safely re-runnable without duplicate-key errors.
    existing = db.users.delete_one({"email": normalized_email})
    if existing.deleted_count:
        print(f"Removed existing user: {normalized_email}")

    user_doc = {
        "email": normalized_email,
        "passwordHash": hash_password(args.password),
        "role": "admin",
        "isTemporaryPassword": False,
        "isFirstLoginComplete": True,
        "createdAt": datetime.now(timezone.utc),
    }

    result = db.users.insert_one(user_doc)

    print()
    print("[+] Admin account ready:")
    print(f"   email:    {args.email}")
    print(f"   password: {args.password}")
    print(f"   _id:      {result.inserted_id}")
    print()
    print("Log in with these credentials at /login or via:")
    print(f'   curl -X POST http://localhost:8000/auth/login '
          f'-H "Content-Type: application/json" '
          f'-d "{{\\"email\\":\\"{args.email}\\",\\"password\\":\\"{args.password}\\"}}"')

    client.close()


if __name__ == "__main__":
    main()
