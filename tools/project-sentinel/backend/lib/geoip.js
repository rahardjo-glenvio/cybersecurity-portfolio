'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const axios = require('axios');

// ip-api.com free tier: /batch allows 15 requests/min, 100 IPs per request.
// The single-IP endpoint allows 45/min, which a busy alert feed blows through
// almost immediately - hence batching.
const BATCH_ENDPOINT = 'http://ip-api.com/batch';
const BATCH_FIELDS = 'status,message,country,city,lat,lon,query';
const BATCH_SIZE = 100;
const MAX_BATCHES_PER_CYCLE = 10;
// Stay a couple of requests under ip-api's documented 15/min so a burst of
// refreshes can never earn the host a temporary ban.
const BATCH_LIMIT_PER_MIN = 13;

const SUCCESS_TTL_MS = 12 * 3600 * 1000;
const FAILURE_TTL_MS = 30 * 60 * 1000;

const CACHE_DIR = path.join(__dirname, '..', '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'geoip.json');
const SAVE_DEBOUNCE_MS = 5000;

const client = axios.create({
  timeout: 8000,
  // One kept-alive connection instead of a fresh TCP+DNS round trip per lookup.
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 4 }),
  headers: { 'Content-Type': 'application/json' }
});

/** @type {Map<string, {geo: object|null, expires: number}>} */
const cache = new Map();
let saveTimer = null;
let loaded = false;

/** Timestamps of batch requests sent in the trailing 60 s. */
let recentBatches = [];

function batchBudgetLeft() {
  const cutoff = Date.now() - 60_000;
  recentBatches = recentBatches.filter(t => t > cutoff);
  return BATCH_LIMIT_PER_MIN - recentBatches.length;
}

const metrics = { hits: 0, misses: 0, batches: 0, resolved: 0, failed: 0, rateLimited: 0 };

function loadCache() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    const now = Date.now();
    let kept = 0;
    for (const [ip, entry] of Object.entries(raw)) {
      if (entry && entry.expires > now) { cache.set(ip, entry); kept++; }
    }
    if (kept) console.log(`[geoip] warm start: ${kept} cached locations`);
  } catch {
    // no cache yet, or unreadable - not worth failing over
  }
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(CACHE_FILE, JSON.stringify(Object.fromEntries(cache)), 'utf8');
    } catch (err) {
      console.warn('[geoip] cache save failed:', err.message);
    }
  }, SAVE_DEBOUNCE_MS);
  if (saveTimer.unref) saveTimer.unref();
}

// ── Manual location overrides ───────────────────────────────────────────────
// Sebagian IP tergeolokasi buruk oleh GeoIP (mis. Starlink/CGNAT yang egress-nya
// jauh dari lokasi fisik: dish di Purwokerto tapi IP keluar via gateway Jakarta).
// File known-locations.json memungkinkan operator menyematkan lokasi sebenarnya
// untuk IP tertentu. File bersifat opsional dan di-hot-reload saat berubah.
const OVERRIDE_FILE = path.join(__dirname, '..', 'known-locations.json');
let overrides = {};
let overridesMtime = -1;

function loadOverrides() {
  try {
    const stat = fs.statSync(OVERRIDE_FILE);
    if (stat.mtimeMs !== overridesMtime) {
      const raw = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf8'));
      const clean = {};
      for (const [ip, g] of Object.entries(raw)) {
        if (g && typeof g.lat === 'number' && typeof g.lon === 'number') {
          clean[ip] = {
            country: g.country || 'Unknown',
            city: g.city || 'Unknown',
            lat: g.lat,
            lon: g.lon
          };
        }
      }
      overrides = clean;
      overridesMtime = stat.mtimeMs;
      console.log(`[geoip] loaded ${Object.keys(overrides).length} manual location override(s)`);
    }
  } catch {
    // File tidak ada atau tidak valid: pertahankan yang lama (default: kosong).
    if (overridesMtime === -1) overrides = {};
  }
  return overrides;
}

