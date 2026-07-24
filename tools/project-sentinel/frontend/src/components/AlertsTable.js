import React, { useState, useRef, useEffect, useMemo } from 'react';
import './AlertsTable.css';

// Wordlist bawaan untuk membantu pencarian
const PRESET_WORDLIST = [
  // Services / Protocols
  { label: 'SSH', category: 'Service' },
  { label: 'FTP', category: 'Service' },
  { label: 'HTTP', category: 'Service' },
  { label: 'HTTPS', category: 'Service' },
  { label: 'RDP', category: 'Service' },
  { label: 'MySQL', category: 'Service' },
  { label: 'SMTP', category: 'Service' },
  { label: 'DNS', category: 'Service' },
  { label: 'FIM', category: 'Service' },
  // Attack types
  { label: 'Brute Force', category: 'Attack' },
  { label: 'Password Guessing', category: 'Attack' },
  { label: 'SQL Injection', category: 'Attack' },
  { label: 'Web Scanning', category: 'Attack' },
  { label: 'File Integrity', category: 'Attack' },
  { label: 'Phishing', category: 'Attack' },
  { label: 'Valid Accounts', category: 'Attack' },
  { label: 'authentication failed', category: 'Attack' },
  { label: 'brute force trying', category: 'Attack' },
  // Severity
  { label: 'critical', category: 'Level' },
  { label: 'high', category: 'Level' },
  { label: 'medium', category: 'Level' },
  // Rule types
  { label: 'rootcheck', category: 'Rule' },
  { label: 'sshd', category: 'Rule' },
  { label: 'integrity checksum', category: 'Rule' },
  { label: 'web application attack', category: 'Rule' },
];

// Ikon kecil (SVG, bukan emoji) agar konsisten lintas OS
const IconSearch = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
       strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconSort = ({ dir }) => (
  <svg className={`sort-ico ${dir || ''}`} viewBox="0 0 24 24" width="11" height="11"
       fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
       strokeLinejoin="round" aria-hidden="true">
    {dir === 'asc'
      ? <polyline points="18 15 12 9 6 15" />
      : dir === 'desc'
        ? <polyline points="6 9 12 15 18 9" />
        : <><polyline points="8 9 12 5 16 9" opacity="0.9" /><polyline points="8 15 12 19 16 15" opacity="0.9" /></>}
  </svg>
);

