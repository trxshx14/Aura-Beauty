"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Float,
  Lightformer,
  MeshReflectorMaterial,
  PerformanceMonitor,
  SoftShadows,
  Sparkles,
} from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HOTSPOTS } from "../lib/aura";

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

function clay(color: string) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.92,
    metalness: 0,
  });
}

/* -------------------------------------------------------------------------- */
/*  Overlay state — plain mutable values the master timeline tweens and the   */
/*  per-frame projector reads. No React state, so scrolling never re-renders. */
/* -------------------------------------------------------------------------- */

const overlayState = { hotspots: 1 };

/* -------------------------------------------------------------------------- */
/*  Bottle materials — glass, cap, and the serum liquid inside                 */
/* -------------------------------------------------------------------------- */

type BottleMaterials = {
  glass: THREE.MeshPhysicalMaterial;
  cap: THREE.MeshStandardMaterial;
  liquid: THREE.MeshStandardMaterial;
};

function useBottleMaterials(): BottleMaterials {
  return useMemo(
    () => ({
      glass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#F7EAE4"),
        roughness: 0.15,
        transmission: 0.7,
        thickness: 1,
        ior: 1.4,
        clearcoat: 0.7,
        clearcoatRoughness: 0.3,
        iridescence: 0.15,
        iridescenceIOR: 1.3,
        envMapIntensity: 1.2,
        attenuationColor: new THREE.Color(PALETTE.pink),
        attenuationDistance: 2.5,
        transparent: true,
        opacity: 1,
      }),
      cap: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE.nude),
        roughness: 0.5,
        metalness: 0.05,
      }),
      // The serum, seen through the frosted glass. It must be OPAQUE: three.js
      // only renders opaque objects into the transmission buffer, so a
      // transparent/transmissive liquid would be invisible behind the glass.
      // The shade picker tints THIS — the product changes, the vessel stays.
      liquid: new THREE.MeshStandardMaterial({
        color: new THREE.Color("#EFC0A6"),
        roughness: 0.3,
        metalness: 0,
      }),
    }),
    []
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene refs                                                                 */
/* -------------------------------------------------------------------------- */

type StageRefs = {
  bottle: React.RefObject<THREE.Group | null>;
  /** Moves with the bottle AND its idle float — the hotspots' anchor. */
  bottleAnchor: React.RefObject<THREE.Group | null>;
  heroPedestal: React.RefObject<THREE.Group | null>;
  sidePedestal: React.RefObject<THREE.Group | null>;
  steps: React.RefObject<THREE.Group | null>;
  sphere: React.RefObject<THREE.Mesh | null>;
  ring: React.RefObject<THREE.Mesh | null>;
  column: React.RefObject<THREE.Mesh | null>;
};

/* -------------------------------------------------------------------------- */
/*  Product bottle                                                             */
/*  outer group  ← GSAP scroll transforms                                      */
/*    Float      ← idle hover                                                  */
/*      anchor   ← hotspots read this world position                           */
/*        spin   ← slow turntable                                              */
/* -------------------------------------------------------------------------- */

