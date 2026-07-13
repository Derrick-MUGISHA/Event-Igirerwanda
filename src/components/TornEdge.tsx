/* Deterministic pseudo-random so server and client render the same tear */
function noise(seed: number, x: number) {
  return Math.abs(Math.sin(seed + x * 12.9898) * 43758.5453) % 1;
}

function jaggedPoints(baseY: number, amp: number, seed: number) {
  const pts: string[] = [];
  for (let x = 0; x <= 55440; x += 24) {
    const y = baseY + (noise(seed, x) - 0.5) * amp;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return pts;
}

/**
 * A ripped white paper strip, torn on both edges — the section divider
 * from the reference design.
 */
export default function TornStrip({ className = "" }: { className?: string }) {
  const top = jaggedPoints(12, 56, 37);
  const bottom = jaggedPoints(68, 26, 31).reverse();
  const d = `M ${top.join(" L ")} L ${bottom.join(" L ")} Z`;
  return (
    <svg
      viewBox="0 0 1440 90"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`block h-14 w-full sm:h-20 ${className}`}
    >
      <path d={d} fill="#f2efe4" />
      <path
        d={`M ${jaggedPoints(30, 18, 55).join(" L ")}`}
        fill="none"
        stroke="#d9d4c2"
        strokeWidth="2"
        opacity="0.6"
      />
    </svg>
  );
}
