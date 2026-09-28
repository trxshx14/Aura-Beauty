"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { INGREDIENTS, PRICE_PHP, SHADES, formatPHP, type Shade } from "../lib/aura";
import MagneticButton from "../components/ui/MagneticButton";
import Preloader from "../components/ui/Preloader";
import Hotspots from "../components/ui/Hotspots";
import CustomCursor from "../components/ui/CustomCursor";
import PerfHud from "../components/ui/PerfHud";
import BagDrawer, { type BagLine } from "../components/ui/BagDrawer";
import SwatchStroke from "../components/ui/SwatchStroke";

const ThreeScene = dynamic(() => import("../components/ThreeScene"), {
  ssr: false,
});

/* -------------------------------------------------------------------------- */
/*  Content                                                                    */
/* -------------------------------------------------------------------------- */

const MARQUEE_ITEMS = [
  "Seven ingredients",
  "Dermatologist tested",
  "100% vegan",
  "Frosted glass, fully recyclable",
  "No fragrance",
  "Non-comedogenic",
];

const SECTIONS = [
  { n: "01", label: "Vessel" },
  { n: "02", label: "Formula" },
  { n: "03", label: "Shades" },
  { n: "04", label: "Collection" },
] as const;

/* Subtle film grain (inline SVG) — printed, editorial texture. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* -------------------------------------------------------------------------- */
/*  Fly-to-bag: a dot in the shade's colour arcs from the button to the bag   */
/*  counter. x and y use different eases, which is what bends the path.       */
/* -------------------------------------------------------------------------- */

function flyToBag(from: Element, to: Element, color: string, onArrive: () => void) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const size = 14;
  const dot = document.createElement("div");
  Object.assign(dot.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "9999px",
    background: color,
    boxShadow: "0 0 0 3px #FBF7F4, 0 6px 16px rgba(43,41,39,0.25)",
    zIndex: "65",
    pointerEvents: "none",
  });
  document.body.appendChild(dot);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);

  gsap
    .timeline({
      onComplete: () => {
        dot.remove();
        onArrive();
      },
    })
    .to(dot, { x: dx, duration: 0.85, ease: "power1.inOut" }, 0)
    .to(dot, { y: dy, duration: 0.85, ease: "back.in(1.3)" }, 0)
    .to(dot, { scale: 0.45, duration: 0.85, ease: "power2.in" }, 0);
}

/* -------------------------------------------------------------------------- */

