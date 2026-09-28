"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Full-screen intro curtain.
 *
 * The counter is honest: it eases toward ~90% while the 3D chunk downloads
 * and compiles, and only completes when the scene reports that it has
 * actually rendered ("aura:ready"). A 900 ms minimum stops it flashing on
 * fast machines; a 7 s fallback reveals the page even if WebGL fails.
 *
 * `onReveal` fires as the curtain starts lifting, so the hero intro can
 * overlap with it.
 */
export default function Preloader({ onReveal }: { onReveal: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    // Always start the story from the top, and hold scroll until revealed.
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const html = document.documentElement;
    html.style.overflow = "hidden";

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const num = el.querySelector<HTMLElement>("[data-preloader-num]")!;
    const bar = el.querySelector<HTMLElement>("[data-preloader-bar]")!;
    const counter = { value: 0 };
    const render = () => {
      num.textContent = String(Math.round(counter.value)).padStart(3, "0");
      bar.style.transform = `scaleX(${counter.value / 100})`;
    };

    const startedAt = performance.now();
    let finished = false;
    let fallback = 0;
    let minDelay = 0;

    const ctx = gsap.context(() => {
      const idle = gsap.to(counter, {
        value: 90,
        duration: 2.6,
        ease: "power2.out",
        onUpdate: render,
      });

      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(fallback);
        idle.kill();

        gsap
          .timeline({
            onComplete: () => {
              html.style.overflow = "";
              setDone(true);
            },
          })
          .to(counter, { value: 100, duration: 0.5, ease: "power2.inOut", onUpdate: render })
          .to("[data-preloader-inner]", { autoAlpha: 0, y: -12, duration: 0.35, ease: "power2.in" }, "+=0.12")
          .add(() => onRevealRef.current(), "-=0.05")
          .to(el, {
            yPercent: -100,
            duration: reduced ? 0.01 : 1.05,
            ease: "expo.inOut",
          }, "<");
      };

      const onReady = () => {
        const wait = Math.max(0, 900 - (performance.now() - startedAt));
        minDelay = window.setTimeout(finish, wait);
      };

      if (window.__auraReady) onReady();
      else window.addEventListener("aura:ready", onReady, { once: true });
      fallback = window.setTimeout(finish, 7000);
    }, el);

    return () => {
      window.clearTimeout(fallback);
      window.clearTimeout(minDelay);
      html.style.overflow = "";
      ctx.revert();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      aria-label="Loading the Aura showcase"
      className="fixed inset-0 z-[60] flex items-end bg-[#FBF7F4] will-change-transform"
    >
      <div
        data-preloader-inner
        className="flex w-full items-end justify-between px-8 pb-10 md:px-16 lg:px-24"
      >
        <div>
          <p className="mb-3 text-[11px] uppercase tracking-[0.35em] text-[#2B2927]/50">
            Serum Nº1 — preparing the studio
          </p>
          <p className="[font-family:var(--font-display)] text-5xl font-light tracking-tight md:text-7xl">
            AURA<sup className="align-super text-sm">®</sup>
          </p>
        </div>
        <p
          data-preloader-num
          className="[font-family:var(--font-display)] text-[clamp(4rem,12vw,10rem)] font-light italic leading-none tabular-nums text-[#C97B5D]"
        >
          000
        </p>
      </div>
      {/* progress hairline along the bottom edge */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#2B2927]/10">
        <div
          data-preloader-bar
          className="h-full origin-left bg-[#C97B5D]"
          style={{ transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}