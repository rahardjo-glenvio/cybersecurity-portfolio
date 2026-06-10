import React, { useEffect, useRef, useState } from 'react';
import './Map2D.css';

function Map2D({ alerts }) {
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

    return () => stopAllAnimations();
  }, []);

  // BUG FIX: Handle both empty and non-empty alerts
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
  };

  // NEW: Clear map function
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
      opacity: 0.5,
      maxZoom: 15
    }).addTo(map);

    L.control.zoom({ position: 'topleft' }).addTo(map);

    window.socMap = map;
    window.attackLayers = L.layerGroup().addTo(map);
    window.animationGeneration = 0;
    window.pulseTimeouts = [];
  };

  const getSeverityColor = (level) => {
    if (level >= 9) return '#ff0044';
    if (level >= 7) return '#ff8800';
    if (level >= 5) return '#ffdd00';
    return '#00ff88';
  };

  const getSeverityLabel = (level) => {
    if (level >= 9) return 'CRITICAL';
    if (level >= 7) return 'HIGH';
    if (level >= 5) return 'MEDIUM';
    return 'LOW';
  };

  const generateArcPoints = (start, end, n = 120) => {
    const pts = [];
    const dist = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[1] - start[1], 2));
    const h = dist * 0.2;
    const dx = end[1] - start[1], dy = end[0] - start[0];
    const len = Math.sqrt(dx * dx + dy * dy) || 1;

    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const lat = start[0] + (end[0] - start[0]) * t;
      const lng = start[1] + (end[1] - start[1]) * t;
      const arc = Math.sin(t * Math.PI) * h;
      pts.push([lat + (dx / len) * arc * 0.5, lng - (dy / len) * arc * 0.5]);
    }
    return pts;
  };

  // Keep for arc fade-in only; pulse uses linear
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  // Spawn N simultaneous pulses on one arc, staggered evenly — no gaps ever
  const animatePulse = (pathPoints, color, duration, gen, count = 4) => {
    const L = window.L;
    if (!L) return;

    const icon = L.divIcon({
      className: 'pulse-traveler',
      html: `<div class="tp-wrap">
        <div class="tp-core" style="background:${color};box-shadow:0 0 6px ${color},0 0 12px ${color}55"></div>
      </div>`,
      iconSize: [10, 10],
      iconAnchor: [5, 5]
    });

    // One independent looping traveler, offset by `startOffset` ms
    const spawnTraveler = (startOffset) => {
      if (gen !== window.animationGeneration || !window.attackLayers) return;

      const pulse = L.marker(pathPoints[0], { icon, interactive: false });
      pulse.addTo(window.attackLayers);

      // Subtract startOffset so this traveler begins partway through the path
      const t0 = performance.now() - startOffset;
      let lastCycle = -1;

      const loop = () => {
        if (gen !== window.animationGeneration) {
          window.attackLayers?.hasLayer(pulse) && window.attackLayers.removeLayer(pulse);
          return;
        }

        const elapsed = performance.now() - t0;
        const cycle   = Math.floor(elapsed / duration);

        // Pure linear progress — constant speed, no slowdown at endpoints
        const p = (elapsed % duration) / duration;

        const fi   = p * (pathPoints.length - 1);
        const lo   = fi | 0;                                  // fast Math.floor
        const hi   = lo + 1 < pathPoints.length ? lo + 1 : lo;
        const frac = fi - lo;
        const lat  = pathPoints[lo][0] + (pathPoints[hi][0] - pathPoints[lo][0]) * frac;
        const lng  = pathPoints[lo][1] + (pathPoints[hi][1] - pathPoints[lo][1]) * frac;
        pulse.setLatLng([lat, lng]);

        // Impact ring each time the bullet wraps around to destination
        if (cycle > lastCycle) {
          lastCycle = cycle;
          spawnImpact(pathPoints[pathPoints.length - 1], color, gen);
        }

        requestAnimationFrame(loop);
      };

      requestAnimationFrame(loop);
    };

    // Spawn all N travelers immediately, each offset in path progress
    for (let i = 0; i < count; i++) {
      const startOffset = (duration / count) * i;
      spawnTraveler(startOffset);
    }
  };

  const spawnImpact = (latlng, color, gen) => {
    const L = window.L;
    if (!L || !window.attackLayers) return;
    if (gen !== undefined && gen !== window.animationGeneration) return;

    const icon = L.divIcon({
      className: '',
      html: `<div class="impact-ring" style="border-color:${color}"></div>`,
      iconSize: [30, 30], 
      iconAnchor: [15, 15]
    });
    const m = L.marker(latlng, { icon, interactive: false }).addTo(window.attackLayers);
    const tid = setTimeout(() => {
      window.attackLayers?.hasLayer(m) && window.attackLayers.removeLayer(m);
    }, 1200);
    window.pulseTimeouts?.push(tid);
  };

  // ─── Deduplicate + cluster alerts by source IP for perf ────────────────────
  const clusterAlerts = (data) => {
    // Group by source_ip, keep highest-severity alert per IP
    const byIp = {};
    data.forEach(a => {
      const key = a.source_ip || 'unknown';
      if (!byIp[key] || a.rule_level > byIp[key].rule_level) {
        byIp[key] = { ...a, _count: 0 };
      }
      byIp[key]._count = (byIp[key]._count || 0) + 1;
    });
    // Sort by severity desc, cap at MAX_SOURCES unique origins
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

    // Only keep alerts with valid coords
    const geoRaw = data.filter(a =>
      a.source_lat && a.source_lon &&
      a.destination_lat && a.destination_lon
    );

    if (geoRaw.length === 0) {
      setTimeout(() => { map.setView([20, 30], 2); setBlackout(false); }, 500);
      return;
    }

    // Cluster: max 40 unique source IPs, best severity per IP
    const geo = clusterAlerts(geoRaw);

    const bounds = [];
    const destSeen = new Set();

    geo.forEach((alert, idx) => {
      const color = getSeverityColor(alert.rule_level);
      const src = [alert.source_lat, alert.source_lon];
      const dst = [alert.destination_lat, alert.destination_lon];
      bounds.push(src, dst);

      const arc = generateArcPoints(src, dst);

      const line = L.polyline(arc, {
        color,
        weight: alert.rule_level >= 9 ? 1.5 : 1,
        opacity: 0,
        className: 'arc-line'
      }).addTo(window.attackLayers);

      const tid = setTimeout(() => {
        if (gen !== window.animationGeneration) return;
        const dur = 600, t0 = performance.now();
        const fade = () => {
          if (gen !== window.animationGeneration) return;
          const p = easeOutCubic(Math.min((performance.now() - t0) / dur, 1));
          line.setStyle({ opacity: p * 0.55 });
          if (p < 1) requestAnimationFrame(fade);
        };
        requestAnimationFrame(fade);
      }, idx * 80);
      window.pulseTimeouts?.push(tid);

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

      // Bullet count + speed by severity: critical = 5 fast, high = 4, med = 3, low = 2
      const bulletCount = alert.rule_level >= 9 ? 5
                        : alert.rule_level >= 7 ? 4
                        : alert.rule_level >= 5 ? 3 : 2;
      const speed       = alert.rule_level >= 9 ? 1400
                        : alert.rule_level >= 7 ? 1800
                        : alert.rule_level >= 5 ? 2200 : 2800;
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
              <div class="cp-row"><span class="cp-key">CRITICAL</span><span class="cp-val" style="color:#ff0044">${data.filter(a => a.rule_level >= 9).length}</span></div>
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
  // Unique source IPs (what's actually rendered on map)
  const uniqueSources = new Set(geoAlerts.map(a => a.source_ip)).size;

  return (
    <div className="map-wrap">
      <div className={`map-blackout ${blackout ? 'active' : ''}`} />

      <div className="scanline-overlay" />
      <div className="scan-beam" />
      <div className="map-vignette" />

      <div className="hud-tl">
        <div className="hud-header-inner">
          <div className="hud-live-dot" />
          <div className="hud-title">WAZUH THREAT MONITOR</div>
        </div>
        <div className="hud-sub">▸ REAL-TIME ATTACK VISUALIZATION</div>
      </div>

      <div className="hud-tr">
        <div className="hud-box">
          <span className="hud-num">{geoAlerts.length}</span>
          <span className="hud-lbl">{uniqueSources > 0 ? `${uniqueSources} SRC` : 'THREATS'}</span>
        </div>
        <div className="hud-box crit">
          <span className="hud-num">{criticalCount}</span>
          <span className="hud-lbl">CRITICAL</span>
        </div>
        <div className="hud-box high">
          <span className="hud-num">{highCount}</span>
          <span className="hud-lbl">HIGH</span>
        </div>
        <div className="hud-box med">
          <span className="hud-num">{mediumCount}</span>
          <span className="hud-lbl">MEDIUM</span>
        </div>
      </div>

      <div className="hud-bl">
        <button 
          className="hud-btn" 
          onClick={() => smoothTransition(() => window.socMap?.setView([20, 30], 2))}
        >
          GLOBAL VIEW
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
          FIT ATTACKS
        </button>
        <button 
          className="hud-btn" 
          onClick={() => smoothTransition(() => window.socMap?.setView([-7.4, 109.2], 11))}
        >
          ZOOM TARGET
        </button>
      </div>

      {safeAlerts.length === 0 && mapReady && (
        <div className="map-empty-state">
          <div className="empty-icon">⚠</div>
          <div className="empty-title">NO THREATS DETECTED</div>
          <div className="empty-subtitle">System is monitoring for suspicious activity</div>
        </div>
      )}

      {selectedAlert && (
        <div className="detail-panel">
          <div className="dp-header">
            <span>▸ THREAT DETAIL</span>
            <button onClick={() => setSelectedAlert(null)}>✕</button>
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
          <div className="status-dot-sm" />
          <span className="status-online">SYSTEM ONLINE</span>
        </div>
        <div className="status-item">SENTINEL v2.0</div>
        <div className="status-item">WAZUH IDS INTEGRATION</div>
        <div className="status-item">ENGINE: ACTIVE</div>
        <div className="status-scrolling">
          <span className="status-ticker">
            ████ MONITORING ALL NETWORK INTERFACES &nbsp;|&nbsp; THREAT INTELLIGENCE FEED: ACTIVE &nbsp;|&nbsp; MITRE ATT&CK FRAMEWORK: ENABLED &nbsp;|&nbsp; GEO-IP RESOLUTION: RUNNING &nbsp;|&nbsp; ANOMALY DETECTION: ONLINE &nbsp;|&nbsp; TLS INSPECTION: ENABLED &nbsp;████
          </span>
        </div>
      </div>

      <div ref={mapRef} className="map-canvas" />
      {!mapReady && (
        <div className="map-loading">▸ INITIALIZING THREAT MAP...</div>
      )}
    </div>
  );
}

export default Map2D;
