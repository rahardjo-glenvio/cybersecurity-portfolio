# 🛡️ Sentinel SOC Dashboard

A real-time Security Operations Center (SOC) dashboard built on top of **Wazuh SIEM**, visualizing live attack data on an interactive world map with a cyberpunk-inspired HUD interface.

![Dashboard Preview](docs/preview.png)

---

## ✨ Features

- **🗺️ Live Attack Map** — Interactive 2D world map (Leaflet.js) showing real-time attack arcs with animated pulse travelers between source and destination
- **📡 Wazuh Integration** — Connects directly to Wazuh Manager API and OpenSearch Indexer to pull live IDS alerts (last 24h)
- **🌍 GeoIP Enrichment** — Automatic IP geolocation via `ip-api.com` for external source IPs
- **🔴 MITRE ATT&CK Mapping** — Each alert tagged with relevant MITRE techniques
- **⚡ Real-time Severity HUD** — Color-coded threat counters (Critical / High / Medium)
- **🔍 Alert Table** — Searchable, filterable table with auto-complete suggestions
- **🎭 Demo Mode** — Built-in demo data with 12 sample global attacks (no Wazuh needed)
- **🔐 JWT Authentication** — Secure login with bcrypt password hashing
- **🎨 Cyberpunk UI** — Orbitron font, scanline overlay, animated scan beam, glassmorphism HUD

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Leaflet.js, CSS3 Animations |
| Backend | Node.js, Express 5 |
| Auth | JWT, bcrypt |
| SIEM | Wazuh 4.x (Manager + Indexer/OpenSearch) |
| GeoIP | ip-api.com (free tier) |
| Font | Orbitron (Google Fonts) |

---

## 📁 Project Structure

```
sentinel-soc-dashboard/
├── backend/
│   ├── server.js          # Express API — alert fetching, GeoIP enrichment, demo data
│   ├── auth.js            # JWT auth middleware & login routes
│   ├── scripts/
│   │   └── generateHash.js  # Utility to hash admin password
│   ├── package.json
│   └── .env.example       # Environment variable template
│
└── frontend/
    ├── public/
    │   └── index.html     # Google Fonts (Orbitron) loaded here
    ├── src/
    │   ├── App.js          # Root component — data fetching, routing
    │   ├── App.css         # Global styles, header, menu
    │   ├── components/
    │   │   ├── Map2D.js    # Leaflet map, attack markers, arc animations
    │   │   ├── Map2D.css   # HUD overlay, scanlines, scan beam, status bar
    │   │   ├── AlertsTable.js   # Searchable alert table with suggestions
    │   │   ├── AlertsTable.css  # Table styles, stat boxes, search UI
    │   │   ├── Login.js    # Login page
    │   │   └── Login.css
    │   └── utils/
    │       └── auth.js     # Token storage & auth helpers
    └── package.json
```

---

## 🚀 Setup

### Prerequisites

- Node.js 18+
- Wazuh 4.x (optional — demo mode works without it)

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/sentinel-soc-dashboard.git
cd sentinel-soc-dashboard

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values. To generate the admin password hash:

```bash
node scripts/generateHash.js
```

### 3. Run

**Backend:**
```bash
cd backend
node server.js
# API available at http://localhost:3001
```

**Frontend (development):**
```bash
cd frontend
npm start
# Dashboard at http://localhost:3000
```

**Frontend (production build):**
```bash
cd frontend
npm run build
# Serve the build/ folder with any static server
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Login, returns JWT |
| `POST` | `/api/auth/logout` | ✅ | Invalidate token |
| `GET` | `/api/alerts` | ✅ | Live alerts from Wazuh Indexer |
| `GET` | `/api/alerts/demo` | ✅ | Static demo alerts (12 global attacks) |
| `GET` | `/api/test` | ✅ | Health check |

---

## 🎮 Demo Mode

The dashboard includes a **Demo Mode** with 12 pre-configured global attack scenarios — no Wazuh installation needed. Switch between Demo/Real Alerts using the dropdown in the top-right corner.

Demo attacks include:
- SSH Brute Force from Russia, China, Germany
- Web Application Attack from Netherlands
- MySQL Injection from South Korea
- RDP Attack from Indonesia
- SMTP Relay from India
- And more...

---

## 🔒 Security Notes

- All credentials are loaded via environment variables — **never hardcoded**
- JWT tokens expire and are invalidated on logout
- HTTPS connections to Wazuh use `rejectUnauthorized: false` (internal network only)
- Rate limiting applied via `express-rate-limit`
- Security headers via `helmet`

---

## 📸 Screenshots

> Add screenshots of your running dashboard here

---

## 📄 License

MIT License — feel free to use for learning and portfolio purposes.

---

## 🙋 About

Built as part of a cybersecurity homelab project integrating Wazuh SIEM with a custom SOC visualization dashboard. The system runs on a Proxmox LXC container monitoring real network traffic.
