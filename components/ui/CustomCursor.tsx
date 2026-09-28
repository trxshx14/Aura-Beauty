"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/**
 * Two-part cursor: a dot that tracks the pointer exactly and a ring that
 * follows with a little lag. Over anything with a `data-cursor` attribute the
 * ring grows, fills with terracotta and shows that attribute's text
 * ("Select", "Open", "Add"…).
 *
 * Only mounts for a precise pointer (mouse / trackpad) when the user has not
 * asked for reduced motion. Touch and keyboard users keep the system cursor.
 * One delegated `pointerover` listener covers the whole page, so elements
 * added later (the bag drawer, hotspots) work without extra wiring.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const shape = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled || !dot.current || !ring.current || !shape.current || !label.current) return;
    const html = document.documentElement;
    html.classList.add("has-custom-cursor");

    const dotX = gsap.quickTo(dot.current, "x", { duration: 0.08, ease: "power3" });
    const dotY = gsap.quickTo(dot.current, "y", { duration: 0.08, ease: "power3" });
    const ringX = gsap.quickTo(ring.current, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(ring.current, "y", { duration: 0.45, ease: "power3" });

    let visible = false;
    let active: Element | null = null;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!visible) {
        visible = true;
        gsap.set([dot.current, ring.current], { x: e.clientX, y: e.clientY });
        gsap.to(wrap.current, { autoAlpha: 1, duration: 0.3 });
      }
      dotX(e.clientX);
      dotY(e.clientY);
      ringX(e.clientX);
      ringY(e.clientY);
    };

    const setTarget = (target: Element | null) => {
      if (target === active) return;
      active = target;
      const text = target?.getAttribute("data-cursor") ?? "";
      label.current!.textContent = text;
      gsap.to(shape.current, {
        scale: target ? (text ? 2.1 : 1.5) : 1,
        backgroundColor: target && text ? "rgba(201,123,93,0.92)" : "rgba(201,123,93,0)",
        borderColor: target && text ? "rgba(201,123,93,0)" : "rgba(43,41,39,0.45)",
        duration: 0.35,
        ease: "power3.out",
      });
      gsap.to(label.current, { autoAlpha: text ? 1 : 0, duration: 0.2 });
      gsap.to(dot.current, { autoAlpha: target ? 0 : 1, duration: 0.2 });
    };

    const onOver = (e: PointerEvent) => {
      setTarget((e.target as Element).closest("[data-cursor]"));
    };
    const onDown = () => gsap.to(shape.current, { scale: "*=0.85", duration: 0.12, yoyo: true, repeat: 1 });
    const onLeaveWindow = () => {
      visible = false;
      gsap.to(wrap.current, { autoAlpha: 0, duration: 0.2 });
    };

    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerover", onOver);
    window.addEventListener("pointerdown", onDown);
    html.addEventListener("pointerleave", onLeaveWindow);

    return () => {
      html.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      html.removeEventListener("pointerleave", onLeaveWindow);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={wrap}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[70] opacity-0"
      style={{ visibility: "hidden" }}
    >
      <div ref={ring} className="absolute left-0 top-0">
        <div className="relative -ml-5 -mt-5 grid h-10 w-10 place-items-center">
          <div
            ref={shape}
            className="absolute inset-0 rounded-full border border-[#2B2927]/45"
          />
          <span
            ref={label}
            className="relative text-[9px] font-medium uppercase tracking-[0.2em] text-[#FBF7F4] opacity-0"
          />
        </div>
      </div>
      <div
        ref={dot}
        className="absolute left-0 top-0 -ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-[#2B2927]"
      />
    </div>
  );
}