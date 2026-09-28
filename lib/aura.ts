/* -------------------------------------------------------------------------- */
/*  Shared contract between the DOM layer and the WebGL layer.                 */
/*                                                                             */
/*  The two layers never import each other's components. They talk through   */
/*  typed window CustomEvents, and both read the static data below.            */
/* -------------------------------------------------------------------------- */

/** Per-frame render statistics emitted by the scene (twice a second). */
export type RenderStats = {
  fps: number;
  ms: number;
  calls: number;
  triangles: number;
  dpr: number;
};

/* Typed window events: `window.addEventListener("aura:stats", e => e.detail)`
   is fully typed everywhere — no casts at the call sites. */
declare global {
  interface WindowEventMap {
    /** DOM → WebGL: a shade hex was selected; the serum tints to it. */
    "aura:shade": CustomEvent<string>;
    /** WebGL → DOM: the scene has rendered its first frames (shaders compiled). */
    "aura:ready": Event;
    /** WebGL → DOM: live render statistics for the stats HUD. */
    "aura:stats": CustomEvent<RenderStats>;
  }
  interface Window {
    /** Set alongside "aura:ready", in case a listener attaches late. */
    __auraReady?: boolean;
  }
}

/* -------------------------------------------------------------------------- */
/*  Product data                                                               */
/* -------------------------------------------------------------------------- */

export const PRICE_PHP = 1500;

export const formatPHP = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export const SHADES = [
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

export type Shade = (typeof SHADES)[number];

/* -------------------------------------------------------------------------- */
/*  Hotspots — anchored to the bottle in 3D, rendered in the DOM.              */
/*  `offset` is in the bottle's local units (radius 0.55, height ~2.7), and    */
/*  is applied in screen-aligned space so pins always sit on the right-hand    */
/*  silhouette, whatever the bottle's rotation.                                */
/* -------------------------------------------------------------------------- */

export const HOTSPOTS = [
  {
    id: "cap",
    offset: [0.3, 1.2, 0] as const,
    title: "Precision dropper",
    body: "One press measures a single 0.5 ml dose — enough for face and neck, nothing wasted.",
  },
  {
    id: "glass",
    offset: [0.56, 0.5, 0] as const,
    title: "Frosted UV glass",
    body: "Filters the light that breaks down active ingredients. Fully recyclable.",
  },
  {
    id: "serum",
    offset: [0.56, -0.45, 0] as const,
    title: "The serum",
    body: "A water-light gel of niacinamide, salicylic and azelaic acids, softened with aloe.",
  },
] as const;

export type HotspotId = (typeof HOTSPOTS)[number]["id"];