import React, { useState, useEffect, useRef } from 'react';
import './WIDYAIntro.css';

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text, speed = 28, startDelay = 0) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    if (!text) return;

    let i = 0;
    const delay = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(delay);
  }, [text, speed, startDelay]);

  return { displayed, done };
}

// ─── Glitch Sphere ────────────────────────────────────────────────────────────
function GlitchSphere() {
  return (
    <div className="widya-sphere-wrap">
      <div className="widya-sphere-ring" />
      <div className="widya-sphere">
        <div className="widya-sphere-lines" />
        <div className="widya-sphere-r" />
        <div className="widya-sphere-b" />
        <div className="widya-sphere-glitch" />
        <div className="widya-sphere-core" />
      </div>
      <div className="widya-sphere-status" />
    </div>
  );
}

// ─── Single chat message with typewriter ─────────────────────────────────────
function ChatMsg({ text, highlight, speed = 28, delay = 0, onDone }) {
  const { displayed, done } = useTypewriter(text, speed, delay);
  const doneRef = useRef(false);

  useEffect(() => {
    if (done && !doneRef.current) {
      doneRef.current = true;
      if (onDone) setTimeout(onDone, 350);
    }
  }, [done, onDone]);

  return (
    <div className="widya-chat-msg">
      <div className="widya-chat-avatar">👁</div>
      <div className={`widya-chat-bubble ${highlight ? 'highlight' : ''}`}>
        {displayed}
        {!done && <span className="widya-cursor" />}
      </div>
    </div>
  );
}

// ─── Chat sequence config ─────────────────────────────────────────────────────
const MESSAGES = [
  { id: 'greeting',  text: 'Halo! Aku WIDYA 👁',                           highlight: true,  speed: 45  },
  { id: 'fullname',  text: 'Wazuh Intelligent Defense Yield Analyzer.',    highlight: false, speed: 22  },
  { id: 'desc',      text: 'Aku dirancang untuk menganalisis ancaman keamanan jaringanmu secara real-time — mulai dari pola serangan, asal negara, hingga teknik MITRE ATT&CK yang digunakan.', highlight: false, speed: 18 },
  { id: 'ready',     text: 'Siap menjalankan analisis mendalam. Klik tombol di bawah untuk mulai.', highlight: false, speed: 22 },
];

// ─── Main Intro Component ─────────────────────────────────────────────────────
export default function WIDYAIntro({ alertCount, onComplete }) {
  const [step, setStep] = useState(-1);   // -1 = dots only
  const [exiting, setExiting] = useState(false);
  const [shownMessages, setShownMessages] = useState([]);

  // Start sequence after short delay
  useEffect(() => {
    const t = setTimeout(() => setStep(0), 900);
    return () => clearTimeout(t);
  }, []);

  // Advance to next message when current one finishes typing
  const handleMsgDone = (idx) => {
    if (idx + 1 < MESSAGES.length) {
      setStep(idx + 1);
    }
    // Show CTA after last message (handled by step >= MESSAGES.length)
  };

  // Track which messages are "active" (revealed)
  useEffect(() => {
    if (step >= 0 && step < MESSAGES.length) {
      setShownMessages(prev => {
        if (prev.find(m => m.id === MESSAGES[step].id)) return prev;
        return [...prev, MESSAGES[step]];
      });
    }
  }, [step]);

  const handleStart = () => {
    setExiting(true);
    setTimeout(onComplete, 480);
  };

  return (
    <div className={`widya-intro-overlay ${exiting ? 'exiting' : ''}`}>
      <button className="widya-intro-skip" onClick={handleStart}>
        SKIP ▸
      </button>

      <div className="widya-intro-content">
        <GlitchSphere />

        <div className="widya-chat-box">
          {/* Initial typing dots */}
          {step === -1 && (
            <div className="widya-chat-msg">
              <div className="widya-chat-avatar">👁</div>
              <div className="widya-chat-bubble">
                <div className="widya-typing-dots">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {shownMessages.map((msg, idx) => (
            <ChatMsg
              key={msg.id}
              text={msg.text}
              highlight={msg.highlight}
              speed={msg.speed}
              onDone={step === idx ? () => handleMsgDone(idx) : undefined}
            />
          ))}

          {/* CTA after all messages done */}
          {step >= MESSAGES.length - 1 && shownMessages.length === MESSAGES.length && (
            <div className="widya-intro-cta">
              <div className="widya-chat-msg">
                <div className="widya-chat-avatar">👁</div>
                <div className="widya-chat-bubble">
                  Saat ini terdeteksi <b style={{ color: '#00ccff' }}>{alertCount} event</b> aktif yang siap dianalisis.
                </div>
              </div>
              <button className="widya-cta-btn" onClick={handleStart}>
                MULAI ANALISIS ▸
              </button>
              <span className="widya-cta-hint">POWERED BY WIDYA v1.0</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
