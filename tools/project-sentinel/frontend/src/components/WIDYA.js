import React, { useMemo, useState, useEffect } from 'react';
import WIDYAIntro from './WIDYAIntro';
import './WIDYA.css';

// ─── Color maps ───────────────────────────────────────────────────────────────
const SVC_COLOR = {
  SSH: '#00ccff', HTTP: '#ff8800', HTTPS: '#ff8800',
  MySQL: '#ff0044', RDP: '#ff0044', FTP: '#ffdd00',
  SMTP: '#a855f7', AUTH: '#00ffcc', FIM: '#00ffcc',
  DNS: '#60a5fa', OTHER: '#6b7280',
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, size = 160, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;

  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 10;
  const innerR = outerR * 0.58;

  const polar = (ang, r) => ({
    x: cx + r * Math.cos((ang - 90) * Math.PI / 180),
    y: cy + r * Math.sin((ang - 90) * Math.PI / 180),
  });

  let cur = 0;
  const slices = data.map(d => {
    const start = cur;
    const sweep = (d.value / total) * 359.99;
    cur += sweep;
    const la = sweep > 180 ? 1 : 0;
    const os = polar(start, outerR), oe = polar(cur, outerR);
    const is_ = polar(start, innerR), ie = polar(cur, innerR);
    return {
      ...d,
      path: `M${os.x},${os.y} A${outerR},${outerR} 0 ${la} 1 ${oe.x},${oe.y} L${ie.x},${ie.y} A${innerR},${innerR} 0 ${la} 0 ${is_.x},${is_.y}Z`,
    };
  });

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <filter id="wglow">
          <feGaussianBlur stdDeviation="2.5" result="cb" />
          <feMerge><feMergeNode in="cb" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color}
          stroke="rgba(0,0,0,0.4)" strokeWidth={1.5}
          filter="url(#wglow)" opacity={0.92} />
      ))}
      {centerLabel && (
        <>
          <text x={cx} y={cy - 5} textAnchor="middle" fill="#ffffff"
            fontSize={Math.round(size * 0.13)} fontWeight="bold"
            fontFamily="Orbitron, monospace">{total}</text>
          <text x={cx} y={cy + 11} textAnchor="middle" fill="#3a6a80"
            fontSize={Math.round(size * 0.052)} fontFamily="Courier New, monospace"
            letterSpacing={1}>{centerLabel}</text>
        </>
      )}
    </svg>
  );
}

// ─── Horizontal Bar ───────────────────────────────────────────────────────────
function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="widya-hbar">
      <span className="widya-hbar-label">{label}</span>
      <div className="widya-hbar-track">
        <div className="widya-hbar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="widya-hbar-val">{value}</span>
    </div>
  );
}

