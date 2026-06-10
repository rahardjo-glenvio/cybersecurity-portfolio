import React, { useRef, useEffect, useLayoutEffect } from 'react';

export default function JAGADSpread({ originX, originY, onDone }) {
  const canvasRef = useRef(null);

  // Runs synchronously after DOM paint - draws opaque cover before browser shows first frame,
  // preventing the panel content from flashing through before the animation starts.
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#07101f';
    ctx.fillRect(0, 0, W, H);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reuse dimensions already set by useLayoutEffect (don't reset - that clears the canvas)
    const W = canvas.width  || canvas.offsetWidth;
    const H = canvas.height || canvas.offsetHeight;
    if (!W || !H) return;

    const ctx = canvas.getContext('2d');

    const TOTAL_MS  = 2000;
    const CELL      = 40;
    const maxDist   = Math.hypot(
      Math.max(originX, W - originX),
      Math.max(originY, H - originY)
    ) * 1.05;

    const start = performance.now();
    let raf;
    let finished = false;
    const end = () => { if (!finished) { finished = true; onDone(); } };

    const draw = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / TOTAL_MS, 1);

      // fade-in 0→8%
      const fadeIn = Math.min(t / 0.08, 1);

      // smoothstep fade-out 62%→100% - eases out so panel reveal feels natural
      const FADE_START = 0.62;
      let fadeOut = 1;
      if (t > FADE_START) {
        const ft = (t - FADE_START) / (1 - FADE_START);
        fadeOut = Math.max(0, 1 - ft * ft * (3 - 2 * ft));
      }
      const gA = fadeIn * fadeOut;

      // clearRect leaves canvas pixels transparent - no CSS background, so panel
      // becomes visible through the canvas as gA → 0
      ctx.clearRect(0, 0, W, H);

      if (gA > 0.004) {
        const sT = Math.min(t / 0.65, 1);
        const sE  = sT < 0.5 ? 2*sT*sT : 1 - Math.pow(-2*sT+2, 2)/2;
        const sD  = sE * maxDist;

        // ── dark background ──────────────────────────────────────────
        ctx.fillStyle = `rgba(7,16,31,${gA * 0.96})`;
        ctx.fillRect(0, 0, W, H);

        // ── grid clipped to spread circle ────────────────────────────
        ctx.save();
        ctx.beginPath();
        ctx.arc(originX, originY, sD, 0, Math.PI * 2);
        ctx.clip();
        ctx.globalAlpha = gA * 0.13;
        ctx.strokeStyle = '#00ccff';
        ctx.lineWidth   = 0.5;
        ctx.beginPath();
        for (let r = 0; r * CELL <= H + CELL; r++) {
          const y = r * CELL; ctx.moveTo(0, y); ctx.lineTo(W, y);
        }
        for (let c = 0; c * CELL <= W + CELL; c++) {
          const x = c * CELL; ctx.moveTo(x, 0); ctx.lineTo(x, H);
        }
        ctx.stroke();
        ctx.restore();

        // ── spread-front glow ─────────────────────────────────────────
        if (sD > 8) {
          const fg = ctx.createRadialGradient(originX, originY, Math.max(0, sD-40), originX, originY, sD+6);
          fg.addColorStop(0,   'rgba(0,180,255,0)');
          fg.addColorStop(0.6, `rgba(0,210,255,${gA*0.10})`);
          fg.addColorStop(1,   `rgba(0,255,200,${gA*0.06})`);
          ctx.save();
          ctx.fillStyle = fg;
          ctx.beginPath(); ctx.arc(originX, originY, sD+6, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }

        // ── expanding rings ───────────────────────────────────────────
        const RING_COLORS = ['#00ffcc','#00ccff','#0088ff','#00e0ff','#00ffcc','#00ccff'];
        for (let i = 0; i < 6; i++) {
          const rT = Math.max(0, (t - i*0.05) / 0.55);
          if (rT <= 0 || rT > 1.35) continue;
          const r  = rT * maxDist * 0.7;
          const rA = Math.max(0, 1 - rT) * 0.5 * gA;
          if (rA < 0.01) continue;
          ctx.save();
          ctx.globalAlpha = rA;
          ctx.strokeStyle = RING_COLORS[i];
          ctx.lineWidth   = Math.max(0.3, 1.5 - rT);
          ctx.beginPath(); ctx.arc(originX, originY, r, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        }

        // ── origin burst ──────────────────────────────────────────────
        {
          const bT = Math.min(t / 0.14, 1);
          const bA = Math.max(0, 1 - bT*0.65) * gA;
          if (bA > 0) {
            const bR = 4 + bT*90;
            const bg = ctx.createRadialGradient(originX, originY, 0, originX, originY, bR);
            bg.addColorStop(0,   `rgba(0,255,255,${bA*0.9})`);
            bg.addColorStop(0.3, `rgba(0,180,255,${bA*0.4})`);
            bg.addColorStop(1,   'rgba(0,60,200,0)');
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.fillStyle   = bg;
            ctx.beginPath(); ctx.arc(originX, originY, bR, 0, Math.PI*2); ctx.fill();
            ctx.restore();
          }
        }

        // ── dashed radial rays ────────────────────────────────────────
        {
          const rLen = Math.max(0, sE - 0.03) * maxDist * 1.05;
          const rA   = Math.max(0, 1 - sE*0.9) * 0.25 * gA;
          if (rLen > 0 && rA > 0.01) {
            ctx.save();
            ctx.globalAlpha = rA;
            ctx.strokeStyle = '#00aaff';
            ctx.lineWidth   = 0.7;
            ctx.setLineDash([3, 7]);
            for (let i = 0; i < 14; i++) {
              const a = (i / 14) * Math.PI * 2;
              ctx.beginPath();
              ctx.moveTo(originX, originY);
              ctx.lineTo(originX + Math.cos(a)*rLen, originY + Math.sin(a)*rLen);
              ctx.stroke();
            }
            ctx.setLineDash([]);
            ctx.restore();
          }
        }

        // ── glowing nodes at grid intersections ───────────────────────
        for (let r = 0; r * CELL <= H + CELL; r++) {
          for (let c = 0; c * CELL <= W + CELL; c++) {
            const x = c * CELL, y = r * CELL;
            const d = Math.hypot(x - originX, y - originY);
            if (d >= sD - 2) continue;
            const near    = Math.min((sD - d) / (CELL * 1.1), 1);
            const flicker = 0.6 + 0.4 * Math.sin(elapsed*0.005 + c*2.1 + r*1.9);
            const nA      = near * flicker * gA * 0.55;
            if (nA < 0.04) continue;
            ctx.save();
            const hR = 4 + flicker*3;
            const hg = ctx.createRadialGradient(x, y, 0, x, y, hR);
            hg.addColorStop(0, `rgba(0,255,200,${nA*0.55})`);
            hg.addColorStop(1, 'rgba(0,200,255,0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle   = hg;
            ctx.beginPath(); ctx.arc(x, y, hR, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = nA;
            ctx.fillStyle   = '#00ffcc';
            ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.restore();
          }
        }

        // ── moving data packets along rays ────────────────────────────
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + 0.4;
          const cycle = ((elapsed * 0.001 + i * 0.125) % 1);
          const pD    = cycle * maxDist * 0.9;
          const px    = originX + Math.cos(angle) * pD;
          const py    = originY + Math.sin(angle) * pD;
          if (px < -8 || px > W+8 || py < -8 || py > H+8) continue;
          if (pD > sD) continue;
          const pA = (1 - cycle) * gA * 0.65;
          if (pA < 0.04) continue;
          ctx.save();
          const pg = ctx.createRadialGradient(px, py, 0, px, py, 10);
          pg.addColorStop(0,   `rgba(0,240,255,${pA})`);
          pg.addColorStop(0.4, `rgba(0,180,255,${pA*0.35})`);
          pg.addColorStop(1,   'rgba(0,80,200,0)');
          ctx.globalAlpha = 1;
          ctx.fillStyle   = pg;
          ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI*2); ctx.fill();
          ctx.globalAlpha = pA;
          ctx.fillStyle   = '#e0ffff';
          ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2); ctx.fill();
          ctx.restore();
        }
      }

      if (t >= 1) {
        end();
      } else {
        raf = requestAnimationFrame(draw);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); finished = true; };
  }, [originX, originY, onDone]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width:  '100%',
        height: '100%',
        zIndex: 10,
        pointerEvents: 'none',
        // No CSS background - useLayoutEffect draws initial fill synchronously,
        // and during fade-out clearRect leaves canvas transparent so panel shows through.
      }}
    />
  );
}
