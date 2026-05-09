"""Initialize the database schema.

Usage:
    python -m scripts.init_db
"""
from app.db import init_db

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
