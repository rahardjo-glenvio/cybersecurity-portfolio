<div align="center">

# 🛡️ Project SENTINEL

**Security Event and Network Threat Intelligence with Notification, Evidence and Live-map**

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Wazuh](https://img.shields.io/badge/Wazuh-4.x-00B4D8?style=flat-square)](https://wazuh.com)
[![Leaflet](https://img.shields.io/badge/Leaflet.js-Map-199900?style=flat-square&logo=leaflet&logoColor=white)](https://leafletjs.com)
[![License](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)](LICENSE)

*A cyberpunk-themed threat visualization dashboard that displays live attack data on an interactive world map, powered by Wazuh IDS alerts.*

</div>

---

## 📸 Screenshots

### 🔐 Login Screen
![Login Page](docs/screenshots/login.png)

> Secure JWT authentication with animated particle background and cyberpunk styling.

---

### 🗺️ Live Attack Map: Full Dashboard
![Dashboard Overview](docs/screenshots/dashboard.png)

> Real-time world map showing attack arcs from 12 countries converging on the target server. Color-coded by severity: 🔴 Critical · 🟠 High · 🟡 Medium.

---

### 🎯 Target Server Close-up
![Map Close-up](docs/screenshots/map-closeup.png)

> Zoomed view of the defended server node with all inbound attack vectors: SSH brute force, SQL Injection, RDP, MySQL attacks.

---

### 📋 Security Alerts Table
![Alerts Table](docs/screenshots/alerts-table.png)

> Searchable alert log with GeoIP enrichment, MITRE ATT&CK tags, service classification, and severity badges.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🗺️ **Live Attack Map** | Interactive Leaflet.js world map with smooth animated arcs - multiple simultaneous traveling pulses per route, speed/intensity scaled by alert severity |
| 📡 **Wazuh Integration** | Reads directly from Wazuh's `alerts.json` in real-time - no indexer/filebeat dependency, always up to date |
| ⚡ **Streaming Log Reader** | Walks `alerts.json` backwards in chunks and stops at the time cutoff - a 44 MB log costs 12 ms and 0.75 MB of reads, with no shell out to `tail` |
| 🌍 **GeoIP Enrichment** | IP geolocation via `ip-api.com`, deduplicated and **batched 100 IPs per call**, with a 12 h disk-backed cache - typically 1 HTTP request per refresh, 0 when warm |
| ⚡ **Severity HUD** | Real-time counters for Threats / Critical / High / Medium with glowing neon indicators |
| 🔍 **Smart Search** | Full-text search with auto-complete across IP, country, service, MITRE technique |
| 🤖 **JAGAD AI Analyst** | In-dashboard threat analyst chatbot - risk scoring, MITRE mapping, geo analysis, and detailed mitigation guidance generated from live alert data |
| 🎭 **Demo Mode** | 12 built-in global attack scenarios, no Wazuh needed to try it |
| 🔐 **JWT Auth** | Secure login with bcrypt password hashing and token expiry |
| 🎨 **Cyberpunk UI** | Minimal single-row HUD header, Orbitron font, scanline overlay, glassmorphism panels |
| 📊 **MITRE ATT&CK** | Every alert tagged with relevant technique (Brute Force, SQL Injection, etc.) |
| ⚙️ **Map Performance** | Alerts clustered by source IP (max 40 markers) and lightweight CSS effects keep the map smooth even with hundreds of events |

---

## 🏗️ Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│                  PROJECT SENTINEL                        │
│                                                         │
│  Frontend                    Backend                    │
│  ─────────────────           ────────────────────       │
│  React 19                    Node.js + Express 5        │
│  Leaflet.js (maps)           JWT Authentication         │
│  Orbitron (Google Fonts)     bcrypt password hashing    │
│  CSS3 Animations             ip-api.com (GeoIP)         │
│  Canvas (JAGAD intro/spread) Direct alerts.json reader  │
│                                                         │
│  SIEM Integration                                       │
│  ────────────────────────────────────────────────       │
│  Wazuh alerts.json (real-time, no indexer needed)       │
│  No Filebeat, no Indexer, no Manager API required       │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
project-sentinel/
│
├── backend/
│   ├── server.js              # API routes: alerts, demo data, health
│   ├── auth.js                # JWT middleware & login/logout routes
│   ├── lib/
│   │   ├── alertsReader.js    # Async reverse-chunk reader for alerts.json
│   │   ├── geoip.js           # Deduplicated, batched, cached GeoIP resolver
│   │   └── alertsService.js   # Pipeline orchestration + response cache
│   ├── scripts/
│   │   └── generateHash.js    # Utility to bcrypt-hash admin password
│   ├── package.json
│   └── .env.example           ← copy to .env and fill in credentials
│
├── frontend/
│   ├── public/
│   │   ├── index.html         # Loads Orbitron font from Google Fonts
│   │   └── jagad-face.png      # JAGAD AI avatar artwork
│   ├── src/
│   │   ├── App.js             # Root: auth check, data fetch, layout
│   │   ├── App.css            # Header, menu, global styles
│   │   ├── components/
│   │   │   ├── Map2D.js       # Leaflet map + clustered arc animations + HUD
│   │   │   ├── Map2D.css      # Scanlines, scan beam, glassmorphism HUD
│   │   │   ├── AlertsTable.js # Searchable table with MITRE tags
│   │   │   ├── AlertsTable.css
│   │   │   ├── JAGAD.js       # AI threat-analyst chatbot (risk score, MITRE, recs)
│   │   │   ├── JAGAD.css
│   │   │   ├── JAGADIntro.js  # Boot-up intro animation for JAGAD
│   │   │   ├── JAGADIntro.css
│   │   │   ├── JAGADSpread.js # Canvas-based reveal/spread animation
│   │   │   ├── Login.js       # Animated login page
│   │   │   └── Login.css
│   │   └── utils/
│   │       └── auth.js        # Token helpers
│   └── package.json
│
└── docs/screenshots/          # README preview images
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Wazuh 4.x *(optional, demo mode works without it)*

### 1. Clone & Install

```bash
git clone https://github.com/rahardjo-glenvio/cybersecurity-portfolio.git
cd cybersecurity-portfolio/tools/project-sentinel

npm install --prefix backend
npm install --prefix frontend
```

### 2. Configure Environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials
```

Generate admin password hash:
```bash
npm run hash --prefix backend
# Paste the output hash into .env as ADMIN_PASSWORD_HASH
```

### 3. Run

```bash
# Terminal 1: Backend API (port 3001)
npm start --prefix backend

# Terminal 2: Frontend dev server (port 3000)
npm start --prefix frontend
```

Open `http://localhost:3000` and login with your admin credentials.

> **Ports already taken?** Set `PORT` in `backend/.env`, then create
> `frontend/.env` with `PORT=<react port>` and
> `REACT_APP_API_PORT=<backend port>`. The frontend derives its API base from
> the hostname you loaded it on, so LAN access keeps working.

---

## 🔌 API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| `POST` | `/api/auth/login` | ❌ | Login → returns JWT token |
| `POST` | `/api/auth/logout` | ✅ | Invalidate session token |
| `GET` | `/api/alerts` | ✅ | Live alerts read directly from Wazuh's `alerts.json` |
| `GET` | `/api/alerts/demo` | ✅ | 12 static demo attacks from global IPs |
| `GET` | `/api/test` | ✅ | Backend health check + GeoIP cache metrics |

`/api/alerts` accepts two query parameters:

| Param | Default | Range | Meaning |
|-------|---------|-------|---------|
| `hours` | `24` | 1–168 | How far back to look |
| `limit` | `500` | 1–5000 | Max **relevant** alerts to return |

Every response carries a `meta` block describing how it was produced — useful
for tuning and for confirming the caches are doing their job:

```jsonc
{
  "success": true,
  "count": 500,
  "alerts": [ /* ... */ ],
  "meta": {
    "window_hours": 24,
    "limit": 500,
    "read": {
      "bytesScanned": 786432,      // stopped after 768 KB of a 44 MB log
      "linesScanned": 1017,
      "stoppedBecause": "max-alerts",
      "readMs": 12.1
    },
    "geo": {
      "requested": 500,            // alerts needing a location
      "unique": 30,                // distinct IPs behind them
      "cacheHits": 30,
      "lookedUp": 0,
      "batchesSent": 0             // zero HTTP calls on a warm cache
    },
    "total_ms": 13.6,
    "cached": false                // true = memoised, alerts.json unchanged
  }
}
```

> `meta` always describes the **build** that produced the payload. When
> `cached` is `true` the timings are the ones from that original build, not the
> (near-zero) cost of replaying it.

---

## 🎮 Demo Mode

No Wazuh? No problem. Switch to **Demo Mode** using the top-right dropdown, no setup needed.

Includes 12 pre-configured global attack scenarios:

| Source IP | Country | Attack Type | Service | Severity |
|-----------|---------|-------------|---------|----------|
| 103.79.141.133 | 🇨🇳 China | Password Guessing | SSH :22 | Medium |
| 185.220.101.34 | 🇷🇺 Russia | Brute Force | SSH :22 | **Critical** |
| 45.142.212.61 | 🇳🇱 Netherlands | SQL Injection | HTTP :80 | High |
| 89.163.224.51 | 🇩🇪 Germany | Brute Force | SSH :22 | **Critical** |
| 121.167.58.200 | 🇰🇷 South Korea | SQL Injection | MySQL :3306 | **Critical** |
| 49.37.212.18 | 🇮🇳 India | Phishing | SMTP :25 | Medium |
| 203.0.113.45 | 🇯🇵 Japan | Valid Accounts | SSH :22 | Medium |
| 200.6.185.234 | 🇧🇷 Brazil | Password Guessing | FTP :21 | Medium |
| 172.58.146.22 | 🇺🇸 United States | File Integrity | FIM | High |
| 103.155.92.11 | 🇮🇩 Indonesia | Brute Force | RDP :3389 | High |
| 36.68.43.100 | 🇮🇩 Indonesia | Brute Force | SSH :22 | **Critical** |
| 114.142.171.22 | 🇮🇩 Indonesia | Web Scanning | HTTPS :443 | Medium |

---

## 🔒 Security Design

- ✅ All credentials via **environment variables**, nothing hardcoded in source
- ✅ JWT tokens with expiry + server-side invalidation on logout
- ✅ bcrypt password hashing (cost factor 12)
- ✅ Rate limiting via `express-rate-limit` on the login route
- ✅ Security headers via `helmet`
- ✅ CORS allowlist — set `CORS_ORIGINS` for an exact list, or leave it unset to
  allow only loopback and RFC1918 (`10.x`, `192.168.x`, `172.16–31.x`) origins

### CORS behaviour

The dashboard derives its API base from `window.location.hostname`, so the
`Origin` it sends is whatever host you loaded it on. That means the allowlist
has to match how you actually reach the dashboard:

| `CORS_ORIGINS` | Who may call the API from a browser |
|---|---|
| unset *(default)* | Any loopback or private-LAN host, on any port |
| `http://10.0.0.5:3000` | Only that exact origin |
| `http://localhost:3000,http://10.0.0.5:3000` | Either of those two |

Requests with **no** `Origin` header (curl, health probes, server-to-server) are
not browser cross-origin requests, so CORS does not apply to them — but they
still need a valid JWT like everything else. Disallowed origins simply receive
no `Access-Control-Allow-Origin` header, and the browser blocks the response.

> Expose this backend to the public internet and JWT auth becomes the *only*
> thing standing between an attacker and your alert feed. Keep it on the LAN or
> behind a VPN.

---

## 🌐 Architecture

```
[Internet Attackers]
        │
        ▼
[Wazuh Agent] ──► [Wazuh Manager]
                          │
                          ▼
                  [/var/ossec/logs/alerts/alerts.json]
                          │
                          ▼ (reverse chunk read, stops at time cutoff)
                  [Sentinel Backend :3001]
                    ├── /api/auth
                    ├── /api/alerts      ◄── batched GeoIP + mtime cache
                    └── /api/alerts/demo
                          │
                          ▼
                  [Sentinel Frontend :3000]
                    ├── Attack Map (Leaflet, clustered arcs)
                    ├── Severity HUD
                    ├── Alerts Table
                    └── JAGAD AI Threat Analyst
```

---

## ⚙️ Ingestion Pipeline

Wazuh appends one JSON object per line to `alerts.json`. SENTINEL reads that
file directly — no indexer, no Filebeat — and turns it into map-ready events in
four stages:

```
alerts.json (append-only, newest at EOF)
      │
      │  1. READ    lib/alertsReader.js
      │     Walks the file BACKWARDS in 256 KB chunks and stops as soon as it
      │     has enough alerts or crosses the time cutoff. Cost scales with the
      │     window you ask for, not with the size of the log.
      ▼
      │  2. FILTER  lib/alertsService.js
      │     Noise rules (level < 3, PAM session open/close, netstat churn) are
      │     applied WHILE streaming, so the limit counts alerts you'll actually
      │     see rather than lines read.
      ▼
      │  3. ENRICH  lib/geoip.js
      │     Source IPs are deduplicated, served from cache where possible, and
      │     whatever is left goes to ip-api.com's /batch endpoint — 100 IPs per
      │     HTTP call instead of one call per alert.
      ▼
      │  4. CACHE   lib/alertsService.js
      │     The finished payload is memoised against alerts.json's mtime+size.
      │     Unchanged log ⇒ replayed instantly. Concurrent requests share one
      │     in-flight build instead of stampeding the reader.
      ▼
   GET /api/alerts
```

### Why it used to be slow

Measured against a synthetic 44 MB / 60,000-line Wazuh log spanning 48 hours
with 30 distinct attacker IPs:

| Problem | Effect |
|---|---|
| `execSync("tail -n 1500 …")` | Spawned a shell **and blocked the Node event loop for ~91 ms per request** — the server could serve nothing else meanwhile. Also `tail`-dependent, so it silently returned nothing on Windows. |
| One `ip-api.com/json/<ip>` call **per alert** | 244 HTTP calls for 244 alerts that came from only **30 unique IPs** — 87.7% pure waste. |
| ip-api free tier is 45 req/min | Those 244 calls blew straight past the limit: ~45 succeeded, the rest got HTTP 429. |
| Geo failures fell back to `getPrivateCoords()` | Rate-limited attackers were drawn **on top of the defended server**, silently corrupting the map. |
| No cache of any kind | Every refresh redid the whole thing from scratch. |
| Fixed `tail -n 1500` cap | The "last 24 h" window really only covered **0.40 h** of this log. The cap, not the cutoff, decided what you saw. |

### What it costs now

| Scenario | Before | After |
|---|---:|---:|
| Log read (44 MB file) | 91 ms, blocking, 1.10 MB into memory | **12 ms**, async, 0.75 MB |
| GeoIP HTTP calls (500 alerts / 30 IPs) | 244 | **1** |
| GeoIP HTTP calls, cache warm | 244 | **0** |
| First request (cold cache) | rate-limited, partly wrong | **110 ms** |
| Repeat request, log unchanged | full rework | **7.5 ms** |
| First request after a process restart | full rework + 244 calls | **23 ms**, 0 calls |
| Relevant alerts returned for `limit=500` | 244 | **500** |
| Time actually covered at that limit | 0.40 h | **0.81 h** |
| `hours=48&limit=5000` | not possible | **146 ms**, covers 8.13 h |

The GeoIP cache is written to `backend/.cache/geoip.json` (gitignored), so a
restart no longer costs a single lookup. Locations live 12 h, failures are
negative-cached for 30 min, and an IP that can't be resolved now returns
`source_lat: null` and is **excluded from the map** instead of being faked.

---

## 🤖 JAGAD - AI Threat Analyst

**JAGAD** ("Jaringan Analisis Garda Ancaman Digital") is an in-dashboard chat assistant that analyzes the live alert feed and answers questions about the current security posture - entirely client-side, no external AI API required.

- **Risk scoring** - computes an overall `LOW / MEDIUM / HIGH / CRITICAL` risk score from severity-weighted alert counts
- **Severity breakdown** - Critical / High / Medium / Low counts with SLA-style guidance per tier
- **Attack vector analysis** - top targeted services (SSH, HTTP, RDP, MySQL, etc.) with counts
- **Geographic analysis** - top source countries/regions for inbound attacks
- **MITRE ATT&CK mapping** - maps observed techniques to tactics (Initial Access, Credential Access, Defense Evasion, Reconnaissance) with explanations
- **Timeline view** - recent alerts with severity tags, full descriptions, and city/country/MITRE/rule-ID metadata
- **Tailored recommendations** - multi-sentence, configuration-specific hardening and mitigation steps based on what's actually being attacked
- **Full report / brief mode** - multi-paragraph executive summary combining all of the above
- **Boot-up & reveal animations** - `JAGADIntro.js` (intro sequence) and `JAGADSpread.js` (canvas-based spread/reveal effect) for a polished first impression

---

## 📄 License

MIT License, free to use, fork, and adapt for your own homelab.

---

<div align="center">

**Built with ☕ + 🔐 | Cybersecurity Homelab Project**

[⬆ Back to Portfolio](../../README.md)

</div>