export default function Page() {
  const [activeShade, setActiveShade] = useState<Shade>(SHADES[0]);
  const [lines, setLines] = useState<BagLine[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [hudOpen, setHudOpen] = useState(false);
  const [toast, setToast] = useState<{ key: number; text: string } | null>(null);

  const bagButton = useRef<HTMLButtonElement>(null);
  const bagCount = useRef<HTMLSpanElement>(null);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  /* ---- Shade selection → WebGL ----------------------------------------- */
  const selectShade = (shade: Shade) => {
    setActiveShade(shade);
    // One event tints the serum, the rim light and the key light in 3D…
    window.dispatchEvent(new CustomEvent("aura:shade", { detail: shade.hex }));
    // …and one CSS variable tints the page's atmosphere wash to match.
    document.documentElement.style.setProperty("--shade", shade.hex);
  };

  /* ---- Intro: runs as the preloader curtain lifts ---------------------- */
  const onReveal = useCallback(() => {
    if (prefersReducedMotion()) return;
    gsap.from("[data-intro-line]", {
      yPercent: 115,
      duration: 1.2,
      ease: "expo.out",
      stagger: 0.09,
      delay: 0.25,
    });
    gsap.from("[data-intro-fade]", {
      autoAlpha: 0,
      y: 14,
      duration: 0.9,
      ease: "power2.out",
      stagger: 0.08,
      delay: 0.6,
    });
    // "light." relaxes into Fraunces' soft, wonky cut as the page settles.
    gsap.fromTo(
      "[data-soft-intro]",
      { "--soft": 0, "--wonk": 0 },
      { "--soft": 100, "--wonk": 1, duration: 2.2, ease: "power2.inOut", delay: 0.9 }
    );
    gsap.from("[data-hotspot-pin]", {
      autoAlpha: 0,
      x: -10,
      duration: 0.7,
      ease: "power3.out",
      stagger: 0.12,
      delay: 1.0,
    });
  }, []);

  /* ---- Bag ------------------------------------------------------------- */
  const addToBag = (e: React.MouseEvent<HTMLButtonElement>, shade: Shade = activeShade) => {
    const commit = () => {
      setLines((prev) => {
        const existing = prev.find((l) => l.shadeId === shade.id);
        return existing
          ? prev.map((l) => (l.shadeId === shade.id ? { ...l, qty: l.qty + 1 } : l))
          : [...prev, { shadeId: shade.id, qty: 1 }];
      });
      setToast({ key: Date.now(), text: `${shade.name} added to your bag` });
      if (bagCount.current && !prefersReducedMotion()) {
        gsap.fromTo(
          bagCount.current,
          { scale: 1.7, color: "#C97B5D" },
          { scale: 1, color: "#2B2927", duration: 0.7, ease: "elastic.out(1, 0.4)" }
        );
      }
    };
    if (prefersReducedMotion() || !bagCount.current) commit();
    else flyToBag(e.currentTarget, bagCount.current, shade.hex, commit);
  };

  const changeQty = useCallback((shadeId: Shade["id"], delta: number) => {
    setLines((prev) =>
      prev.map((l) => (l.shadeId === shadeId ? { ...l, qty: Math.max(1, l.qty + delta) } : l))
    );
  }, []);

  const removeLine = useCallback((shadeId: Shade["id"]) => {
    setLines((prev) => prev.filter((l) => l.shadeId !== shadeId));
  }, []);

  const closeBag = useCallback(() => setBagOpen(false), []);

  const goToSection = useCallback((index: number) => {
    window.scrollTo({
      top: index * window.innerHeight,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, []);

  const browseShades = useCallback(() => {
    setBagOpen(false);
    // Let the drawer release its scroll lock first.
    window.setTimeout(() => goToSection(2), 60);
  }, [goToSection]);

  /* ---- Toast auto-dismiss ---------------------------------------------- */
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(t);
  }, [toast]);

  /* ---- "D" toggles the render-stats HUD -------------------------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "d" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      setHudOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="bg-[#FBF7F4] text-[#2B2927]">
      <Preloader onReveal={onReveal} />

      {/* LAYER 0 — fixed 3D stage */}
      <div className="fixed inset-0 z-0 h-screen w-full pointer-events-none">
        <ThreeScene />
      </div>

      {/* LAYER 1 — atmosphere washes above the canvas */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]">
        <div className="absolute right-[-12%] top-[-18%] h-[75vh] w-[75vh] rounded-full bg-[#E8A852]/[0.13] blur-[130px]" />
        <div className="absolute bottom-[-22%] left-[-12%] h-[85vh] w-[85vh] rounded-full bg-[#F2C9C0]/[0.35] blur-[150px]" />
        <div className="absolute left-1/4 top-1/3 h-[45vh] w-[45vh] rounded-full bg-[#C97B5D]/[0.07] blur-[110px]" />
        {/* Shade wash: follows the selected shade via the --shade variable */}
        <div className="absolute right-[-8%] top-[20%] h-[70vh] w-[60vh] rounded-full bg-[var(--shade)] opacity-25 blur-[140px] transition-colors duration-1000" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(201,123,93,0.09)_100%)]" />
      </div>

      {/* LAYER 2 — film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[2] opacity-[0.05] mix-blend-multiply"
        style={{ backgroundImage: GRAIN }}
      />

      {/* LAYER 3 — overlays positioned by the 3D scene */}
      <Hotspots />

      {/* LAYER 3 — fixed chrome */}
      <header className="fixed inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-6 md:px-16 lg:px-24">
        <a
          href="#"
          data-cursor=""
          onClick={(e) => {
            e.preventDefault();
            goToSection(0);
          }}
          className={`[font-family:var(--font-display)] text-xl tracking-tight text-[#2B2927] no-underline ${focusRing}`}
        >
          AURA<sup className="align-super text-[10px]">®</sup>
        </a>
        <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/60">
          <span className="hidden md:inline">Serum Nº1 — 2026</span>
          <button
            ref={bagButton}
            type="button"
            data-cursor="Bag"
            aria-haspopup="dialog"
            aria-label={`Open bag, ${count} ${count === 1 ? "item" : "items"}`}
            onClick={() => setBagOpen(true)}
            className={`uppercase tracking-[0.3em] text-[#2B2927] ${focusRing}`}
          >
            Bag (<span ref={bagCount} className="inline-block tabular-nums">{count}</span>)
          </button>
        </div>
      </header>

      {/* Progress rail — numbers are buttons that jump to each act; the
          hairline fills with the same master timeline that drives the 3D. */}
      <nav
        aria-label="Sections"
        className="fixed right-6 top-1/2 z-20 hidden -translate-y-1/2 items-stretch gap-4 md:flex"
      >
        <ol className="flex flex-col justify-between gap-7">
          {SECTIONS.map((s, i) => (
            <li key={s.n}>
              <button
                type="button"
                data-progress={i + 1}
                data-cursor=""
                onClick={() => goToSection(i)}
                aria-label={`Go to ${s.label}`}
                className={`group flex w-full items-center justify-end gap-3 text-[10px] uppercase tracking-[0.25em] ${
                  i === 0 ? "opacity-100" : "opacity-35"
                } ${focusRing}`}
              >
                <span className="translate-x-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                  {s.label}
                </span>
                <span className="tabular-nums">{s.n}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="relative w-px bg-[#2B2927]/15">
          <div
            data-progress-fill
            className="absolute inset-0 origin-top bg-[#C97B5D]"
            style={{ transform: "scaleY(0)" }}
          />
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Scroll container                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div id="scroll-container" className="relative z-10 w-full">
        {/* ---------------- Section 1 — Hero showcase ---------------- */}
        <section className="relative flex h-screen w-full items-center overflow-hidden">
          <div data-panel="hero" className="relative h-full w-full">
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none [font-family:var(--font-display)] text-[clamp(8rem,24vw,22rem)] font-light leading-none tracking-tighter text-[#C97B5D]/[0.06]"
            >
              AURA
            </span>

            <div className="relative mx-auto flex h-full w-full max-w-7xl items-center px-8 md:px-16 lg:px-24">
              <div className="max-w-2xl">
                <p
                  data-intro-fade
                  className="mb-8 flex items-center gap-4 text-xs font-medium uppercase tracking-[0.35em] text-[#2B2927]/60"
                >
                  <span className="inline-block h-px w-8 bg-[#C97B5D]" />
                  Aura Beauty — Serum Nº1
                </p>
                {/* Each line sits in its own overflow mask so it can rise
                    into view; the padding keeps descenders from clipping. */}
                <h1 className="[font-family:var(--font-display)] text-[clamp(3.25rem,8vw,8.5rem)] font-light leading-[0.95] tracking-tight">
                  <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                    <span data-intro-line className="block">
                      Skin,
                    </span>
                  </span>
                  <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                    <span data-intro-line className="block pl-[0.8em]">
                      in its own
                    </span>
                  </span>
                  <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em] pr-[0.2em]">
                    <span data-intro-line data-soft-intro className="soft-type block italic text-[#C97B5D]">
                      light.
                    </span>
                  </span>
                </h1>
                <div className="mt-12 flex flex-wrap items-end gap-x-16 gap-y-8">
                  <p
                    data-intro-fade
                    className="max-w-xs text-sm leading-relaxed text-[#2B2927]/60"
                  >
                    A weightless botanical serum, distilled to seven
                    ingredients. Nothing your skin doesn&apos;t recognize.
                  </p>
                  <p
                    data-intro-fade
                    className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/40"
                  >
                    Scroll to explore
                    <span className="inline-block h-8 w-px animate-pulse bg-[#2B2927]/30" />
                  </p>
                </div>
              </div>
            </div>

            <div
              data-intro-fade
              className="absolute inset-x-0 bottom-0 overflow-hidden border-t border-[#2B2927]/10 py-4"
            >
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
              <div>
                <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-[#C97B5D]">
                  02 — The Clean Formula
                </p>
                {/* Each line rises out of its own mask, on the scroll timeline
                    — the same reveal as the hero headline. */}
                <h2 className="[font-family:var(--font-display)] text-[clamp(2.5rem,5vw,4.5rem)] font-light leading-[1.05]">
                  <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                    <span data-line="formula" className="block">Seven</span>
                  </span>
                  <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em]">
                    <span data-line="formula" className="block">ingredients.</span>
                  </span>
                  <span className="-mb-[0.12em] block overflow-hidden pb-[0.12em] pr-[0.2em]">
                    <span data-line="formula" className="block">
                      <span data-soft-scroll className="soft-type italic text-[#C97B5D]">
                        Zero noise.
                      </span>
                    </span>
                  </span>
                </h2>
                <p className="mt-6 max-w-sm text-sm leading-relaxed text-[#2B2927]/60">
                  Niacinamide and two gentle acids, buffered with aloe —
                  suspended in frosted glass that shields every drop from
                  light.
                </p>
              </div>

              <div className="max-w-md rounded-2xl bg-[#FBF7F4]/85 p-10 shadow-[0_24px_80px_-32px_rgba(43,41,39,0.18)] ring-1 ring-[#F2C9C0]/70 backdrop-blur-md lg:justify-self-end">
                {/* Hovering a row spotlights that ingredient's 3D specimen
                    orbiting the bottle (DOM → WebGL via "aura:ingredient"). */}
                <ul
                  className="space-y-4 text-sm"
                  onMouseLeave={() =>
                    window.dispatchEvent(new CustomEvent("aura:ingredient", { detail: null }))
                  }
                >
                  {INGREDIENTS.map((ing, i) => (
                    <li
                      key={ing.name}
                      data-formula-row
                      data-cursor=""
                      onMouseEnter={() =>
                        window.dispatchEvent(new CustomEvent("aura:ingredient", { detail: i }))
                      }
                      className="group flex items-baseline justify-between transition-all duration-300 hover:pl-2"
                    >
                      <span
                        aria-hidden
                        className="mr-3 inline-block h-2 w-2 shrink-0 translate-y-[-1px] rounded-full ring-1 ring-[#2B2927]/10 transition-transform duration-300 group-hover:scale-150"
                        style={{ backgroundColor: ing.swatch }}
                      />
                      <span className="font-medium transition-colors duration-300 group-hover:text-[#C97B5D]">
                        {ing.name}
                      </span>
                      <span className="mx-3 flex-1 border-b border-dotted border-[#2B2927]/20" />
                      <span className="text-[#2B2927]/50">{ing.role}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 hidden text-[10px] uppercase tracking-[0.25em] text-[#2B2927]/35 [@media(hover:hover)]:block">
                  Hover an ingredient to find it in 3D
                </p>

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

              <div className="min-h-[7.5rem] md:min-h-[9rem]">
                <div className="-mb-[0.12em] overflow-hidden pb-[0.12em]">
                  <div data-line="shades">
                    <span className="block [font-family:var(--font-display)] text-2xl italic text-[#2B2927]/45 md:text-3xl">
                      {activeShade.id} —
                    </span>
                  </div>
                </div>
                {/* The wrapper persists across shade changes (the scroll reveal
                    targets it); the keyed h2 inside remounts to replay fade-up. */}
                <div className="-mb-[0.12em] overflow-hidden pb-[0.12em] pr-[0.2em]">
                  <div data-line="shades">
                <h2
                  key={activeShade.id}
                  className="soft-type animate-fade-up [font-family:var(--font-display)] text-[clamp(3rem,7vw,6.5rem)] font-light italic leading-none tracking-tight"
                  style={{
                    // The shade, deepened with charcoal so pale shades like
                    // Rosewater stay readable on the cream background.
                    color: `color-mix(in srgb, ${activeShade.hex} 62%, #2B2927)`,
                    ["--soft" as string]: 100,
                    ["--wonk" as string]: 1,
                  }}
                >
                  {activeShade.name}
                </h2>
                  </div>
                </div>
              </div>
              <p className="mt-4 max-w-sm text-sm text-[#2B2927]/55">
                {activeShade.note} Select a shade — the serum tints in real
                time.
              </p>

              {/* Swatches: swiped strokes of serum rather than flat dots. */}
              <div className="mt-10 flex flex-wrap items-end gap-x-3 gap-y-4">
                {SHADES.map((shade, i) => {
                  const isActive = shade.id === activeShade.id;
                  return (
                    <button
                      key={shade.id}
                      type="button"
                      data-cursor="Select"
                      onClick={() => selectShade(shade)}
                      aria-label={`Select shade ${shade.id} ${shade.name}`}
                      aria-pressed={isActive}
                      className="group flex flex-col items-center gap-2 rounded-xl px-1 pt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
                    >
                      <span
                        className={`block transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          isActive ? "-translate-y-2 scale-110" : "group-hover:-translate-y-1"
                        }`}
                      >
                        <SwatchStroke hex={shade.hex} index={i} className="h-10 w-24" />
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.2em] transition-opacity duration-300 ${
                          isActive ? "opacity-100" : "opacity-40 group-hover:opacity-70"
                        }`}
                      >
                        {shade.id}
                      </span>
                      {/* active marker */}
                      <span
                        aria-hidden
                        className={`h-px bg-[#2B2927] transition-all duration-500 ${isActive ? "w-6" : "w-0"}`}
                      />
                    </button>
                  );
                })}
              </div>

              <MagneticButton
                data-cursor="Add"
                onClick={(e) => addToBag(e)}
                className={`mt-12 rounded-full bg-[#2B2927] px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] text-[#FBF7F4] transition-colors duration-300 hover:bg-[#C97B5D] ${focusRing}`}
              >
                Add to bag — {formatPHP(PRICE_PHP)}
              </MagneticButton>

            </div>
          </div>
        </section>

        {/* ------------- Section 4 — The collection (finale) ------------- */}
        {/* The four bottles are 3D; this panel only adds type and buttons.
            Columns are centred at 20 / 40 / 60 / 80 % — exactly where the
            scene places the bottles — so each label sits under its bottle. */}
        <section className="relative h-screen w-full overflow-hidden">
          <div
            data-panel="finale"
            className="flex h-full flex-col justify-between pb-10 pt-28 opacity-0 will-change-transform"
          >
            <div className="px-8 text-center">
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.35em] text-[#C97B5D]">
                04 — The Collection
              </p>
              <h2 className="[font-family:var(--font-display)] text-[clamp(2rem,4vw,3.75rem)] font-light leading-tight tracking-tight">
                <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] align-bottom">
                  <span data-line="finale" className="inline-block">
                    Four shades.
                  </span>
                </span>{" "}
                <span className="-mb-[0.12em] inline-block overflow-hidden pb-[0.12em] pr-[0.2em] align-bottom">
                  <span
                    data-line="finale"
                    className="soft-type inline-block italic text-[#C97B5D]"
                    style={{ ["--soft" as string]: 100, ["--wonk" as string]: 1 }}
                  >
                    One ritual.
                  </span>
                </span>
              </h2>
            </div>

            <div>
              <ul className="grid grid-cols-2 gap-y-6 px-8 md:grid-cols-4 md:gap-y-0 md:px-[10%]">
                {SHADES.map((shade) => (
                  <li key={shade.id} className="flex flex-col items-center text-center">
                    <p className="[font-family:var(--font-display)] text-xl italic">{shade.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-[#2B2927]/45">
                      Shade {shade.id} · {formatPHP(PRICE_PHP)}
                    </p>
                    <button
                      type="button"
                      data-cursor="Add"
                      onClick={(e) => addToBag(e, shade)}
                      aria-label={`Add ${shade.name} to bag`}
                      className={`mt-3 rounded-full border border-[#2B2927]/20 px-5 py-2 text-[10px] font-medium uppercase tracking-[0.25em] transition-colors duration-300 hover:border-[#2B2927] hover:bg-[#2B2927] hover:text-[#FBF7F4] ${focusRing}`}
                    >
                      Add to bag
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-8 text-[10px] uppercase tracking-[0.3em] text-[#2B2927]/35">
                <p>Aura Beauty © 2026 — Designed &amp; built by Trisha Raye</p>
                <button
                  type="button"
                  data-cursor=""
                  onClick={() => setHudOpen((v) => !v)}
                  aria-pressed={hudOpen}
                  className={`uppercase tracking-[0.3em] underline-offset-4 hover:text-[#2B2927] hover:underline ${focusRing}`}
                >
                  Render stats <kbd className="font-mono normal-case tracking-normal">[D]</kbd>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Toast — announced politely to screen readers */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4"
      >
        {toast && (
          <div
            key={toast.key}
            className="animate-fade-up pointer-events-auto flex items-center gap-5 rounded-full bg-[#2B2927] py-2 pl-5 pr-2 text-xs text-[#FBF7F4] shadow-[0_18px_40px_-16px_rgba(43,41,39,0.6)]"
          >
            <span>{toast.text}</span>
            <button
              type="button"
              data-cursor=""
              onClick={() => {
                setToast(null);
                setBagOpen(true);
              }}
              className="rounded-full bg-[#FBF7F4] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.25em] text-[#2B2927] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8A852]"
            >
              View bag
            </button>
          </div>
        )}
      </div>

      <BagDrawer
        open={bagOpen}
        lines={lines}
        onClose={closeBag}
        onChangeQty={changeQty}
        onRemove={removeLine}
        onBrowse={browseShades}
        returnFocusTo={bagButton}
      />

      <PerfHud open={hudOpen} onClose={() => setHudOpen(false)} />
      <CustomCursor />
    </main>
  );
}