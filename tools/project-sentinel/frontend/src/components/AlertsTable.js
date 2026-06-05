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

function AlertsTable({ alerts, allAlerts, dataSource, searchTerm, onSearch }) {
  const [inputValue, setInputValue] = useState(searchTerm || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const inputRef = useRef(null);
  const suggestRef = useRef(null);

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

  // Bangun suggestions dari data aktual + wordlist
  const suggestions = useMemo(() => {
    const term = inputValue.toLowerCase().trim();
    if (!term) return [];

    const seen = new Set();
    const results = [];

    // Dari wordlist preset
    PRESET_WORDLIST.forEach(({ label, category }) => {
      if (label.toLowerCase().includes(term) && !seen.has(label.toLowerCase())) {
        seen.add(label.toLowerCase());
        results.push({ label, category, type: 'preset' });
      }
    });

    // Dari data alert aktual (allAlerts untuk dapat semua, bukan yang sudah difilter)
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

  const getSeverityColor = (level) => {
    if (level >= 9) return '#ff0044';
    if (level >= 7) return '#ff8800';
    if (level >= 5) return '#ffdd00';
    return '#00ff88';
  };

  const getCategoryColor = (cat) => {
    const map = {
      Service: '#00ccff', Attack: '#ff4477', Level: '#ffdd00',
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

  const totalAlerts = alerts.length;
  const criticalCount = alerts.filter(a => a.rule_level >= 9).length;
  const highCount = alerts.filter(a => a.rule_level >= 7 && a.rule_level < 9).length;
  const countryCount = new Set(alerts.map(a => a.source_country).filter(Boolean)).size;
  const isFiltered = searchTerm && searchTerm.trim().length > 0;

  return (
    <div className="alerts-container">
      <div className="alerts-header-row">
        <h1>Wazuh Security Alerts</h1>

        {/* Search Bar */}
        <div className="search-wrapper">
          <div className={`search-box ${inputValue ? 'has-value' : ''}`}>
            <span className="search-icon">⌕</span>
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
              <button className="search-clear" onClick={handleClear} title="Hapus">✕</button>
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
            {isFiltered ? <><span style={{ color: '#00ffcc' }}>{totalAlerts}</span><span style={{ color: '#3a6a80', fontSize: 12 }}> / {(allAlerts || []).length}</span></> : totalAlerts}
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
            <th>Time</th>
            <th>Source IP</th>
            <th>City</th>
            <th>Country</th>
            <th>Service</th>
            <th>Rule Description</th>
            <th>Level</th>
            <th>MITRE ATT&CK</th>
          </tr>
        </thead>
        <tbody>
          {alerts.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#5a8aa0' }}>
                {isFiltered ? `Tidak ada hasil untuk "${searchTerm}"` : 'Tidak ada alert'}
              </td>
            </tr>
          ) : (
            alerts.map(alert => (
              <tr key={alert.id}>
                <td className="timestamp">{formatTimestamp(alert.timestamp)}</td>
                <td className="ip">{highlightMatch(alert.source_ip, searchTerm)}</td>
                <td className="city">{highlightMatch(alert.source_city || '-', searchTerm)}</td>
                <td className="country">{highlightMatch(alert.source_country || 'Unknown', searchTerm)}</td>
                <td className="service">
                  {alert.service ? (
                    <span className="service-badge">
                      {highlightMatch(alert.service, searchTerm)} :{alert.port}
                    </span>
                  ) : '-'}
                </td>
                <td className="description">{highlightMatch(alert.rule_description, searchTerm)}</td>
                <td className="level">
                  <span className="severity-badge" style={{ backgroundColor: getSeverityColor(alert.rule_level) }}>
                    {alert.rule_level}
                  </span>
                </td>
                <td className="mitre">
                  {alert.mitre_technique && alert.mitre_technique.length > 0
                    ? highlightMatch(alert.mitre_technique.join(', '), searchTerm)
                    : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default AlertsTable;
