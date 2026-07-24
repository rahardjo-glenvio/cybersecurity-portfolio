const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');
require('dotenv').config();

const { createAlertsService } = require('./lib/alertsService');

const app = express();
const PORT = process.env.PORT || 3001;

// Behind nginx every request arrives from 127.0.0.1, so req.ip would be the
// proxy for everyone and the login rate limiter would lock out all clients at
// once instead of the one guessing passwords. Trusting only loopback keeps
// X-Forwarded-For usable without letting a direct caller spoof its own IP.
app.set('trust proxy', 'loopback');

// Detect local IP
const getLocalIP = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
};

const SERVER_IP = getLocalIP();
console.log('Server IP:', SERVER_IP);

// ─── CORS ───────────────────────────────────────────────────────────────────
// The dashboard builds its API base from window.location.hostname, so the
// Origin it sends is whatever host you loaded the dashboard on. Set
// CORS_ORIGINS to pin the allowlist down exactly; with it unset we fall back to
// loopback + RFC1918 hosts on any port, which is where a homelab SOC lives.
const PRIVATE_HOST = /^(?:localhost|\[::1\]|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+)$/i;

const stripSlash = (s) => s.trim().replace(/\/+$/, '');

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(stripSlash)
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  // No Origin header means this is not a browser cross-origin request (curl,
  // a health probe, server-to-server). CORS does not apply; the JWT still does.
  if (!origin) return true;
  if (ALLOWED_ORIGINS.length) return ALLOWED_ORIGINS.includes(stripSlash(origin));
  try {
    return PRIVATE_HOST.test(new URL(origin).hostname);
  } catch {
    return false;
  }
};

console.log(
  ALLOWED_ORIGINS.length
    ? `CORS allowlist: ${ALLOWED_ORIGINS.join(', ')}`
    : 'CORS allowlist: (CORS_ORIGINS unset) loopback + private LAN ranges only'
);

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
// Disallowed origins simply get no CORS headers, so the browser blocks the
// read. Rejecting with an error here would turn it into a confusing 500.
app.use(cors({ origin: (origin, cb) => cb(null, isAllowedOrigin(origin)) }));
app.use(express.json());
const { router: authRouter, authenticateToken } = require("./auth");
app.use("/api/auth", authRouter);

// Health probe publik & ringan untuk indikator status live di dashboard.
// Sengaja TANPA auth supaya frontend bisa polling murni untuk tahu "backend
// terjangkau atau tidak", bukan untuk data sensitif. no-store agar tak di-cache.
const STARTED_AT = Date.now();
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok', uptime_s: Math.floor((Date.now() - STARTED_AT) / 1000), ts: Date.now() });
});

const TARGET = {
  lat: parseFloat(process.env.SERVER_LAT || -7.4333),
  lon: parseFloat(process.env.SERVER_LON || 109.2333),
  city: process.env.SERVER_CITY || 'Server',
  country: process.env.SERVER_COUNTRY || 'Indonesia'
};

const ALERTS_JSON_PATH = process.env.ALERTS_JSON_PATH || '/var/ossec/logs/alerts/alerts.json';

const CLIENT_KEYS_PATH = process.env.CLIENT_KEYS_PATH || '/var/ossec/etc/client.keys';

const alertsService = createAlertsService({
  alertsPath: ALERTS_JSON_PATH,
  serverIp: SERVER_IP,
  target: TARGET,
  serverName: os.hostname(),
  clientKeysPath: CLIENT_KEYS_PATH
});

