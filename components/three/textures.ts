import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/*  Procedural textures — drawn on <canvas> at runtime, so the project ships   */
/*  no image files and every texture is resolution-independent code.          */
/* -------------------------------------------------------------------------- */

/** Tiny seeded PRNG so textures look identical on every load. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return [c, c.getContext("2d")!] as const;
}

/**
 * Soft value noise: random pixels at several scales, each upscaled with
 * bilinear smoothing and layered. Returns a grey canvas centred on `base`.
 */
function valueNoise(size: number, seed: number, base: number, amplitude: number) {
  const [c, ctx] = canvas(size);
  const rand = rng(seed);
  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const octaves = [8, 16, 32, 64, 128];
  octaves.forEach((cells, i) => {
    const [small, sctx] = canvas(cells);
    const img = sctx.createImageData(cells, cells);
    for (let p = 0; p < img.data.length; p += 4) {
      const v = Math.round(base + (rand() - 0.5) * 2 * amplitude);
      img.data[p] = img.data[p + 1] = img.data[p + 2] = v;
      img.data[p + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    // Tile 3×3, then upscale only the middle tile: the smoothing at its
    // edges blends with the wrapped neighbours, so the result repeats
    // without seams.
    const [tiled, tctx] = canvas(cells * 3);
    for (let tx = 0; tx < 3; tx++)
      for (let ty = 0; ty < 3; ty++) tctx.drawImage(small, tx * cells, ty * cells);
    ctx.globalAlpha = 0.5 / (i + 1) + 0.1;
    ctx.drawImage(tiled, cells, cells, cells, cells, 0, 0, size, size);
  });

  // Fine grain on top, like hand-troweled plaster.
  ctx.globalAlpha = 1;
  const img = ctx.getImageData(0, 0, size, size);
  for (let p = 0; p < img.data.length; p += 4) {
    const g = (rand() - 0.5) * amplitude * 0.35;
    img.data[p] += g;
    img.data[p + 1] += g;
    img.data[p + 2] += g;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

function toTexture(c: HTMLCanvasElement, repeat: number, srgb = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Plaster surface: a bump map and a matching roughness map. */
export function createPlasterMaps() {
  const bump = toTexture(valueNoise(512, 7, 128, 60), 2);
  const rough = toTexture(valueNoise(256, 19, 225, 18), 2);
  return { bump, rough };
}

/**
 * Terrazzo colour map: nude base with chips of the brand palette.
 * Returned with separate textures for the cylinder side and caps, so chips
 * keep the same size on both (their UVs have very different aspect ratios).
 */
export function createTerrazzoMaps() {
  const size = 1024;
  const [c, ctx] = canvas(size);
  const rand = rng(42);
  ctx.fillStyle = "#E8D5C4";
  ctx.fillRect(0, 0, size, size);

  const chips = ["#C97B5D", "#F2C9C0", "#E8A852", "#B8A396", "#FBF7F4", "#2B2927"];
  const weights = [0.28, 0.24, 0.12, 0.18, 0.14, 0.04];
  const pick = () => {
    let r = rand();
    for (let i = 0; i < chips.length; i++) {
      if ((r -= weights[i]) <= 0) return chips[i];
    }
    return chips[0];
  };

  for (let i = 0; i < 900; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + Math.pow(rand(), 3) * 16;
    const sides = 4 + Math.floor(rand() * 4);
    const points: [number, number][] = [];
    for (let s = 0; s < sides; s++) {
      const a = (s / sides) * Math.PI * 2 + rand() * 0.6;
      const rr = r * (0.6 + rand() * 0.6);
      points.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    ctx.fillStyle = pick();
    // Draw each chip in the 8 neighbouring tiles too, so the texture
    // repeats without visible seams.
    for (const dx of [-size, 0, size]) {
      for (const dy of [-size, 0, size]) {
        ctx.beginPath();
        points.forEach(([px, py], k) =>
          k === 0 ? ctx.moveTo(x + dx + px, y + dy + py) : ctx.lineTo(x + dx + px, y + dy + py)
        );
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  const side = toTexture(c, 1, true);
  side.repeat.set(6, 0.5); // circumference ≈ 6 units, height 0.5
  const cap = toTexture(c, 1, true);
  cap.repeat.set(1.9, 1.9); // diameter ≈ 1.9 units
  return { side, cap };
}

/**
 * The bottle label, printed with the page's own display font. Drawn once
 * fonts are ready; the texture updates in place.
 */
export function createLabelTexture() {
  const [c, ctx] = (() => {
    const el = document.createElement("canvas");
    el.width = 1024;
    el.height = 640;
    return [el, el.getContext("2d")!] as const;
  })();
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const draw = () => {
    const css = getComputedStyle(document.documentElement);
    const display = css.getPropertyValue("--font-display").trim() || "Georgia, serif";
    const sans = css.getPropertyValue("--font-sans").trim() || "system-ui, sans-serif";

    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#2B2927";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = `500 34px ${sans}`;
    ctx.letterSpacing = "14px";
    ctx.fillText("SERUM Nº1", 512, 118);

    ctx.font = `300 220px ${display}`;
    ctx.letterSpacing = "6px";
    ctx.fillText("AURA", 512, 300);

    ctx.fillRect(362, 430, 300, 3);

    ctx.font = `italic 300 44px ${display}`;
    ctx.letterSpacing = "0px";
    ctx.fillText("niacinamide · salicylic · azelaic", 512, 500);

    ctx.font = `500 26px ${sans}`;
    ctx.letterSpacing = "10px";
    ctx.fillText("30 ML — 1.0 FL OZ", 512, 580);

    texture.needsUpdate = true;
  };

  draw();
  document.fonts?.ready.then(draw);
  return texture;
}