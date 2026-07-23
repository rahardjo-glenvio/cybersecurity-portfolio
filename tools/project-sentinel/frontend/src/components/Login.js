import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { auth } from '../utils/auth';
import './Login.css';

const API_PORT = process.env.REACT_APP_API_PORT || '3001';
const API_BASE = `http://${window.location.hostname}:${API_PORT}`;

// Perfectly aligned shield — all shared edges use IDENTICAL coordinates
// Split: horizontal y=118, y=158  |  vertical x=100
const PIECES = [
  { id:'p0', d:'M100,18 L28,60 L28,118 L100,118 Z',    g:'lxg0',
    tx:'-440px', ty:'-290px', rot:'-48deg',
    bx:'-550px', by:'-400px', brot:'-110deg', delay:'0ms' },
  { id:'p1', d:'M100,18 L172,60 L172,118 L100,118 Z',  g:'lxg1',
    tx:'440px',  ty:'-290px', rot:'48deg',
    bx:'550px',  by:'-400px', brot:'110deg',  delay:'75ms' },
  { id:'p2', d:'M28,118 L100,118 L100,158 L28,158 Z',  g:'lxg2',
    tx:'-400px', ty:'210px',  rot:'-28deg',
    bx:'-520px', by:'320px',  brot:'-60deg',  delay:'145ms' },
  { id:'p3', d:'M100,118 L172,118 L172,158 L100,158 Z',g:'lxg3',
    tx:'400px',  ty:'210px',  rot:'28deg',
    bx:'520px',  by:'320px',  brot:'60deg',   delay:'215ms' },
  { id:'p4', d:'M28,158 L172,158 L100,228 Z',          g:'lxg4',
    tx:'0px',    ty:'370px',  rot:'0deg',
    bx:'0px',    by:'520px',  brot:'15deg',   delay:'275ms' },
];

const LETTERS  = ['S','E','N','T','I','N','E','L'];
const LDIRS    = ['top','left','right','top','left','right','top','right'];
const TAGWORDS = ['SECURE','OPERATIONS','CENTER'];
const TDIRS    = ['left','top','right'];

