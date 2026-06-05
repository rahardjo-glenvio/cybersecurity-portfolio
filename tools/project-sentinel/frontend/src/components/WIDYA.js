import React, { useMemo, useState, useEffect, useRef } from 'react';
import WIDYAIntro from './WIDYAIntro';
import './WIDYA.css';

// ─── Colors ───────────────────────────────────────────────────────────────────
const SVC_COLOR = {
  SSH:'#00ccff', HTTP:'#ff8800', HTTPS:'#ff8800', MySQL:'#ff0044',
  RDP:'#ff0044', FTP:'#ffdd00', SMTP:'#a855f7', AUTH:'#00ffcc',
  FIM:'#00ffcc', DNS:'#60a5fa', OTHER:'#4a6a80',
};

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data, size = 110, centerLabel }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const cx = size / 2, cy = size / 2;
  const outerR = size / 2 - 8, innerR = outerR * 0.6;
  const polar = (a, r) => ({
    x: cx + r * Math.cos((a - 90) * Math.PI / 180),
    y: cy + r * Math.sin((a - 90) * Math.PI / 180),
  });
  let cur = 0;
  const slices = data.map(d => {
    const start = cur, sweep = (d.value / total) * 359.99;
    cur += sweep;
    const la = sweep > 180 ? 1 : 0;
    const os = polar(start, outerR), oe = polar(cur, outerR);
    const is_ = polar(start, innerR), ie = polar(cur, innerR);
    return { ...d, path: `M${os.x},${os.y} A${outerR},${outerR} 0 ${la} 1 ${oe.x},${oe.y} L${ie.x},${ie.y} A${innerR},${innerR} 0 ${la} 0 ${is_.x},${is_.y}Z` };
  });
  return (
    <svg width={size} height={size}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
      ))}
      {centerLabel && <>
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#fff"
          fontSize={Math.round(size * 0.14)} fontWeight="bold" fontFamily="Orbitron,monospace">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#1e4055"
          fontSize={Math.round(size * 0.055)} fontFamily="Courier New,monospace" letterSpacing={1}>{centerLabel}</text>
      </>}
    </svg>
  );
}

// ─── Risk Gauge ───────────────────────────────────────────────────────────────
function RiskGauge({ score }) {
  const color = score >= 70 ? '#ff0044' : score >= 45 ? '#ff8800' : score >= 20 ? '#ffdd00' : '#00ff88';
  const label = score >= 70 ? 'CRITICAL' : score >= 45 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';
  const R = 32, C = 2 * Math.PI * R, dash = (score / 100) * C;
  return (
    <svg width={80} height={80} viewBox="0 0 80 80">
      <circle cx={40} cy={40} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={8} />
      <circle cx={40} cy={40} r={R} fill="none" stroke={color} strokeWidth={8}
        strokeLinecap="round" strokeDasharray={`${dash} ${C}`} strokeDashoffset={C / 4}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      <text x={40} y={37} textAnchor="middle" fill={color}
        fontSize={16} fontWeight="bold" fontFamily="Orbitron,monospace">{score}</text>
      <text x={40} y={50} textAnchor="middle" fill="#1e4055"
        fontSize={6} fontFamily="Courier New,monospace" letterSpacing={1}>{label}</text>
    </svg>
  );
}

// ─── HBar ─────────────────────────────────────────────────────────────────────
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

