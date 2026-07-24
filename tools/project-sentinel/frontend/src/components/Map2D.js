import React, { useEffect, useRef, useState } from 'react';
import './Map2D.css';

/* ── Reduced motion ─────────────────────────────────────────────────────────
   Pengguna yang menyetel "reduce motion" tidak mendapat peluru beranimasi;
   arc + marker tetap tampil (informasi utuh, tanpa gerakan yang mengganggu). */
const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── Impact ring saat peluru mencapai tujuan ─────────────────────────────── */
function spawnImpact(latlng, color, gen) {
  const L = window.L;
  if (!L || !window.attackLayers) return;
  if (gen !== undefined && gen !== window.animationGeneration) return;

  const icon = L.divIcon({
    className: '',
    html: `<div class="impact-ring" style="border-color:${color}"></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
  const m = L.marker(latlng, { icon, interactive: false }).addTo(window.attackLayers);
  const tid = setTimeout(() => {
    window.attackLayers?.hasLayer(m) && window.attackLayers.removeLayer(m);
  }, 1100);
  window.pulseTimeouts?.push(tid);
}

/* ── Ticker animasi terpadu ──────────────────────────────────────────────────
   SATU requestAnimationFrame loop menggerakkan SEMUA peluru. Sebelumnya tiap
   peluru punya loop sendiri (80-200 rAF simultan) yang membuat animasi berat
   dan patah-patah. Kini posisi seluruh peluru dihitung dan di-set dalam satu
   frame, lalu loop berhenti otomatis saat tak ada peluru (hemat CPU). */
function ensureTicker() {
  if (window.__snTickerId) return;
  if (!window.__snTravelers) window.__snTravelers = [];

  const frame = (now) => {
    const travelers = window.__snTravelers;
    const gen = window.animationGeneration;
    const layers = window.attackLayers;

    for (let i = travelers.length - 1; i >= 0; i--) {
      const tv = travelers[i];
      if (tv.gen !== gen) {
        layers && layers.hasLayer(tv.marker) && layers.removeLayer(tv.marker);
        travelers.splice(i, 1);
        continue;
      }
      const elapsed = now - tv.t0;
      const cycle = (elapsed / tv.duration) | 0;
      const p = (elapsed % tv.duration) / tv.duration; // linear, kecepatan konstan
      const pts = tv.points;
      const fi = p * (pts.length - 1);
      const lo = fi | 0;
      const hi = lo + 1 < pts.length ? lo + 1 : lo;
      const frac = fi - lo;
      const lat = pts[lo][0] + (pts[hi][0] - pts[lo][0]) * frac;
      const lng = pts[lo][1] + (pts[hi][1] - pts[lo][1]) * frac;
      tv.marker.setLatLng([lat, lng]);

      if (cycle > tv.lastCycle) {
        tv.lastCycle = cycle;
        spawnImpact(pts[pts.length - 1], tv.color, tv.gen);
      }
    }

    if (travelers.length === 0) {
      window.__snTickerId = null; // idle: hentikan loop, dihidupkan lagi saat ada peluru
      return;
    }
    window.__snTickerId = requestAnimationFrame(frame);
  };

  window.__snTickerId = requestAnimationFrame(frame);
}

function Map2D({ alerts, status }) {
  const mapRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [blackout, setBlackout] = useState(false);

  const smoothTransition = (action) => {
    setBlackout(true);
    setTimeout(() => {
      action();
      setTimeout(() => setBlackout(false), 300);
    }, 500);
  };

  useEffect(() => {
    const loadResource = (type, src) => {
      return new Promise((resolve, reject) => {
        const existing = document.querySelector(
          `${type}[${type === 'link' ? 'href' : 'src'}="${src}"]`
        );
        if (existing) { resolve(); return; }
        const el = document.createElement(type);
        if (type === 'link') { el.rel = 'stylesheet'; el.href = src; }
        else { el.src = src; }
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
      });
    };

    const init = async () => {
      try {
        await loadResource('link', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
        await loadResource('script', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        initMap();
        setMapReady(true);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    };

    if (!window.L) {
      init();
    } else {
      initMap();
      setMapReady(true);
    }

    return () => {
      stopAllAnimations();
      if (window.__snTickerId) {
        cancelAnimationFrame(window.__snTickerId);
        window.__snTickerId = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady) return;

    if (alerts && alerts.length > 0) {
      renderAttacks(alerts);
    } else {
      clearMap();
    }
  }, [alerts, mapReady]);

  const stopAllAnimations = () => {
    window.animationGeneration = (window.animationGeneration || 0) + 1;
    (window.pulseTimeouts || []).forEach(id => clearTimeout(id));
    window.pulseTimeouts = [];
    // Kosongkan daftar peluru: ticker berhenti otomatis pada frame berikutnya.
    window.__snTravelers = [];
  };

  const clearMap = () => {
    if (!window.attackLayers) return;

    setBlackout(true);
    stopAllAnimations();
    window.attackLayers.clearLayers();

    if (window.socMap) {
      setTimeout(() => {
        window.socMap.setView([20, 30], 2);
        setTimeout(() => setBlackout(false), 300);
      }, 300);
    } else {
      setBlackout(false);
    }
  };

  const initMap = () => {
    if (!mapRef.current || !window.L) return;
    const L = window.L;

    if (window.socMap) {
      window.socMap.remove();
    }

    const map = L.map(mapRef.current, {
      center: [20, 30],
      zoom: 2,
      minZoom: 2,
      maxZoom: 15,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      wheelDebounceTime: 80
    });

    // Prevent Leaflet from stealing page scroll when map container is focused
    const container = map.getContainer();
    container.addEventListener('focus', () => container.blur(), { capture: true, passive: true });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      opacity: 0.55,
      maxZoom: 15
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    window.socMap = map;
    window.attackLayers = L.layerGroup().addTo(map);
    window.animationGeneration = 0;
    window.pulseTimeouts = [];
    window.__snTravelers = [];
  };

  const getSeverityColor = (level) => {
    if (level >= 9) return '#ff2d55';
    if (level >= 7) return '#ff8800';
    if (level >= 5) return '#ffcc00';
    return '#22d3a6';
  };

  const getSeverityLabel = (level) => {
    if (level >= 9) return 'CRITICAL';
    if (level >= 7) return 'HIGH';
    if (level >= 5) return 'MEDIUM';
    return 'LOW';
  };

  // Easing untuk reveal arc (fade-in halus)
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  /* Kurva quadratic bezier: satu control point diangkat tegak lurus dari garis
     src->dst. Hasilnya benar-benar mulus (bukan pendekatan sinus per-segmen),
     dan 56 titik cukup karena bezier tidak punya sudut tajam. */
  const generateArcPoints = (start, end, n = 56) => {
    const dLat = end[0] - start[0];
    const dLng = end[1] - start[1];
    const dist = Math.hypot(dLat, dLng) || 1;
    const lift = Math.min(dist * 0.18, 26); // tinggi lengkung, dibatasi agar tak liar
    // vektor tegak lurus (unit) untuk mengangkat titik kontrol
    const nx = -dLng / dist;
    const ny = dLat / dist;
    const cLat = (start[0] + end[0]) / 2 + ny * lift;
    const cLng = (start[1] + end[1]) / 2 + nx * lift;

    const pts = new Array(n + 1);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const mt = 1 - t;
      const a = mt * mt, b = 2 * mt * t, c = t * t;
      pts[i] = [
        a * start[0] + b * cLat + c * end[0],
        a * start[1] + b * cLng + c * end[1],
      ];
    }
    return pts;
  };

  /* Daftarkan N peluru ke ticker terpadu (tidak lagi memulai rAF per peluru). */
  const animatePulse = (pathPoints, color, duration, gen, count = 3) => {
    const L = window.L;
    if (!L || prefersReducedMotion()) return; // hormati reduce-motion
    if (!window.__snTravelers) window.__snTravelers = [];

    const icon = L.divIcon({
      className: 'pulse-traveler',
      html: `<div class="tp-wrap"><div class="tp-core" style="background:${color};box-shadow:0 0 6px ${color},0 0 12px ${color}55"></div></div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const now = performance.now();
    for (let i = 0; i < count; i++) {
      if (gen !== window.animationGeneration || !window.attackLayers) return;
      const startOffset = (duration / count) * i;
      const marker = L.marker(pathPoints[0], { icon, interactive: false });
      marker.addTo(window.attackLayers);
      window.__snTravelers.push({
        marker,
        points: pathPoints,
        color,
        duration,
        gen,
        t0: now - startOffset, // mulai partway agar peluru tersebar merata di arc
        lastCycle: -1,
      });
    }
    ensureTicker();
  };

  const clusterAlerts = (data) => {
    const byIp = {};
    data.forEach(a => {
      const key = a.source_ip || 'unknown';
      if (!byIp[key] || a.rule_level > byIp[key].rule_level) {
        byIp[key] = { ...a, _count: 0 };
      }
      byIp[key]._count = (byIp[key]._count || 0) + 1;
    });
    return Object.values(byIp)
      .sort((a, b) => b.rule_level - a.rule_level)
      .slice(0, 40);
  };

  const renderAttacks = (data) => {
    if (!window.L || !window.socMap) return;

    const L = window.L;
    const map = window.socMap;

    setBlackout(true);
    stopAllAnimations();
    window.attackLayers?.clearLayers();

    if (!data || data.length === 0) {
      setTimeout(() => { map.setView([20, 30], 2); setBlackout(false); }, 500);
      return;
    }

    const gen = window.animationGeneration;

    const geoRaw = data.filter(a =>
      a.source_lat && a.source_lon &&
      a.destination_lat && a.destination_lon
    );

    if (geoRaw.length === 0) {
      setTimeout(() => { map.setView([20, 30], 2); setBlackout(false); }, 500);
      return;
    }

    const geo = clusterAlerts(geoRaw);

    const bounds = [];
    const destSeen = new Set();
    const reveal = []; // arc yang akan di-fade-in oleh SATU loop reveal

    geo.forEach((alert, idx) => {
      const color = getSeverityColor(alert.rule_level);
      const src = [alert.source_lat, alert.source_lon];
      const dst = [alert.destination_lat, alert.destination_lon];
      bounds.push(src, dst);

      const arc = generateArcPoints(src, dst);

      const line = L.polyline(arc, {
        color,
        weight: alert.rule_level >= 9 ? 1.6 : 1.1,
        opacity: 0,
        className: 'arc-line'
      }).addTo(window.attackLayers);

      reveal.push({ line, target: alert.rule_level >= 9 ? 0.62 : 0.5, delay: idx * 32 });

      line.bindPopup(`
        <div class="cp mini">
          <div class="cp-row">
            <span class="cp-val">${alert.source_city} → ${alert.destination_city}</span>
          </div>
          <div class="cp-row">
            <span class="cp-tag" style="color:${color}">${alert.service}${alert.port ? ':' + alert.port : ''}</span>
            <span class="sev-badge" style="background:${color}">${getSeverityLabel(alert.rule_level)}</span>
          </div>
        </div>
      `, { className: 'cp-wrap' });

      // Jumlah peluru per arc berdasarkan severity (dikurangi dari 2-5 ke 1-3
      // agar ringan di perangkat menengah tanpa kehilangan makna visual).
      const bulletCount = alert.rule_level >= 9 ? 3
                        : alert.rule_level >= 7 ? 2
                        : alert.rule_level >= 5 ? 2 : 1;
      const speed       = alert.rule_level >= 9 ? 1500
                        : alert.rule_level >= 7 ? 1900
                        : alert.rule_level >= 5 ? 2300 : 2900;
      animatePulse(arc, color, speed, gen, bulletCount);

      const countBadge = (alert._count > 1)
        ? `<span class="atk-count" style="color:${color}">${alert._count}×</span>`
        : '';

      const srcIcon = L.divIcon({
        className: '',
        html: `<div class="atk-marker">
          <div class="atk-ring" style="border-color:${color}"></div>
          <div class="atk-core" style="background:${color}">
            <span class="atk-port">${alert.port || '?'}</span>
          </div>
          ${countBadge}
          <div class="atk-label" style="color:${color}">${(alert.source_city || 'UNKNOWN').toUpperCase()}</div>
        </div>`,
        iconSize: [54, 54],
        iconAnchor: [27, 27]
      });

      const srcMarker = L.marker(src, { icon: srcIcon }).addTo(window.attackLayers);

      srcMarker.bindPopup(`
        <div class="cp">
          <div class="cp-header" style="border-bottom-color:${color}">
            <span class="sev-badge" style="background:${color}">${getSeverityLabel(alert.rule_level)}</span>
            <span class="cp-title">ATTACKER ORIGIN</span>
          </div>
          <div class="cp-body">
            <div class="cp-row"><span class="cp-key">IP</span><span class="cp-val">${alert.source_ip}</span></div>
            <div class="cp-row"><span class="cp-key">LOCATION</span><span class="cp-val">${alert.source_city}, ${alert.source_country}</span></div>
            <div class="cp-row"><span class="cp-key">EVENTS</span><span class="cp-val" style="color:${color}">${alert._count || 1} alert${alert._count !== 1 ? 's' : ''}</span></div>
            <div class="cp-divider"></div>
            <div class="cp-row"><span class="cp-key">TARGET</span><span class="cp-tag">${alert.service}:${alert.port || '?'}</span></div>
            <div class="cp-row"><span class="cp-key">METHOD</span><span class="cp-val">${alert.rule_description}</span></div>
            <div class="cp-row"><span class="cp-key">MITRE</span><span class="cp-mitre">${(alert.mitre_technique || []).join(', ') || 'N/A'}</span></div>
          </div>
        </div>
      `, { className: 'cp-wrap', maxWidth: 340 });

      srcMarker.on('click', () => setSelectedAlert(alert));

      const dkey = `${alert.destination_lat},${alert.destination_lon}`;
      if (!destSeen.has(dkey)) {
        destSeen.add(dkey);

        const dstIcon = L.divIcon({
          className: '',
          html: `<div class="srv-marker">
            <div class="srv-ring"></div>
            <div class="srv-ring d1"></div>
            <div class="srv-core"><span class="srv-text">SERVER</span></div>
            <div class="srv-city">${(alert.destination_city || 'TARGET').toUpperCase()}</div>
            <div class="srv-ip">${alert.destination_ip}</div>
          </div>`,
          iconSize: [80, 80],
          iconAnchor: [40, 40]
        });

        const dstMarker = L.marker(dst, { icon: dstIcon }).addTo(window.attackLayers);

        dstMarker.bindPopup(`
          <div class="cp">
            <div class="cp-header" style="border-bottom-color:#00ffcc">
              <span class="sev-badge" style="background:#00ffcc;color:#000">PROTECTED</span>
              <span class="cp-title">DEFENSE TARGET</span>
            </div>
            <div class="cp-body">
              <div class="cp-row"><span class="cp-key">SERVER IP</span><span class="cp-val">${alert.destination_ip}</span></div>
              <div class="cp-row"><span class="cp-key">LOCATION</span><span class="cp-val">${alert.destination_city}, ${alert.destination_country}</span></div>
              <div class="cp-row"><span class="cp-key">THREATS</span><span class="cp-val">${geoRaw.length}</span></div>
              <div class="cp-row"><span class="cp-key">CRITICAL</span><span class="cp-val" style="color:#ff2d55">${data.filter(a => a.rule_level >= 9).length}</span></div>
              <div class="cp-row"><span class="cp-key">HIGH</span><span class="cp-val" style="color:#ff8800">${data.filter(a => a.rule_level >= 7 && a.rule_level < 9).length}</span></div>
            </div>
          </div>
        `, { className: 'cp-wrap', maxWidth: 340 });

        dstMarker.on('click', () => setSelectedAlert({
          source_ip: alert.destination_ip,
          source_city: alert.destination_city,
          source_country: alert.destination_country,
          rule_description: `Under ${geoRaw.length} active threats`,
          service: 'SERVER',
          port: 'ALL',
          mitre_technique: []
        }));
      }
    });

    // Reveal arc: SATU loop rAF untuk semua arc (dulu satu loop per arc).
    if (!prefersReducedMotion() && reveal.length) {
      const revealStart = performance.now();
      const revealDur = 520;
      const doReveal = () => {
        if (gen !== window.animationGeneration) return;
        const t = performance.now() - revealStart;
        let done = true;
        for (const a of reveal) {
          const local = Math.min(Math.max((t - a.delay) / revealDur, 0), 1);
          a.line.setStyle({ opacity: easeOutCubic(local) * a.target });
          if (local < 1) done = false;
        }
        if (!done) requestAnimationFrame(doReveal);
      };
      requestAnimationFrame(doReveal);
    } else {
      reveal.forEach(a => a.line.setStyle({ opacity: a.target }));
    }

    if (bounds.length > 0) {
      setTimeout(() => {
        if (gen !== window.animationGeneration) return;
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 11, animate: false });
        setTimeout(() => setBlackout(false), 300);
      }, 500);
    } else {
      setTimeout(() => setBlackout(false), 500);
    }
  };

  const safeAlerts = alerts || [];
  const geoAlerts = safeAlerts.filter(a => a.source_lat);
  const criticalCount = safeAlerts.filter(a => a.rule_level >= 9).length;
  const highCount = safeAlerts.filter(a => a.rule_level >= 7 && a.rule_level < 9).length;
  const mediumCount = safeAlerts.filter(a => a.rule_level >= 5 && a.rule_level < 7).length;
  const uniqueSources = new Set(geoAlerts.map(a => a.source_ip)).size;

  return (
    <div className="map-wrap">
      <div className={`map-blackout ${blackout ? 'active' : ''}`} />

      <div className="map-vignette" />

      <div className="hud-tl">
        <div className="hud-header-inner">
          <div className="hud-live-dot" />
          <div className="hud-title">THREAT MONITOR</div>
        </div>
        <div className="hud-sub">Real-time attack map</div>
      </div>

      <div className="hud-tr">
        <div className="hud-box">
          <span className="hud-num">{geoAlerts.length}</span>
          <span className="hud-lbl">{uniqueSources > 0 ? `${uniqueSources} sources` : 'threats'}</span>
        </div>
        <div className="hud-box crit">
          <span className="hud-num">{criticalCount}</span>
          <span className="hud-lbl">critical</span>
        </div>
        <div className="hud-box high">
          <span className="hud-num">{highCount}</span>
          <span className="hud-lbl">high</span>
        </div>
        <div className="hud-box med">
          <span className="hud-num">{mediumCount}</span>
          <span className="hud-lbl">medium</span>
        </div>
      </div>

      <div className="hud-bl">
        <button
          className="hud-btn"
          onClick={() => smoothTransition(() => window.socMap?.setView([20, 30], 2))}
        >
          Global
        </button>
        <button
          className="hud-btn"
          onClick={() => {
            if (!window.socMap || !safeAlerts.length) return;
            const pts = safeAlerts
              .filter(a => a.source_lat && a.destination_lat)
              .flatMap(a => [
                [a.source_lat, a.source_lon],
                [a.destination_lat, a.destination_lon]
              ]);
            if (pts.length) {
              smoothTransition(() =>
                window.socMap.fitBounds(pts, {
                  padding: [80, 80],
                  maxZoom: 11,
                  animate: false
                })
              );
            }
          }}
        >
          Fit attacks
        </button>
        <button
          className="hud-btn"
          onClick={() => smoothTransition(() => window.socMap?.setView([-7.4, 109.2], 11))}
        >
          Zoom target
        </button>
      </div>

      {safeAlerts.length === 0 && mapReady && (
        <div className="map-empty-state">
          <svg className="empty-icon" viewBox="0 0 24 24" width="52" height="52" fill="none"
               stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
               aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="empty-title">NO THREATS DETECTED</div>
          <div className="empty-subtitle">System is monitoring for suspicious activity</div>
        </div>
      )}

      {selectedAlert && (
        <div className="detail-panel">
          <div className="dp-header">
            <span>Threat detail</span>
            <button onClick={() => setSelectedAlert(null)} aria-label="Tutup detail">✕</button>
          </div>
          {[
            ['FROM', `${selectedAlert.source_city}, ${selectedAlert.source_country}`],
            ['IP', selectedAlert.source_ip],
            ['SERVICE', `${selectedAlert.service}:${selectedAlert.port || '?'}`],
            ['METHOD', selectedAlert.rule_description],
            ['MITRE', (selectedAlert.mitre_technique || []).join(', ') || 'N/A'],
          ].map(([k, v]) => (
            <div className="dp-row" key={k}>
              <span className="dp-key">{k}</span>
              <span className="dp-val">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="map-status-bar">
        <div className="status-item">
          <div className={`status-dot-sm ${status === 'offline' ? 'off' : ''}`} />
          <span className={`status-online ${status === 'offline' ? 'off' : ''}`}>
            {status === 'online' ? 'SYSTEM ONLINE' : status === 'offline' ? 'BACKEND OFFLINE' : 'CHECKING…'}
          </span>
        </div>
        <div className="status-spacer" />
        <div className="status-item dim">WAZUH IDS</div>
        <div className="status-item dim">MITRE ATT&CK</div>
        <div className="status-item dim">SENTINEL v2.0</div>
      </div>

      <div ref={mapRef} className="map-canvas" />
      {!mapReady && (
        <div className="map-loading">Initializing threat map…</div>
      )}
    </div>
  );
}

export default Map2D;
