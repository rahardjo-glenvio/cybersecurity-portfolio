import sqlite3
import os
import shutil
from app.config import Config

def get_db():
    session_id = _get_session_id()

    if session_id:
        os.makedirs(Config.SESSIONS_DIR, exist_ok=True)
        db_path = os.path.join(Config.SESSIONS_DIR, f'{session_id}.db')
        if not os.path.exists(db_path):
            if os.path.exists(Config.TEMPLATE_DB):
                shutil.copy2(Config.TEMPLATE_DB, db_path)
            else:
                _create_schema(db_path)
    else:
        db_path = Config.TEMPLATE_DB

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    return conn

def _get_session_id():
    try:
        from flask import request
        return request.cookies.get('lab_session')
    except RuntimeError:
        return None

def _create_schema(db_path):
    conn = sqlite3.connect(db_path)
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            bio TEXT DEFAULT '',
            website TEXT DEFAULT '',
            profile_pic TEXT DEFAULT 'default.jpg',
            role TEXT DEFAULT 'user',
            is_private INTEGER DEFAULT 0,
            reset_token TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            image_path TEXT NOT NULL,
            caption TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS likes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS follows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            follower_id INTEGER NOT NULL,
            following_id INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()

def init_db():
    if not os.path.exists(Config.TEMPLATE_DB):
        _create_schema(Config.TEMPLATE_DB)

def reset_session(session_id):
    db_path = os.path.join(Config.SESSIONS_DIR, f'{session_id}.db')
    if os.path.exists(db_path):
        os.remove(db_path)
    if os.path.exists(Config.TEMPLATE_DB):
        shutil.copy2(Config.TEMPLATE_DB, db_path)

def query_db(query, args=(), one=False):
    conn = get_db()
    cur = conn.execute(query, args)
    rv = cur.fetchall()
    conn.commit()
    conn.close()
    return (rv[0] if rv else None) if one else rv

def execute_db(query, args=()):
    conn = get_db()
    cur = conn.execute(query, args)
    conn.commit()
    last_id = cur.lastrowid
    conn.close()
    return last_id