// ─── Analysis Engine ──────────────────────────────────────────────────────────
function buildAnalysis(alerts) {
  if (!alerts?.length) return null;
  const svcMap = {}, ctryMap = {}, mitreMap = {};
  alerts.forEach(a => {
    svcMap[a.service] = (svcMap[a.service] || 0) + 1;
    ctryMap[a.source_country] = (ctryMap[a.source_country] || 0) + 1;
    (a.mitre_technique || []).forEach(t => { mitreMap[t] = (mitreMap[t] || 0) + 1; });
  });
  const crit = alerts.filter(a => a.rule_level >= 9).length;
  const high = alerts.filter(a => a.rule_level >= 7 && a.rule_level < 9).length;
  const med  = alerts.filter(a => a.rule_level >= 5 && a.rule_level < 7).length;
  const low  = alerts.filter(a => a.rule_level < 5).length;
  const serviceData = Object.entries(svcMap).sort((a,b)=>b[1]-a[1])
    .map(([l,v]) => ({ label:l, value:v, color: SVC_COLOR[l]||SVC_COLOR.OTHER }));
  const countryData = Object.entries(ctryMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([l,v],i) => ({ label:l, value:v, color: i===0?'#ff0044':i===1?'#ff8800':'#00ccff' }));
  const mitreData = Object.entries(mitreMap).sort((a,b)=>b[1]-a[1]).slice(0,6)
    .map(([l,v]) => ({ label:l, value:v, color:'#a855f7' }));
  const sevData = [
    { label:'Critical', value:crit, color:'#ff0044' },
    { label:'High',     value:high, color:'#ff8800' },
    { label:'Medium',   value:med,  color:'#ffdd00' },
    { label:'Low',      value:low,  color:'#00ff88' },
  ].filter(d => d.value > 0);
  const riskScore = Math.min(100, Math.round(
    (crit*18 + high*9 + med*4 + low*1) + (crit>0?25:0) + (high>2?15:0)
  ));
  const topSvc  = serviceData[0]?.label || 'Unknown';
  const topCtry = countryData[0]?.label || 'Unknown';
  const brief = !alerts.length
    ? 'Tidak ada ancaman aktif. Sistem dalam kondisi normal.'
    : `WIDYA telah memproses ${alerts.length} security event. Postur ancaman ${crit>=3?'kritis':crit>=1?'elevated':'rendah'}. Vektor serangan dominan: ${topSvc} dari ${topCtry}. ${crit>0?`${crit} event kritis memerlukan eskalasi segera.`:'Tidak ada event kritis saat ini.'}`;
  const recs = [];
  if (topSvc==='SSH') recs.push('Terapkan autentikasi berbasis SSH key, nonaktifkan login password');
  if (topSvc==='HTTP'||topSvc==='HTTPS') recs.push('Deploy WAF untuk memblokir web application exploits');
  if (serviceData.some(s=>s.label==='RDP')) recs.push('Batasi RDP di balik VPN, aktifkan Network Level Authentication');
  if (serviceData.some(s=>s.label==='MySQL')) recs.push('Isolasi port 3306, terapkan IP allowlist yang ketat');
  if (crit>0) recs.push('Eskalasi event critical ke tim incident response');
  recs.push('Tinjau firewall rules berdasarkan pola serangan yang terdeteksi');
  recs.push('Aktifkan multi-factor authentication pada semua akun admin');
  return { serviceData, countryData, mitreData, sevData, riskScore, brief, recs:recs.slice(0,4), crit, topSvc, topCtry, total: alerts.length };
}

