"use client";

import { useEffect, useState } from "react";
import { HOTSPOTS, type HotspotId } from "../../lib/aura";

/**
 * DOM half of the 3D hotspots.
 *
 * These are real buttons in the page (focusable, screen-reader friendly,
 * above every text layer). Their POSITION is owned by the WebGL scene:
 * HotspotProjector writes transform / opacity / visibility / data-side on
 * each `[data-hotspot]` element every frame. React only handles open/close.
 */
export default function Hotspots() {
  const [open, setOpen] = useState<HotspotId | null>(null);

  // Escape or a click anywhere else closes the open card.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest("[data-hotspot]")) setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  // Close when the pins scroll away, so they come back closed.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => window.scrollY > window.innerHeight * 0.1 && setOpen(null);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <div
      aria-label="Product details"
      role="group"
      className="pointer-events-none fixed inset-0 z-20"
    >
      {HOTSPOTS.map((spot) => {
        const isOpen = open === spot.id;
        const cardId = `hotspot-${spot.id}`;
        return (
          <div
            key={spot.id}
            data-hotspot={spot.id}
            data-side="right"
            className="group absolute left-0 top-0 will-change-transform"
            style={{ visibility: "hidden", opacity: 0 }}
          >
            {/* Row: pin · leader line · label. Anchored so the pin's centre
                sits exactly on the projected point; flips for data-side=left. */}
            <div className="absolute top-0 flex -translate-y-1/2 items-center group-data-[side=left]:right-0 group-data-[side=left]:translate-x-[14px] group-data-[side=left]:flex-row-reverse group-data-[side=right]:left-0 group-data-[side=right]:-translate-x-[14px]">
              <button
                type="button"
                data-hotspot-pin
                data-cursor={isOpen ? "Close" : "Open"}
                aria-expanded={isOpen}
                aria-controls={cardId}
                onClick={() => setOpen(isOpen ? null : spot.id)}
                className="pointer-events-auto flex items-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4] group-data-[side=left]:flex-row-reverse"
              >
                <span className="relative grid h-7 w-7 place-items-center">
                  <span className="hotspot-ping absolute inset-0 rounded-full bg-[#C97B5D]/35" />
                  <span
                    className={`relative h-2.5 w-2.5 rounded-full ring-4 ring-[#FBF7F4] transition-colors duration-300 ${
                      isOpen ? "bg-[#2B2927]" : "bg-[#C97B5D]"
                    }`}
                  />
                </span>
                <span className="h-px w-8 bg-[#2B2927]/35" />
                <span className="whitespace-nowrap rounded-full bg-[#FBF7F4]/80 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-[#2B2927] shadow-[0_8px_24px_-12px_rgba(43,41,39,0.35)] ring-1 ring-[#F2C9C0] backdrop-blur-md">
                  {spot.title}
                </span>
              </button>
            </div>

            {/* Detail card */}
            <div
              id={cardId}
              role="region"
              aria-label={spot.title}
              className={`absolute top-6 w-64 rounded-xl bg-[#FBF7F4]/90 p-5 text-sm leading-relaxed text-[#2B2927]/75 shadow-[0_24px_60px_-24px_rgba(43,41,39,0.35)] ring-1 ring-[#F2C9C0] backdrop-blur-md transition-all duration-300 ease-out group-data-[side=left]:right-[-14px] group-data-[side=right]:left-[-14px] ${
                isOpen
                  ? "pointer-events-auto visible translate-y-0 opacity-100"
                  : "invisible -translate-y-1 opacity-0"
              }`}
            >
              <p className="mb-1.5 [font-family:var(--font-display)] text-lg italic text-[#2B2927]">
                {spot.title}
              </p>
              {spot.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}