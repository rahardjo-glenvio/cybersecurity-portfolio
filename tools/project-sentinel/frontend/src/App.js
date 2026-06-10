import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import Map2D from './components/Map2D';
import AlertsTable from './components/AlertsTable';
import Login from './components/Login';
import JAGAD from './components/JAGAD';
import { auth } from './utils/auth';
import './App.css';

const API_BASE = `http://${window.location.hostname}:3001`;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [dataSource, setDataSource] = useState('demo');
  const [searchTerm, setSearchTerm] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [jagadOpen, setJagadOpen] = useState(false);
  const [jagadClosing, setJagadClosing] = useState(false);
  const menuRef  = useRef(null);
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
  }, [dataSource, isAuthenticated]);

  // Reset search saat ganti data source
  useEffect(() => {
    setSearchTerm('');
  }, [dataSource]);

  const fetchAlerts = async () => {
    try {
      const endpoint = dataSource === 'demo'
        ? `${API_BASE}/api/alerts/demo`
        : `${API_BASE}/api/alerts`;
      const response = await axios.get(endpoint, {
        headers: auth.getAuthHeaders()
      });
      setAlerts(response.data.alerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setAlerts([]);
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
          <span className="hdr-live-pill">
            <span className="hdr-live-dot" />
            LIVE
          </span>
          <span className="hdr-center-sep" />
          <span className="hdr-center-item">WAZUH IDS ACTIVE</span>
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
            <span className="jagad-trigger-eye">👁</span>
            <span>{jagadOpen ? 'CLOSE' : 'JAGAD AI'}</span>
          </button>

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

      <Map2D alerts={filteredAlerts} />
      <AlertsTable
        alerts={filteredAlerts}
        allAlerts={alerts}
        dataSource={dataSource}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
      />

      {jagadOpen && (
        <JAGAD alerts={filteredAlerts} onClose={handleCloseJagad} closing={jagadClosing} />
      )}
    </div>
  );
}

export default App;
