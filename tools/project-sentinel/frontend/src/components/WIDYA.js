import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import WIDYAIntro from './WIDYAIntro';
import WIDYASpread from './WIDYASpread';
import './WIDYA.css';

// ─── Reusable avatar with photo + fallback ────────────────────────────────────
function WIDYAAvatar({ size = 26 }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="widya-avatar" style={{ width: size, height: size, flexShrink: 0 }}>
      {imgOk ? (
        <img
          src="/widya-face.png"
          alt="WIDYA"
          className="widya-avatar-img"
          onError={() => setImgOk(false)}
        />
      ) : (
        <span className="widya-avatar-fallback">AI</span>
      )}
    </div>
  );
}

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
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#e0f4ff"
          fontSize={Math.round(size * 0.14)} fontWeight="bold" fontFamily="Orbitron,monospace">{total}</text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="rgba(0,200,240,0.45)"
          fontSize={Math.round(size * 0.058)} fontFamily="Courier New,monospace" letterSpacing={1}>{centerLabel}</text>
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
      <text x={40} y={50} textAnchor="middle" fill="rgba(0,200,240,0.45)"
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
        <div className="widya-hbar-fill"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}80` }} />
      </div>
      <span className="widya-hbar-val">{value}</span>
    </div>
  );
}

// ─── Analysis Engine ──────────────────────────────────────────────────────────
function buildAnalysis(alerts) {
  if (!alerts?.length) return null;
  const svcMap = {}, ctryMap = {}, mitreMap = {}, ipMap = {};
  alerts.forEach(a => {
    svcMap[a.service] = (svcMap[a.service] || 0) + 1;
    ctryMap[a.source_country] = (ctryMap[a.source_country] || 0) + 1;
    (a.mitre_technique || []).forEach(t => { mitreMap[t] = (mitreMap[t] || 0) + 1; });
    if (a.source_ip) ipMap[a.source_ip] = (ipMap[a.source_ip] || 0) + 1;
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
  const riskLabel = riskScore >= 70 ? 'CRITICAL' : riskScore >= 45 ? 'HIGH' : riskScore >= 20 ? 'MEDIUM' : 'LOW';
  const topSvc    = serviceData[0]?.label || 'Unknown';
  const topCtry   = countryData[0]?.label || 'Unknown';
  const topMitre  = mitreData[0]?.label   || 'Unknown';
  const topIp     = Object.entries(ipMap).sort((a,b)=>b[1]-a[1])[0];
  const uniqueIPs = Object.keys(ipMap).length;

  // ── Extended multi-paragraph brief ────────────────────────────────────────
  const riskSentence = riskScore >= 70
    ? `Status sistem berada di level **CRITICAL** — terdapat ancaman aktif yang memerlukan respons segera dari tim keamanan.`
    : riskScore >= 45
    ? `Status sistem berada di level **HIGH** — pola serangan menunjukkan aktivitas berbahaya yang perlu ditangani dalam waktu dekat.`
    : riskScore >= 20
    ? `Status sistem berada di level **MEDIUM** — serangan terdeteksi namun belum ada indikasi breach yang berhasil.`
    : `Status sistem berada di level **LOW** — aktivitas mencurigakan minimal, sistem dalam kondisi relatif aman.`;

  const critSentence = crit > 0
    ? `**${crit} event Critical** terdeteksi — ini mengindikasikan serangan dengan tingkat bahaya tinggi yang berpotensi mengakibatkan unauthorized access, data exfiltration, atau gangguan layanan. Eskalasi ke tim Incident Response diperlukan segera.`
    : `Tidak ada event Critical yang terdeteksi saat ini, namun pemantauan aktif harus tetap berjalan.`;

  const svcSentence = topSvc === 'SSH'
    ? `Vektor serangan dominan adalah **SSH (port 22)** yang merupakan target klasik brute-force dan credential stuffing. Penyerang mencoba menebak password admin secara otomatis menggunakan wordlist.`
    : topSvc === 'HTTP' || topSvc === 'HTTPS'
    ? `Vektor serangan dominan adalah **${topSvc}** — mengindikasikan upaya web application attack, directory traversal, atau injection attack terhadap layanan web yang terekspos.`
    : `Vektor serangan dominan adalah **${topSvc}** dengan ${serviceData[0]?.value || 0} kejadian tercatat dalam periode monitoring ini.`;

  const geoSentence = countryData.length > 1
    ? `Serangan berasal dari **${countryData.length} negara berbeda**, dengan penyerang terbanyak dari **${topCtry}** (${countryData[0]?.value} serangan), diikuti **${countryData[1]?.label}** (${countryData[1]?.value} serangan). Distribusi multi-negara ini mengindikasikan kemungkinan penggunaan botnet atau proxy chain oleh penyerang.`
    : `Seluruh serangan berasal dari **${topCtry}** — pola serangan terpusat ini perlu diinvestigasi lebih lanjut.`;

  const mitreSentence = topMitre !== 'Unknown'
    ? `Teknik MITRE ATT&CK yang paling banyak digunakan adalah **${topMitre}**, yang menunjukkan bahwa penyerang berfokus pada fase ${topMitre.toLowerCase().includes('brute') || topMitre.toLowerCase().includes('password') ? 'Initial Access melalui credential compromise' : topMitre.toLowerCase().includes('scan') || topMitre.toLowerCase().includes('recon') ? 'Reconnaissance untuk pemetaan permukaan serangan' : 'eksekusi teknik ofensif tertentu dalam kill chain'}.`
    : '';

  const brief = [
    `WIDYA telah menganalisis **${alerts.length} security event** dari **${uniqueIPs} unique IP address** dalam 24 jam terakhir. Risk Score sistem: **${riskScore}/100**.`,
    riskSentence,
    critSentence,
    svcSentence,
    geoSentence,
    mitreSentence,
  ].filter(Boolean).join('\n\n');

  // ── Detailed recommendations ──────────────────────────────────────────────
  const recs = [];
  if (topSvc === 'SSH') recs.push(
    'Nonaktifkan password authentication pada SSH — ganti dengan SSH key-based authentication. Edit /etc/ssh/sshd_config: set PasswordAuthentication no, PubkeyAuthentication yes. Restart sshd setelah perubahan.'
  );
  if (topSvc === 'HTTP' || topSvc === 'HTTPS') recs.push(
    'Deploy Web Application Firewall (WAF) seperti ModSecurity atau AWS WAF untuk memblokir SQL injection, XSS, dan path traversal. Aktifkan OWASP Core Rule Set dan tinjau log akses secara berkala.'
  );
  if (serviceData.some(s => s.label === 'RDP')) recs.push(
    'Batasi akses RDP hanya melalui VPN dengan MFA. Nonaktifkan RDP jika tidak digunakan. Aktifkan Network Level Authentication (NLA) dan terapkan account lockout policy setelah 5 percobaan gagal.'
  );
  if (serviceData.some(s => s.label === 'MySQL')) recs.push(
    'Blokir port 3306 dari akses publik menggunakan firewall. Buat user MySQL dengan privilege minimal (principle of least privilege). Aktifkan audit log MySQL untuk memantau query yang mencurigakan.'
  );
  if (crit > 0) recs.push(
    `Eskalasi ${crit} event Critical ke tim Incident Response. Lakukan isolasi host yang terdampak, ambil forensic snapshot, dan review auth log (/var/log/auth.log) untuk trace aktivitas attacker.`
  );
  if (countryData.length >= 2) recs.push(
    `Terapkan geo-blocking untuk negara-negara dengan serangan terbanyak (${countryData.slice(0,3).map(c=>c.label).join(', ')}) menggunakan iptables atau fail2ban dengan GeoIP database.`
  );
  recs.push('Aktifkan Multi-Factor Authentication (MFA) pada semua akun administrator dan akun dengan akses privileged. Gunakan TOTP (Google Authenticator/Authy) atau hardware key (YubiKey).');
  recs.push('Tinjau dan perbarui firewall rules — blokir semua port yang tidak diperlukan, terapkan default-deny policy, dan whitelist hanya IP/range yang legitimate untuk layanan kritis.');

  return {
    serviceData, countryData, mitreData, sevData, riskScore, riskLabel,
    brief, recs: recs.slice(0, 5),
    crit, high, med, low,
    topSvc, topCtry, topMitre, topIp, uniqueIPs,
    total: alerts.length,
  };
}

// ─── Response Builder ─────────────────────────────────────────────────────────
function buildResponse(cmd, analysis, alerts) {
  if (!analysis) return [{ type:'text', text:'Belum ada data alert. Pastikan koneksi ke Wazuh aktif dan data real alerts sudah dipilih.' }];

  const cmdLower = cmd.toLowerCase();
  const { riskScore, riskLabel, crit, high, med, low, total, topSvc, topCtry, topMitre, uniqueIPs, serviceData, countryData, sevData } = analysis;

  // ── Risk Score ──────────────────────────────────────────────────────────────
  if (cmdLower.includes('risk') || cmdLower.includes('skor')) {
    const detail = riskScore >= 70
      ? `Risk Score **${riskScore}/100** mengindikasikan kondisi **CRITICAL**. Sistem saat ini sedang mengalami serangan aktif dengan tingkat bahaya tinggi.\n\nDengan **${crit} event Critical** dan **${high} event High** yang terdeteksi, ada kemungkinan penyerang sedang dalam tahap privilege escalation atau lateral movement. Tindakan isolasi dan investigasi forensik harus dilakukan segera.\n\nJangan tunda — setiap menit penundaan memberikan waktu tambahan bagi penyerang untuk memperluas akses mereka di dalam sistem.`
      : riskScore >= 45
      ? `Risk Score **${riskScore}/100** mengindikasikan kondisi **HIGH**. Terdapat serangan aktif yang perlu ditangani dalam waktu kurang dari 1 jam.\n\nDeteksi **${crit} Critical** dan **${high} High** event menunjukkan bahwa penyerang sedang aktif mencoba mendapatkan akses. Walaupun belum ada indikasi breach yang berhasil, window of opportunity bagi penyerang masih terbuka.\n\nPrioritaskan review log autentikasi dan terapkan temporary block pada IP sumber serangan.`
      : riskScore >= 20
      ? `Risk Score **${riskScore}/100** berada di level **MEDIUM**. Sistem mendeteksi serangan namun tidak ada tanda-tanda compromise aktif saat ini.\n\nTotal **${total} security event** terdeteksi dengan **${med} event Medium** sebagai mayoritas. Pola ini umum untuk server yang terekspos ke internet — sebagian besar serangan bersifat oportunistik dan otomatis (bot scanning).\n\nLakukan hardening bertahap sambil memantau log secara aktif setiap hari.`
      : `Risk Score **${riskScore}/100** berada di level **LOW**. Sistem dalam kondisi relatif aman.\n\nHanya terdeteksi **${low} event Low severity** — kemungkinan berupa traffic scanning biasa atau percobaan akses yang langsung digagalkan oleh sistem. Tidak ada indikasi ancaman serius saat ini.\n\nTerus pantau dan lakukan security assessment rutin setiap minggu untuk mempertahankan postur keamanan ini.`;
    return [
      { type:'text', text: detail },
      { type:'risk', score: riskScore, crit, total },
    ];
  }

  // ── Attack Distribution ─────────────────────────────────────────────────────
  if (cmdLower.includes('serang') || cmdLower.includes('distribusi') || cmdLower.includes('attack') || cmdLower.includes('vektor')) {
    const svcDetails = serviceData.slice(0, 3).map(s => {
      const ctx = s.label === 'SSH'
        ? 'Brute-force / credential stuffing — penyerang mencoba ribuan kombinasi password'
        : s.label === 'HTTP' || s.label === 'HTTPS'
        ? 'Web attack — SQL injection, XSS, atau directory traversal terhadap aplikasi web'
        : s.label === 'RDP'
        ? 'Remote Desktop attack — target utama ransomware operators'
        : s.label === 'MySQL'
        ? 'Database attack — eksploitasi port DB yang terekspos ke publik'
        : s.label === 'FTP'
        ? 'FTP brute-force — protokol lama tanpa enkripsi, rentan credential theft'
        : s.label === 'FIM'
        ? 'File Integrity event — perubahan file sistem yang tidak diotorisasi'
        : `Serangan via layanan ${s.label}`;
      return `• **${s.label}** (${s.value} event): ${ctx}`;
    }).join('\n');

    return [
      { type:'text', text:`Terdeteksi **${total} total serangan** melalui **${serviceData.length} jenis vektor** berbeda dari **${uniqueIPs} unique source IP**.\n\n${svcDetails}\n\nVektor dominan **${topSvc}** menyumbang ${Math.round(serviceData[0]?.value/total*100)}% dari seluruh serangan. Pola ini konsisten dengan teknik Initial Access dalam MITRE ATT&CK framework — penyerang mencari titik masuk pertama sebelum melakukan eskalasi.` },
      { type:'attacks', serviceData, total },
    ];
  }

  // ── Geo / Country ───────────────────────────────────────────────────────────
  if (cmdLower.includes('negara') || cmdLower.includes('geo') || cmdLower.includes('country') || cmdLower.includes('asal') || cmdLower.includes('dari mana') || cmdLower.includes('siapa') || cmdLower.includes('penyerang')) {
    const ctryList = countryData.slice(0, 3).map((c, i) =>
      `${i===0?'🔴':i===1?'🟠':'🔵'} **${c.label}** — ${c.value} serangan (${Math.round(c.value/total*100)}%)`
    ).join('\n');
    const geoNote = countryData.length >= 3
      ? `\n\nDistribusi multi-negara ini merupakan indikator penggunaan **botnet** atau **proxy/TOR exit node** oleh penyerang. IP address yang tampak berasal dari berbagai negara bisa jadi hanya relay — origin sesungguhnya bisa berbeda. Gunakan threat intelligence database untuk klasifikasi IP yang lebih akurat.`
      : '';
    return [
      { type:'text', text:`Serangan berasal dari **${countryData.length} negara berbeda**. Distribusi teratas:\n\n${ctryList}${geoNote}` },
      { type:'geo', countryData },
    ];
  }

  // ── MITRE ATT&CK ────────────────────────────────────────────────────────────
  if (cmdLower.includes('mitre') || cmdLower.includes('teknik') || cmdLower.includes('taktik') || cmdLower.includes('att&ck')) {
    const mitreCtx = analysis.mitreData.slice(0, 4).map(m => {
      const phase = m.label.toLowerCase().includes('brute') || m.label.toLowerCase().includes('password') || m.label.toLowerCase().includes('guessing')
        ? 'TA0006 · Credential Access'
        : m.label.toLowerCase().includes('scan') || m.label.toLowerCase().includes('recon')
        ? 'TA0043 · Reconnaissance'
        : m.label.toLowerCase().includes('injection') || m.label.toLowerCase().includes('sql')
        ? 'TA0001 · Initial Access'
        : m.label.toLowerCase().includes('integrity') || m.label.toLowerCase().includes('fim')
        ? 'TA0005 · Defense Evasion'
        : m.label.toLowerCase().includes('phish')
        ? 'TA0001 · Initial Access'
        : 'TA0000 · Aktif';
      return `• **${m.label}** (${m.value}×) — ${phase}`;
    }).join('\n');

    return [
      { type:'text', text:`Ditemukan **${analysis.mitreData.length} teknik MITRE ATT&CK** yang teridentifikasi dalam event aktif.\n\n${mitreCtx}\n\nTeknik dominan **${topMitre}** mengindikasikan penyerang berada pada fase awal kill chain. ${topMitre !== 'Unknown' && (topMitre.toLowerCase().includes('brute') || topMitre.toLowerCase().includes('password')) ? 'Serangan brute-force masif ini biasanya dilakukan secara otomatis oleh tools seperti Hydra, Medusa, atau Ncrack — tanda bahwa target kamu ada di internet-facing attack surface.' : 'Pantau escalation ke teknik-teknik lateral movement seperti Pass-the-Hash atau Remote Services.'}` },
      { type:'mitre', mitreData: analysis.mitreData },
    ];
  }

  // ── Threat Brief / Summary ──────────────────────────────────────────────────
  if (cmdLower.includes('brief') || cmdLower.includes('ringkas') || cmdLower.includes('analisis') || cmdLower.includes('summary') || cmdLower.includes('laporan singkat')) {
    return [
      { type:'text', text:`Berikut laporan analisis ancaman komprehensif berdasarkan **${total} event** yang diproses WIDYA:` },
      { type:'brief', text: analysis.brief },
    ];
  }

  // ── Recommendations ─────────────────────────────────────────────────────────
  if (cmdLower.includes('saran') || cmdLower.includes('rekomend') || cmdLower.includes('langkah') || cmdLower.includes('tips') || cmdLower.includes('mitigasi') || cmdLower.includes('hardening')) {
    return [
      { type:'text', text:`Berdasarkan analisis **${total} security event** dengan risk score **${riskScore}/100**, berikut rekomendasi tindakan keamanan yang diprioritaskan berdasarkan urgensi dan dampak:\n\nLangkah-langkah ini disusun berdasarkan pola serangan aktual yang terdeteksi Wazuh — bukan template generik.` },
      { type:'recs', recs: analysis.recs },
    ];
  }

  // ── Timeline ────────────────────────────────────────────────────────────────
  if (cmdLower.includes('timeline') || cmdLower.includes('terbaru') || cmdLower.includes('recent') || cmdLower.includes('terakhir') || cmdLower.includes('baru-baru')) {
    const shown = Math.min(8, alerts.length);
    return [
      { type:'text', text:`Menampilkan **${shown} event terbaru** dari total **${total} serangan** yang terdeteksi.\n\nEvent-event ini diurutkan dari yang paling baru. Perhatikan pola: serangan berulang dari IP yang sama dalam waktu singkat mengindikasikan **automated attack tool** atau **botnet node** — pertimbangkan untuk langsung block IP tersebut di firewall.` },
      { type:'timeline', alerts: alerts.slice(0, shown) },
    ];
  }

  // ── Severity ────────────────────────────────────────────────────────────────
  if (cmdLower.includes('severity') || cmdLower.includes('keparahan') || cmdLower.includes('tingkat') || cmdLower.includes('level')) {
    const sevExplain = [
      crit  > 0 ? `**Critical (level 9–15):** ${crit} event — memerlukan respons SEGERA. Indikasi serangan aktif atau intrusi yang berhasil. SLA respons: < 15 menit.` : null,
      high  > 0 ? `**High (level 7–8):** ${high} event — perlu ditangani dalam 1 jam. Potensi compromise atau eskalasi jika dibiarkan.` : null,
      med   > 0 ? `**Medium (level 5–6):** ${med} event — tindak lanjut dalam 24 jam. Serangan umum yang belum berhasil.` : null,
      low   > 0 ? `**Low (level 1–4):** ${low} event — untuk referensi dan audit trail. Biasanya noise atau informational events.` : null,
    ].filter(Boolean).join('\n\n');
    return [
      { type:'text', text:`Distribusi **${total} event** berdasarkan tingkat keparahan:\n\n${sevExplain}\n\nFokuskan perhatian pada Critical dan High terlebih dahulu — keduanya mewakili **${Math.round((crit+high)/total*100)}% dari total event** namun memiliki dampak terbesar jika tidak ditangani.` },
      { type:'severity', sevData },
    ];
  }

  // ── Hello / Greeting ────────────────────────────────────────────────────────
  if (cmdLower.includes('halo') || cmdLower.includes('hai') || cmdLower.includes('hello') || cmdLower.includes('hi') || cmdLower === 'widya') {
    return [{ type:'text', text:`Halo! Aku **WIDYA** — Wazuh Intelligent Defense Yield Analyzer.\n\nAku sudah menganalisis **${total} security event** dari sistem kamu. Ringkasan cepat:\n\n• Risk Score: **${riskScore}/100** (${riskLabel})\n• Critical events: **${crit}** — ${crit > 0 ? '⚠️ perlu perhatian segera' : '✓ tidak ada saat ini'}\n• Serangan terbanyak via **${topSvc}** dari **${topCtry}**\n• Unique attackers: **${uniqueIPs} IP address**\n\nMau aku analisis lebih dalam? Klik chip di bawah atau tanya langsung.` }];
  }

  // ── Full Report ─────────────────────────────────────────────────────────────
  if (cmdLower.includes('semua') || cmdLower.includes('all') || cmdLower.includes('lengkap') || cmdLower.includes('laporan') || cmdLower.includes('full report')) {
    return [
      { type:'text', text:`**LAPORAN KEAMANAN LENGKAP — WIDYA SENTINEL**\n\nLaporan ini mencakup analisis komprehensif seluruh **${total} security event** yang terdeteksi dalam periode monitoring aktif. Dibuat otomatis berdasarkan data real-time dari Wazuh IDS.` },
      { type:'risk', score: riskScore, crit, total },
      { type:'brief', text: analysis.brief },
      { type:'attacks', serviceData, total },
      { type:'geo', countryData },
      { type:'severity', sevData },
      { type:'recs', recs: analysis.recs },
    ];
  }

  // ── Capabilities ────────────────────────────────────────────────────────────
  if (cmdLower.includes('bisa') || cmdLower.includes('fitur') || cmdLower.includes('apa saja') || cmdLower.includes('kemampuan') || cmdLower.includes('lakukan') || cmdLower.includes('help') || cmdLower.includes('bantuan')) {
    return [
      { type:'text', text:`Aku bisa membantu kamu menganalisis ancaman keamanan dari berbagai sudut pandang. Klik salah satu kategori di bawah untuk langsung mulai, atau ketik pertanyaan bebas dalam Bahasa Indonesia.` },
      { type:'capabilities' },
    ];
  }

  // ── Numeric queries ─────────────────────────────────────────────────────────
  if (cmdLower.includes('berapa') && (cmdLower.includes('serang') || cmdLower.includes('event') || cmdLower.includes('total'))) {
    return [{ type:'text', text:`Total terdeteksi **${total} security event** dari **${uniqueIPs} unique source IP address** dalam 24 jam terakhir.\n\nRincian berdasarkan severity:\n• **${crit} Critical** (level 9–15) — tindakan segera\n• **${high} High** (level 7–8) — tangani dalam 1 jam\n• **${med} Medium** (level 5–6) — tangani dalam 24 jam\n• **${low} Low** (level 1–4) — audit & monitoring\n\nRate serangan: sekitar **${Math.round(total/24)} event/jam** rata-rata.` }];
  }

  if (cmdLower.includes('berapa') && (cmdLower.includes('negara') || cmdLower.includes('asal'))) {
    return [{ type:'text', text:`Serangan berasal dari **${countryData.length} negara berbeda**. Negara teratas: **${topCtry}** dengan ${countryData[0]?.value} serangan (${Math.round(countryData[0]?.value/total*100)}% dari total).\n\nKehadiran serangan dari banyak negara ini merupakan indikasi bahwa IP attacker kemungkinan menggunakan **VPN, proxy, TOR exit node, atau mesin yang sudah dikompromikan** sebagai relay — bukan lokasi fisik penyerang yang sesungguhnya.` }];
  }

  // ── Status check ────────────────────────────────────────────────────────────
  if (cmdLower.includes('aman') || cmdLower.includes('bahaya') || cmdLower.includes('status') || cmdLower.includes('kondisi')) {
    const statusText = riskScore >= 70
      ? `**BERBAHAYA** — sistem sedang mengalami serangan aktif. Ada **${crit} event Critical** yang harus segera ditangani. Jika tidak direspons dalam 15 menit, risiko compromise meningkat signifikan.`
      : riskScore >= 45
      ? `**WASPADA** — ada serangan serius yang sedang berlangsung. **${crit} Critical** dan **${high} High** event menunjukkan upaya intrusi yang persisten. Tindakan hardening segera diperlukan.`
      : riskScore >= 20
      ? `**MODERAT** — sistem mendeteksi serangan namun tidak ada tanda compromise berhasil. Sebagian besar adalah automated bot scanning yang umum di internet. Tetap pantau dan hardening.`
      : `**AMAN** — tidak ada ancaman signifikan saat ini. Serangan minimal terdeteksi, semuanya pada level rendah. Pertahankan postur keamanan ini.`;
    return [
      { type:'text', text:`Status sistem saat ini: ${statusText}\n\nRisk Score: **${riskScore}/100** | Total Event: **${total}** | Unique Attacker IPs: **${uniqueIPs}**` },
      { type:'risk', score: riskScore, crit, total },
    ];
  }

  // ── Critical events ─────────────────────────────────────────────────────────
  if (cmdLower.includes('critical') || cmdLower.includes('kritis') || cmdLower.includes('darurat') || cmdLower.includes('urgent')) {
    if (crit > 0) {
      const critAlerts = alerts.filter(a => a.rule_level >= 9);
      const topCrit = critAlerts[0];
      return [
        { type:'text', text:`⚠️ **${crit} event Critical terdeteksi** — ini memerlukan perhatian segera!\n\nEvent Critical (level 9–15 Wazuh) mengindikasikan:\n• Brute-force attack berhasil atau hampir berhasil\n• Potensi unauthorized access ke sistem\n• Anomali kritis pada file integrity atau proses\n\nContoh event terbaru: **"${topCrit?.rule_description || '-'}"** dari **${topCrit?.source_ip || '-'}** (${topCrit?.source_country || '-'}).\n\nLangkah segera: block IP sumber, review /var/log/auth.log, periksa active sessions dengan "who" dan "last", eskalasi ke tim IR.` },
        { type:'severity', sevData },
      ];
    } else {
      return [
        { type:'text', text:`✓ **Tidak ada event Critical saat ini.**\n\nSistem mendeteksi **${total} event** namun tidak ada yang mencapai level Critical (9–15). Distribusi event saat ini:\n\n• **${high} High** — ada, perlu dipantau\n• **${med} Medium** — serangan umum yang tergagalkan\n• **${low} Low** — informational / noise\n\nPertahankan monitoring aktif — status bisa berubah kapan saja jika penyerang meningkatkan intensitas serangan.` },
        { type:'severity', sevData },
      ];
    }
  }

  // ── SSH specific ─────────────────────────────────────────────────────────────
  if (cmdLower.includes('ssh')) {
    const sshAlerts = alerts.filter(a => a.service === 'SSH');
    const sshIPs = [...new Set(sshAlerts.map(a => a.source_ip))].length;
    return [{ type:'text', text:`Terdeteksi **${sshAlerts.length} serangan SSH** dari **${sshIPs} unique IP address** — mewakili **${Math.round(sshAlerts.length/total*100)}%** dari total serangan.\n\nSSH (port 22) adalah target brute-force paling umum di internet. Tools seperti **Hydra, Medusa, dan Ncrack** mampu melakukan ribuan percobaan login per menit.\n\n**Langkah mitigasi SSH:**\n• Ganti ke SSH key-based auth, matikan PasswordAuthentication\n• Pindahkan SSH ke port non-standard (misal 2222)\n• Gunakan fail2ban untuk auto-block IP setelah N percobaan gagal\n• Batasi akses SSH hanya dari IP allowlist via iptables\n• Aktifkan Port Knocking jika perlu layer tambahan` }];
  }

  // ── Thanks ───────────────────────────────────────────────────────────────────
  if (cmdLower.includes('terima kasih') || cmdLower.includes('makasih') || cmdLower.includes('thanks') || cmdLower.includes('thx')) {
    return [{ type:'text', text:`Sama-sama! Aku selalu siap membantu menganalisis ancaman dan memberikan insight keamanan.\n\nIngat: keamanan siber bukan satu kali setup — ini proses berkelanjutan. Tetap pantau log, update patch, dan lakukan review berkala.\n\nAda yang ingin dianalisis lagi? 🛡️` }];
  }

  // ── WIDYA identity ───────────────────────────────────────────────────────────
  if (cmdLower.includes('widya') && (cmdLower.includes('kamu') || cmdLower.includes('siapa') || cmdLower.includes('apa') || cmdLower.includes('tentang'))) {
    return [{ type:'text', text:`Aku **WIDYA** — *Wazuh Intelligent Defense Yield Analyzer*.\n\nAku adalah sistem analisis ancaman siber yang terintegrasi langsung dengan **Wazuh SIEM/IDS** yang berjalan di server ini. Aku memproses security event secara real-time dari log Wazuh dan mengubahnya menjadi insight yang dapat ditindaklanjuti.\n\n**Kemampuan utamaku:**\n• Analisis Risk Score berbasis event komposisi\n• Pemetaan serangan ke framework MITRE ATT&CK\n• Geolokasi sumber serangan\n• Rekomendasi mitigasi yang dipersonalisasi berdasarkan pola serangan aktual\n• Timeline event kronologis\n• Analisis distribusi vektor serangan\n\nAku tidak terhubung ke internet — semua analisis dilakukan lokal berdasarkan data Wazuh kamu.` }];
  }

  // ── IP lookup ─────────────────────────────────────────────────────────────────
  const hasNum = /\d{1,3}\.\d{1,3}/.test(cmdLower);
  if (cmdLower.includes('ip') || hasNum) {
    const matchedAlert = alerts.find(a => a.source_ip && cmdLower.includes(a.source_ip));
    if (matchedAlert) {
      const ipAlerts = alerts.filter(a => a.source_ip === matchedAlert.source_ip);
      return [{ type:'text', text:`**IP: ${matchedAlert.source_ip}**\n\n• Lokasi: **${matchedAlert.source_city}, ${matchedAlert.source_country}**\n• Total serangan dari IP ini: **${ipAlerts.length} event**\n• Jenis serangan: **${matchedAlert.rule_description}**\n• Layanan yang diserang: **${matchedAlert.service}${matchedAlert.port ? ':' + matchedAlert.port : ''}**\n• Severity tertinggi: **Level ${Math.max(...ipAlerts.map(a => a.rule_level))}**\n• Teknik MITRE: ${(matchedAlert.mitre_technique||[]).join(', ') || 'Tidak teridentifikasi'}\n\nRekomendasi: block IP ini di firewall jika serangan masih berlanjut.` }];
    }
  }

  // ── Default / catch-all ───────────────────────────────────────────────────────
  return [{ type:'text', text:`Hmm, aku belum bisa memproses pertanyaan itu dengan tepat. Coba tanya dengan kata kunci yang lebih spesifik.\n\n**Contoh pertanyaan yang bisa kamu tanyakan:**\n\n• "Berapa risk score sistem sekarang?"\n• "Dari negara mana saja serangan berasal?"\n• "Apa teknik MITRE yang digunakan penyerang?"\n• "Tampilkan event terbaru"\n• "Apakah sistem dalam kondisi aman?"\n• "Berikan rekomendasi keamanan"\n• "Buat laporan lengkap"\n\nAtau klik salah satu chip di bawah untuk analisis cepat.` }];
}

// ─── Render Response Item ─────────────────────────────────────────────────────
function ResponseItem({ item, onSend }) {
  if (item.type === 'text') {
    // Parse **bold**, then split on blank lines → paragraphs, \n → <br>
    const parsed = (item.text || '')
      .replace(/\*\*(.*?)\*\*/g, '<b class="wt-bold">$1</b>');
    const paras = parsed.split('\n\n').filter(Boolean);
    return (
      <div className="widya-msg-text">
        {paras.map((para, i) => (
          <p key={i} className="wt-para"
            dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, '<br>') }} />
        ))}
      </div>
    );
  }
  if (item.type === 'capabilities') return (
    <div className="widya-capabilities">
      {CAPABILITY_LIST.map((cap, i) => (
        <button key={i} className="widya-cap-item" onClick={() => onSend?.(cap.cmd)}>
          <span className="widya-cap-icon">{cap.icon}</span>
          <div className="widya-cap-body">
            <div className="widya-cap-label">{cap.label}</div>
            <div className="widya-cap-desc">{cap.desc}</div>
          </div>
          <span className="widya-cap-arrow">›</span>
        </button>
      ))}
    </div>
  );
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
  if (item.type === 'brief') {
    const parsed = (item.text || '').replace(/\*\*(.*?)\*\*/g, '<b class="wt-bold">$1</b>');
    const paras  = parsed.split('\n\n').filter(Boolean);
    return (
      <div className="widya-data-card">
        <div className="widya-data-title">AI THREAT BRIEF</div>
        {paras.map((para, i) => (
          <p key={i} className="widya-brief-text"
            dangerouslySetInnerHTML={{ __html: para.replace(/\n/g, '<br>') }} />
        ))}
      </div>
    );
  }
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
          const col = a.rule_level>=9?'#ff0044':a.rule_level>=7?'#ff8800':a.rule_level>=5?'#ffdd00':'#00ff88';
          const sevLabel = a.rule_level>=9?'CRITICAL':a.rule_level>=7?'HIGH':a.rule_level>=5?'MEDIUM':'LOW';
          const dt = new Date(a.timestamp);
          const time = dt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
          const date = dt.toLocaleDateString('id-ID',{day:'2-digit',month:'short'});
          const mitre = (a.mitre_technique||[]).slice(0,2).join(', ');
          return (
            <div key={i} className="widya-tl-item">
              <div className="widya-tl-dot" style={{ background:col, boxShadow:`0 0 5px ${col}` }} />
              <div className="widya-tl-body">
                <div className="widya-tl-title">
                  <span style={{color:col,fontWeight:'bold'}}>[{sevLabel}]</span>
                  {' '}<span style={{color:'rgba(0,200,240,0.8)'}}>{a.service}</span>
                  {' '}· {a.source_ip}
                </div>
                <div className="widya-tl-desc">{a.rule_description||'Unknown event'}</div>
                <div className="widya-tl-meta">
                  📍 {a.source_city || '?'}, {a.source_country || '?'}
                  {mitre ? ` · 🎯 ${mitre}` : ''}
                  {` · Rule ${a.rule_id||'?'}`}
                </div>
              </div>
              <div className="widya-tl-time">
                <div>{time}</div>
                <div style={{fontSize:'9px',opacity:0.5}}>{date}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
  return null;
}

// ─── Capability list (also rendered as interactive cards) ─────────────────────
const CAPABILITY_LIST = [
  { icon:'◈', label:'Risk Score',          desc:'Skor risiko sistem 0–100',                    cmd:'risk score'          },
  { icon:'◉', label:'Distribusi Serangan', desc:'Jenis vektor serangan + pie chart',            cmd:'distribusi serangan' },
  { icon:'◎', label:'Top Negara',          desc:'Negara asal serangan terbanyak',               cmd:'top negara'          },
  { icon:'▣', label:'MITRE ATT&CK',        desc:'Teknik yang digunakan penyerang',              cmd:'mitre'               },
  { icon:'▸', label:'Threat Brief',        desc:'Ringkasan analisis ancaman AI',                cmd:'threat brief'        },
  { icon:'◆', label:'Rekomendasi',         desc:'Saran tindakan keamanan prioritas',            cmd:'rekomendasi'         },
  { icon:'◷', label:'Timeline',           desc:'Event serangan terbaru secara kronologis',     cmd:'timeline'            },
  { icon:'▲', label:'Severity',            desc:'Distribusi keparahan event',                   cmd:'severity'            },
];

// ─── Quick Chips ──────────────────────────────────────────────────────────────
const CHIPS = [
  { label:'◈ Risk Score',   cmd:'risk score'          },
  { label:'◉ Serangan',     cmd:'distribusi serangan' },
  { label:'◎ Negara',       cmd:'top negara'          },
  { label:'▣ MITRE',        cmd:'mitre'               },
  { label:'▸ Brief',        cmd:'threat brief'        },
  { label:'◆ Saran',        cmd:'rekomendasi'         },
  { label:'◷ Timeline',     cmd:'timeline'            },
  { label:'▲ Severity',     cmd:'severity'            },
];

// ─── Main WIDYA Component ─────────────────────────────────────────────────────
export default function WIDYA({ alerts, onClose, closing }) {
  // intro: WIDYAIntro visible, panel hidden | done: panel slides in
  const [phase, setPhase] = useState('intro');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);

  const analysis = useMemo(() => buildAnalysis(alerts), [alerts]);

  // User clicked Mulai Analisis — pre-load messages, sphere flies, then spread plays
  const handleIntroLaunch = () => {
    const n = alerts?.length || 0;
    setMessages([{
      from: 'widya',
      items: [{ type:'text', text:`Analisis dimulai. Aku mendeteksi **${n} event aktif** saat ini. Pilih topik di bawah atau ketik pertanyaan kamu.` }]
    }]);
  };

  // Sphere landed → start spread effect, panel mounts behind canvas
  const handleIntroComplete = useCallback(() => setPhase('spreading'), []);

  // Spread canvas done → reveal panel
  const handleSpreadDone = useCallback(() => setPhase('done'), []);

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

  // Origin relative to panel canvas: avatar center = padding-left 16 + half avatar 17
  const spreadOriginX = 16 + 17; // 33px from left edge of panel
  const spreadOriginY = 13 + 17; // 30px from top of panel

  return (
    <>
      {/* Panel — mounts during spreading (canvas inside covers it) and stays in done */}
      {phase !== 'intro' && <div className={`widya-panel${closing ? ' widya-panel-closing' : ''}`}>

      {/* Tech-virus spread canvas — inside panel so it's scoped to panel area */}
      {phase === 'spreading' && (
        <WIDYASpread
          originX={spreadOriginX}
          originY={spreadOriginY}
          onDone={handleSpreadDone}
        />
      )}

      {/* Header */}
      <div className="widya-header">
        <div className="widya-branding">
          <div>
            <WIDYAAvatar size={34} />
          </div>
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
              <WIDYAAvatar size={26} />
              <div className="widya-msg-body">
                {msg.items.map((item, j) => (
                  <ResponseItem key={j} item={item} onSend={sendMessage} />
                ))}
              </div>
            </div>
          )
        ))}

        {isTyping && (
          <div className="widya-typing">
            <WIDYAAvatar size={26} />
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
    </div>}

      {/* Intro overlay */}
      {phase === 'intro' && (
        <WIDYAIntro
          alertCount={alerts?.length || 0}
          onLaunch={handleIntroLaunch}
          onComplete={handleIntroComplete}
        />
      )}
    </>
  );
}
