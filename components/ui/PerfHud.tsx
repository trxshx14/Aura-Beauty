"use client";

import { useEffect, useState } from "react";
import type { RenderStats } from "../../lib/aura";

const HISTORY = 48;

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

/**
 * Render-stats overlay, toggled with the D key or the footer button.
 * Reads the "aura:stats" events the scene emits twice a second: FPS (with a
 * sparkline of the last ~24 s), frame time, draw calls and triangles across
 * every render pass, and the current device-pixel-ratio chosen by the
 * adaptive-resolution monitor.
 */
export default function PerfHud({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [stats, setStats] = useState<RenderStats | null>(null);
  const [history, setHistory] = useState<number[]>([]);

  useEffect(() => {
    const onStats = (e: CustomEvent<RenderStats>) => {
      setStats(e.detail);
      setHistory((h) => [...h.slice(-(HISTORY - 1)), e.detail.fps]);
    };
    window.addEventListener("aura:stats", onStats);
    return () => window.removeEventListener("aura:stats", onStats);
  }, []);

  if (!open) return null;

  const max = 70;
  const points = history
    .map((fps, i) => {
      const x = (i / (HISTORY - 1)) * 160;
      const y = 36 - (Math.min(fps, max) / max) * 34;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const fpsColor =
    !stats ? "text-[#2B2927]" : stats.fps >= 50 ? "text-[#5E8B5A]" : stats.fps >= 30 ? "text-[#C58A2E]" : "text-[#B4533A]";

  return (
    <aside
      aria-label="Render statistics"
      className="fixed bottom-6 right-6 z-30 w-60 rounded-xl bg-[#FBF7F4]/85 p-4 font-mono text-[11px] text-[#2B2927] shadow-[0_24px_60px_-24px_rgba(43,41,39,0.35)] ring-1 ring-[#F2C9C0] backdrop-blur-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="uppercase tracking-[0.25em] text-[#2B2927]/55">Render stats</span>
        <button
          type="button"
          onClick={onClose}
          data-cursor=""
          aria-label="Close render stats"
          className="rounded px-1 text-[#2B2927]/55 hover:text-[#2B2927] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927]"
        >
          ✕
        </button>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-3xl tabular-nums ${fpsColor}`}>
          {stats ? Math.round(stats.fps) : "—"}
        </span>
        <span className="text-[#2B2927]/55">fps</span>
        <span className="ml-auto tabular-nums text-[#2B2927]/55">
          {stats ? `${stats.ms.toFixed(1)} ms` : ""}
        </span>
      </div>

      <svg viewBox="0 0 160 38" className="mt-2 h-10 w-full" aria-hidden>
        <line x1="0" x2="160" y1={36 - (60 / max) * 34} y2={36 - (60 / max) * 34} stroke="#2B2927" strokeOpacity="0.12" strokeDasharray="2 3" />
        {history.length > 1 && (
          <polyline points={points} fill="none" stroke="#C97B5D" strokeWidth="1.5" strokeLinejoin="round" />
        )}
      </svg>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-[#F2C9C0]/70 pt-3 tabular-nums">
        <dt className="text-[#2B2927]/55">Draw calls</dt>
        <dd className="text-right">{stats ? stats.calls : "—"}</dd>
        <dt className="text-[#2B2927]/55">Triangles</dt>
        <dd className="text-right">{stats ? compact(stats.triangles) : "—"}</dd>
        <dt className="text-[#2B2927]/55">Pixel ratio</dt>
        <dd className="text-right">{stats ? `${stats.dpr.toFixed(2)}×` : "—"}</dd>
      </dl>
      <p className="mt-3 text-[10px] leading-snug text-[#2B2927]/45">
        Resolution adapts to the frame rate. Press D to hide.
      </p>
    </aside>
  );
}