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
| **Operating System** | Ubuntu Server | 24.04 LTS |
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
