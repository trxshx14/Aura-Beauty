"use client";

import { useRef } from "react";
import gsap from "gsap";

/**
 * The button leans toward the cursor and snaps back with an elastic ease.
 * Touch devices never fire mousemove, and reduced-motion users are skipped,
 * so it falls back to an ordinary button.
 */
export default function MagneticButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);

  const reduced = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || reduced()) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, { x: dx * 0.35, y: dy * 0.35, duration: 0.4, ease: "power3.out" });
  };

  const onLeave = () => {
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.35)" });
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