// ─── Response Builder ─────────────────────────────────────────────────────────
function buildResponse(cmd, analysis, alerts) {
  if (!analysis) return [{ type:'text', text:'Belum ada data alert. Pastikan koneksi ke Wazuh aktif.' }];

  const cmdLower = cmd.toLowerCase();

  if (cmdLower.includes('risk') || cmdLower.includes('skor')) {
    return [
      { type:'text', text:`Risk Score sistem kamu saat ini adalah **${analysis.riskScore}/100** dengan status **${analysis.riskScore>=70?'CRITICAL':analysis.riskScore>=45?'HIGH':analysis.riskScore>=20?'MEDIUM':'LOW'}**.` },
      { type:'risk', score: analysis.riskScore, crit: analysis.crit, total: analysis.total },
    ];
  }
  if (cmdLower.includes('serang') || cmdLower.includes('distribusi') || cmdLower.includes('attack')) {
    return [
      { type:'text', text:`Terdeteksi ${analysis.total} serangan dari ${analysis.serviceData.length} jenis vektor. Terbanyak via **${analysis.topSvc}**.` },
      { type:'attacks', serviceData: analysis.serviceData, total: analysis.total },
    ];
  }
  if (cmdLower.includes('negara') || cmdLower.includes('geo') || cmdLower.includes('country') || cmdLower.includes('asal')) {
    return [
      { type:'text', text:`Serangan berasal dari ${analysis.countryData.length} negara. Ancaman terbesar dari **${analysis.topCtry}**.` },
      { type:'geo', countryData: analysis.countryData },
    ];
  }
  if (cmdLower.includes('mitre') || cmdLower.includes('teknik') || cmdLower.includes('taktik')) {
    return [
      { type:'text', text:`Ditemukan ${analysis.mitreData.length} teknik MITRE ATT&CK yang teridentifikasi dalam event aktif.` },
      { type:'mitre', mitreData: analysis.mitreData },
    ];
  }
  if (cmdLower.includes('brief') || cmdLower.includes('ringkas') || cmdLower.includes('analisis') || cmdLower.includes('summary')) {
    return [
      { type:'text', text:'Berikut ringkasan analisis ancaman saat ini:' },
      { type:'brief', text: analysis.brief },
    ];
  }
  if (cmdLower.includes('saran') || cmdLower.includes('rekomend') || cmdLower.includes('langkah') || cmdLower.includes('tips')) {
    return [
      { type:'text', text:'Berikut rekomendasi tindakan berdasarkan pola serangan yang terdeteksi:' },
      { type:'recs', recs: analysis.recs },
    ];
  }
  if (cmdLower.includes('timeline') || cmdLower.includes('terbaru') || cmdLower.includes('recent')) {
    return [
      { type:'text', text:`6 event terbaru dari ${analysis.total} total serangan:` },
      { type:'timeline', alerts: alerts.slice(0,6) },
    ];
  }
  if (cmdLower.includes('severity') || cmdLower.includes('keparahan') || cmdLower.includes('tingkat')) {
    return [
      { type:'text', text:`Distribusi keparahan: ${analysis.crit} Critical, ${analysis.sevData.find(s=>s.label==='High')?.value||0} High, ${analysis.sevData.find(s=>s.label==='Medium')?.value||0} Medium.` },
      { type:'severity', sevData: analysis.sevData },
    ];
  }
  if (cmdLower.includes('halo') || cmdLower.includes('hai') || cmdLower.includes('hello') || cmdLower.includes('hi')) {
    return [{ type:'text', text:`Halo! 👁 Aku WIDYA, analis ancaman siber yang siap membantumu. Saat ini aku mendeteksi **${analysis.total} event aktif**. Mau aku analisis yang mana dulu?` }];
  }
  if (cmdLower.includes('semua') || cmdLower.includes('all') || cmdLower.includes('lengkap')) {
    return [
      { type:'text', text:`Laporan lengkap: ${analysis.total} event, risk score ${analysis.riskScore}, ${analysis.crit} critical, dari ${analysis.countryData.length} negara.` },
      { type:'risk', score: analysis.riskScore, crit: analysis.crit, total: analysis.total },
      { type:'attacks', serviceData: analysis.serviceData, total: analysis.total },
      { type:'geo', countryData: analysis.countryData },
      { type:'brief', text: analysis.brief },
    ];
  }
  return [{ type:'text', text:`Maaf, aku tidak mengerti perintah itu. Coba gunakan tombol di bawah atau ketik: **risk score**, **distribusi serangan**, **top negara**, **mitre**, **threat brief**, **rekomendasi**, atau **timeline**.` }];
}

