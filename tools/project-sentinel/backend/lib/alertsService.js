'use strict';

const fs = require('fs');
const { readRecentAlerts } = require('./alertsReader');
const { resolveMany, getMetrics: getGeoMetrics, getOverride } = require('./geoip');

// Serve a rebuilt result for at least this long even if the log keeps growing,
// so a burst of dashboard refreshes cannot stampede the reader.
const MIN_CACHE_MS = 3000;

const SERVICE_RULES = [
  [/sshd|\bssh\b/, { service: 'SSH', port: 22 }],
  [/\bftp\b/, { service: 'FTP', port: 21 }],
  [/https|\bssl\b/, { service: 'HTTPS', port: 443 }],
  [/http|apache|nginx/, { service: 'HTTP', port: 80 }],
  [/mysql/, { service: 'MySQL', port: 3306 }],
  [/\brdp\b/, { service: 'RDP', port: 3389 }],
  [/smtp/, { service: 'SMTP', port: 25 }],
  [/\bdns\b/, { service: 'DNS', port: 53 }],
  [/integrity/, { service: 'FIM', port: 0 }],
  [/\bpam\b|sudo/, { service: 'AUTH', port: 0 }]
];

const detectService = (desc) => {
  const d = (desc || '').toLowerCase();
  for (const [re, hit] of SERVICE_RULES) if (re.test(d)) return hit;
  return { service: 'OTHER', port: 0 };
};

const NOISE = [
  'pam: login session closed',
  'netstat listening ports'
];

/** Cheap reject applied while streaming the log, before any enrichment. */
function makeRelevanceFilter() {
  return (alert) => {
    const level = alert.rule?.level;
    if (typeof level !== 'number' || level < 3) return false;
    const d = (alert.rule?.description || '').toLowerCase();
    if (level <= 3 && d.includes('pam: login session opened')) return false;
    for (const n of NOISE) if (d.includes(n)) return false;
    return true;
  };
}

function makeIsPrivateIP(serverIp) {
  const localSubnet = serverIp.split('.').slice(0, 3).join('.') + '.';
  return (ip) => {
    if (!ip || ip === 'unknown') return true;
    if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '127.0.0.1') return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
    if (ip.startsWith(localSubnet)) return true;
    return false;
  };
}

