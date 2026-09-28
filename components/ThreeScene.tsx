"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
  SoftShadows,
  Sparkles,
} from "@react-three/drei";
import { DepthOfField, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode, type DepthOfFieldEffect } from "postprocessing";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOTSPOTS, SHADES } from "../lib/aura";
import { BottleModel, BOTTLE_BASE_Y, createBottleKit, createLiquidMaterial } from "./three/Bottle";
import { createPlasterMaps, createTerrazzoMaps } from "./three/textures";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/* -------------------------------------------------------------------------- */
/*  Palette                                                                    */
/* -------------------------------------------------------------------------- */

const PALETTE = {
  vanilla: "#FBF7F4",
  pink: "#F2C9C0",
  terracotta: "#C97B5D",
  nude: "#E8D5C4",
  amber: "#E8A852",
  charcoal: "#2B2927",
} as const;

/**
 * The studio backdrop, in HDR. The ACES tone-mapping pass darkens everything
 * it touches, so a plain #FBF7F4 would come out grey. This is the linear value
 * that tone-maps back to exactly #FBF7F4 — solved numerically offline with
 * three.js's own ACES curve. Used for the backdrop dome AND the fog, so the
 * floor dissolves into the page colour with no horizon line.
 */
const BACKDROP_HDR = new THREE.Color(4.678, 2.925, 2.178);

/* -------------------------------------------------------------------------- */
/*  Overlay state — plain values the scroll timeline tweens and per-frame     */
/*  code reads. No React state, so scrolling never re-renders anything.       */
/* -------------------------------------------------------------------------- */

const overlayState = {
  hotspots: 1, // hotspot pins visibility (0–1)
  dof: 0, // depth-of-field bokeh scale
};

/* Lineup for the finale: one bottle per shade, 20 % of the viewport apart,
   so the HTML labels (centred at 20 / 40 / 60 / 80 %) line up underneath. */
const LINEUP_X = [-0.3, -0.1, 0.1, 0.3];
const LINEUP_SCALE = 0.72;

/* -------------------------------------------------------------------------- */
/*  Scene refs                                                                 */
/* -------------------------------------------------------------------------- */

type StageRefs = {
  bottle: React.RefObject<THREE.Group | null>;
  bottleAnchor: React.RefObject<THREE.Group | null>;
  caustics: React.RefObject<THREE.Group | null>;
  heroPedestal: React.RefObject<THREE.Group | null>;
  sidePedestal: React.RefObject<THREE.Group | null>;
  steps: React.RefObject<THREE.Group | null>;
  sphere: React.RefObject<THREE.Mesh | null>;
  ring: React.RefObject<THREE.Mesh | null>;
  column: React.RefObject<THREE.Mesh | null>;
  lineup: React.RefObject<THREE.Group | null>;
  keyLight: React.RefObject<THREE.DirectionalLight | null>;
  rimLight: React.RefObject<THREE.PointLight | null>;
};

/** The caustics projection plane's colour uniform (fading it to black = off). */
function causticColor(group: THREE.Group | null): THREE.Color | null {
  const plane = group?.children.find(
    (c): c is THREE.Mesh => (c as THREE.Mesh).isMesh === true
  );
  const material = plane?.material as (THREE.Material & { color?: THREE.Color }) | undefined;
  return material?.color ?? null;
}

/* -------------------------------------------------------------------------- */
/*  Materials                                                                  */
/* -------------------------------------------------------------------------- */

function useStageMaterials() {
  return useMemo(() => {
    const { bump, rough } = createPlasterMaps();
    const plaster = (color: string) =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 1,
        roughnessMap: rough,
        bumpMap: bump,
        bumpScale: 1.2,
        metalness: 0,
      });

    // Terrazzo for the hero plinth: separate side/cap maps keep chip size even.
    const terrazzo = createTerrazzoMaps();
    const terrazzoMat = (map: THREE.Texture) =>
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.55,
        roughnessMap: rough,
        bumpMap: bump,
        bumpScale: 0.4,
      });

    return {
      nude: plaster(PALETTE.nude),
      terracotta: plaster(PALETTE.terracotta),
      pink: plaster(PALETTE.pink),
      amber: new THREE.MeshStandardMaterial({ color: PALETTE.amber, roughness: 0.6 }),
      ring: new THREE.MeshStandardMaterial({ color: PALETTE.pink, roughness: 0.5 }),
      // Cylinder material groups: [side, top cap, bottom cap]
      terrazzo: [terrazzoMat(terrazzo.side), terrazzoMat(terrazzo.cap), terrazzoMat(terrazzo.cap)],
    };
  }, []);
}

