"use client";

import { useId } from "react";

/* -------------------------------------------------------------------------- */
/*  A swiped swatch of serum — the way beauty brands show a shade on skin.     */
/*                                                                             */
/*  Pure SVG, no images:                                                        */
/*   - a vertical gradient (lighter top, deeper bottom) gives the stroke body  */
/*   - a thin white band is the creamy highlight                               */
/*   - a stretched noise filter adds the drag streaks of a real swipe          */
/*   - a displacement filter roughs up the edges so no two strokes match       */
/* -------------------------------------------------------------------------- */

const STROKE =
  "M10 26 C8 15 20 9 34 10 C52 11 72 13 92 17 C104 19 114 22 113 27 C112 31 102 32 90 33 C70 35 48 38 30 39 C17 40 11 35 10 26 Z";
const SHEEN =
  "M20 17 C34 14 56 15 80 18 C92 19.5 100 21 104 23 C94 22 76 20.5 58 20 C44 19.6 30 20 20 21 Z";

/** Mix two #rrggbb colours; t = 0 → a, t = 1 → b. */
function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa
    .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
    .join("")}`;
}

export default function SwatchStroke({
  hex,
  index,
  className = "",
}: {
  hex: string;
  /** Varies the angle and noise seed, so each stroke looks hand-made. */
  index: number;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const light = mix(hex, "#FFFFFF", 0.32);
  const deep = mix(hex, "#2B2927", 0.2);

  return (
    <svg
      viewBox="0 0 120 48"
      aria-hidden
      className={`overflow-visible ${className}`}
      style={{ transform: `rotate(${-5 + index * 3}deg)` }}
    >
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.55" stopColor={hex} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>

        {/* Rough, organic edges */}
        <filter id={`${id}edge`} x="-10%" y="-40%" width="120%" height="180%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9 0.12" numOctaves="2" seed={index * 7 + 3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Drag streaks: noise stretched along the swipe, kept inside the shape */}
        <filter id={`${id}streak`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.55" numOctaves="2" seed={index * 13 + 5} result="n" />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1.6 0 0 0 -0.55"
            result="streaks"
          />
          <feComposite in="streaks" in2="SourceAlpha" operator="in" />
        </filter>

        <filter id={`${id}shadow`} x="-20%" y="-40%" width="140%" height="200%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#2B2927" floodOpacity="0.14" />
        </filter>
      </defs>

      <g filter={`url(#${id}shadow)`}>
        <g filter={`url(#${id}edge)`}>
          <path d={STROKE} fill={`url(#${id}g)`} />
          <path d={STROKE} fill="#000" filter={`url(#${id}streak)`} opacity="0.35" />
          <path d={SHEEN} fill="#FFFFFF" opacity="0.4" />
        </g>
      </g>
    </svg>
  );
}