// client.keys lists every enrolled agent as `id name ip key` (lines starting
// with `!` are tombstones for removed agents). The manager itself is agent 000
// and is never written there, so we always prepend it.
function readAgents(clientKeysPath, serverName) {
  const agents = [{ id: '000', name: serverName, ip: '127.0.0.1', local: true }];
  try {
    const raw = fs.readFileSync(clientKeysPath, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || t.startsWith('!')) continue;
      const [id, name, ip] = t.split(/\s+/);
      if (!id || !name) continue;
      agents.push({ id, name, ip: ip || 'any', local: false });
    }
  } catch {
    // No client.keys, or not readable (service not in group wazuh): the
    // dropdown still works, it just shows the manager alone.
  }
  const seen = new Set();
  return agents
    .filter((a) => (seen.has(a.id) ? false : seen.add(a.id)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function createAlertsService({
  alertsPath,
  serverIp,
  target,
  serverName = 'wazuh-manager',
  clientKeysPath = '/var/ossec/etc/client.keys'
}) {
  const isRelevant = makeRelevanceFilter();
  const isPrivateIP = makeIsPrivateIP(serverIp);

  let cached = null;      // { key, payload, builtAt }
  let inFlight = null;    // dedupes concurrent rebuilds

  async function fileSignature() {
    try {
      const st = await fs.promises.stat(alertsPath);
      return `${st.mtimeMs}:${st.size}`;
    } catch {
      return 'missing';
    }
  }

  async function build({ hours, limit, agentId = 'all' }) {
    const started = process.hrtime.bigint();

    // Filtering by agent inside the relevance test means the byte-budget/limit
    // applies to that agent's alerts, so a quiet agent still fills a full page
    // instead of being crowded out by a noisy one.
    const relevance = agentId === 'all'
      ? isRelevant
      : (a) => isRelevant(a) && (a.agent?.id === agentId);

    const { alerts: rawAlerts, stats: readStats } = await readRecentAlerts({
      filePath: alertsPath,
      hours,
      maxAlerts: limit,
      isRelevant: relevance
    });

    const normalized = rawAlerts.map((s, idx) => {
      const srcip = s.data?.srcip
        || s.data?.src_ip
        || s.data?.win?.eventdata?.ipAddress
        || s.agent?.ip
        || null;
      // "Eksternal" (digambar sebagai penyerang di peta) bila IP publik ATAU
      // punya override manual di known-locations.json. Override membuat IP
      // privat lab (mis. sumber hydra) tampil di lokasi yang dipilih operator,
      // bukan menumpuk di titik server. Tanpa override, perilaku default sama.
      const external = !!srcip && (!isPrivateIP(srcip) || !!getOverride(srcip));
      const svc = detectService(s.rule?.description);
      return {
        id: s.id || `file-${idx}`,
        timestamp: s.timestamp,
        rule_id: s.rule?.id,
        rule_description: s.rule?.description,
        rule_level: s.rule?.level,
        source_ip: srcip || serverIp,
        has_external_ip: external,
        destination_ip: serverIp,
        mitre_technique: s.rule?.mitre?.technique || [],
        full_log: s.full_log,
        agent_id: s.agent?.id || '000',
        agent_name: s.agent?.name || 'wazuh-manager',
        agent_ip: s.agent?.ip || null,
        service: svc.service,
        port: svc.port
      };
    });

    // One deduplicated, batched geo round trip for the whole page of alerts.
    // IP dengan override manual dilewati dari lookup jaringan (lokasinya sudah
    // pasti), termasuk IP privat lab yang sengaja dipetakan.
    const externalIps = normalized
      .filter(a => a.has_external_ip && !getOverride(a.source_ip))
      .map(a => a.source_ip);
    const { locations, stats: geoStats } = await resolveMany(externalIps);

    const enriched = normalized.map((alert) => {
      let geo;
      if (alert.has_external_ip) {
        // Override manual menang; lalu hasil GeoIP; null bila gagal - peta
        // melewati yang null daripada menggambar penyerang menimpa server.
        geo = getOverride(alert.source_ip) || locations.get(alert.source_ip) || null;
      } else {
        geo = { country: target.country, city: target.city, lat: target.lat, lon: target.lon };
      }

      return {
        ...alert,
        source_country: geo?.country || 'Unknown',
        source_city: geo?.city || 'Unknown',
        source_lat: geo?.lat ?? null,
        source_lon: geo?.lon ?? null,
        geo_resolved: !!geo,
        destination_country: target.country,
        destination_city: target.city,
        destination_lat: target.lat,
        destination_lon: target.lon
      };
    });

    return {
      success: true,
      count: enriched.length,
      alerts: enriched,
      meta: {
        window_hours: hours,
        limit,
        agent: agentId,
        read: readStats,
        geo: geoStats,
        total_ms: Number(process.hrtime.bigint() - started) / 1e6,
        cached: false
      }
    };
  }

  const replay = (payload) => ({ ...payload, meta: { ...payload.meta, cached: true } });

  async function getAlerts({ hours = 24, limit = 500, agentId = 'all' } = {}) {
    const shape = `${hours}:${limit}:${agentId}`;
    const key = `${await fileSignature()}:${shape}`;

    if (cached) {
      // alerts.json has not changed - the previous answer is still exact.
      if (cached.key === key) return replay(cached.payload);

      // The log grew, but on a busy manager it grows constantly. Rebuilding on
      // every append would mean never serving from cache at all, so hold the
      // last result briefly.
      if (cached.shape === shape && Date.now() - cached.builtAt < MIN_CACHE_MS) {
        return replay(cached.payload);
      }
    }

    // Collapse concurrent misses into one read instead of stampeding the file.
    if (inFlight) return inFlight;

    inFlight = build({ hours, limit, agentId })
      .then((payload) => {
        cached = { key, shape, payload, builtAt: Date.now() };
        return payload;
      })
      .finally(() => { inFlight = null; });

    return inFlight;
  }

  const listAgents = () => readAgents(clientKeysPath, serverName);

  return { getAlerts, getGeoMetrics, detectService, listAgents };
}

module.exports = { createAlertsService, detectService };