/* -------------------------------------------------------------------------- */
/*  Studio stage                                                               */
/* -------------------------------------------------------------------------- */

function StudioStage({
  refs,
  mats,
}: {
  refs: StageRefs;
  mats: ReturnType<typeof useStageMaterials>;
}) {
  return (
    <>
      {/* Backdrop dome: an infinite cyclorama in the page colour. */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color={BACKDROP_HDR} side={THREE.BackSide} fog={false} depthWrite={false} />
      </mesh>

      {/* Satin studio floor with soft, blurred reflections. */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.45, 0]}>
        <planeGeometry args={[80, 80]} />
        <MeshReflectorMaterial
          color={PALETTE.vanilla}
          roughness={0.85}
          metalness={0}
          mirror={0}
          resolution={512}
          blur={[300, 80]}
          mixBlur={1}
          mixStrength={1.6}
          depthScale={0.8}
          minDepthThreshold={0.85}
        />
      </mesh>

      {/* Hero plinth — terrazzo with a terracotta reveal line */}
      <group ref={refs.heroPedestal}>
        <mesh castShadow receiveShadow material={mats.terrazzo}>
          <cylinderGeometry args={[0.95, 0.95, 0.5, 96]} />
        </mesh>
        <mesh castShadow material={mats.terracotta} position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.97, 0.97, 0.06, 96]} />
        </mesh>
      </group>

      {/* Side pedestal — rises in act 2, sinks in the finale */}
      <group ref={refs.sidePedestal}>
        <mesh castShadow receiveShadow material={mats.terracotta}>
          <cylinderGeometry args={[0.8, 0.8, 1.1, 96]} />
        </mesh>
      </group>

      <group ref={refs.steps}>
        <mesh castShadow receiveShadow material={mats.terracotta}>
          <boxGeometry args={[2.6, 0.4, 2.6]} />
        </mesh>
        <mesh castShadow receiveShadow material={mats.nude} position={[-0.5, 0.4, 0.4]}>
          <boxGeometry args={[1.9, 0.4, 1.9]} />
        </mesh>
        <mesh castShadow receiveShadow material={mats.pink} position={[-0.9, 0.8, 0.7]}>
          <boxGeometry args={[1.2, 0.4, 1.2]} />
        </mesh>
      </group>

      <mesh ref={refs.sphere} castShadow material={mats.amber}>
        <sphereGeometry args={[0.38, 64, 64]} />
      </mesh>

      <mesh ref={refs.ring} material={mats.ring}>
        <torusGeometry args={[1.55, 0.055, 24, 128]} />
      </mesh>

      <mesh ref={refs.column} castShadow material={mats.terracotta}>
        <boxGeometry args={[0.9, 6.5, 0.9]} />
      </mesh>

      <Sparkles
        count={70}
        scale={[14, 6, 8]}
        position={[0, 0.6, -1]}
        size={2.5}
        speed={0.25}
        opacity={0.35}
        color={PALETTE.amber}
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Finale lineup — four bottles, one per shade, each on its own plinth.       */
/*  Each slot group starts under the floor and is raised by the timeline.     */
/* -------------------------------------------------------------------------- */

