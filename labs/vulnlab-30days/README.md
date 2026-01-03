# SecureBank VulnLab

![Security](https://img.shields.io/badge/Security-Vulnerable-critical)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![Status](https://img.shields.io/badge/Status-Day%204%2F30-yellow)

Intentionally vulnerable banking application for penetration testing education. Part of a 30-day cybersecurity learning project.

## Warning

This application contains critical security flaws. For educational use only. Never deploy to production or expose to public networks.

---

## Overview

SecureBank simulates a realistic online banking platform with complete functionality and 10+ intentional OWASP Top 10 vulnerabilities for security training.

**Features:**
- User authentication and registration
- Money transfers between accounts
- Transaction history tracking
- Support ticket system
- Profile management

**Tech Stack:** Python Flask | SQLite | Bootstrap 5 | Nginx | Ubuntu Linux

---

## Vulnerabilities

| Vulnerability | Severity | Status |
|---------------|----------|--------|
| SQL Injection | Critical | Documented |
| Plain Text Passwords | Critical | Pending |
| Broken Authentication | Critical | Pending |
| IDOR | High | Pending |
| CSRF | High | Pending |
| XSS | High | Pending |
| Input Validation | High | Pending |
| Information Disclosure | Medium | Pending |
| Debug Mode | Medium | Pending |
| No Rate Limiting | Medium | Pending |

---

## Quick Start
```bash
# Clone repository
git clone https://github.com/rahardjo-glenvio/cybersecurity-portfolio.git
cd cybersecurity-portfolio/labs/vulnlab-30days/app

# Install dependencies
pip install flask flask-sqlalchemy

# Run application
python3 app.py
```

Access at `http://localhost:5000`

**Default Credentials:**
- Admin: `admin` / `admin123`
- Test: `test` / `test123`

---

## Testing Examples

**SQL Injection (Authentication Bypass):**
```
Username: admin' OR '1'='1' --
Password: anything
```

**IDOR (Unauthorized Access):**
```
/ticket/1  →  /ticket/2  (view others' tickets)
```

**XSS (Stored):**
```
Support ticket message: <script>alert('XSS')</script>
```

**Negative Balance Exploit:**
```
Transfer amount: -50000  (increases balance)
```

---

## Documentation

- **Exploits Directory:** Detailed vulnerability reports and exploitation guides
- **Config Directory:** Server configuration files

---

## Learning Outcomes

**Technical:** Full-stack development, Flask, SQLAlchemy, Linux administration, Nginx  
**Security:** OWASP Top 10, penetration testing, vulnerability assessment, secure coding  
**Professional:** Documentation, version control, project management

---

## Project Timeline

**Dec 31, 2025 - Jan 2, 2026:** Application development and UI refinement (Complete)  
**Jan 3 - Jan 15, 2026:** Vulnerability exploitation and documentation (In Progress - 1/10 complete)  
**Jan 16 - Jan 25, 2026:** Comprehensive security reports and testing  
**Jan 26 - Jan 30, 2026:** Remediation and final verification

---

## Disclaimer

Educational use only. Intentional vulnerabilities for authorized security training. Never test on systems without permission. Author assumes no liability for misuse.

---

## Credits

**Author:** Glenvio Regalito Rahardjo  
**Institution:** SMK Telkom Purwokerto - Cybersecurity Specialization  
**Guidance:** Developed with Claude AI (Anthropic) technical mentorship

---

**Last Updated:** January 3, 2026 | Day 4/30
