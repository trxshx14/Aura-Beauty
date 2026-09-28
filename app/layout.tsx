import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

/**
 * Editorial pairing:
 *  - Fraunces (display) — loaded as a VARIABLE font so its SOFT and WONK
 *    axes can be animated (see .soft-type in globals.css). Weight is left
 *    unset on purpose: with `axes`, next/font loads the full weight range.
 *  - Manrope (body/UI) — a quiet geometric sans for copy, labels, and UI.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Aura Beauty — Serum Nº1",
  description:
    "A weightless botanical serum, distilled to seven ingredients. Skin, in its own light.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="bg-[#FBF7F4] font-[family-name:var(--font-sans)] text-[#2B2927] antialiased">
        {children}
      </body>
    </html>
  );
}