# SOCIVUL

**Intentionally Vulnerable Social Media Lab for Web Penetration Testing**

SOCIVUL is a deliberately vulnerable Instagram-like web application built for web application security training, penetration testing practice, and CTF-style challenges. It is designed to look and feel like a real social media platform so that students practice thinking like actual attackers, not just following guided tutorials.

> **WARNING:** For educational use only. Do not deploy on a public internet-facing server. This application contains deliberate security flaws by design. Use only in an isolated lab environment.

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Backend   | Python 3.11 / Flask 2.3           |
| Database  | SQLite (raw SQL, no ORM)          |
| Frontend  | Jinja2 / Vanilla CSS / Vanilla JS |
| Auth      | JWT (stored in cookies)           |
| Deploy    | Docker + Docker Compose           |

---

## Quick Start

**Requirements:** Docker and Docker Compose

```bash
git clone https://github.com/rahardjo-glenvio/cybersecurity-portfolio.git
cd cybersecurity-portfolio/labs/socivul
docker-compose up --build
```

Access the app at `http://localhost:5000`

To run without Docker:

```bash
pip install -r requirements.txt
python seed.py
python run.py
```

---

## Features

- User registration with rate limiting
- Photo and video posts with captions, likes, and comments
- Follow / unfollow system
- Direct messaging between users
- User profile pages with bio and post grid
- Search for users
- Notifications for likes, comments, and follows
- Admin dashboard
- Password reset flow
- REST API endpoints
- Realistic ghost accounts (cannot be logged into)

---

## Accounts

All pre-seeded accounts are **ghost accounts** and cannot be logged into directly. You must **register your own account** to explore the platform.

A fake email address is accepted during registration.

Finding valid credentials for privileged accounts is part of the challenge.

---

## Vulnerability Categories

The following vulnerability classes are present in this application. No further hints are provided.

- Cross-Site Scripting (XSS)
- SQL Injection
- Insecure Direct Object Reference (IDOR)
- Broken Access Control
- Sensitive Data Exposure
- Weak Cryptography
- Security Misconfiguration
- Improper Input Validation

---

## Intended Challenge Flow

This lab is designed to be approached like a real black-box penetration test:

1. Register an account and explore the platform as a normal user
2. Perform reconnaissance using standard tools and techniques
3. Identify and exploit vulnerabilities to escalate access
4. Reach the admin panel

No walkthrough is provided. That is intentional.

---

## Project Structure

```
socivul/
├── app/
│   ├── routes/         # Flask blueprints (auth, feed, profile, admin, api, dm)
│   ├── static/
│   │   ├── css/        # Stylesheet
│   │   ├── js/         # Client-side scripts
│   │   ├── uploads/    # Seeded images and videos
│   │   └── logs/       # Application logs
│   └── templates/      # Jinja2 HTML templates
├── sessions/           # Per-user session databases (runtime, not committed)
├── socivul_template.db # Template database used for lab resets
├── seed.py             # Initial data seeding script
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

---

## Lab Reset

Each visitor gets an isolated session database. To reset your session to a clean state, click the **Reset Lab** button in the top navigation bar.

---

## Disclaimer

This project was created solely for security education purposes. All vulnerabilities are intentional and documented for learning. The author does not condone unauthorized access to any system.
