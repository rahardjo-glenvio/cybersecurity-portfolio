# Service Availability & Firewall Mitigation Lab

## Overview
This repository contains documentation for a cybersecurity learning lab
focused on service availability and basic firewall mitigation
using IPTables on Ubuntu Server.

The goal of this project is to understand how excessive traffic
can impact service availability and to evaluate how firewall-based
rate limiting can help reduce such impact in a controlled environment.

This repository intentionally focuses on documentation and analysis,
not on attack execution details.

---

## Project Objectives
The main objectives of this lab are:
- To observe the impact of high traffic on service availability
- To apply basic rate-limiting rules using IPTables
- To evaluate the effectiveness and limitations of firewall-based mitigation
- To understand why layered defenses are required for availability protection

---

## Lab Environment
- Target System: Ubuntu Server (VirtualBox)
- Firewall: IPTables
- Attacker Simulation: Kali Linux (WSL)
- Environment: Local and isolated lab network

No production systems or public services were involved in this project.

---

## High-Level Workflow
The lab was conducted using the following high-level stages:
1. Baseline observation without mitigation
2. Implementation of basic IPTables firewall rules
3. Observation after mitigation
4. Comparison of system behavior before and after mitigation

Detailed attack commands and parameters are intentionally omitted
to maintain ethical and responsible documentation.

---

## Key Takeaways
- Service availability can be significantly affected by excessive traffic
- IPTables can reduce the impact of certain traffic-based attacks
- Firewall-only mitigation is not sufficient for large-scale scenarios
- Monitoring and layered security controls are essential for resilience

---

## Documentation
The formal lab report and supporting documentation
are available in the `report/` directory.

---

## Notes
This project was conducted strictly for educational purposes
as part of cybersecurity training and skill development.
All testing was performed on intentionally controlled systems.
