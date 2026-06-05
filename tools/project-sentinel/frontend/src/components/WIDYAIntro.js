import React, { useState, useEffect } from 'react';
import './WIDYAIntro.css';

// Profile sphere — uses actual image if available, CSS fallback otherwise
function ProfileSphere() {
  const [imgOk, setImgOk] = useState(true);

  return (
    <div className="widya-profile-wrap">
      <div className="widya-profile-ring-2" />
      <div className="widya-profile-ring" />
      <div className="widya-profile-circle">
        {imgOk ? (
          <img
            src="/widya-face.png"
            alt="WIDYA"
            className="widya-profile-img"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="widya-css-sphere" />
        )}
      </div>
      <div className="widya-profile-status" />
    </div>
  );
}

export default function WIDYAIntro({ alertCount, onComplete }) {
  const [visible, setVisible]   = useState(false);
  const [exiting, setExiting]   = useState(false);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    setExiting(true);
    // Wait for suction animation then call onComplete
    setTimeout(onComplete, 650);
  };

  return (
    <div
      className={`widya-intro-overlay${exiting ? ' exiting' : ''}`}
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.4s ease' }}
    >
      <button className="widya-intro-skip" onClick={handleStart}>
        SKIP ▸
      </button>

      <div className="widya-intro-content">
        <ProfileSphere />

        <div className="widya-intro-greeting">
          <div className="widya-intro-name">WIDYA</div>
          <div className="widya-intro-sub">
            Wazuh Intelligent Defense Yield Analyzer
          </div>
        </div>

        <button className="widya-cta-btn" onClick={handleStart}>
          Mulai Analisis
        </button>
        <span className="widya-cta-hint">{alertCount} EVENTS TERDETEKSI</span>
      </div>
    </div>
  );
}