export default function Login({ onLoginSuccess }) {
  const [phase, setPhase]       = useState('init');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  useEffect(() => {
    const T = [
      setTimeout(() => setPhase('fly'),         50),
      setTimeout(() => setPhase('done'),        1500),
      setTimeout(() => setPhase('title'),       2000),
      setTimeout(() => setPhase('tag'),         2850),
      setTimeout(() => setPhase('implode'),     3450),
      setTimeout(() => setPhase('burst'),       3800),
      setTimeout(() => setPhase('materialize'), 4050),
      setTimeout(() => setPhase('form'),        4800),
    ];
    return () => T.forEach(clearTimeout);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Username dan password harus diisi'); return; }
    setError(''); setLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/api/auth/login`, { username: username.trim(), password });
      auth.setToken(r.data.token, r.data.user);
      setPhase('success');
      setTimeout(() => onLoginSuccess(), 2500);
    } catch (err) {
      setError(err.response?.data?.error || 'Login gagal. Coba lagi.');
      setPassword('');
      setPhase('shake');
      setTimeout(() => setPhase('form'), 700);
    } finally { setLoading(false); }
  };

  const assembled    = ['fly','done','title','tag','implode','burst','materialize','form','shake','success'].includes(phase);
  const titleVis     = ['title','tag','implode'].includes(phase);
  const tagVis       = ['tag','implode'].includes(phase);
  const sceneOut     = ['materialize','form','shake','success'].includes(phase);
  const formVis      = ['form','shake','success'].includes(phase);
  const isMaterialize = phase === 'materialize';

  return (
    <div className="lx-wrap">
      <div className="lx-grid"/>
      <div className="lx-vignette"/>

      {[...Array(28)].map((_,i) => (
        <div key={i} className="lx-ptcl" style={{
          left:`${(i*3.73+1.1)%100}%`,
          animationDelay:`${(i*0.43)%7}s`,
          animationDuration:`${7+(i*0.61)%9}s`
        }}/>
      ))}

      {/* ── SHIELD SCENE ── */}
      <div className={`lx-scene${sceneOut?' lx-scene--out':''}`}>

        <div className="lx-title-row" aria-label="SENTINEL">
          {LETTERS.map((ch,i) => (
            <span key={i}
              className={`lx-letter lx-letter--${LDIRS[i]}${titleVis?' lx-letter--in':''}`}
              style={{transitionDelay:`${i*65}ms`}}
            >{ch}</span>
          ))}
        </div>

        <svg
          className={[
            'lx-shield',
            assembled  ? 'lx-shield--glow'    : '',
            phase==='implode' ? 'lx-shield--implode' : '',
          ].join(' ')}
          viewBox="0 0 200 246"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="lxg0" x1="100%" y1="0%"  x2="0%"   y2="100%">
              <stop offset="0%"   stopColor="#7fffff" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#00aadd" stopOpacity="0.88"/>
            </linearGradient>
            <linearGradient id="lxg1" x1="0%"   y1="0%"  x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#00ffee" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#00bbff" stopOpacity="0.88"/>
            </linearGradient>
            <linearGradient id="lxg2" x1="100%" y1="0%"  x2="0%"   y2="100%">
              <stop offset="0%"   stopColor="#00ddff" stopOpacity="0.82"/>
              <stop offset="100%" stopColor="#0077bb" stopOpacity="0.78"/>
            </linearGradient>
            <linearGradient id="lxg3" x1="0%"   y1="0%"  x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#00ccff" stopOpacity="0.82"/>
              <stop offset="100%" stopColor="#0088cc" stopOpacity="0.78"/>
            </linearGradient>
            <linearGradient id="lxg4" x1="0%"   y1="0%"  x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#00aabb" stopOpacity="0.88"/>
              <stop offset="100%" stopColor="#005577" stopOpacity="0.85"/>
            </linearGradient>
            <filter id="lxf" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="lxfS" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="2.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {PIECES.map(p => (
            <path key={p.id} d={p.d} fill={`url(#${p.g})`} filter="url(#lxf)"
              className={[
                'lx-piece',
                assembled          ? 'lx-piece--in'    : '',
                phase === 'burst'  ? 'lx-piece--burst'  : '',
              ].join(' ')}
              style={{
                '--tx': p.tx, '--ty': p.ty, '--rot': p.rot,
                '--bx': p.bx, '--by': p.by, '--brot': p.brot,
                '--delay': p.delay,
                transformOrigin: '100px 123px',
              }}
            />
          ))}

          {/* Outer border */}
          <path d="M100,18 L172,60 L172,158 L100,228 L28,158 L28,60 Z"
                fill="none" stroke="rgba(0,220,255,0.55)" strokeWidth="1.2"
                filter="url(#lxfS)"
                style={{opacity:assembled?1:0, transition:'opacity 0.6s ease 0.7s'}}/>

          {/* Seam lines */}
          <g filter="url(#lxfS)"
             style={{opacity:assembled?1:0, transition:'opacity 0.6s ease 0.85s'}}>
            <line x1="100" y1="18"  x2="100" y2="228" stroke="rgba(0,255,220,0.32)" strokeWidth="0.8"/>
            <line x1="28"  y1="118" x2="172" y2="118" stroke="rgba(0,255,220,0.32)" strokeWidth="0.8"/>
            <line x1="28"  y1="158" x2="172" y2="158" stroke="rgba(0,255,220,0.25)" strokeWidth="0.8"/>
          </g>

          {/* Center gem */}
          <g style={{opacity:assembled?1:0, transition:'opacity 0.8s ease 1s'}}>
            <polygon points="100,108 108,113 108,123 100,128 92,123 92,113"
                     fill="none" stroke="rgba(0,255,204,0.65)" strokeWidth="1"
                     filter="url(#lxfS)" className="lx-gem"/>
            <circle cx="100" cy="118" r="2.5" fill="rgba(0,255,220,0.9)" filter="url(#lxfS)"/>
          </g>

          {/* Orbit ring */}
          <circle cx="100" cy="123" r="96" fill="none"
                  stroke="rgba(0,204,255,0.11)" strokeWidth="1"
                  style={{opacity:assembled?1:0, transition:'opacity 1s ease 0.9s'}}
                  className="lx-orbit"/>
        </svg>

        <div className="lx-tag-row">
          {TAGWORDS.map((w,i) => (
            <span key={i}
              className={`lx-tagword lx-tagword--${TDIRS[i]}${tagVis?' lx-tagword--in':''}`}
              style={{transitionDelay:`${i*110}ms`}}
            >{w}</span>
          ))}
        </div>
      </div>

      {/* ── BURST FX ── */}
      {phase === 'burst' && <>
        <div className="lx-shockwave lx-sw1"/>
        <div className="lx-shockwave lx-sw2"/>
        <div className="lx-flash"/>
      </>}

      {/* ── LOGIN FORM ── */}
      <div className={[
        'lx-form-wrap',
        isMaterialize       ? 'lx-form-wrap--mat'   : '',
        formVis             ? 'lx-form-wrap--in'     : '',
        phase === 'shake'   ? 'lx-form-wrap--shake'  : '',
      ].join(' ')}>

        {/* Scan line during materialization */}
        {isMaterialize && <div className="lx-scan-mat"/>}

        {/* Corner targeting brackets */}
        <div className="lx-corner lx-corner--tl"/>
        <div className="lx-corner lx-corner--tr"/>
        <div className="lx-corner lx-corner--bl"/>
        <div className="lx-corner lx-corner--br"/>

        <div className="lx-card">
          <div className="lx-card-beam"/>
          <div className="lx-card-scanlines"/>

          <div className="lx-card-head">
            <div className="lx-brand">
              <span className="lx-brand-sl">//</span>
              <span className="lx-brand-name">SENTINEL</span>
            </div>
            <div className="lx-brand-sub">SECURE OPERATIONS CENTER</div>
            <div className="lx-brand-warn">⚠ UNAUTHORIZED ACCESS PROHIBITED</div>
          </div>

          <form className="lx-form" onSubmit={submit} autoComplete="off">
            <div className="lx-field">
              <label><span className="lx-label-bracket">▸</span> USERNAME</label>
              <div className="lx-inp-wrap">
                <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                  placeholder="Enter username" maxLength="50" autoComplete="username"
                  disabled={loading} required/>
                <span className="lx-inp-corner lx-inp-corner--tl"/>
                <span className="lx-inp-corner lx-inp-corner--br"/>
              </div>
            </div>

            <div className="lx-field">
              <label><span className="lx-label-bracket">▸</span> PASSWORD</label>
              <div className="lx-inp-wrap">
                <input type={showPwd?'text':'password'} value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="Enter password" maxLength="200" autoComplete="current-password"
                  disabled={loading} required/>
                <span className="lx-inp-corner lx-inp-corner--tl"/>
                <span className="lx-inp-corner lx-inp-corner--br"/>
                <button type="button" className="lx-pwd-btn"
                  onClick={()=>setShowPwd(v=>!v)} tabIndex="-1">
                  {showPwd?'HIDE':'SHOW'}
                </button>
              </div>
            </div>

            {error && (
              <div className="lx-error">
                <span className="lx-err-icon">!</span>
                {error}
              </div>
            )}

            <button type="submit" className="lx-submit" disabled={loading}>
              <span className="lx-submit-bg"/>
              {loading
                ? <><span>AUTHENTICATING</span><span className="lx-dots"/></>
                : <span>INITIATE ACCESS</span>
              }
            </button>

            <div className="lx-foot">
              <span className="lx-online"><span className="lx-dot"/>SYSTEM ONLINE</span>
              <span className="lx-ver">v1.0.0</span>
            </div>
          </form>
        </div>
      </div>

      {/* ── SUCCESS ── */}
      {phase === 'success' && (
        <div className="lx-success">
          <div className="lx-suc-ring-wrap">
            <div className="lx-sr lx-sr1"/><div className="lx-sr lx-sr2"/>
            <div className="lx-sr lx-sr3"/><div className="lx-sr lx-sr4"/>
            <div className="lx-suc-icon">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="#00ffcc"
                        strokeWidth="2" className="lx-suc-circle"/>
                <path d="M28 50 L44 66 L72 34" fill="none" stroke="#00ffcc"
                      strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round"
                      className="lx-suc-tick"/>
              </svg>
            </div>
          </div>
          <div className="lx-suc-label">ACCESS GRANTED</div>
          <div className="lx-suc-sub">INITIALIZING DASHBOARD<span className="lx-dots"/></div>
        </div>
      )}
    </div>
  );
}
