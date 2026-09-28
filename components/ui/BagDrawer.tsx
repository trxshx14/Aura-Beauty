"use client";

import { useEffect, useRef } from "react";
import { PRICE_PHP, SHADES, formatPHP, type Shade } from "../../lib/aura";

export type BagLine = { shadeId: Shade["id"]; qty: number };

/**
 * Slide-over bag as an accessible modal dialog:
 * - focus moves to the close button on open and back to the opener on close
 * - Tab / Shift+Tab stay inside the panel; Escape and the backdrop close it
 * - page scroll is locked while open
 * - when closed it is `visibility: hidden`, so it leaves the tab order and
 *   the accessibility tree, while the slide-out transition still plays.
 */
export default function BagDrawer({
  open,
  lines,
  onClose,
  onChangeQty,
  onRemove,
  onBrowse,
  returnFocusTo,
}: {
  open: boolean;
  lines: BagLine[];
  onClose: () => void;
  onChangeQty: (shadeId: Shade["id"], delta: number) => void;
  onRemove: (shadeId: Shade["id"]) => void;
  onBrowse: () => void;
  returnFocusTo: React.RefObject<HTMLElement | null>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = count * PRICE_PHP;

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const opener = returnFocusTo.current;
    // Wait a frame so the panel is visible before moving focus into it.
    const raf = requestAnimationFrame(() => closeBtn.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      html.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open, onClose, returnFocusTo]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[#2B2927]/20 backdrop-blur-[2px] transition-opacity duration-500 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bag-title"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-[#FBF7F4] shadow-[-24px_0_80px_-32px_rgba(43,41,39,0.35)] transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "visible translate-x-0" : "invisible translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-[#F2C9C0]/70 px-8 py-6">
          <h2 id="bag-title" className="[font-family:var(--font-display)] text-2xl font-light">
            Your bag <span className="text-[#2B2927]/40">({count})</span>
          </h2>
          <button
            ref={closeBtn}
            type="button"
            onClick={onClose}
            data-cursor="Close"
            className="text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/60 hover:text-[#2B2927] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
          >
            Close
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-start justify-center gap-4 px-8">
            <p className="[font-family:var(--font-display)] text-3xl font-light italic text-[#2B2927]/70">
              Nothing here yet.
            </p>
            <p className="text-sm text-[#2B2927]/55">Pick a shade to add Serum Nº1 to your bag.</p>
            <button
              type="button"
              onClick={onBrowse}
              data-cursor="Go"
              className="mt-2 rounded-full border border-[#2B2927]/25 px-6 py-3 text-[11px] uppercase tracking-[0.3em] hover:border-[#2B2927] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927] focus-visible:ring-offset-4 focus-visible:ring-offset-[#FBF7F4]"
            >
              Choose a shade
            </button>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-[#F2C9C0]/70 overflow-y-auto px-8">
            {lines.map((line) => {
              const shade = SHADES.find((s) => s.id === line.shadeId)!;
              return (
                <li key={line.shadeId} className="flex gap-4 py-6">
                  <span
                    aria-hidden
                    className="mt-1 h-12 w-12 shrink-0 rounded-full ring-1 ring-[#2B2927]/10"
                    style={{ backgroundColor: shade.hex }}
                  />
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="[font-family:var(--font-display)] text-lg italic">{shade.name}</p>
                      <p className="text-sm tabular-nums">{formatPHP(PRICE_PHP * line.qty)}</p>
                    </div>
                    <p className="text-xs text-[#2B2927]/50">Serum Nº1 · 30 ml · Shade {shade.id}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full ring-1 ring-[#2B2927]/15">
                        <button
                          type="button"
                          onClick={() => onChangeQty(line.shadeId, -1)}
                          disabled={line.qty <= 1}
                          aria-label={`Decrease quantity of ${shade.name}`}
                          data-cursor=""
                          className="grid h-8 w-8 place-items-center rounded-full text-[#2B2927]/70 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927]"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums" aria-live="polite">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => onChangeQty(line.shadeId, 1)}
                          aria-label={`Increase quantity of ${shade.name}`}
                          data-cursor=""
                          className="grid h-8 w-8 place-items-center rounded-full text-[#2B2927]/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927]"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(line.shadeId)}
                        data-cursor=""
                        className="text-[11px] uppercase tracking-[0.2em] text-[#2B2927]/45 underline-offset-4 hover:text-[#2B2927] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2927]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="border-t border-[#F2C9C0]/70 px-8 py-6">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] uppercase tracking-[0.3em] text-[#2B2927]/55">Subtotal</span>
            <span className="[font-family:var(--font-display)] text-2xl tabular-nums">{formatPHP(subtotal)}</span>
          </div>
          <button
            type="button"
            disabled
            aria-describedby="checkout-note"
            className="mt-5 w-full rounded-full bg-[#2B2927] px-10 py-4 text-xs font-medium uppercase tracking-[0.3em] text-[#FBF7F4] disabled:opacity-40"
          >
            Checkout
          </button>
          <p id="checkout-note" className="mt-3 text-center text-[11px] text-[#2B2927]/45">
            Demo storefront — checkout is turned off.
          </p>
        </footer>
      </div>
    </>
  );
}