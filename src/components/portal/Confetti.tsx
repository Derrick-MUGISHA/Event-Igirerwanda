"use client";

import { useEffect, useRef } from "react";

/* Full-screen canvas confetti burst — fired once when a pass is generated.
   Self-contained (no library): a few hundred brand-coloured pieces launched
   from the centre, falling under gravity and fading out. */
export default function Confetti({ fire }: { fire: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
    };
    resize();

    const colors = ["#f59300", "#7cc35a", "#e2603a", "#d4b458", "#a9d4a0", "#ffffff"];
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.42;
    const pieces = Array.from({ length: 180 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = (6 + Math.random() * 16) * dpr;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 6 * dpr,
        g: 0.35 * dpr,
        size: (4 + Math.random() * 7) * dpr,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.4,
        color: colors[(Math.random() * colors.length) | 0],
      };
    });

    const DURATION = 2800;
    const start = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const elapsed = t - start;
      const life = Math.max(0, 1 - elapsed / DURATION);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of pieces) {
        p.vy += p.g;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.globalAlpha = life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }
      if (elapsed < DURATION) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [fire]);

  if (!fire) return null;
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] h-screen w-screen"
    />
  );
}
