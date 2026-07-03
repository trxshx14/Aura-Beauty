"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

/**
 * The 3D scene is client-only (WebGL). Loading it dynamically with ssr:false
 * keeps the Next.js server render clean and avoids hydration mismatches.
 */
const ThreeScene = dynamic(() => import("@/components/ThreeScene"), {
  ssr: false,
});

const SHADES = [
  { id: "01", name: "Rosewater", hex: "#E8C4BC" },
  { id: "02", name: "Nude Veil", hex: "#D9B49B" },
  { id: "03", name: "Terra", hex: "#B98166" },
  { id: "04", name: "Amber Silk", hex: "#8F5B45" },
] as const;

export default function Page() {
  const [activeShade, setActiveShade] = useState<(typeof SHADES)[number]>(
    SHADES[0]
  );

  return (
    <main className="bg-[#FBF7F4] text-[#2B2927]">
      {/* ------------------------------------------------------------------ */}
      {/* LAYER 0 — Fixed 3D stage. pointer-events-none so the HTML above     */}
      {/* stays fully interactive (buttons, links, text selection).          */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed inset-0 z-0 h-screen w-full pointer-events-none">
        <ThreeScene />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* LAYER 1 — Scroll container. Its total height defines the master     */}
      {/* ScrollTrigger range (start: "top top" → end: "bottom bottom").      */}
      {/* Each panel is exactly 100vh, giving the timeline a clean cadence:   */}
      {/*   panel 1 → 2  =  timeline 0 → 1  (macro zoom milestone)            */}
      {/*   panel 2 → 3  =  timeline 1 → 2  (slide-aside milestone)           */}
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
                <span className="italic text-[#2B2927]/70">light.</span>
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
            {/*
              Starts hidden (opacity-0) to prevent a flash before GSAP takes
              over. The master timeline in ThreeScene.tsx animates autoAlpha,
              which manages both opacity and visibility.
            */}
            <div
              data-panel="formula"
              className="max-w-md opacity-0 will-change-transform rounded-2xl bg-[#FBF7F4]/80 p-10 shadow-[0_24px_80px_-32px_rgba(43,41,39,0.18)] ring-1 ring-[#F3E1DC] backdrop-blur-md"
            >
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#2B2927]/50">
                02 — The Clean Formula
              </p>
              <h2 className="[font-family:var(--font-display)] text-4xl font-light leading-tight">
                Seven ingredients.
                <br />
                Zero noise.
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-[#2B2927]/65">
                Cold-pressed squalane, fermented rice water, and a whisper of
                blush clay — suspended in a frosted-glass vessel that protects
                every drop from light. No fragrance, no fillers, no film.
              </p>
              <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-[#F3E1DC] pt-6 text-center">
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
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#2B2927]/50">
                03 — Find Your Shade
              </p>
              <h2 className="[font-family:var(--font-display)] text-4xl font-light leading-tight md:text-5xl">
                Tinted to your
                <br />
                undertone.
              </h2>

              {/* Shade swatches */}
              <div className="mt-10 flex items-center gap-4">
                {SHADES.map((shade) => {
                  const isActive = shade.id === activeShade.id;
                  return (
                    <button
                      key={shade.id}
                      type="button"
                      onClick={() => setActiveShade(shade)}
                      aria-label={`Select shade ${shade.id} ${shade.name}`}
                      aria-pressed={isActive}
                      className={`h-12 w-12 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4] ${
                        isActive
                          ? "scale-110 ring-2 ring-[#2B2927] ring-offset-4 ring-offset-[#FBF7F4]"
                          : "ring-1 ring-[#2B2927]/15 hover:scale-105"
                      }`}
                      style={{ backgroundColor: shade.hex }}
                    />
                  );
                })}
              </div>

              {/* Active shade readout */}
              <div className="mt-8 flex items-baseline gap-4 border-t border-[#F3E1DC] pt-6">
                <span className="[font-family:var(--font-display)] text-2xl font-light">
                  {activeShade.id} — {activeShade.name}
                </span>
              </div>

              <button
                type="button"
                className="mt-10 rounded-full bg-[#2B2927] px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] text-[#FBF7F4] transition-colors duration-300 hover:bg-[#2B2927]/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
              >
                Add to bag — $68
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}