// ─── Risk Gauge ───────────────────────────────────────────────────────────────
function RiskGauge({ score }) {
  const color = score >= 70 ? '#ff0044' : score >= 45 ? '#ff8800' : score >= 20 ? '#ffdd00' : '#00ff88';
  const label = score >= 70 ? 'CRITICAL' : score >= 45 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';
  const R = 38, C = 2 * Math.PI * R;
  const dash = (score / 100) * C;

  return (
    <div className="widya-gauge">
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={R} fill="none"
          stroke="rgba(255,255,255,0.05)" strokeWidth={9} />
        <circle cx={48} cy={48} r={R} fill="none"
          stroke={color} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`}
          strokeDashoffset={C / 4}
          style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray 1s ease' }} />
        <text x={48} y={44} textAnchor="middle" fill={color}
          fontSize={19} fontWeight="bold" fontFamily="Orbitron, monospace">{score}</text>
        <text x={48} y={57} textAnchor="middle" fill="#3a6a80"
          fontSize={6.5} fontFamily="Courier New, monospace" letterSpacing={1}>{label}</text>
      </svg>
    </div>
  );
}

// ─── AI Text Generator ────────────────────────────────────────────────────────
function generateBrief(alerts, topSvc, topCtry, critCount) {
  if (!alerts.length) return 'No active threats detected. All systems nominal. Passive monitoring engaged.';
  const n = alerts.length;
  const tier = critCount >= 3 ? 'critically elevated' : critCount >= 1 ? 'moderately elevated' : 'low-level';
  const verb = critCount > 0 ? `${critCount} critical event${critCount > 1 ? 's' : ''} demand immediate escalation.` : 'No critical incidents at this time.';
  return `WIDYA has processed ${n} security event${n > 1 ? 's' : ''} and assessed the overall threat posture as ${tier}. The dominant attack vector is ${topSvc} exploitation, with ${topCtry} identified as the primary threat origin. ${verb} Continuous behavioral analysis is active.`;
}

function generateRecs(alerts, svcData) {
  const recs = [];
  const top = svcData[0]?.label || '';
  if (top === 'SSH') recs.push('Enforce SSH key-based auth and disable password login');
  if (top === 'HTTP' || top === 'HTTPS') recs.push('Deploy WAF rules to block web application exploits');
  if (svcData.some(s => s.label === 'RDP')) recs.push('Restrict RDP behind VPN and enable Network Level Auth');
  if (svcData.some(s => s.label === 'MySQL')) recs.push('Isolate DB port 3306, apply strict IP allowlist');
  if (alerts.filter(a => a.rule_level >= 9).length > 0) recs.push('Escalate critical alerts to incident response team');
  recs.push('Review firewall rules based on detected attack patterns');
  recs.push('Enable multi-factor authentication on all admin accounts');
  return recs.slice(0, 4);
}

// ─── Main WIDYA Component ─────────────────────────────────────────────────────
export default function WIDYA({ alerts, onClose }) {
  const [showIntro, setShowIntro] = useState(true);
  const [scanning, setScanning] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    setScanning(true);
    const t = setTimeout(() => setScanning(false), 1800);
    return () => clearTimeout(t);
  }, [alerts]);

  const analysis = useMemo(() => {
    if (!alerts?.length) return null;

    // Service distribution
    const svcMap = {};
    alerts.forEach(a => { svcMap[a.service] = (svcMap[a.service] || 0) + 1; });
    const serviceData = Object.entries(svcMap)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ label, value, color: SVC_COLOR[label] || SVC_COLOR.OTHER }));

    // Country distribution
    const ctryMap = {};
    alerts.forEach(a => { ctryMap[a.source_country] = (ctryMap[a.source_country] || 0) + 1; });
    const countryData = Object.entries(ctryMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value], i) => ({
        label, value,
        color: i === 0 ? '#ff0044' : i === 1 ? '#ff8800' : '#00ccff',
      }));

    // Severity
    const crit = alerts.filter(a => a.rule_level >= 9).length;
    const high = alerts.filter(a => a.rule_level >= 7 && a.rule_level < 9).length;
    const med  = alerts.filter(a => a.rule_level >= 5 && a.rule_level < 7).length;
    const low  = alerts.filter(a => a.rule_level < 5).length;
    const sevData = [
      { label: 'Critical', value: crit, color: '#ff0044' },
      { label: 'High',     value: high, color: '#ff8800' },
      { label: 'Medium',   value: med,  color: '#ffdd00' },
      { label: 'Low',      value: low,  color: '#00ff88' },
    ].filter(d => d.value > 0);

    // MITRE
    const mitreMap = {};
    alerts.forEach(a => (a.mitre_technique || []).forEach(t => {
      mitreMap[t] = (mitreMap[t] || 0) + 1;
    }));
    const mitreData = Object.entries(mitreMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value, color: '#a855f7' }));

    // Risk score
    const riskScore = Math.min(100, Math.round(
      (crit * 18 + high * 9 + med * 4 + low * 1) + (crit > 0 ? 25 : 0) + (high > 2 ? 15 : 0)
    ));

    const topSvc = serviceData[0]?.label || 'Unknown';
    const topCtry = countryData[0]?.label || 'Unknown';
    const brief = generateBrief(alerts, topSvc, topCtry, crit);
    const recs = generateRecs(alerts, serviceData);

    return { serviceData, countryData, sevData, mitreData, riskScore, brief, recs, crit, topSvc, topCtry };
  }, [alerts]);

  const tabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'attacks',  label: 'ATTACKS'  },
    { id: 'geo',      label: 'GEO'      },
    { id: 'intel',    label: 'INTEL'    },
  ];

  if (showIntro) {
    return (
      <WIDYAIntro
        alertCount={alerts?.length || 0}
        onComplete={() => setShowIntro(false)}
      />
    );
  }

  return (
    <div className="widya-panel">

      {/* Header */}
      <div className="widya-header">
        <div className="widya-title-row">
          <div className="widya-branding">
            <div className="widya-eye-icon">👁</div>
            <div>
              <div className="widya-name">WIDYA</div>
              <div className="widya-fullname">Wazuh Intelligent Defense Yield Analyzer</div>
            </div>
          </div>
          <button className="widya-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="widya-tabs">
          {tabs.map(t => (
            <button key={t.id}
              className={`widya-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="widya-body">

        {scanning ? (
          <div className="widya-scanning">
            <div className="widya-scan-ring" />
            <div className="widya-scan-ring widya-scan-ring-2" />
            <div className="widya-scan-label">ANALYZING THREAT DATA...</div>
            <div className="widya-scan-sub">WIDYA is processing {alerts?.length || 0} events</div>
          </div>

        ) : !analysis ? (
          <div className="widya-empty">
            <div style={{ fontSize: 32, opacity: 0.4 }}>📡</div>
            <div>No alert data available</div>
          </div>

        ) : (
          <>
            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="widya-sections">
                <div className="widya-row-2">
                  <div className="widya-card">
                    <div className="widya-card-title">RISK SCORE</div>
                    <RiskGauge score={analysis.riskScore} />
                  </div>
                  <div className="widya-card">
                    <div className="widya-card-title">SEVERITY</div>
                    <DonutChart data={analysis.sevData} size={96} centerLabel="EVENTS" />
                    <div className="widya-legend-sm">
                      {analysis.sevData.map(d => (
                        <div key={d.label} className="widya-leg-sm-item">
                          <span className="widya-leg-dot" style={{ background: d.color }} />
                          <span>{d.label} <b>{d.value}</b></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="widya-card">
                  <div className="widya-card-title">
                    <span className="widya-ai-badge">AI</span> THREAT BRIEF
                  </div>
                  <p className="widya-brief">{analysis.brief}</p>
                </div>

                <div className="widya-card">
                  <div className="widya-card-title">RECOMMENDATIONS</div>
                  <ul className="widya-recs">
                    {analysis.recs.map((r, i) => (
                      <li key={i}><span className="widya-rec-arrow">▸</span>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── ATTACKS ── */}
            {activeTab === 'attacks' && (
              <div className="widya-sections">
                <div className="widya-card">
                  <div className="widya-card-title">ATTACK TYPE DISTRIBUTION</div>
                  <div className="widya-chart-row">
                    <DonutChart data={analysis.serviceData} size={150} centerLabel="ATTACKS" />
                    <div className="widya-legend">
                      {analysis.serviceData.map(d => (
                        <div key={d.label} className="widya-leg-item">
                          <span className="widya-leg-dot" style={{ background: d.color }} />
                          <span className="widya-leg-label">{d.label}</span>
                          <span className="widya-leg-count">{d.value}</span>
                          <span className="widya-leg-pct">
                            {Math.round(d.value / alerts.length * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="widya-card">
                  <div className="widya-card-title">VOLUME PER SERVICE</div>
                  {analysis.serviceData.map(d => (
                    <HBar key={d.label} label={d.label} value={d.value}
                      max={analysis.serviceData[0].value} color={d.color} />
                  ))}
                </div>
              </div>
            )}

            {/* ── GEO ── */}
            {activeTab === 'geo' && (
              <div className="widya-sections">
                <div className="widya-card">
                  <div className="widya-card-title">TOP ATTACKING COUNTRIES</div>
                  {analysis.countryData.map(d => (
                    <HBar key={d.label} label={d.label} value={d.value}
                      max={analysis.countryData[0].value} color={d.color} />
                  ))}
                </div>

                <div className="widya-card">
                  <div className="widya-card-title">GEOGRAPHIC SUMMARY</div>
                  <div className="widya-geo-grid">
                    <div className="widya-geo-stat">
                      <span className="widya-geo-num">{analysis.countryData.length}</span>
                      <span className="widya-geo-lbl">SOURCE COUNTRIES</span>
                    </div>
                    <div className="widya-geo-stat">
                      <span className="widya-geo-num" style={{ color: '#ff0044', fontSize: 13 }}>
                        {analysis.topCtry}
                      </span>
                      <span className="widya-geo-lbl">TOP THREAT ORIGIN</span>
                    </div>
                    <div className="widya-geo-stat">
                      <span className="widya-geo-num">{analysis.countryData[0]?.value}</span>
                      <span className="widya-geo-lbl">ATTACKS FROM #1</span>
                    </div>
                    <div className="widya-geo-stat">
                      <span className="widya-geo-num">{analysis.crit}</span>
                      <span className="widya-geo-lbl" style={{ color: '#ff0044' }}>CRITICAL EVENTS</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── INTEL ── */}
            {activeTab === 'intel' && (
              <div className="widya-sections">
                <div className="widya-card">
                  <div className="widya-card-title">MITRE ATT&CK TECHNIQUES</div>
                  {analysis.mitreData.map(d => (
                    <HBar key={d.label} label={d.label} value={d.value}
                      max={analysis.mitreData[0].value} color="#a855f7" />
                  ))}
                </div>

                <div className="widya-card">
                  <div className="widya-card-title">ATTACK TIMELINE</div>
                  <div className="widya-timeline">
                    {alerts.slice(0, 6).map((a, i) => {
                      const col = a.rule_level >= 9 ? '#ff0044' : a.rule_level >= 7 ? '#ff8800' : '#ffdd00';
                      const time = new Date(a.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return (
                        <div key={i} className="widya-tl-item">
                          <div className="widya-tl-line" />
                          <div className="widya-tl-dot" style={{ background: col, boxShadow: `0 0 6px ${col}` }} />
                          <div className="widya-tl-body">
                            <div className="widya-tl-title">
                              <span style={{ color: col }}>{a.service}</span>
                              {' '}from {a.source_city}, {a.source_country}
                            </div>
                            <div className="widya-tl-desc">{(a.rule_description || '').slice(0, 44)}</div>
                          </div>
                          <div className="widya-tl-time">{time}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="widya-footer">
        <span className="widya-footer-dot" />
        <span>WIDYA v1.0 ONLINE</span>
        <span className="widya-footer-sep">|</span>
        <span>{alerts?.length || 0} EVENTS ANALYZED</span>
      </div>
    </div>
  );
}
