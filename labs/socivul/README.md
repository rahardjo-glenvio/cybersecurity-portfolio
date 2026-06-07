# SOCIVUL — Vulnerable Social Media App for Web Pentesting Practice

SOCIVUL is an intentionally vulnerable social media web application designed for web application security training, penetration testing practice, and CTF-style challenges. It looks and behaves like a real Instagram-like platform.

> **WARNING: For educational use only. Do not deploy on a public internet-facing server without proper network isolation (firewalls, VPN, private lab environment). This application contains deliberate security flaws.**

---

## Features

- User registration and login
- Photo posts with captions and likes
- Comments on posts
- Follow / unfollow users
- Direct messaging between users
- User profile pages (view and edit)
- Search for users and posts
- Notifications for likes, comments, and follows
- Admin dashboard
- Password reset flow
- REST API endpoints

---

## Setup

### Option 1: Docker (Recommended)

```bash
git clone <repo-url>
cd socivul
docker-compose up --build
```

App will be available at `http://localhost:5000`

### Option 2: Manual

**Requirements:** Python 3.11+

```bash
cd socivul
pip install -r requirements.txt
python seed.py
python run.py
```

App will be available at `http://localhost:5000`

---

## Default Accounts

| Username | Password   | Role  |
|----------|------------|-------|
| alice    | alice123   | user  |
| bob      | bob123     | user  |
| charlie  | charlie123 | user  |
| diana    | diana123   | user  |
| admin    | admin123   | admin |

---

## Tech Stack

- **Backend:** Python 3.11 / Flask 2.3
- **Database:** SQLite (raw SQL)
- **Frontend:** Jinja2 templates, vanilla CSS, vanilla JS
- **Auth:** JWT cookies
- **Deploy:** Docker + Docker Compose

---

## Notes

- Uploaded files are stored in `app/static/uploads/`
- The database file is `socivul.db` in the project root
- Debug mode is enabled — stack traces are visible on errors
- This app is for **isolated lab use only**