function Lineup({
  refs,
  kit,
  mats,
}: {
  refs: StageRefs;
  kit: ReturnType<typeof createBottleKit>;
  mats: ReturnType<typeof useStageMaterials>;
}) {
  const { viewport } = useThree();
  const liquids = useMemo(() => SHADES.map((s) => createLiquidMaterial(s.hex)), []);
  const pedestalTop = -0.95;

  return (
    <group ref={refs.lineup} visible={false}>
      {SHADES.map((shade, i) => (
        <group key={shade.id} name={`slot-${i}`} position={[LINEUP_X[i] * viewport.width, -3.4, 0]}>
          <mesh castShadow receiveShadow material={mats.terrazzo} position={[0, pedestalTop - 0.25, 0]}>
            <cylinderGeometry args={[0.5, 0.5, 0.5, 64]} />
          </mesh>
          <group
            position={[0, pedestalTop - BOTTLE_BASE_Y * LINEUP_SCALE, 0]}
            scale={LINEUP_SCALE}
            rotation={[0, -0.3 + i * 0.25, 0]}
          >
            <BottleModel kit={kit} liquid={liquids[i]} spinSpeed={0.08} floatIntensity={0.15} />
          </group>
        </group>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mouse-parallax camera                                                      */
/* -------------------------------------------------------------------------- */

function CameraParallax() {
  const { camera, pointer } = useThree();
  const enabled = useMemo(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useFrame(() => {
    if (!enabled) return;
    const targetX = pointer.x * 0.35;
    const targetY = 0.2 + pointer.y * 0.2;
    camera.position.x += (targetX - camera.position.x) * 0.05;
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, -0.1, 0);
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Post-processing: depth of field focused on the bottle, then tone mapping. */
/*  The composer renders in HDR, so ACES happens here (the renderer's own     */
/*  tone mapping is switched off by EffectComposer).                           */
/* -------------------------------------------------------------------------- */

function Effects({ refs }: { refs: StageRefs }) {
  const dof = useRef<DepthOfFieldEffect>(null);
  const focus = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const effect = dof.current;
    const anchor = refs.bottleAnchor.current;
    if (!effect || !anchor) return;
    anchor.getWorldPosition(focus);
    effect.target?.copy(focus);
    effect.bokehScale = overlayState.dof;
  });

  return (
    <EffectComposer multisampling={4}>
      <DepthOfField ref={dof} target={[0, 0, 0]} worldFocusRange={1.6} bokehScale={0} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}

/* -------------------------------------------------------------------------- */
/*  Hotspot projector — 3D → 2D every frame, zero React renders.               */
/* -------------------------------------------------------------------------- */

function HotspotProjector({ refs }: { refs: StageRefs }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const elements = useRef<Map<string, HTMLElement>>(new Map());
  const scratch = useMemo(
    () => ({ base: new THREE.Vector3(), point: new THREE.Vector3() }),
    []
  );

  useFrame(() => {
    const bottle = refs.bottle.current;
    const anchor = refs.bottleAnchor.current;
    if (!bottle || !anchor) return;

    if (elements.current.size < HOTSPOTS.length) {
      document.querySelectorAll<HTMLElement>("[data-hotspot]").forEach((el) => {
        elements.current.set(el.dataset.hotspot!, el);
      });
    }

    anchor.getWorldPosition(scratch.base);
    const scale = bottle.scale.x;
    const visibility = size.width >= 768 ? overlayState.hotspots : 0;

    for (const spot of HOTSPOTS) {
      const el = elements.current.get(spot.id);
      if (!el) continue;

      scratch.point
        .set(spot.offset[0], spot.offset[1], spot.offset[2])
        .multiplyScalar(scale)
        .add(scratch.base)
        .project(camera);

      const x = (scratch.point.x * 0.5 + 0.5) * size.width;
      const y = (-scratch.point.y * 0.5 + 0.5) * size.height;

      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = visibility.toFixed(3);

      const nextVisibility = visibility > 0.02 ? "visible" : "hidden";
      if (el.style.visibility !== nextVisibility) el.style.visibility = nextVisibility;

      const side = x > size.width - 340 ? "left" : "right";
      if (el.dataset.side !== side) el.dataset.side = side;
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Ready signal + stats probe                                                 */
/* -------------------------------------------------------------------------- */

function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) {
      window.__auraReady = true;
      window.dispatchEvent(new Event("aura:ready"));
    }
  });
  return null;
}

function StatsProbe() {
  const gl = useThree((s) => s.gl);
  const sample = useRef({ frames: 0, start: 0 });

  useEffect(() => {
    gl.info.autoReset = false;
    return () => {
      gl.info.autoReset = true;
    };
  }, [gl]);

  useFrame(() => {
    const calls = gl.info.render.calls;
    const triangles = gl.info.render.triangles;
    gl.info.reset();

    const s = sample.current;
    const now = performance.now();
    if (s.start === 0) s.start = now;
    s.frames += 1;

    const elapsed = now - s.start;
    if (elapsed >= 500) {
      window.dispatchEvent(
        new CustomEvent("aura:stats", {
          detail: {
            fps: (s.frames * 1000) / elapsed,
            ms: elapsed / s.frames,
            calls,
            triangles,
            dpr: gl.getPixelRatio(),
          },
        })
      );
      s.frames = 0;
      s.start = now;
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scroll rig — one master timeline for 3D, lights, effects, HTML, overlays   */
/*                                                                             */
/*  Timeline units = sections:  0–1 hero → formula                             */
/*                              1–2 formula → shades                           */
/*                              2–3 shades → collection finale                 */
/* -------------------------------------------------------------------------- */

function ScrollRig({
  refs,
  liquid,
  glass,
}: {
  refs: StageRefs;
  liquid: THREE.MeshStandardMaterial;
  glass: THREE.MeshPhysicalMaterial;
}) {
  const { viewport } = useThree();

  useLayoutEffect(() => {
    const bottle = refs.bottle.current;
    const heroPedestal = refs.heroPedestal.current;
    const sidePedestal = refs.sidePedestal.current;
    const steps = refs.steps.current;
    const sphere = refs.sphere.current;
    const ring = refs.ring.current;
    const column = refs.column.current;
    const lineup = refs.lineup.current;
    const caustic = causticColor(refs.caustics.current);
    if (!bottle || !heroPedestal || !sidePedestal || !steps || !sphere || !ring || !column || !lineup)
      return;

    const vw = viewport.width;
    const HERO_X = vw * 0.22;
    const EDGE_X = vw * 0.3;
    const slots = lineup.children.filter((c) => c.name.startsWith("slot-"));
    const causticOn = new THREE.Color("#FFE6CC");

    const setInitialPose = () => {
      bottle.visible = true;
      bottle.position.set(HERO_X, -0.15, 0); // base sits exactly on the plinth
      bottle.rotation.set(0, -0.4, 0.05);
      bottle.scale.setScalar(1);

      heroPedestal.position.set(HERO_X, -1.2, 0);
      sidePedestal.position.set(EDGE_X, -3.4, 0.2);
      steps.position.set(vw * 0.42, -1.3, -4.2);
      sphere.position.set(vw * 0.05, -0.7, -1.4);
      ring.position.set(HERO_X, 0.2, -2.1);
      ring.rotation.set(0, 0, 0.2);
      ring.scale.setScalar(1);
      column.position.set(-vw * 0.55, 1.4, -8);
      lineup.visible = false;
      slots.forEach((s) => (s.position.y = -3.4));
      caustic?.copy(causticOn);
      overlayState.hotspots = 1;
      overlayState.dof = 0;
    };

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      setInitialPose();

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: "#scroll-container",
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo("[data-progress-fill]", { scaleY: 0 }, { scaleY: 1, duration: 3 }, 0);

      /* ------- Act 1 · t ∈ [0, 1] — lift-off and macro close-up ------- */
      tl.to(overlayState, { hotspots: 0, duration: 0.18 }, 0.02)
        .to(bottle.rotation, { y: `+=${Math.PI}`, duration: 1 }, 0)
        .to(bottle.scale, { x: 1.05, y: 1.05, z: 1.05, duration: 1 }, 0)
        .to(bottle.position, { x: 0, y: -0.1, z: 0.9, duration: 1 }, 0)
        .to(heroPedestal.position, { y: -2.7, duration: 1 }, 0)
        .to(steps.position, { x: `-=${1.4}`, y: "-=1.2", duration: 1 }, 0)
        .to(sphere.position, { x: -vw * 0.1, y: 0.5, duration: 1 }, 0)
        .to(ring.position, { x: 0, y: 0.1, duration: 1 }, 0)
        .to(ring.rotation, { z: "+=0.6", duration: 1 }, 0)
        .to(ring.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1 }, 0)
        .to(column.position, { x: `-=${vw * 0.05}`, duration: 1 }, 0)
        // Background falls out of focus as the camera "goes macro"
        .to(overlayState, { dof: 4.5, duration: 0.5 }, 0.35)
        .to("[data-panel='hero']", { autoAlpha: 0, y: -40, duration: 0.35 }, 0.05)
        .fromTo("[data-panel='formula']", { autoAlpha: 0, y: 56 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.5)
        .fromTo(
          "[data-formula-row]",
          { autoAlpha: 0, x: -24 },
          { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.07 },
          0.62
        )
        // "Zero noise." softens (Fraunces SOFT axis) as it arrives
        .fromTo("[data-soft-scroll]", { "--soft": 0 }, { "--soft": 100, duration: 0.45 }, 0.6)
        .to("[data-progress='1']", { opacity: 0.35, duration: 0.2 }, 0.5)
        .to("[data-progress='2']", { opacity: 1, duration: 0.2 }, 0.5);

      if (caustic) tl.to(caustic, { r: 0, g: 0, b: 0, duration: 0.15 }, 0.05);

      /* ------- Act 2 · t ∈ [1, 2] — the shade counter ------- */
      tl.to("[data-panel='formula']", { autoAlpha: 0, y: -40, duration: 0.3 }, 1.0)
        .to(overlayState, { dof: 0, duration: 0.3 }, 1.0)
        .to(bottle.position, { x: EDGE_X, y: -0.15, z: 0.3, duration: 1 }, 1)
        .to(bottle.rotation, { y: `+=${Math.PI * 0.35}`, duration: 1 }, 1)
        .to(bottle.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 1 }, 1)
        // plinth top meets the bottle base: −0.15 − 0.8 × 0.95 − 0.55
        .to(sidePedestal.position, { y: -1.46, duration: 0.8 }, 1.15)
        .to(ring.position, { x: EDGE_X, duration: 1 }, 1)
        .to(ring.rotation, { z: "+=0.4", duration: 1 }, 1)
        .to(ring.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 1 }, 1)
        .to(sphere.position, { x: -vw * 0.02, y: -0.95, duration: 1 }, 1)
        .fromTo("[data-panel='shades']", { autoAlpha: 0, y: 56 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 1.5)
        .to("[data-progress='2']", { opacity: 0.35, duration: 0.2 }, 1.5)
        .to("[data-progress='3']", { opacity: 1, duration: 0.2 }, 1.5);

      if (caustic) tl.to(caustic, { r: causticOn.r, g: causticOn.g, b: causticOn.b, duration: 0.15 }, 1.85);

      /* ------- Act 3 · t ∈ [2, 3] — the collection ------- */
      tl.to("[data-panel='shades']", { autoAlpha: 0, y: -40, duration: 0.25 }, 2.0)
        .to(bottle.position, { y: "-=3.3", duration: 0.5, ease: "power2.in" }, 2.0)
        .to(sidePedestal.position, { y: "-=3.3", duration: 0.5, ease: "power2.in" }, 2.0)
        .set(bottle, { visible: false }, 2.5)
        .to(ring.position, { x: 0, y: 0.35, z: -3.2, duration: 0.8 }, 2.0)
        .to(ring.scale, { x: 2.3, y: 2.3, z: 2.3, duration: 0.8 }, 2.0)
        .to(ring.rotation, { z: "+=0.5", duration: 0.8 }, 2.0)
        .to(sphere.position, { x: vw * 0.48, y: -1.05, z: -2.5, duration: 0.8 }, 2.0)
        .set(lineup, { visible: true }, 2.05)
        .fromTo("[data-panel='finale']", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 2.55)
        .to("[data-progress='3']", { opacity: 0.35, duration: 0.2 }, 2.5)
        .to("[data-progress='4']", { opacity: 1, duration: 0.2 }, 2.5);

      if (caustic) tl.to(caustic, { r: 0, g: 0, b: 0, duration: 0.1 }, 2.0);

      slots.forEach((slot, i) => {
        tl.to(slot.position, { y: 0, duration: 0.45, ease: "power3.out" }, 2.2 + i * 0.08);
      });
    });

    // Reduced motion: a static composition; hotspots hide once the hero
    // scrolls away (a visibility switch, not an animation).
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setInitialPose();
      gsap.set(
        "[data-panel='hero'], [data-panel='formula'], [data-panel='shades'], [data-panel='finale'], [data-formula-row], [data-progress]",
        { autoAlpha: 1, y: 0, x: 0, opacity: 1 }
      );
      ScrollTrigger.create({
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          overlayState.hotspots = self.progress < 0.08 ? 1 : 0;
          gsap.set("[data-progress-fill]", { scaleY: self.progress });
        },
      });
    });

    return () => mm.revert();
  }, [viewport.width, refs]);

  /* ---- DOM → WebGL: a selected shade tints the serum AND the studio ---- */
  useEffect(() => {
    const warmWhite = new THREE.Color("#FFF3EA");
    const white = new THREE.Color("#FFFFFF");
    const onShade = (e: CustomEvent<string>) => {
      const hex = e.detail;
      const to = (color: THREE.Color, target: THREE.Color) =>
        gsap.to(color, { r: target.r, g: target.g, b: target.b, duration: 0.9, ease: "power2.out" });

      to(liquid.color, new THREE.Color(hex).lerp(white, 0.15));
      to(glass.attenuationColor, new THREE.Color(hex).lerp(white, 0.65));
      // Key light warms toward the shade; the rim light takes it fully.
      if (refs.keyLight.current) to(refs.keyLight.current.color, warmWhite.clone().lerp(new THREE.Color(hex), 0.18));
      if (refs.rimLight.current) to(refs.rimLight.current.color, new THREE.Color(hex).lerp(white, 0.1));
    };
    window.addEventListener("aura:shade", onShade);
    return () => window.removeEventListener("aura:shade", onShade);
  }, [liquid, glass, refs]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Canvas                                                                     */
/* -------------------------------------------------------------------------- */

export default function ThreeScene() {
  const kit = useMemo(() => createBottleKit(), []);
  const heroLiquid = useMemo(() => createLiquidMaterial("#EFC0A6"), []);
  const stageMats = useStageMaterials();

  const [dpr, setDpr] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(1.5, window.devicePixelRatio)
  );

  const bottle = useRef<THREE.Group>(null);
  const bottleAnchor = useRef<THREE.Group>(null);
  const caustics = useRef<THREE.Group>(null);
  const heroPedestal = useRef<THREE.Group>(null);
  const sidePedestal = useRef<THREE.Group>(null);
  const steps = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const column = useRef<THREE.Mesh>(null);
  const lineup = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const rimLight = useRef<THREE.PointLight>(null);

  // One stable object for the scene's lifetime, so a DPR change never
  // rebuilds the scroll timeline (which depends on `refs`).
  const refs = useMemo<StageRefs>(
    () => ({
      bottle,
      bottleAnchor,
      caustics,
      heroPedestal,
      sidePedestal,
      steps,
      sphere,
      ring,
      column,
      lineup,
      keyLight,
      rimLight,
    }),
    []
  );

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.2, 6.2], fov: 35 }}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      shadows
    >
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
        onDecline={() => setDpr(1)}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />

      <fog attach="fog" args={[BACKDROP_HDR, 7, 15]} />
      <SoftShadows size={24} samples={12} focus={0.6} />

      <ambientLight intensity={0.55} color={PALETTE.vanilla} />
      <directionalLight
        ref={keyLight}
        castShadow
        position={[5, 8, 4]}
        intensity={1.7}
        color="#FFF3EA"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-6, 3, -5]} intensity={0.7} color="#F6E3D8" />
      {/* Shade rim light: behind the bottle, takes the selected shade's colour */}
      <pointLight ref={rimLight} position={[3.2, 1.6, -2.4]} intensity={7} distance={9} color={PALETTE.pink} />
      <pointLight position={[0, -2.5, 3]} intensity={0.3} color={PALETTE.pink} />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.5} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer intensity={1.5} position={[10, 1, 0]} rotation-y={-Math.PI / 2} scale={[16, 2, 1]} />
        <Lightformer intensity={1} color={PALETTE.pink} position={[0, -2, 5]} scale={[8, 3, 1]} />
      </Environment>

      <StudioStage refs={refs} mats={stageMats} />

      {/* Hero bottle: GSAP drives the outer group; BottleModel handles float,
          spin, caustics and the label inside it. */}
      <group ref={bottle}>
        <BottleModel kit={kit} liquid={heroLiquid} anchorRef={bottleAnchor} causticsRef={caustics} />
      </group>

      <Lineup refs={refs} kit={kit} mats={stageMats} />

      <ScrollRig refs={refs} liquid={heroLiquid} glass={kit.glass} />
      <CameraParallax />
      <HotspotProjector refs={refs} />
      <ReadySignal />
      <StatsProbe />
      <Effects refs={refs} />
    </Canvas>
  );
}