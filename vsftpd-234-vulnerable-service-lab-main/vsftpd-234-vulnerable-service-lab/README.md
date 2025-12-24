# Vulnerable Service Exploration Lab – vsftpd 2.3.4

## Overview
This repository documents a hands-on cybersecurity learning lab
focused on analyzing a vulnerable FTP service (`vsftpd 2.3.4`)
in a controlled and isolated environment.

The purpose of this lab is not to demonstrate exploitation techniques,
but to understand how outdated services can introduce serious security risks
and why proper patching and service management are critical.

All activities were conducted strictly for educational purposes.

---

## Learning Objectives
Through this lab, I aimed to:
- Identify exposed services through basic service scanning
- Understand the risks of running outdated software
- Observe the potential impact of known vulnerabilities
- Learn the importance of patching, service hardening, and mitigation

---

## Lab Environment
- Host OS: Windows
- Attacker: Kali Linux (WSL), accessed via VS Code Remote – WSL
- Target: Metasploitable 2 (VirtualBox)
- Network: Local and controlled lab environment

No production systems or public services were involved.

---

## High-Level Workflow
The lab was conducted using the following high-level stages:
1. Service identification through scanning
2. Vulnerability identification based on service version
3. Controlled exploitation to validate risk
4. Impact analysis
5. Mitigation and patching discussion

Detailed exploitation commands and payloads are intentionally omitted.

---

## Key Observations
- Multiple services can be exposed without immediate awareness
- Outdated services significantly increase the attack surface
- Vulnerability exploitation highlights impact, not just technique
- Security should focus on prevention, not only detection

---

## Mitigation & Defensive Considerations
Several defensive actions can reduce the risk of this vulnerability:
- Updating or replacing outdated services
- Disabling unnecessary services
- Restricting service access through firewall rules
- Performing regular audits on running services and versions

This lab reinforced the idea that patching is not optional,
but a fundamental requirement of secure system management.

---

## Documentation
Additional documentation, reports, and supporting screenshots
are available within this repository for reference.

---

## Notes
This project is part of my ongoing cybersecurity learning journey.
All testing was performed on intentionally vulnerable systems
within a controlled lab environment.
