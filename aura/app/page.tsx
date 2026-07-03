"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const ThreeScene = dynamic(() => import("../components/ThreeScene"), {
  ssr: false,
});

/* -------------------------------------------------------------------------- */
/*  Shade data — hex values double as the live tint sent to the 3D bottle      */
/* -------------------------------------------------------------------------- */

const SHADES = [
  {
    id: "01",
    name: "Rosewater",
    hex: "#E8C4BC",
    note: "Cool pink undertones — fair to light skin.",
  },
  {
    id: "02",
    name: "Nude Veil",
    hex: "#D9B49B",
    note: "Neutral beige — light to medium skin.",
  },
  {
    id: "03",
    name: "Terra",
    hex: "#B98166",
    note: "Warm clay undertones — medium to tan skin.",
  },
  {
    id: "04",
    name: "Amber Silk",
    hex: "#8F5B45",
    note: "Golden amber depth — tan to deep skin.",
  },
] as const;

type Shade = (typeof SHADES)[number];

/* Subtle film grain (inline SVG) — kills the flat "default WebGL" look and
   gives the render an editorial, printed texture. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

export default function Page() {
  const [activeShade, setActiveShade] = useState<Shade>(SHADES[0]);

  const selectShade = (shade: Shade) => {
    setActiveShade(shade);
    // DOM → WebGL bridge: ThreeScene listens and tints the glass material.
    window.dispatchEvent(new CustomEvent("aura:shade", { detail: shade.hex }));
  };

  return (
    <main className="bg-[#FBF7F4] text-[#2B2927]">
      {/* LAYER 0 — fixed 3D stage */}
      <div className="fixed inset-0 z-0 h-screen w-full pointer-events-none">
        <ThreeScene />
      </div>

      {/* LAYER 1 — film grain over the render, under the type */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      {/* LAYER 2 — fixed editorial header */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-6 md:px-16 lg:px-24">
        <a
          href="#"
          className="[font-family:var(--font-display)] text-xl tracking-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
        >
          AURA<sup className="text-[10px] align-super">®</sup>
        </a>
        <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/60">
          <span className="hidden md:inline">Serum Nº1 — 2026</span>
          <a
            href="#"
            className="text-[#2B2927] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
          >
            Bag (0)
          </a>
        </div>
      </header>

      {/* LAYER 2 — progress rail (right edge). The master timeline in
          ThreeScene crossfades these via [data-progress] selectors. */}
      <nav
        aria-label="Scroll progress"
        className="fixed right-8 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-6 text-[10px] uppercase tracking-[0.3em] md:flex"
      >
        <span data-progress="1" className="opacity-100">
          01 — Vessel
        </span>
        <span data-progress="2" className="opacity-30">
          02 — Formula
        </span>
        <span data-progress="3" className="opacity-30">
          03 — Shades
        </span>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Scroll container — three 100vh panels define the timeline cadence   */}
      {/* ------------------------------------------------------------------ */}
      <div id="scroll-container" className="relative z-10 w-full">
        {/* ---------------- Section 1 — Hero showcase ---------------- */}
        <section className="flex h-screen w-full items-center">
          <div
            data-panel="hero"
            className="w-full max-w-6xl px-8 md:px-16 lg:px-24"
          >
            <div className="max-w-xl">
              <p className="mb-6 text-xs font-medium uppercase tracking-[0.35em] text-[#2B2927]/60">
                Aura Beauty — Serum Nº1
              </p>
              <h1 className="[font-family:var(--font-display)] text-6xl font-light leading-[1.02] tracking-tight md:text-7xl lg:text-8xl">
                Skin, in
                <br />
                its own
                <br />
                <span className="italic text-[#C97B5D]">light.</span>
              </h1>
              <p className="mt-8 max-w-xs text-sm leading-relaxed text-[#2B2927]/60">
                A weightless botanical serum, distilled to seven ingredients.
                Nothing your skin doesn&apos;t recognize.
              </p>
              <p className="mt-16 flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/40">
                <span className="inline-block h-px w-10 bg-[#2B2927]/30" />
                Scroll to explore
              </p>
            </div>
          </div>
        </section>

        {/* ------------- Section 2 — Formula / ingredients ------------- */}
        <section className="flex h-screen w-full items-center">
          <div className="w-full max-w-6xl px-8 md:px-16 lg:px-24">
            <div
              data-panel="formula"
              className="max-w-md opacity-0 will-change-transform rounded-2xl bg-[#FBF7F4]/85 p-10 shadow-[0_24px_80px_-32px_rgba(43,41,39,0.18)] ring-1 ring-[#F2C9C0]/70 backdrop-blur-md"
            >
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#C97B5D]">
                02 — The Clean Formula
              </p>
              <h2 className="[font-family:var(--font-display)] text-4xl font-light leading-tight">
                Seven ingredients.
                <br />
                Zero noise.
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-[#2B2927]/65">
                Cold-pressed squalane, fermented rice water, and a whisper of
                blush clay — suspended in frosted glass that shields every drop
                from light. No fragrance, no fillers, no film.
              </p>

              {/* Ingredient ledger */}
              <ul className="mt-8 space-y-3 border-t border-[#F2C9C0]/60 pt-6 text-sm">
                {[
                  ["Squalane", "barrier repair"],
                  ["Rice ferment", "luminosity"],
                  ["Blush clay", "gentle refinement"],
                ].map(([name, role]) => (
                  <li key={name} className="flex items-baseline justify-between">
                    <span className="font-medium">{name}</span>
                    <span className="mx-3 flex-1 border-b border-dotted border-[#2B2927]/20" />
                    <span className="text-[#2B2927]/50">{role}</span>
                  </li>
                ))}
              </ul>

              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-[#F2C9C0]/60 pt-6 text-center">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.25em] text-[#2B2927]/40">
                    Vegan
                  </dt>
                  <dd className="mt-1 text-lg font-light">100%</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.25em] text-[#2B2927]/40">
                    Ingredients
                  </dt>
                  <dd className="mt-1 text-lg font-light">7</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.25em] text-[#2B2927]/40">
                    Synthetics
                  </dt>
                  <dd className="mt-1 text-lg font-light">0</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* --------------- Section 3 — Interactive shades --------------- */}
        <section className="flex h-screen w-full items-center">
          <div className="w-full max-w-6xl px-8 md:px-16 lg:px-24">
            <div
              data-panel="shades"
              className="max-w-lg opacity-0 will-change-transform"
            >
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#C97B5D]">
                03 — Find Your Shade
              </p>
              <h2 className="[font-family:var(--font-display)] text-4xl font-light leading-tight md:text-5xl">
                Tinted to your
                <br />
                undertone.
              </h2>
              <p className="mt-4 text-sm text-[#2B2927]/50">
                Select a shade — the vessel tints in real time.
              </p>

              {/* Swatches */}
              <div className="mt-10 flex items-center gap-5">
                {SHADES.map((shade) => {
                  const isActive = shade.id === activeShade.id;
                  return (
                    <button
                      key={shade.id}
                      type="button"
                      onClick={() => selectShade(shade)}
                      aria-label={`Select shade ${shade.id} ${shade.name}`}
                      aria-pressed={isActive}
                      className={`group flex flex-col items-center gap-2 focus:outline-none`}
                    >
                      <span
                        className={`block h-12 w-12 rounded-full transition-all duration-300 group-focus-visible:ring-2 group-focus-visible:ring-[#2B2927] group-focus-visible:ring-offset-4 group-focus-visible:ring-offset-[#FBF7F4] ${
                          isActive
                            ? "scale-110 ring-2 ring-[#2B2927] ring-offset-4 ring-offset-[#FBF7F4]"
                            : "ring-1 ring-[#2B2927]/15 group-hover:scale-105"
                        }`}
                        style={{ backgroundColor: shade.hex }}
                      />
                      <span
                        className={`text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300 ${
                          isActive ? "opacity-100" : "opacity-40"
                        }`}
                      >
                        {shade.id}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active shade readout */}
              <div className="mt-8 border-t border-[#F2C9C0]/60 pt-6">
                <p className="[font-family:var(--font-display)] text-2xl font-light">
                  {activeShade.id} — {activeShade.name}
                </p>
                <p className="mt-1 text-sm text-[#2B2927]/55">
                  {activeShade.note}
                </p>
              </div>

              <button
                type="button"
                className="mt-10 rounded-full bg-[#2B2927] px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] text-[#FBF7F4] transition-colors duration-300 hover:bg-[#C97B5D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
              >
                Add to bag — $68
              </button>

              <p className="mt-14 text-[10px] uppercase tracking-[0.3em] text-[#2B2927]/35">
                Aura Beauty © 2026 — Designed &amp; built by You
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}