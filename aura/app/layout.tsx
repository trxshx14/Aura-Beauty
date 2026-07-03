import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

/**
 * Editorial pairing:
 *  - Fraunces (display) — a soft, high-contrast serif with a beauty-editorial
 *    voice, exposed as --font-display and used sparingly for headlines.
 *  - Manrope (body/UI) — a quiet geometric sans for copy, labels, and UI.
 */
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["300", "400"],
  style: ["normal", "italic"],
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