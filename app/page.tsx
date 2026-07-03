"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import gsap from "gsap";

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

const INGREDIENTS = [
  ["Niacinamide", "barrier repair"],
  ["Salycic Acid", "luminosity"],
  ["Azelaic Acid", "gentle refinement"],
  ["Aloe Vera", "calm + comfort"],
] as const;

const MARQUEE_ITEMS = [
  "Seven ingredients",
  "Dermatologist tested",
  "100% vegan",
  "Frosted glass, fully recyclable",
  "No fragrance",
  "Cold-pressed",
];

/* Subtle film grain (inline SVG) — printed, editorial texture. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

/* -------------------------------------------------------------------------- */
/*  MagneticButton — the CTA leans toward the cursor and snaps back with an    */
/*  elastic ease on leave. A signature awwwards-style micro-interaction in     */
/*  ~20 lines. Touch devices never fire mousemove, so it degrades cleanly.     */
/* -------------------------------------------------------------------------- */

function MagneticButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, { x: dx * 0.35, y: dy * 0.35, duration: 0.4, ease: "power3.out" });
  };

  const onLeave = () => {
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.7,
      ease: "elastic.out(1, 0.35)",
    });
  };

  return (
    <button
      ref={ref}
      type="button"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */

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

      {/* LAYER 1 — atmosphere washes above the canvas: they tint the render
          itself, fusing scene + page and dissolving the floor horizon. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]">
        <div className="absolute right-[-12%] top-[-18%] h-[75vh] w-[75vh] rounded-full bg-[#E8A852]/[0.13] blur-[130px]" />
        <div className="absolute bottom-[-22%] left-[-12%] h-[85vh] w-[85vh] rounded-full bg-[#F2C9C0]/[0.35] blur-[150px]" />
        <div className="absolute left-1/4 top-1/3 h-[45vh] w-[45vh] rounded-full bg-[#C97B5D]/[0.07] blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(201,123,93,0.09)_100%)]" />
      </div>

      {/* LAYER 2 — film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[2] opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      {/* LAYER 3 — fixed chrome */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-6 md:px-16 lg:px-24">
        <a
          href="#"
          className="[font-family:var(--font-display)] text-xl tracking-tight text-[#2B2927] no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
        >
          AURA<sup className="align-super text-[10px]">®</sup>
        </a>
        <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/60">
          <span className="hidden md:inline">Serum Nº1 — 2026</span>
          <a
            href="#"
            className="text-[#2B2927] no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
          >
            Bag (0)
          </a>
        </div>
      </header>

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
      {/* Scroll container                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div id="scroll-container" className="relative z-10 w-full">
        {/* ---------------- Section 1 — Hero showcase ---------------- */}
        <section className="relative flex h-screen w-full items-center overflow-hidden">
          <div data-panel="hero" className="relative h-full w-full">
            {/* Ghost watermark behind the composition */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none [font-family:var(--font-display)] text-[clamp(8rem,24vw,22rem)] font-light leading-none tracking-tighter text-[#C97B5D]/[0.06]"
            >
              AURA
            </span>

            <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-8 md:px-16 lg:px-24">
              <div className="max-w-2xl">
                <p className="mb-8 flex items-center gap-4 text-xs font-medium uppercase tracking-[0.35em] text-[#2B2927]/60">
                  <span className="inline-block h-px w-8 bg-[#C97B5D]" />
                  Aura Beauty — Serum Nº1
                </p>
                {/* clamp() sizing: dramatic at every viewport, and it can
                    never explode if a breakpoint variant fails to compile. */}
                <h1 className="[font-family:var(--font-display)] text-[clamp(3.25rem,8vw,8.5rem)] font-light leading-[0.95] tracking-tight">
                  Skin,
                  <br />
                  <span className="ml-[0.8em]">in its own</span>
                  <br />
                  <span className="italic text-[#C97B5D]">light.</span>
                </h1>
                <div className="mt-12 flex flex-wrap items-end gap-x-16 gap-y-8">
                  <p className="max-w-xs text-sm leading-relaxed text-[#2B2927]/60">
                    A weightless botanical serum, distilled to seven
                    ingredients. Nothing your skin doesn&apos;t recognize.
                  </p>
                  <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/40">
                    Scroll to explore
                    <span className="inline-block h-8 w-px animate-pulse bg-[#2B2927]/30" />
                  </p>
                </div>
              </div>
            </div>

            {/* Infinite editorial marquee along the hero's bottom edge.
                Two identical copies + translateX(-50%) = seamless loop.
                Pauses on hover; disabled under prefers-reduced-motion. */}
            <div className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-[#2B2927]/10 py-4">
              <div className="marquee-track" aria-hidden>
                {[0, 1].map((copy) => (
                  <div
                    key={copy}
                    className="flex shrink-0 items-center [font-family:var(--font-display)] text-lg italic text-[#2B2927]/45"
                  >
                    {MARQUEE_ITEMS.map((item) => (
                      <span key={item} className="flex items-center">
                        <span className="px-6">{item}</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E8A852]" />
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ------------- Section 2 — Formula / ingredients ------------- */}
        <section className="relative flex h-screen w-full items-center overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-8 md:px-16 lg:px-24">
            <div
              data-panel="formula"
              className="grid items-center gap-10 opacity-0 will-change-transform lg:grid-cols-2"
            >
              {/* Left column: structural display typography */}
              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#C97B5D]">
                  02 — The Clean Formula
                </p>
                <h2 className="[font-family:var(--font-display)] text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.05]">
                  Seven
                  <br />
                  ingredients.
                  <br />
                  <span className="italic text-[#C97B5D]">Zero noise.</span>
                </h2>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#2B2927]/60">
                  Cold-pressed squalane, fermented rice water, and a whisper of
                  blush clay — suspended in frosted glass that shields every
                  drop from light.
                </p>
              </div>

              {/* Right column: the ledger card. Each row carries
                  data-formula-row so the master timeline staggers them in. */}
              <div className="max-w-md rounded-2xl bg-[#FBF7F4]/85 p-10 shadow-[0_24px_80px_-32px_rgba(43,41,39,0.18)] ring-1 ring-[#F2C9C0]/70 backdrop-blur-md lg:justify-self-end">
                <ul className="space-y-4 text-sm">
                  {INGREDIENTS.map(([name, role]) => (
                    <li
                      key={name}
                      data-formula-row
                      className="group flex items-baseline justify-between transition-all duration-300 hover:pl-2"
                    >
                      <span className="font-medium transition-colors duration-300 group-hover:text-[#C97B5D]">
                        {name}
                      </span>
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
          </div>
        </section>

        {/* --------------- Section 3 — Interactive shades --------------- */}
        <section className="relative flex h-screen w-full items-center overflow-hidden">
          <div className="mx-auto w-full max-w-7xl px-8 md:px-16 lg:px-24">
            <div
              data-panel="shades"
              className="max-w-xl opacity-0 will-change-transform"
            >
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#C97B5D]">
                03 — Find Your Shade
              </p>

              {/* The shade name IS the headline. The changing key remounts
                  the span, replaying .animate-fade-up on every selection. */}
              <div className="min-h-[7.5rem] md:min-h-[9rem]">
                <p className="[font-family:var(--font-display)] text-2xl italic text-[#2B2927]/45 md:text-3xl">
                  {activeShade.id} —
                </p>
                <h2
                  key={activeShade.id}
                  className="animate-fade-up [font-family:var(--font-display)] text-[clamp(3rem,7vw,6.5rem)] font-light italic leading-none tracking-tight"
                  style={{ color: activeShade.hex }}
                >
                  {activeShade.name}
                </h2>
              </div>
              <p className="mt-4 max-w-sm text-sm text-[#2B2927]/55">
                {activeShade.note} Select a shade — the vessel tints in real
                time.
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
                      className="group flex flex-col items-center gap-2 focus:outline-none"
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

              <MagneticButton
                className="mt-12 rounded-full bg-[#2B2927] px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] text-[#FBF7F4] transition-colors duration-300 hover:bg-[#C97B5D] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
              >
                Add to bag — ₱1,500
              </MagneticButton>

              <p className="mt-14 text-[10px] uppercase tracking-[0.3em] text-[#2B2927]/35">
                Aura Beauty © 2026 — Designed &amp; built by Trisha Raye
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}