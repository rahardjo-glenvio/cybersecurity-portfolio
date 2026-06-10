import React, { useState, useEffect, useRef } from 'react';
import './JAGADIntro.css';

function ProfileSphere({ sphereRef }) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="jagad-profile-wrap" ref={sphereRef}>
      <div className="jagad-profile-ring-2" />
      <div className="jagad-profile-ring" />
      <div className="jagad-profile-circle">
        {imgOk ? (
          <img
            src="/jagad-face.png"
            alt="JAGAD"
            className="jagad-profile-img"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="jagad-css-sphere" />
        )}
      </div>
      <div className="jagad-profile-status" />
    </div>
  );
}

export default function JAGADIntro({ alertCount, onLaunch, onComplete }) {
  const [phase, setPhase] = useState('idle');
  const [visible, setVisible] = useState(false);
  const [overlayFading, setOverlayFading] = useState(false);
  const sphereRef  = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => { setTimeout(() => setVisible(true), 80); }, []);

  const handleStart = () => {
    if (phase !== 'idle') return;
    setPhase('flying');

    onLaunch();

    if (sphereRef.current) {
      const rect = sphereRef.current.getBoundingClientRect();
      const fromX = rect.left + rect.width  / 2;
      const fromY = rect.top  + rect.height / 2;

      // Panel is fixed right:0, width:400px | header padding-top:13px | avatar 34px
      const panelWidth = Math.min(400, window.innerWidth);
      const targetX = window.innerWidth - panelWidth + 16 + 17;
      const targetY = 13 + 17;

      const dx = targetX - fromX;
      const dy = targetY - fromY;

      sphereRef.current.style.setProperty('--fly-dx', `${dx}px`);
      sphereRef.current.style.setProperty('--fly-dy', `${dy}px`);
      sphereRef.current.classList.add('sphere-flying');
    }

    if (contentRef.current) contentRef.current.classList.add('content-fading');

    // Overlay starts fading out just before sphere lands
    setTimeout(() => setOverlayFading(true), 560);

    // Signal parent when done
    setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 960);
  };

  if (phase === 'done') return null;

  return (
    <div
      className="jagad-intro-overlay"
      style={{
        opacity: !visible ? 0 : overlayFading ? 0 : 1,
        transition: 'opacity 0.42s ease',
        pointerEvents: overlayFading ? 'none' : 'auto',
      }}
    >
      <button className="jagad-intro-skip" onClick={handleStart}>SKIP ▸</button>

      <div className="jagad-intro-content" ref={contentRef}>
        <ProfileSphere sphereRef={sphereRef} />

        <div className="jagad-intro-greeting">
          <div className="jagad-intro-name">JAGAD</div>
          <div className="jagad-intro-sub">Jaringan Analisis Garda Ancaman Digital</div>
        </div>

        <button className="jagad-cta-btn" onClick={handleStart}>
          Mulai Analisis
        </button>
        <span className="jagad-cta-hint">{alertCount} EVENTS TERDETEKSI</span>
      </div>
    </div>
  );
}