function ProductBottle({
  refs,
  materials,
}: {
  refs: StageRefs;
  materials: BottleMaterials;
}) {
  const spinRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * 0.12;
  });

  return (
    <group ref={refs.bottle}>
      <Float speed={1.3} rotationIntensity={0.1} floatIntensity={0.3}>
        <group ref={refs.bottleAnchor}>
          <group ref={spinRef}>
            <mesh position={[0, -0.15, 0]} material={materials.liquid}>
              <cylinderGeometry args={[0.46, 0.46, 1.15, 48]} />
            </mesh>
            <mesh castShadow material={materials.glass}>
              <cylinderGeometry args={[0.55, 0.55, 1.6, 64]} />
            </mesh>
            <mesh
              castShadow
              material={materials.glass}
              position={[0, 0.8, 0]}
              scale={[1, 0.35, 1]}
            >
              <sphereGeometry args={[0.55, 48, 32]} />
            </mesh>
            <mesh castShadow material={materials.cap} position={[0, 1.12, 0]}>
              <cylinderGeometry args={[0.28, 0.3, 0.42, 48]} />
            </mesh>
          </group>
        </group>
      </Float>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Studio stage                                                               */
/* -------------------------------------------------------------------------- */

function StudioStage({ refs }: { refs: StageRefs }) {
  const mats = useMemo(
    () => ({
      nude: clay(PALETTE.nude),
      terracotta: clay(PALETTE.terracotta),
      pink: clay(PALETTE.pink),
      amber: clay(PALETTE.amber),
    }),
    []
  );

  return (
    <>
      {/* Satin studio floor with soft, blurred reflections. On weak GPUs,
          PerformanceMonitor lowers DPR first; if that isn't enough, drop
          `resolution` to 256. */}
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

      <group ref={refs.heroPedestal}>
        <mesh castShadow receiveShadow material={mats.nude}>
          <cylinderGeometry args={[0.95, 0.95, 0.5, 64]} />
        </mesh>
        <mesh castShadow material={mats.terracotta} position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.97, 0.97, 0.06, 64]} />
        </mesh>
      </group>

      <group ref={refs.sidePedestal}>
        <mesh castShadow receiveShadow material={mats.terracotta}>
          <cylinderGeometry args={[0.8, 0.8, 1.1, 64]} />
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
        <sphereGeometry args={[0.38, 48, 48]} />
      </mesh>

      <mesh ref={refs.ring} material={mats.pink}>
        <torusGeometry args={[1.55, 0.055, 24, 96]} />
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
/*  Hotspot projector — 3D → 2D, every frame, zero React renders.              */
/*                                                                             */
/*  The hotspot buttons live in the page's DOM (so they sit above the text     */
/*  layers and stay accessible). Each frame we take the bottle's world         */
/*  position, add each hotspot's offset, project it through the camera and     */
/*  write a translate3d straight onto the element.                             */
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

    // Hotspots are rendered by the page; collect them lazily.
    if (elements.current.size < HOTSPOTS.length) {
      document.querySelectorAll<HTMLElement>("[data-hotspot]").forEach((el) => {
        elements.current.set(el.dataset.hotspot!, el);
      });
    }

    anchor.getWorldPosition(scratch.base);
    const scale = bottle.scale.x;
    // Hide below the md breakpoint: on phones the bottle sits behind the copy.
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

      // Flip the label to the left when it would run off the right edge.
      const side = x > size.width - 340 ? "left" : "right";
      if (el.dataset.side !== side) el.dataset.side = side;
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Ready signal — fires after the 3rd frame, i.e. once every shader has       */
/*  compiled and the scene is genuinely on screen. The preloader waits on it.  */
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

/* -------------------------------------------------------------------------- */
/*  Stats probe — FPS, frame time, draw calls and triangles for the HUD.       */
/*  gl.info.autoReset is disabled so the counts include every render pass in   */
/*  a frame (shadow map + floor reflection + main pass), not just the last.    */
/* -------------------------------------------------------------------------- */

function StatsProbe() {
  const gl = useThree((s) => s.gl);
  const window_ = useRef({ frames: 0, start: 0 });

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

    const w = window_.current;
    const now = performance.now();
    if (w.start === 0) w.start = now;
    w.frames += 1;

    const elapsed = now - w.start;
    if (elapsed >= 500) {
      window.dispatchEvent(
        new CustomEvent("aura:stats", {
          detail: {
            fps: (w.frames * 1000) / elapsed,
            ms: elapsed / w.frames,
            calls,
            triangles,
            dpr: gl.getPixelRatio(),
          },
        })
      );
      w.frames = 0;
      w.start = now;
    }
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Scroll rig — one master timeline for 3D + HTML + overlays                  */
/* -------------------------------------------------------------------------- */

function ScrollRig({
  refs,
  materials,
}: {
  refs: StageRefs;
  materials: BottleMaterials;
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
    if (!bottle || !heroPedestal || !sidePedestal || !steps || !sphere || !ring || !column)
      return;

    const vw = viewport.width;
    const HERO_X = vw * 0.22;
    const EDGE_X = vw * 0.3;

    const setInitialPose = () => {
      bottle.position.set(HERO_X, -0.05, 0);
      bottle.rotation.set(0, -0.4, 0.05);
      bottle.scale.setScalar(1);

      heroPedestal.position.set(HERO_X, -1.2, 0);
      sidePedestal.position.set(EDGE_X, -3.4, 0.2);
      // Props frame the bottle on the right; the left half stays clear so
      // the headline reads against clean cream, not against blocks.
      steps.position.set(vw * 0.42, -1.3, -4.2);
      sphere.position.set(vw * 0.05, -0.7, -1.4);
      ring.position.set(HERO_X, 0.15, -2.1);
      ring.rotation.set(0, 0, 0.2);
      column.position.set(-vw * 0.55, 1.4, -8); // a faint ghost pillar deep in the fog
      overlayState.hotspots = 1;
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

      // Progress rail fill spans the whole timeline (0 → 2).
      tl.fromTo("[data-progress-fill]", { scaleY: 0 }, { scaleY: 1, duration: 2 }, 0);

      /* ------- Milestone 1 · t ∈ [0, 1] — restrained macro zoom ------- */
      tl.to(overlayState, { hotspots: 0, duration: 0.18 }, 0.02) // pins leave first
        .to(bottle.rotation, { y: `+=${Math.PI}`, duration: 1 }, 0)
        .to(bottle.scale, { x: 1.12, y: 1.12, z: 1.12, duration: 1 }, 0)
        .to(bottle.position, { x: 0, y: 0.1, z: 0.9, duration: 1 }, 0)
        .to(heroPedestal.position, { y: -2.7, duration: 1 }, 0)
        .to(steps.position, { x: `-=${1.4}`, y: "-=1.2", duration: 1 }, 0)
        .to(sphere.position, { x: -vw * 0.1, y: 0.5, duration: 1 }, 0)
        .to(ring.position, { x: 0, y: 0.1, duration: 1 }, 0)
        .to(ring.rotation, { z: "+=0.6", duration: 1 }, 0)
        .to(ring.scale, { x: 1.2, y: 1.2, z: 1.2, duration: 1 }, 0)
        .to(column.position, { x: `-=${vw * 0.05}`, duration: 1 }, 0)
        .to("[data-panel='hero']", { autoAlpha: 0, y: -40, duration: 0.35 }, 0.05)
        .fromTo(
          "[data-panel='formula']",
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          0.5
        )
        .fromTo(
          "[data-formula-row]",
          { autoAlpha: 0, x: -24 },
          { autoAlpha: 1, x: 0, duration: 0.25, stagger: 0.07 },
          0.62
        )
        .to("[data-progress='1']", { opacity: 0.35, duration: 0.2 }, 0.5)
        .to("[data-progress='2']", { opacity: 1, duration: 0.2 }, 0.5);

      /* ------- Milestone 2 · t ∈ [1, 2] — the shade counter ------- */
      tl.to("[data-panel='formula']", { autoAlpha: 0, y: -40, duration: 0.3 }, 1.0)
        .to(bottle.position, { x: EDGE_X, y: -0.15, z: 0.3, duration: 1 }, 1)
        .to(bottle.rotation, { y: `+=${Math.PI * 0.35}`, duration: 1 }, 1)
        .to(bottle.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 1 }, 1)
        .to(sidePedestal.position, { y: -1.3, duration: 0.8 }, 1.15)
        .to(ring.position, { x: EDGE_X, duration: 1 }, 1)
        .to(ring.rotation, { z: "+=0.4", duration: 1 }, 1)
        .to(ring.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 1 }, 1)
        .to(sphere.position, { x: -vw * 0.02, y: -0.95, duration: 1 }, 1)
        .fromTo(
          "[data-panel='shades']",
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          1.5
        )
        .to("[data-progress='2']", { opacity: 0.35, duration: 0.2 }, 1.5)
        .to("[data-progress='3']", { opacity: 1, duration: 0.2 }, 1.5);
    });

    // Reduced motion: static composition; hotspots simply hide once the
    // hero has scrolled away (a visibility switch, not an animation).
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setInitialPose();
      gsap.set(
        "[data-panel='hero'], [data-panel='formula'], [data-panel='shades'], [data-formula-row], [data-progress]",
        { autoAlpha: 1, y: 0, x: 0, opacity: 1 }
      );
      ScrollTrigger.create({
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          overlayState.hotspots = self.progress < 0.1 ? 1 : 0;
          gsap.set("[data-progress-fill]", { scaleY: self.progress });
        },
      });
    });

    return () => mm.revert();
  }, [viewport.width, refs, materials]);

  /* ---- DOM → WebGL: a selected shade tints the serum ------------------- */
  useEffect(() => {
    const onShade = (e: CustomEvent<string>) => {
      const hex = e.detail;
      const liquidTint = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.15);
      const glassTint = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.65);
      gsap.to(materials.liquid.color, {
        r: liquidTint.r,
        g: liquidTint.g,
        b: liquidTint.b,
        duration: 0.7,
        ease: "power2.out",
      });
      gsap.to(materials.glass.attenuationColor, {
        r: glassTint.r,
        g: glassTint.g,
        b: glassTint.b,
        duration: 0.7,
        ease: "power2.out",
      });
    };
    window.addEventListener("aura:shade", onShade);
    return () => window.removeEventListener("aura:shade", onShade);
  }, [materials]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Canvas                                                                     */
