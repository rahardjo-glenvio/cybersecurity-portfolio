import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import Map2D from './components/Map2D';
import AlertsTable from './components/AlertsTable';
import Login from './components/Login';
import JAGAD from './components/JAGAD';
import { auth } from './utils/auth';
import './App.css';

const API_PORT = process.env.REACT_APP_API_PORT || '3001';
const API_BASE = `http://${window.location.hostname}:${API_PORT}`;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  // Pilihan sumber dipertahankan antar-refresh: jika sudah di Real + agent
  // tertentu, reload halaman tetap di situ (tidak balik ke Demo).
  const [dataSource, setDataSource] = useState(() => localStorage.getItem('sn_dataSource') || 'demo');
  const [agents, setAgents] = useState([]);        // sumber terpantau (Local + agent)
  const [agentScope, setAgentScope] = useState(() => localStorage.getItem('sn_agentScope') || 'all'); // 'all' | agent id
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [jagadOpen, setJagadOpen] = useState(false);
  const [jagadClosing, setJagadClosing] = useState(false);
  const menuRef  = useRef(null);
  const agentMenuRef = useRef(null);
  const clockRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [tzOpen, setTzOpen] = useState(false);
  const [liveTime, setLiveTime] = useState({ time: '--:--:--', date: '' });
  const [clockTz, setClockTz] = useState('WIB');

  const TZ_OFFSETS = { WIB: 7, WITA: 8, WIT: 9 };
  const TZ_NAMES   = {
    WIB:  'WAKTU INDONESIA BARAT · UTC+7',
    WITA: 'WAKTU INDONESIA TENGAH · UTC+8',
    WIT:  'WAKTU INDONESIA TIMUR · UTC+9',
  };

  useEffect(() => {
    const tick = () => {
      const now   = new Date();
      const p     = n => String(n).padStart(2, '0');
      const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
      const tz    = new Date(utcMs + TZ_OFFSETS[clockTz] * 3600000);
      setLiveTime({
        time: `${p(tz.getHours())}:${p(tz.getMinutes())}:${p(tz.getSeconds())}`,
        date: tz.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase(),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [clockTz]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (agentMenuRef.current && !agentMenuRef.current.contains(e.target)) {
        setAgentMenuOpen(false);
      }
      if (clockRef.current && !clockRef.current.contains(e.target)) {
        setTzOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (auth.isAuthenticated()) {
        const valid = await auth.verifyToken(API_BASE);
        if (valid) {
          setIsAuthenticated(true);
        } else {
          auth.removeToken();
        }
      }
      setAuthChecking(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          auth.removeToken();
          setIsAuthenticated(false);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAlerts();
    }
  }, [dataSource, agentScope, isAuthenticated]);

  // Simpan pilihan sumber agar bertahan saat refresh.
  useEffect(() => { localStorage.setItem('sn_dataSource', dataSource); }, [dataSource]);
  useEffect(() => { localStorage.setItem('sn_agentScope', agentScope); }, [agentScope]);

  // Polling real-time: pada mode Real, ambil ulang alerts tiap 5s secara SENYAP
  // (tanpa spinner / tanpa mengosongkan peta), sehingga serangan baru muncul
  // sendiri lewat animasi pop-in di peta tanpa perlu refresh manual.
  useEffect(() => {
    if (!isAuthenticated || dataSource !== 'real') return;
    const id = setInterval(() => fetchAlerts(true), 5000);
    return () => clearInterval(id);
  }, [isAuthenticated, dataSource, agentScope]);

  // Daftar sumber terpantau (Local + agent Wazuh) untuk dropdown scope.
  // Hanya relevan di mode Real; demo tidak punya agent.
  useEffect(() => {
    if (!isAuthenticated || dataSource !== 'real') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/agents`, { headers: auth.getAuthHeaders() });
        if (!cancelled) setAgents(res.data.agents || []);
      } catch (err) {
        if (!cancelled) setAgents([]);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, dataSource]);

  // Status backend real-time: polling ringan ke /api/health (publik) tiap 10s.
  // Online = backend menjawab, Offline = tidak terjangkau. Tidak ada status
  // statis/simulasi; indikator sepenuhnya mengikuti kondisi service.
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const ping = async () => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        const res = await fetch(`${API_BASE}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(timer);
        if (!cancelled) setBackendStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setBackendStatus('offline');
      }
    };
    ping();
    const id = setInterval(ping, 10000);
    return () => { cancelled = true; clearInterval(id); };
  }, [isAuthenticated]);

  // Reset search saat ganti data source
  useEffect(() => {
    setSearchTerm('');
  }, [dataSource]);

  // silent=true dipakai oleh polling real-time: tidak menyalakan spinner dan
  // tidak mengosongkan peta bila satu request gagal (agar animasi tak berkedip).
  const fetchAlerts = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const endpoint = dataSource === 'demo'
        ? `${API_BASE}/api/alerts/demo`
        : `${API_BASE}/api/alerts?agent=${encodeURIComponent(agentScope)}`;
      const response = await axios.get(endpoint, {
        headers: auth.getAuthHeaders()
      });
      setAlerts(response.data.alerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      if (!silent) setAlerts([]); // polling gagal: pertahankan data lama
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const handleOpenJagad = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setJagadClosing(false);
    setJagadOpen(true);
  };

  const handleCloseJagad = useCallback(() => {
    setJagadClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setJagadOpen(false);
      setJagadClosing(false);
      closeTimerRef.current = null;
    }, 350);
  }, []);

  // Filter alerts berdasarkan searchTerm - dikirim ke Map2D dan AlertsTable
  const critCount = useMemo(() => alerts.filter(a => a.rule_level >= 9).length, [alerts]);
  const highCount = useMemo(() => alerts.filter(a => a.rule_level >= 7 && a.rule_level < 9).length, [alerts]);
  const medCount  = useMemo(() => alerts.filter(a => a.rule_level >= 5 && a.rule_level < 7).length, [alerts]);

  const filteredAlerts = useMemo(() => {
    if (!searchTerm.trim()) return alerts;
    const term = searchTerm.toLowerCase();
    return alerts.filter(a =>
      (a.rule_description || '').toLowerCase().includes(term) ||
      (a.service || '').toLowerCase().includes(term) ||
      (a.source_ip || '').toLowerCase().includes(term) ||
      (a.source_country || '').toLowerCase().includes(term) ||
      (a.source_city || '').toLowerCase().includes(term) ||
      (a.destination_ip || '').toLowerCase().includes(term) ||
      String(a.rule_level || '').includes(term) ||
      (a.mitre_technique || []).some(t => t.toLowerCase().includes(term))
    );
  }, [alerts, searchTerm]);

  const handleLogout = async () => {
    await auth.logout(API_BASE);
    setIsAuthenticated(false);
    setAlerts([]);
  };

  // Label ringkas untuk tombol dropdown scope agent.
  const scopeLabel = useMemo(() => {
    if (agentScope === 'all') return 'SEMUA SUMBER';
    const a = agents.find(x => x.id === agentScope);
    if (!a) return `AGENT ${agentScope}`;
    return a.local ? `LOCAL · ${a.name}`.toUpperCase() : a.name.toUpperCase();
  }, [agentScope, agents]);

  if (authChecking) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#00ccff',
        fontFamily: 'Courier New, monospace',
        fontSize: 14,
        letterSpacing: 4
      }}>
        // INITIALIZING...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className={`App ${jagadOpen ? 'jagad-open' : ''}`}>
      <div className="app-header">

        {/* ── Brand ── */}
        <div className="hdr-brand">
          <span className="hdr-brand-mark">◈</span>
          <div className="hdr-brand-text">
            <span className="hdr-brand-name">SENTINEL</span>
            <span className="hdr-brand-sub">WAZUH SOC PLATFORM</span>
          </div>
        </div>

        {/* ── Center: status minimal ── */}
        <div className="hdr-center">
          <span className={`hdr-live-pill ${backendStatus}`} title="Status koneksi ke backend (real-time)">
            <span className="hdr-live-dot" />
            {backendStatus === 'online' ? 'LIVE' : backendStatus === 'offline' ? 'OFFLINE' : 'CHECKING'}
          </span>
          <span className="hdr-center-sep" />
          <span className="hdr-center-item">
            {backendStatus === 'offline' ? 'BACKEND UNREACHABLE' : 'WAZUH IDS ACTIVE'}
          </span>
          <span className="hdr-center-sep" />
          <span className="hdr-center-item dim">{TZ_NAMES[clockTz]}</span>
        </div>

        {/* ── Right controls ── */}
        <div className="header-right">
          {/* Live Clock */}
          <div className="header-clock" ref={clockRef}>
            <div className={`clock-tz-panel ${tzOpen ? 'open' : ''}`}>
              <span className="clock-tz-panel-title">ZONA WAKTU</span>
              {[
                { id: 'WIB',  sub: 'UTC+7', name: 'Indonesia Barat' },
                { id: 'WITA', sub: 'UTC+8', name: 'Indonesia Tengah' },
                { id: 'WIT',  sub: 'UTC+9', name: 'Indonesia Timur' },
              ].map(tz => (
                <button
                  key={tz.id}
                  className={`tz-btn ${clockTz === tz.id ? 'active' : ''}`}
                  onClick={() => { setClockTz(tz.id); setTzOpen(false); }}
                  title={`Waktu ${tz.name} (${tz.sub})`}
                >
                  <span className="tz-btn-label">{tz.id}</span>
                  <span className="tz-btn-sub">{tz.sub}</span>
                </button>
              ))}
            </div>
            <button
              className={`clock-face ${tzOpen ? 'tz-open' : ''}`}
              onClick={() => setTzOpen(prev => !prev)}
              title="Klik untuk ganti zona waktu"
            >
              <span className="clock-time">{liveTime.time}</span>
              <div className="clock-meta">
                <span className="clock-date">{liveTime.date}</span>
                <span className="clock-tz-badge">
                  {clockTz}
                  <span className={`clock-tz-arrow ${tzOpen ? 'open' : ''}`}>‹</span>
                </span>
              </div>
            </button>
          </div>

          <button
            className={`jagad-trigger-btn ${jagadOpen ? 'active' : ''}`}
            onClick={() => jagadOpen ? handleCloseJagad() : handleOpenJagad()}
            title={jagadOpen ? 'Close JAGAD AI' : 'Open JAGAD AI Analyzer'}
          >
            <svg className="jagad-trigger-eye" viewBox="0 0 24 24" width="15" height="15"
                 fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                 strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>{jagadOpen ? 'CLOSE' : 'JAGAD AI'}</span>
          </button>

          {/* Scope agent: hanya di mode Real (demo tidak punya agent) */}
          {dataSource === 'real' && (
            <div className="menu-dropdown" ref={agentMenuRef}>
              <button
                className={`menu-trigger ${agentMenuOpen ? 'open' : ''}`}
                onClick={() => setAgentMenuOpen(prev => !prev)}
                title="Pilih sumber pemantauan: Local (server) atau agent"
              >
                <span className="menu-dot real" />
                {scopeLabel}
                <span className="menu-chevron">{agentMenuOpen ? '▲' : '▼'}</span>
              </button>
              {agentMenuOpen && (
                <div className="menu-panel">
                  <button
                    className={`menu-item ${agentScope === 'all' ? 'active' : ''}`}
                    onClick={() => { setAgentScope('all'); setAgentMenuOpen(false); }}
                  >
                    <span className="menu-item-dot real" />
                    Semua Sumber
                    {agentScope === 'all' && <span className="menu-check">✓</span>}
                  </button>
                  <div className="menu-divider" />
                  {agents.map(a => (
                    <button
                      key={a.id}
                      className={`menu-item ${agentScope === a.id ? 'active' : ''}`}
                      onClick={() => { setAgentScope(a.id); setAgentMenuOpen(false); }}
                      title={`Agent ${a.id}${a.ip && a.ip !== 'any' ? ' · ' + a.ip : ''}`}
                    >
                      <span className={`menu-item-dot ${a.local ? 'demo' : 'real'}`} />
                      {a.local ? `Local · ${a.name}` : a.name}
                      <span className="menu-item-agentid">#{a.id}</span>
                      {agentScope === a.id && <span className="menu-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="menu-dropdown" ref={menuRef}>
            <button
              className={`menu-trigger ${menuOpen ? 'open' : ''}`}
              onClick={() => setMenuOpen(prev => !prev)}
            >
              <span className={`menu-dot ${dataSource === 'real' ? 'real' : 'demo'}`} />
              {dataSource === 'demo' ? 'DEMO DATA' : 'REAL ALERTS'}
              <span className="menu-chevron">{menuOpen ? '▲' : '▼'}</span>
            </button>
            {menuOpen && (
              <div className="menu-panel">
                <button
                  className={`menu-item ${dataSource === 'demo' ? 'active' : ''}`}
                  onClick={() => { setDataSource('demo'); setMenuOpen(false); }}
                >
                  <span className="menu-item-dot demo" />
                  Demo Data
                  {dataSource === 'demo' && <span className="menu-check">✓</span>}
                </button>
                <button
                  className={`menu-item ${dataSource === 'real' ? 'active' : ''}`}
                  onClick={() => { setDataSource('real'); setMenuOpen(false); }}
                >
                  <span className="menu-item-dot real" />
                  Real Alerts
                  {dataSource === 'real' && <span className="menu-check">✓</span>}
                </button>
                <div className="menu-divider" />
                <button className="menu-item logout" onClick={handleLogout}>
                  <span className="menu-item-icon">⏻</span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {backendStatus === 'offline' && (
        <div className="offline-banner" role="alert">
          <span className="offline-banner-dot" />
          <span>Koneksi ke backend terputus. Status <strong>OFFLINE</strong>. Data yang tampil mungkin tidak terbaru.</span>
        </div>
      )}

      <Map2D
        alerts={filteredAlerts}
        status={backendStatus}
        sourceKey={`${dataSource}:${agentScope}:${searchTerm.trim()}`}
      />
      <AlertsTable
        alerts={filteredAlerts}
        allAlerts={alerts}
        dataSource={dataSource}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        loading={isLoading}
      />

      {jagadOpen && (
        <JAGAD alerts={filteredAlerts} onClose={handleCloseJagad} closing={jagadClosing} />
      )}
    </div>
  );
}

export default App;
