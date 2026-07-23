'use strict';

const fs = require('fs');
const { readRecentAlerts } = require('./alertsReader');
const { resolveMany, getMetrics: getGeoMetrics } = require('./geoip');

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

function createAlertsService({ alertsPath, serverIp, target }) {
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

  async function build({ hours, limit }) {
    const started = process.hrtime.bigint();

    const { alerts: rawAlerts, stats: readStats } = await readRecentAlerts({
      filePath: alertsPath,
      hours,
      maxAlerts: limit,
      isRelevant
    });

    const normalized = rawAlerts.map((s, idx) => {
      const srcip = s.data?.srcip
        || s.data?.src_ip
        || s.data?.win?.eventdata?.ipAddress
        || s.agent?.ip
        || null;
      const external = !!srcip && !isPrivateIP(srcip);
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
        agent_name: s.agent?.name || 'wazuh-manager',
        service: svc.service,
        port: svc.port
      };
    });

    // One deduplicated, batched geo round trip for the whole page of alerts.
    const externalIps = normalized.filter(a => a.has_external_ip).map(a => a.source_ip);
    const { locations, stats: geoStats } = await resolveMany(externalIps);

    const enriched = normalized.map((alert) => {
      let geo;
      if (alert.has_external_ip) {
        // null when the lookup failed - the map skips these rather than
        // drawing the attacker on top of the defended server.
        geo = locations.get(alert.source_ip) || null;
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
        read: readStats,
        geo: geoStats,
        total_ms: Number(process.hrtime.bigint() - started) / 1e6,
        cached: false
      }
    };
  }

  const replay = (payload) => ({ ...payload, meta: { ...payload.meta, cached: true } });

  async function getAlerts({ hours = 24, limit = 500 } = {}) {
    const shape = `${hours}:${limit}`;
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

    inFlight = build({ hours, limit })
      .then((payload) => {
        cached = { key, shape, payload, builtAt: Date.now() };
        return payload;
      })
      .finally(() => { inFlight = null; });

    return inFlight;
  }

  return { getAlerts, getGeoMetrics, detectService };
}

module.exports = { createAlertsService, detectService };