// List of monitorable sources for the dashboard's scope dropdown: the manager
// itself (agent 000, "Local") plus every enrolled Wazuh agent. Auth-gated like
// the alerts it scopes.
app.get('/api/agents', authenticateToken, (req, res) => {
  try {
    res.json({ agents: alertsService.listAgents() });
  } catch (error) {
    console.error('Agents error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/test', authenticateToken, (req, res) => {
  res.json({ message: 'Backend OK', ip: SERVER_IP, geo_cache: alertsService.getGeoMetrics() });
});

// Real alerts — streamed straight out of Wazuh's alerts.json.
// Reading, filtering, GeoIP batching and caching all live in lib/alertsService.
app.get('/api/alerts', authenticateToken, async (req, res) => {
  try {
    const hours = Math.min(Math.max(parseInt(req.query.hours, 10) || 24, 1), 168);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 500, 1), 5000);
    // 'all' or a numeric agent id; anything else falls back to 'all' so a bad
    // query can never turn into an unfiltered internal error.
    const rawAgent = (req.query.agent || 'all').toString();
    const agentId = /^(all|\d{1,5})$/.test(rawAgent) ? rawAgent : 'all';

    const payload = await alertsService.getAlerts({ hours, limit, agentId });

    const m = payload.meta;
    console.log(
      `Alerts: ${payload.count} in ${m.total_ms?.toFixed(0) ?? '-'}ms` +
      `${m.cached ? ' (cached)' : ''} | read ${m.read.linesScanned} lines ` +
      `(${(m.read.bytesScanned / 1024).toFixed(0)}KB, stop=${m.read.stoppedBecause}) | ` +
      `geo ${m.geo.unique} unique, ${m.geo.cacheHits} cached, ${m.geo.batchesSent} batch(es)`
    );

    res.json(payload);
  } catch (error) {
    console.error('Alerts error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Demo mode — static sample alerts (no Wazuh connection needed)
app.get('/api/alerts/demo', authenticateToken, (req, res) => {
  const SERVER_LAT = parseFloat(process.env.SERVER_LAT || -7.4333);
  const SERVER_LON = parseFloat(process.env.SERVER_LON || 109.2333);
  const SERVER_CITY = process.env.SERVER_CITY || 'Purwokerto';
  const SERVER_COUNTRY = process.env.SERVER_COUNTRY || 'Indonesia';

  const alerts = [
    {
      id: 'demo-1', timestamp: new Date(Date.now() - 120000).toISOString(),
      rule_id: '5760', rule_description: 'sshd: authentication failed.', rule_level: 5,
      source_ip: '103.79.141.133', source_country: 'China', source_lat: 39.9042, source_lon: 116.4074, source_city: 'Beijing',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'SSH', port: 22, mitre_technique: ['Password Guessing']
    },
    {
      id: 'demo-2', timestamp: new Date(Date.now() - 180000).toISOString(),
      rule_id: '5712', rule_description: 'sshd: brute force trying to get access.', rule_level: 10,
      source_ip: '185.220.101.34', source_country: 'Russia', source_lat: 55.7558, source_lon: 37.6173, source_city: 'Moscow',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'SSH', port: 22, mitre_technique: ['Brute Force']
    },
    {
      id: 'demo-3', timestamp: new Date(Date.now() - 300000).toISOString(),
      rule_id: '5503', rule_description: 'Web application attack detected.', rule_level: 8,
      source_ip: '45.142.212.61', source_country: 'Netherlands', source_lat: 52.3702, source_lon: 4.8952, source_city: 'Amsterdam',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'HTTP', port: 80, mitre_technique: ['SQL Injection']
    },
    {
      id: 'demo-4', timestamp: new Date(Date.now() - 420000).toISOString(),
      rule_id: '5551', rule_description: 'Integrity checksum changed.', rule_level: 7,
      source_ip: '172.58.146.22', source_country: 'United States', source_lat: 37.7749, source_lon: -122.4194, source_city: 'San Francisco',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'FIM', port: 0, mitre_technique: ['File Integrity']
    },
    {
      id: 'demo-5', timestamp: new Date(Date.now() - 600000).toISOString(),
      rule_id: '5760', rule_description: 'FTP authentication failed.', rule_level: 5,
      source_ip: '200.6.185.234', source_country: 'Brazil', source_lat: -23.5505, source_lon: -46.6333, source_city: 'Sao Paulo',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'FTP', port: 21, mitre_technique: ['Password Guessing']
    },
    {
      id: 'demo-6', timestamp: new Date(Date.now() - 720000).toISOString(),
      rule_id: '5710', rule_description: 'sshd: Attempt to login using non-existent user.', rule_level: 5,
      source_ip: '203.0.113.45', source_country: 'Japan', source_lat: 35.6762, source_lon: 139.6503, source_city: 'Tokyo',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'SSH', port: 22, mitre_technique: ['Valid Accounts']
    },
    {
      id: 'demo-7', timestamp: new Date(Date.now() - 480000).toISOString(),
      rule_id: '5712', rule_description: 'sshd: brute force trying to get access.', rule_level: 10,
      source_ip: '89.163.224.51', source_country: 'Germany', source_lat: 52.5200, source_lon: 13.4050, source_city: 'Berlin',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'SSH', port: 22, mitre_technique: ['Brute Force']
    },
    {
      id: 'demo-8', timestamp: new Date(Date.now() - 360000).toISOString(),
      rule_id: '5503', rule_description: 'MySQL unauthorized access attempt.', rule_level: 9,
      source_ip: '121.167.58.200', source_country: 'South Korea', source_lat: 37.5665, source_lon: 126.9780, source_city: 'Seoul',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'MySQL', port: 3306, mitre_technique: ['SQL Injection']
    },
    {
      id: 'demo-9', timestamp: new Date(Date.now() - 540000).toISOString(),
      rule_id: '5760', rule_description: 'SMTP relay attempt blocked.', rule_level: 4,
      source_ip: '49.37.212.18', source_country: 'India', source_lat: 28.6139, source_lon: 77.2090, source_city: 'New Delhi',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'SMTP', port: 25, mitre_technique: ['Phishing']
    },
    {
      id: 'demo-10', timestamp: new Date(Date.now() - 30000).toISOString(),
      rule_id: '5760', rule_description: 'RDP multiple failed login attempts.', rule_level: 8,
      source_ip: '103.155.92.11', source_country: 'Indonesia', source_lat: -7.9786, source_lon: 112.6317, source_city: 'Malang',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'RDP', port: 3389, mitre_technique: ['Brute Force']
    },
    {
      id: 'demo-11', timestamp: new Date(Date.now() - 60000).toISOString(),
      rule_id: '5712', rule_description: 'sshd: brute force trying to get access.', rule_level: 10,
      source_ip: '36.68.43.100', source_country: 'Indonesia', source_lat: -6.2088, source_lon: 106.8456, source_city: 'Jakarta',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'SSH', port: 22, mitre_technique: ['Brute Force']
    },
    {
      id: 'demo-12', timestamp: new Date(Date.now() - 240000).toISOString(),
      rule_id: '5901', rule_description: 'HTTPS suspicious request pattern detected.', rule_level: 6,
      source_ip: '114.142.171.22', source_country: 'Indonesia', source_lat: -7.2575, source_lon: 112.7521, source_city: 'Surabaya',
      destination_ip: SERVER_IP, destination_country: SERVER_COUNTRY, destination_lat: SERVER_LAT, destination_lon: SERVER_LON, destination_city: SERVER_CITY,
      service: 'HTTPS', port: 443, mitre_technique: ['Web Scanning']
    }
  ];

  res.json({ success: true, count: alerts.length, alerts });
});

// Behind a reverse proxy there is no reason to accept connections from
// anywhere but loopback, so BIND_HOST can shut the door without relying on the
// firewall alone. Defaults to 0.0.0.0 to keep the homelab LAN setup working.
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';

app.listen(PORT, BIND_HOST, () => {
  console.log(`Backend running on http://${BIND_HOST}:${PORT}`);
});
