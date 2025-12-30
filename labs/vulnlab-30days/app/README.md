# 🏦 SecureBank - Intentionally Vulnerable Banking Application

![Security](https://img.shields.io/badge/Security-Vulnerable-red)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![License](https://img.shields.io/badge/License-Educational-yellow)

> **⚠️ WARNING:** This application contains intentional security vulnerabilities for educational purposes. DO NOT deploy in production environments.

## 📋 Overview

SecureBank is a deliberately vulnerable web banking application developed as part of a 30-day cybersecurity learning project. The application demonstrates common OWASP Top 10 vulnerabilities in a realistic banking context, providing hands-on experience in vulnerability identification, exploitation, and remediation.

## 🎯 Project Goals

- Build intentionally vulnerable web application
- Document OWASP Top 10 vulnerabilities
- Create exploitation scripts and Proof of Concepts (PoCs)
- Implement proper security remediations
- Develop professional security documentation

## 🔓 Implemented Vulnerabilities

| Vulnerability | Severity | Status |
|---------------|----------|--------|
| SQL Injection | Critical | ✅ Implemented |
| Plain Text Passwords | Critical | ✅ Implemented |
| Broken Authentication | High | ✅ Implemented |
| IDOR | High | ✅ Implemented |
| CSRF | High | ✅ Implemented |
| Input Validation | High | ✅ Implemented |
| Weak Session Management | Medium | ✅ Implemented |
| Information Disclosure | Medium | ✅ Implemented |

## 🛠️ Technology Stack

- **Backend:** Flask 3.0.0 (Python)
- **Database:** SQLite 3
- **ORM:** SQLAlchemy 3.1.1
- **Frontend:** Bootstrap 5.3.0
- **Web Server:** Nginx 1.24.0
- **OS:** Ubuntu Server 22.04 LTS

## ✨ Features

- User authentication system
- Account dashboard with balance display
- Money transfer functionality
- Transaction history tracking
- Admin user management

## 📦 Installation

### Prerequisites

- Ubuntu Server 22.04+
- Python 3.10+
- Nginx
- SQLite3

### Quick Start
```bash
# Clone repository
git clone https://github.com/yourusername/cybersecurity-portfolio.git
cd cybersecurity-portfolio/labs/vulnlab-30days

# Install dependencies
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run application
cd app/vulnerable
python3 app.py
```

Access at: `http://localhost:5000`

### Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`

**Test Account:**
- Username: `test`
- Password: `test123`

## 🔍 Vulnerability Testing

See [docs/exploitation-guide.md](docs/exploitation-guide.md) for detailed exploitation steps.

### Quick SQL Injection Test
```bash
# Login bypass
Username: admin' OR '1'='1' --
Password: anything
```

### SQLMap Testing
```bash
sqlmap -u "http://localhost:5000/login" \
  --data="username=test&password=test" \
  --level=5 --risk=3 --batch --dump
```

## 🔒 Security Remediation

See [docs/remediation-guide.md](docs/remediation-guide.md) for secure implementation.

## 📚 Documentation

- [Setup Guide](docs/setup-guide.md)
- [Vulnerability Report](docs/vulnerability-report.md)
- [Exploitation Guide](docs/exploitation-guide.md)
- [Remediation Guide](docs/remediation-guide.md)

## 🎓 Learning Outcomes

- Web application security fundamentals
- OWASP Top 10 vulnerabilities
- Penetration testing methodologies
- Secure coding practices
- Professional security documentation

## ⚠️ Disclaimer

This application is created solely for educational purposes. It contains intentional security vulnerabilities and should NEVER be deployed in production environments or exposed to public networks. The author assumes no liability for misuse of this application.

## 👤 Author

**Glen Rahardjo**  
SMK Telkom Purwokerto  
Computer Network & Telecommunications Engineering

## 📄 License

Educational Use Only - Not for Production

## 🙏 Acknowledgments

Special thanks to Claude AI by Anthropic for guidance and mentorship throughout this learning journey.

---

**Part of:** [30 Days VulnLab Journey](../../README.md)  
**Project Date:** December 2024 - January 2025
