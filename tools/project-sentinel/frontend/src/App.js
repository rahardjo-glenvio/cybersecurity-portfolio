import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import Map2D from './components/Map2D';
import AlertsTable from './components/AlertsTable';
import Login from './components/Login';
import WIDYA from './components/WIDYA';
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
  const [widyaOpen, setWidyaOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
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

  // Filter alerts berdasarkan searchTerm — dikirim ke Map2D dan AlertsTable
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
    <div className="App">
      <div className="app-header">
        <h1>Project SENTINEL</h1>
          <button
            className={`widya-trigger-btn ${widyaOpen ? 'active' : ''}`}
            onClick={() => setWidyaOpen(prev => !prev)}
            title="Open WIDYA AI Analyzer"
          >
            <span className="widya-trigger-eye">👁</span>
            <span>WIDYA AI</span>
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

      <Map2D alerts={filteredAlerts} />
      <AlertsTable
        alerts={filteredAlerts}
        allAlerts={alerts}
        dataSource={dataSource}
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
      />

      {widyaOpen && (
        <WIDYA alerts={filteredAlerts} onClose={() => setWidyaOpen(false)} />
      )}
    </div>
  );
}

export default App;