// ─── Render Response Item ─────────────────────────────────────────────────────
function ResponseItem({ item }) {
  if (item.type === 'text') {
    const html = (item.text||'').replace(/\*\*(.*?)\*\*/g, '<b style="color:#a0c8e0">$1</b>');
    return <div className="widya-msg-text" dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (item.type === 'risk') return (
    <div className="widya-data-card">
      <div className="widya-data-title">RISK SCORE</div>
      <div className="widya-risk-row">
        <RiskGauge score={item.score} />
        <div className="widya-risk-info">
          <div className="widya-risk-label" style={{ color: item.score>=70?'#ff0044':item.score>=45?'#ff8800':item.score>=20?'#ffdd00':'#00ff88' }}>
            {item.score}/100
          </div>
          <div className="widya-risk-sub">{item.crit} CRITICAL · {item.total} TOTAL</div>
        </div>
      </div>
    </div>
  );
  if (item.type === 'attacks') return (
    <div className="widya-data-card">
      <div className="widya-data-title">DISTRIBUSI SERANGAN</div>
      <div className="widya-chart-row">
        <DonutChart data={item.serviceData} size={110} centerLabel="ATTACKS" />
        <div className="widya-legend">
          {item.serviceData.map(d => (
            <div key={d.label} className="widya-leg-item">
              <span className="widya-leg-dot" style={{ background: d.color }} />
              <span className="widya-leg-label">{d.label}</span>
              <span className="widya-leg-count">{d.value}</span>
              <span className="widya-leg-pct">{Math.round(d.value/item.total*100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (item.type === 'severity') return (
    <div className="widya-data-card">
      <div className="widya-data-title">TINGKAT KEPARAHAN</div>
      <div className="widya-chart-row">
        <DonutChart data={item.sevData} size={110} centerLabel="EVENTS" />
        <div className="widya-legend">
          {item.sevData.map(d => (
            <div key={d.label} className="widya-leg-item">
              <span className="widya-leg-dot" style={{ background: d.color }} />
              <span className="widya-leg-label">{d.label}</span>
              <span className="widya-leg-count">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (item.type === 'geo') return (
    <div className="widya-data-card">
      <div className="widya-data-title">TOP NEGARA PENYERANG</div>
      {item.countryData.map(d => (
        <HBar key={d.label} label={d.label} value={d.value} max={item.countryData[0].value} color={d.color} />
      ))}
    </div>
  );
  if (item.type === 'mitre') return (
    <div className="widya-data-card">
      <div className="widya-data-title">MITRE ATT&CK TECHNIQUES</div>
      {item.mitreData.map(d => (
        <HBar key={d.label} label={d.label} value={d.value} max={item.mitreData[0].value} color="#a855f7" />
      ))}
    </div>
  );
  if (item.type === 'brief') return (
    <div className="widya-data-card">
      <div className="widya-data-title">AI THREAT BRIEF</div>
      <p className="widya-brief-text">{item.text}</p>
    </div>
  );
  if (item.type === 'recs') return (
    <div className="widya-data-card">
      <div className="widya-data-title">REKOMENDASI</div>
      <ul className="widya-recs">
        {item.recs.map((r,i) => (
          <li key={i}><span className="widya-rec-num">0{i+1}</span>{r}</li>
        ))}
      </ul>
    </div>
  );
  if (item.type === 'timeline') return (
    <div className="widya-data-card">
      <div className="widya-data-title">ATTACK TIMELINE</div>
      <div className="widya-timeline">
        {item.alerts.map((a,i) => {
          const col = a.rule_level>=9?'#ff0044':a.rule_level>=7?'#ff8800':'#ffdd00';
          const time = new Date(a.timestamp).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
          return (
            <div key={i} className="widya-tl-item">
              <div className="widya-tl-dot" style={{ background:col, boxShadow:`0 0 5px ${col}` }} />
              <div className="widya-tl-body">
                <div className="widya-tl-title"><span style={{color:col}}>{a.service}</span> · {a.source_city}, {a.source_country}</div>
                <div className="widya-tl-desc">{(a.rule_description||'').slice(0,48)}</div>
              </div>
              <div className="widya-tl-time">{time}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return null;
}

// ─── Quick Chips ──────────────────────────────────────────────────────────────
const CHIPS = [
  { label:'📊 Risk Score',    cmd:'risk score'          },
  { label:'🥧 Serangan',      cmd:'distribusi serangan' },
  { label:'🌍 Negara',        cmd:'top negara'          },
  { label:'🎯 MITRE',         cmd:'mitre'               },
  { label:'📝 Brief',         cmd:'threat brief'        },
  { label:'💡 Saran',         cmd:'rekomendasi'         },
  { label:'📅 Timeline',      cmd:'timeline'            },
  { label:'⚡ Severity',      cmd:'severity'            },
];

// ─── Main WIDYA Component ─────────────────────────────────────────────────────
export default function WIDYA({ alerts, onClose }) {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  const analysis = useMemo(() => buildAnalysis(alerts), [alerts]);

  // Welcome message on open
  useEffect(() => {
    if (!showIntro) {
      const n = alerts?.length || 0;
      setMessages([{
        from: 'widya',
        items: [{ type:'text', text:`Analisis dimulai 👁 Aku mendeteksi **${n} event aktif** saat ini. Pilih topik di bawah atau ketik pertanyaan kamu.` }]
      }]);
    }
  }, [showIntro, alerts?.length]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = (cmd) => {
    const text = cmd || input.trim();
    if (!text) return;
    setInput('');

    // Add user message
    setMessages(prev => [...prev, { from:'user', text }]);
    setIsTyping(true);

    // Simulate WIDYA "thinking" then respond
    setTimeout(() => {
      const responseItems = buildResponse(text, analysis, alerts || []);
      setIsTyping(false);
      setMessages(prev => [...prev, { from:'widya', items: responseItems }]);
    }, 600 + Math.random() * 400);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
        <div className="widya-branding">
          <div className="widya-eye-icon">👁</div>
          <div>
            <div className="widya-name">WIDYA</div>
            <div className="widya-fullname">Wazuh Intelligent Defense Yield Analyzer</div>
          </div>
        </div>
        <button className="widya-close-btn" onClick={onClose}>✕</button>
      </div>

      {/* Status */}
      <div className="widya-status-bar">
        <div className="widya-status-dot" />
        <span>ONLINE</span>
        <span style={{ color:'rgba(0,204,255,0.15)' }}>|</span>
        <span>{alerts?.length || 0} EVENTS ANALYZED</span>
      </div>

      {/* Chat area */}
      <div className="widya-chat-area" ref={chatRef}>
        {messages.map((msg, i) => (
          msg.from === 'user' ? (
            <div key={i} className="user-msg">
              <div className="user-msg-bubble">{msg.text}</div>
            </div>
          ) : (
            <div key={i} className="widya-msg">
              <div className="widya-msg-avatar">👁</div>
              <div className="widya-msg-body">
                {msg.items.map((item, j) => (
                  <ResponseItem key={j} item={item} />
                ))}
              </div>
            </div>
          )
        ))}

        {isTyping && (
          <div className="widya-typing">
            <div className="widya-msg-avatar" style={{ width:26, height:26, borderRadius:'50%', background:'rgba(0,204,255,0.08)', border:'1px solid rgba(0,204,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>👁</div>
            <div className="widya-typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Quick chips */}
      <div className="widya-chips-wrap">
        {CHIPS.map(c => (
          <button key={c.cmd} className="widya-chip"
            onClick={() => sendMessage(c.cmd)}
            disabled={isTyping}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="widya-input-bar">
        <input
          className="widya-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Tanya WIDYA sesuatu..."
          disabled={isTyping}
        />
        <button className="widya-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || isTyping}>
          ▸
        </button>
      </div>
    </div>
  );
}
