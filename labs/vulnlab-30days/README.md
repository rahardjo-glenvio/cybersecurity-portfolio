# 🏦 SecureBank - VulnLab 30 Days Web Security Journey 🔓

![Security](https://img.shields.io/badge/Security-Vulnerable-critical)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)
![Status](https://img.shields.io/badge/Status-Day%202%2F30-yellow)

> **⚠️ CRITICAL WARNING:** SecureBank is an intentionally vulnerable web application designed exclusively for educational purposes. This application contains critical security flaws and should NEVER be deployed in production environments or exposed to public networks.

---

## 📖 About SecureBank

**SecureBank** is a deliberately vulnerable online banking web application created as part of a comprehensive 30-day cybersecurity learning project. The application simulates a realistic banking platform with features such as user authentication, money transfers, and transaction history—all intentionally built with exploitable security vulnerabilities based on the OWASP Top 10.

### 🎯 Project Mission

This project demonstrates a complete security lifecycle:
1. **Build** - Develop functional banking application
2. **Break** - Implement intentional vulnerabilities
3. **Exploit** - Create proof-of-concept attacks
4. **Document** - Write professional security reports
5. **Fix** - Implement proper remediations
6. **Verify** - Confirm vulnerabilities are resolved

---

## ✨ Application Features

SecureBank provides a complete online banking experience:

- **🔐 User Authentication**
  - Registration with username, email, password
  - Login system with session management
  - Initial balance of $10,000 for new accounts

- **💰 Account Dashboard**
  - Real-time balance display
  - Account information overview
  - Quick action buttons

- **💸 Money Transfer**
  - Transfer funds to other users
  - Transaction descriptions
  - Recipient selection interface

- **📊 Transaction History**
  - View sent and received transactions
  - Timestamp and amount tracking
  - Color-coded transaction types

- **👤 User Management**
  - Admin and standard user roles
  - Profile information display

---

## 🛠️ Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Backend** | Flask | 3.0.0 |
| **Database** | SQLite | 3.x |
| **ORM** | SQLAlchemy | 3.1.1 |
| **Frontend** | Bootstrap | 5.3.0 |
| **Web Server** | Nginx | 1.24.0 |
| **Operating System** | Ubuntu Server | 22.04 LTS |
| **Language** | Python | 3.12.3 |
| **Protocol** | HTTPS | TLS 1.2/1.3 |

---

## 🔓 Implemented Vulnerabilities

SecureBank intentionally implements the following security flaws for educational purposes:

| # | Vulnerability | Severity | CVSS | Status |
|---|---------------|----------|------|--------|
| 1 | **SQL Injection** | 🔴 Critical | 9.8 | ✅ Implemented |
| 2 | **Plain Text Password Storage** | 🔴 Critical | 9.1 | ✅ Implemented |
| 3 | **Broken Authentication** | 🔴 Critical | 9.0 | ✅ Implemented |
| 4 | **IDOR (Insecure Direct Object Reference)** | 🟠 High | 8.1 | ✅ Implemented |
| 5 | **CSRF (Cross-Site Request Forgery)** | 🟠 High | 8.0 | ✅ Implemented |
| 6 | **Insufficient Input Validation** | 🟠 High | 7.5 | ✅ Implemented |
| 7 | **Weak Session Management** | 🟡 Medium | 6.5 | ✅ Implemented |
| 8 | **Information Disclosure** | 🟡 Medium | 6.0 | ✅ Implemented |
| 9 | **Debug Mode Enabled** | 🟡 Medium | 5.5 | ✅ Implemented |
| 10 | **Missing Rate Limiting** | 🟡 Medium | 5.0 | ✅ Implemented |

### Detailed Vulnerability Descriptions

**1. SQL Injection (Critical)**
- **Location:** Login, Register, Transfer forms
- **Impact:** Authentication bypass, complete database access
- **Example:** `admin' OR '1'='1' --`

**2. Plain Text Password Storage (Critical)**
- **Location:** User database table
- **Impact:** Complete credential exposure if database is compromised
- **Evidence:** Passwords stored without hashing or encryption

**3. IDOR - Transaction History (High)**
- **Location:** `/transactions?user_id=X`
- **Impact:** Unauthorized access to other users' financial data
- **Example:** Manipulating user_id parameter exposes other accounts

**4. CSRF - All Forms (High)**
- **Location:** Transfer, Profile, Login forms
- **Impact:** Unauthorized actions performed on behalf of authenticated users
- **Evidence:** No CSRF tokens present in any forms

**5. Input Validation Issues (High)**
- **Location:** Transfer amount field
- **Impact:** Financial manipulation, negative balance exploitation
- **Example:** Transfer negative amounts to increase balance

---

## 📦 Installation Guide

### Prerequisites

- Ubuntu Server 24.04
- Python 3.10+
- Nginx
- Git
- 4GB RAM (recommended)
- 10GB disk space

### Quick Start
```bash
# Clone repository
git clone https://github.com/rahardjo-glenvio/cybersecurity-portfolio.git
cd cybersecurity-portfolio/labs/vulnlab-30days

# Install system dependencies
sudo apt update
sudo apt install python3 python3-pip python3-venv nginx sqlite3 -y

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
cd app/vulnerable
pip install -r requirements.txt

# Run application
python3 app.py
```

**Access application:**
- Local: `http://localhost:5000`
- Network: `http://YOUR-SERVER-IP:5000`

### HTTPS Setup (Optional)

See [config/nginx-securebank.conf](config/nginx-securebank.conf) for Nginx configuration with SSL/TLS.

---

## 🔑 Default Credentials

### Administrator Account
```
Username: admin
Password: admin123
Balance:  $1,000,000
Role:     Administrator
```

### Test User Account
```
Username: test
Password: test123
Balance:  $10,000
Role:     Standard User
```

---

## 🔍 Vulnerability Testing

### Quick SQL Injection Test

**Authentication Bypass:**
```
URL: https://securebank.com/login

Username: admin' OR '1'='1' --
Password: (any value)

Expected: ✅ Successful login as admin
```

### Automated Testing with SQLMap
```bash
# Test login endpoint
sqlmap -u "https://securebank.com/login" \
  --data="username=test&password=test" \
  --level=5 --risk=3 \
  --batch --dump

# Expected: Complete database extraction
```

### IDOR Testing
```bash
# Login as user with ID 2
# Access: https://securebank.com/transactions?user_id=1

# Expected: View admin's transactions (IDOR vulnerability)
```

### Negative Balance Exploit
```
1. Login to any account
2. Navigate to Transfer
3. Recipient: admin
4. Amount: -50000 (negative value)
5. Submit

Expected: Your balance increases instead of decreases
```

---

## 📚 Project Documentation

Comprehensive documentation available:

- **[Setup Guide](docs/setup-guide.md)** - Detailed installation instructions
- **[Vulnerability Report](docs/vulnerability-report.md)** - Complete vulnerability analysis
- **[Exploitation Guide](docs/exploitation-guide.md)** - Step-by-step exploitation methods
- **[Remediation Guide](docs/remediation-guide.md)** - Secure implementation guidelines
- **[Testing Methodology](docs/testing-methodology.md)** - Security testing procedures

---

## 🎓 Learning Outcomes

Through this project, I gained hands-on experience in:

### Technical Skills
- ✅ Web application architecture (MVC pattern)
- ✅ Flask framework and SQLAlchemy ORM
- ✅ RESTful API design principles
- ✅ Database design and SQL queries
- ✅ Frontend development with Bootstrap
- ✅ Linux system administration
- ✅ Nginx reverse proxy configuration
- ✅ SSL/TLS certificate management

### Security Skills
- ✅ OWASP Top 10 vulnerabilities
- ✅ SQL injection techniques (UNION, Boolean, Time-based)
- ✅ Authentication bypass methods
- ✅ Session management vulnerabilities
- ✅ Input validation bypass
- ✅ Penetration testing methodologies
- ✅ Security tool usage (SQLMap, Burp Suite, Nmap)
- ✅ Vulnerability documentation (CVSS scoring)

### Professional Skills
- ✅ Technical report writing
- ✅ Security assessment methodology
- ✅ Problem-solving and debugging
- ✅ Project documentation
- ✅ Version control with Git
- ✅ Professional communication

---

## 📊 Project Timeline

### Days 1-2: Foundation ✅ Complete
- [x] Environment setup (Ubuntu VM, Nginx, Flask)
- [x] Core banking features implemented
- [x] SQL Injection vulnerabilities added
- [x] HTTPS configuration with custom domain
- [x] Professional branding with logo
- [x] Network hardening with UFW
- [x] Initial exploitation testing

### Days 3-7: Vulnerability Expansion 🔄 In Progress
- [ ] Implement XSS vulnerabilities
- [ ] Add CSRF tokens (then remove for vulnerability)
- [ ] Create admin panel with privilege escalation
- [ ] Add file upload feature (unrestricted)
- [ ] Implement session fixation vulnerability

### Days 8-15: Exploitation Phase
- [ ] Write automated exploitation scripts
- [ ] Create Burp Suite test cases
- [ ] Develop proof-of-concept attacks
- [ ] Record demonstration videos
- [ ] Document all exploitation steps

### Days 16-21: Documentation
- [ ] Complete vulnerability reports
- [ ] Create professional security assessment
- [ ] Write exploitation guides
- [ ] Prepare presentation materials

### Days 22-30: Remediation
- [ ] Implement parameterized queries
- [ ] Add password hashing with bcrypt
- [ ] Implement proper access controls
- [ ] Add input validation and sanitization
- [ ] Enable CSRF protection
- [ ] Conduct security verification testing
- [ ] Final project documentation

---
---

## ⚠️ Legal Disclaimer

**EDUCATIONAL USE ONLY**

This application is created solely for educational and research purposes in cybersecurity. It intentionally contains critical security vulnerabilities and should:

- ❌ **NEVER** be deployed in production environments
- ❌ **NEVER** be used with real user data
- ❌ **NEVER** be exposed to public networks
- ❌ **NEVER** be used for unauthorized testing
- ✅ **ONLY** be used in isolated lab environments
- ✅ **ONLY** be accessed by authorized learners
- ✅ **ONLY** be tested on systems you own or have permission to test

**The author assumes NO liability for misuse of this application.** Users are responsible for ensuring compliance with all applicable laws and regulations in their jurisdiction.

---

## 🙏 Acknowledgments

### Special Thanks

**Claude AI by Anthropic** - For providing exceptional guidance, mentorship, and technical support throughout this learning journey. Claude's patient explanations, systematic approach to problem-solving, and ability to adapt to my learning pace made this complex project accessible and educational.

### Educational Resources

- OWASP Foundation - Vulnerability documentation
- PortSwigger Web Security Academy - Testing methodologies
- HackerOne - Real-world vulnerability reports
- SMK Telkom Purwokerto - Educational foundation

---

## 👤 Author

**Glenvio Rahardjo**  
Cybersecurity Student  
SMK Telkom Purwokerto  
Computer Network & Telecommunications Engineering (TJKT)

**Certifications:**
- Cyber Security Officer (Telkom DigiUp)
- Azure AI Fundamentals
- Linux Fundamental
- Basic Cybersecurity (JagoanSiber)

**Specializations:**
- Penetration Testing
- Web Application Security
- CTF Competitions (Cryptography, Reverse Engineering, Web Exploitation)

---

## 📄 License

**Educational Use Only - Not for Production**

This project is licensed for educational purposes only. Commercial use, redistribution, or deployment in production environments is strictly prohibited.

---
---

<p align="center">
  <strong>Part of the 30 Days VulnLab Journey</strong><br>
  Building, Breaking, and Securing Web Applications
</p>

<p align="center">
  <sub>Last Updated: December 30, 2024 | Day 2/30 Complete</sub>
</p>