/* -------------------------------------------------------------------------- */

export default function ThreeScene() {
  const materials = useBottleMaterials();

  // Adaptive resolution: start at up to 1.5×, let PerformanceMonitor move it
  // between 1× and 2× depending on the frame rate this device sustains.
  const [dpr, setDpr] = useState(() =>
    typeof window === "undefined" ? 1 : Math.min(1.5, window.devicePixelRatio)
  );

  const bottle = useRef<THREE.Group>(null);
  const bottleAnchor = useRef<THREE.Group>(null);
  const heroPedestal = useRef<THREE.Group>(null);
  const sidePedestal = useRef<THREE.Group>(null);
  const steps = useRef<THREE.Group>(null);
  const sphere = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const column = useRef<THREE.Mesh>(null);

  // One stable object for the whole lifetime of the scene. If this were
  // rebuilt on every render, a DPR change would tear down and rebuild the
  // scroll timeline (it depends on `refs`).
  const refs = useMemo<StageRefs>(
    () => ({ bottle, bottleAnchor, heroPedestal, sidePedestal, steps, sphere, ring, column }),
    []
  );

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 0.2, 6.2], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows
    >
      <PerformanceMonitor
        onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
        onDecline={() => setDpr(1)}
        flipflops={3}
        onFallback={() => setDpr(1)}
      />

      <fog attach="fog" args={[PALETTE.vanilla, 7, 15]} />
      <SoftShadows size={24} samples={12} focus={0.6} />

      <ambientLight intensity={0.55} color={PALETTE.vanilla} />
      <directionalLight
        castShadow
        position={[5, 8, 4]}
        intensity={1.7}
        color="#fff3ea"
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0002}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-6, 3, -5]} intensity={0.7} color="#f6e3d8" />
      <pointLight position={[0, -2.5, 3]} intensity={0.3} color={PALETTE.pink} />

      <Environment resolution={256}>
        <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
        <Lightformer
          intensity={1.5}
          position={[-5, 1, -1]}
          rotation-y={Math.PI / 2}
          scale={[12, 4, 1]}
        />
        <Lightformer
          intensity={1.5}
          position={[10, 1, 0]}
          rotation-y={-Math.PI / 2}
          scale={[16, 2, 1]}
        />
        <Lightformer
          intensity={1}
          color={PALETTE.pink}
          position={[0, -2, 5]}
          scale={[8, 3, 1]}
        />
      </Environment>

      <StudioStage refs={refs} />
      <ProductBottle refs={refs} materials={materials} />
      <ScrollRig refs={refs} materials={materials} />
      <CameraParallax />
      <HotspotProjector refs={refs} />
      <ReadySignal />
      <StatsProbe />
    </Canvas>
  );
}