function AlertsTable({ alerts, allAlerts, dataSource, searchTerm, onSearch, loading }) {
  const [inputValue, setInputValue] = useState(searchTerm || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, dir: 'asc' });
  const inputRef = useRef(null);
  const suggestRef = useRef(null);
  const detailRef = useRef(null);

  // Sync inputValue dengan searchTerm dari parent
  useEffect(() => {
    setInputValue(searchTerm || '');
  }, [searchTerm]);

  // Tutup suggestions saat klik luar
  useEffect(() => {
    const handle = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // Smooth scroll + focus ke panel detail saat sebuah log dipilih
  useEffect(() => {
    if (!selectedLog || !detailRef.current) return;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const id = requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'center',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [selectedLog]);

  // Kalau daftar alert berubah (mis. ganti data source), tutup detail yang stale
  useEffect(() => {
    setSelectedLog(prev => (prev && alerts.some(a => a.id === prev.id) ? prev : null));
  }, [alerts]);

  // Bangun suggestions dari data aktual + wordlist
  const suggestions = useMemo(() => {
    const term = inputValue.toLowerCase().trim();
    if (!term) return [];

    const seen = new Set();
    const results = [];

    PRESET_WORDLIST.forEach(({ label, category }) => {
      if (label.toLowerCase().includes(term) && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        results.push({ label, category, type: 'preset' });
      }
    });

    const source = allAlerts || alerts || [];
    source.forEach(a => {
      const candidates = [
        { val: a.service, cat: 'Service' },
        { val: a.source_country, cat: 'Country' },
        { val: a.source_city, cat: 'City' },
        { val: a.source_ip, cat: 'IP' },
        { val: a.rule_description, cat: 'Rule' },
        ...(a.mitre_technique || []).map(t => ({ val: t, cat: 'MITRE' })),
      ];
      candidates.forEach(({ val, cat }) => {
        if (!val) return;
        const key = val.toLowerCase();
        if (key.includes(term) && !seen.has(key)) {
          seen.add(key);
          results.push({ label: val, category: cat, type: 'dynamic' });
        }
      });
    });

    return results.slice(0, 8);
  }, [inputValue, allAlerts, alerts]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onSearch(val);
    setShowSuggestions(true);
    setActiveSuggestion(-1);
  };

  const handleSelect = (label) => {
    setInputValue(label);
    onSearch(label);
    setShowSuggestions(false);
    setActiveSuggestion(-1);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInputValue('');
    onSearch('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeSuggestion >= 0) {
        handleSelect(suggestions[activeSuggestion].label);
      } else {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Severity dipetakan ke token warna yang sama dengan peta (konsistensi)
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
  const getSeverityTier = (level) => {
    if (level >= 9) return 'critical';
    if (level >= 7) return 'high';
    if (level >= 5) return 'medium';
    return 'low';
  };

  const getCategoryColor = (cat) => {
    const map = {
      Service: '#00ccff', Attack: '#ff4477', Level: '#ffcc00',
      Rule: '#00ffcc', Country: '#aa88ff', City: '#88ccff',
      IP: '#ff9944', MITRE: '#ff66aa', preset: '#5588aa',
    };
    return map[cat] || '#5a8aa0';
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const highlightMatch = (text, term) => {
    if (!term || !text) return text;
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="search-highlight">{text.slice(idx, idx + term.length)}</mark>
        {text.slice(idx + term.length)}
      </>
    );
  };

  // ── Sorting lokal (hanya urutan tampilan, tidak mengubah data) ─────────────
  const requestSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const sortedAlerts = useMemo(() => {
    if (!sortConfig.key) return alerts;
    const val = (a) => {
      switch (sortConfig.key) {
        case 'time': return new Date(a.timestamp).getTime() || 0;
        case 'ip': return a.source_ip || '';
        case 'country': return a.source_country || '';
        case 'service': return a.service || '';
        case 'level': return a.rule_level || 0;
        default: return '';
      }
    };
    const dir = sortConfig.dir === 'asc' ? 1 : -1;
    return [...alerts].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [alerts, sortConfig]);

  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter(a => a.rule_level >= 9).length;
  const highCount = alerts.filter(a => a.rule_level >= 7 && a.rule_level < 9).length;
  const countryCount = new Set(alerts.map(a => a.source_country).filter(Boolean)).size;
  const isFiltered = searchTerm && searchTerm.trim().length > 0;

  const COLUMNS = [
    { key: 'time', label: 'Time', sortable: true },
    { key: 'ip', label: 'Source IP', sortable: true },
    { key: 'city', label: 'City', sortable: false },
    { key: 'country', label: 'Country', sortable: true },
    { key: 'service', label: 'Service', sortable: true },
    { key: 'desc', label: 'Rule Description', sortable: false },
    { key: 'level', label: 'Level', sortable: true },
    { key: 'mitre', label: 'MITRE ATT&CK', sortable: false },
  ];

  return (
    <div className="alerts-container">
      <div className="alerts-header-row">
        <div className="alerts-title-group">
          <span className="alerts-title-mark" />
          <div className="alerts-title-text">
            <h1>Security Alerts</h1>
            <span className="alerts-title-sub">Wazuh IDS event stream</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-wrapper">
          <div className={`search-box ${inputValue ? 'has-value' : ''}`}>
            <span className="search-icon"><IconSearch /></span>
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Cari serangan, IP, negara, service..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => inputValue && setShowSuggestions(true)}
              autoComplete="off"
              spellCheck="false"
            />
            {inputValue && (
              <button className="search-clear" onClick={handleClear} title="Hapus" aria-label="Hapus pencarian">✕</button>
            )}
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="search-suggestions" ref={suggestRef}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  className={`suggestion-item ${i === activeSuggestion ? 'active' : ''}`}
                  onMouseDown={() => handleSelect(s.label)}
                >
                  <span
                    className="suggestion-label"
                    style={{ color: i === activeSuggestion ? '#fff' : '#c0d8e8' }}
                  >
                    {highlightMatch(s.label, inputValue)}
                  </span>
                  <span
                    className="suggestion-cat"
                    style={{ color: getCategoryColor(s.category) }}
                  >
                    {s.category}
                  </span>
                </div>
              ))}
              <div className="suggestion-footer">
                ↑↓ navigasi · Enter pilih · Esc tutup
              </div>
            </div>
          )}

          {/* Quick wordlist chips */}
          <div className="search-chips">
            {['SSH', 'Brute Force', 'SQL Injection', 'FTP', 'RDP', 'Web Scanning'].map(word => (
              <button
                key={word}
                className={`search-chip ${inputValue === word ? 'active' : ''}`}
                onClick={() => handleSelect(word)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats">
        <div className="stat-box">
          <div className="stat-number">
            {isFiltered ? <><span style={{ color: '#00ffcc' }}>{totalAlerts}</span><span className="stat-number-sub"> / {(allAlerts || []).length}</span></> : totalAlerts}
          </div>
          <div className="stat-label">{isFiltered ? 'Hasil Filter' : 'Total Alerts'}</div>
        </div>
        <div className="stat-box" data-sev="critical">
          <div className="stat-number">{criticalCount}</div>
          <div className="stat-label">Critical</div>
        </div>
        <div className="stat-box" data-sev="high">
          <div className="stat-number">{highCount}</div>
          <div className="stat-label">High</div>
        </div>
        <div className="stat-box">
          <div className="stat-number">{countryCount}</div>
          <div className="stat-label">Countries</div>
        </div>
      </div>

      {isFiltered && (
        <div className="search-status">
          <span className="search-status-text">
            Menampilkan <strong>{totalAlerts}</strong> hasil untuk "<strong>{searchTerm}</strong>"
          </span>
          <button className="search-status-clear" onClick={handleClear}>✕ Hapus filter</button>
        </div>
      )}

      <div className="table-scroll-wrapper">
      <table className="alerts-table">
        <thead>
          <tr>
            {COLUMNS.map(col => {
              const active = sortConfig.key === col.key;
              return (
                <th
                  key={col.key}
                  className={`${col.sortable ? 'sortable' : ''} ${active ? 'sorted' : ''} col-${col.key}`}
                  onClick={col.sortable ? () => requestSort(col.key) : undefined}
                  aria-sort={active ? (sortConfig.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="th-inner">
                    {col.label}
                    {col.sortable && <IconSort dir={active ? sortConfig.dir : null} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <tr className="skeleton-row" key={`sk-${i}`}>
                {COLUMNS.map(c => (
                  <td key={c.key}><span className="skeleton-bar" /></td>
                ))}
              </tr>
            ))
          ) : sortedAlerts.length === 0 ? (
            <tr>
              <td colSpan={8}>
                <div className="table-empty">
                  <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor"
                       strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span className="table-empty-title">
                    {isFiltered ? `Tidak ada hasil untuk "${searchTerm}"` : 'Tidak ada alert'}
                  </span>
                  <span className="table-empty-sub">
                    {isFiltered ? 'Coba kata kunci lain atau hapus filter' : 'Sistem sedang memantau aktivitas'}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            sortedAlerts.map(alert => {
              const tier = getSeverityTier(alert.rule_level);
              const isSel = selectedLog && selectedLog.id === alert.id;
              return (
                <tr
                  key={alert.id}
                  className={`log-row sev-${tier} ${isSel ? 'selected' : ''}`}
                  onClick={() => setSelectedLog(alert)}
                >
                  <td className="timestamp">{formatTimestamp(alert.timestamp)}</td>
                  <td className="ip">{highlightMatch(alert.source_ip, searchTerm)}</td>
                  <td className="city">{highlightMatch(alert.source_city || '-', searchTerm)}</td>
                  <td className="country">{highlightMatch(alert.source_country || 'Unknown', searchTerm)}</td>
                  <td className="service">
                    {alert.service ? (
                      <span className="service-badge">
                        {highlightMatch(alert.service, searchTerm)}<span className="svc-port">:{alert.port}</span>
                      </span>
                    ) : '-'}
                  </td>
                  <td className="description">{highlightMatch(alert.rule_description, searchTerm)}</td>
                  <td className="level">
                    <span className={`severity-badge sev-${tier}`}>
                      <span className="sev-dot" />
                      {alert.rule_level}
                    </span>
                  </td>
                  <td className="mitre">
                    {alert.mitre_technique && alert.mitre_technique.length > 0
                      ? highlightMatch(alert.mitre_technique.join(', '), searchTerm)
                      : '-'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      </div>

      {/* ── Panel detail log: muncul saat sebuah baris diklik ─────────────── */}
      {selectedLog && (
        <div
          ref={detailRef}
          className={`log-detail sev-${getSeverityTier(selectedLog.rule_level)}`}
          style={{ '--sev': getSeverityColor(selectedLog.rule_level) }}
        >
          <div className="log-detail-glow" />
          <div className="ld-header">
            <div className="ld-header-left">
              <span className="ld-sev-badge">{getSeverityLabel(selectedLog.rule_level)}</span>
              <div className="ld-title-block">
                <span className="ld-title">Log Detail</span>
                <span className="ld-title-sub">Rule level {selectedLog.rule_level}</span>
              </div>
            </div>
            <button className="ld-close" onClick={() => setSelectedLog(null)} aria-label="Tutup detail">✕</button>
          </div>

          <div className="ld-body">
            {[
              ['Waktu', formatTimestamp(selectedLog.timestamp)],
              ['Source IP', selectedLog.source_ip],
              ['Lokasi', `${selectedLog.source_city || '-'}, ${selectedLog.source_country || 'Unknown'}`],
              ['Service', selectedLog.service ? `${selectedLog.service}:${selectedLog.port || '?'}` : '-'],
              ['Destination', selectedLog.destination_ip || '-'],
              ['MITRE ATT&CK', (selectedLog.mitre_technique || []).join(', ') || 'N/A'],
            ].map(([k, v]) => (
              <div className="ld-field" key={k}>
                <span className="ld-key">{k}</span>
                <span className="ld-val">{v}</span>
              </div>
            ))}
            <div className="ld-field ld-field-wide">
              <span className="ld-key">Rule Description</span>
              <span className="ld-val ld-desc">{selectedLog.rule_description}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertsTable;