/**
 * Resolves many IPs at once: deduplicates, serves what it can from cache, and
 * batches the rest. Never throws - unresolved IPs come back as null so callers
 * can label them honestly instead of inventing coordinates.
 *
 * @param {string[]} ips
 * @returns {Promise<{locations: Map<string, object|null>, stats: object}>}
 */
async function resolveMany(ips) {
  loadCache();
  const ov = loadOverrides();
  const started = process.hrtime.bigint();

  const unique = [...new Set(ips.filter(Boolean))];
  const locations = new Map();
  const missing = [];
  const now = Date.now();

  for (const ip of unique) {
    // Override manual menang atas cache maupun GeoIP.
    if (ov[ip]) { locations.set(ip, ov[ip]); metrics.hits++; continue; }
    const entry = cache.get(ip);
    if (entry && entry.expires > now) {
      locations.set(ip, entry.geo);
      metrics.hits++;
    } else {
      missing.push(ip);
      metrics.misses++;
    }
  }

  const chunks = [];
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    chunks.push(missing.slice(i, i + BATCH_SIZE));
  }

  let batchesSent = 0;
  let rateLimitHit = false;

  for (const chunk of chunks) {
    if (batchesSent >= MAX_BATCHES_PER_CYCLE) { rateLimitHit = true; break; }
    if (batchBudgetLeft() <= 0) {
      // Out of quota for this minute. Leave the rest unresolved and uncached
      // so the next refresh picks them up.
      rateLimitHit = true;
      break;
    }

    try {
      recentBatches.push(Date.now());
      const res = await client.post(`${BATCH_ENDPOINT}?fields=${BATCH_FIELDS}`, chunk);
      batchesSent++;
      metrics.batches++;

      for (const row of res.data || []) {
        const ip = row.query;
        if (!ip) continue;
        const ok = row.status === 'success' && typeof row.lat === 'number';
        const geo = ok
          ? { country: row.country, city: row.city, lat: row.lat, lon: row.lon }
          : null;
        locations.set(ip, geo);
        cache.set(ip, { geo, expires: Date.now() + (ok ? SUCCESS_TTL_MS : FAILURE_TTL_MS) });
        if (ok) metrics.resolved++; else metrics.failed++;
      }

      // ip-api reports the remaining quota in this window; back off before it bites.
      const remaining = parseInt(res.headers['x-rl'], 10);
      if (Number.isFinite(remaining) && remaining <= 1) { rateLimitHit = true; break; }
    } catch (err) {
      if (err.response && err.response.status === 429) {
        metrics.rateLimited++;
        rateLimitHit = true;
        console.warn('[geoip] rate limited by ip-api, deferring remaining lookups');
        break;
      }
      console.warn('[geoip] batch failed:', err.message);
      // Negative-cache briefly so one outage does not retry on every request.
      for (const ip of chunk) {
        if (!locations.has(ip)) {
          locations.set(ip, null);
          cache.set(ip, { geo: null, expires: Date.now() + FAILURE_TTL_MS });
        }
      }
      metrics.failed += chunk.length;
      break;
    }
  }

  // Anything still unaccounted for (deferred by rate limiting) stays null and
  // is NOT cached, so the next cycle retries it.
  for (const ip of unique) if (!locations.has(ip)) locations.set(ip, null);

  if (batchesSent) scheduleSave();

  return {
    locations,
    stats: {
      requested: ips.length,
      unique: unique.length,
      cacheHits: unique.length - missing.length,
      lookedUp: missing.length,
      batchesSent,
      rateLimitHit,
      ms: Number(process.hrtime.bigint() - started) / 1e6
    }
  };
}

function getMetrics() {
  return { ...metrics, cacheSize: cache.size };
}

/**
 * Lokasi override manual untuk satu IP, atau null. Hot-reload via mtime,
 * sama seperti resolveMany. Dipakai alertsService agar IP privat lab yang
 * sengaja dipetakan (known-locations.json) tetap tampil di lokasi itu,
 * alih-alih di-fallback ke titik server.
 */
function getOverride(ip) {
  if (!ip) return null;
  const ov = loadOverrides();
  return ov[ip] || null;
}

module.exports = { resolveMany, getMetrics, getOverride };
