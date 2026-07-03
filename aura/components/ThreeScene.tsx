"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, Lightformer} from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reduces resize-jitter on mobile browsers where the URL bar collapsing
 * fires resize events mid-scroll and would otherwise force a ScrollTrigger
 * recalculation on every frame.
 */
ScrollTrigger.config({ ignoreMobileResize: true });

/* -------------------------------------------------------------------------- */
/*  Product placeholder — a premium frosted-glass serum bottle                 */
/* -------------------------------------------------------------------------- */

type BottleMaterials = {
  glass: THREE.MeshPhysicalMaterial;
  cap: THREE.MeshStandardMaterial;
};

function useBottleMaterials(): BottleMaterials {
  return useMemo(() => {
    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f6ebe6"),
      roughness: 0.2,
      transmission: 0.7,
      thickness: 1,
      ior: 1.4,
      clearcoat: 0.6,
      clearcoatRoughness: 0.35,
      attenuationColor: new THREE.Color("#F3E1DC"),
      attenuationDistance: 2.5,
      transparent: true, // required so GSAP can tween .opacity in milestone 2
      opacity: 1,
    });

    const cap = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#F3E1DC"),
      roughness: 0.45,
      metalness: 0.05,
      transparent: true,
      opacity: 1,
    });

    return { glass, cap };
  }, []);
}

/**
 * A "rounded cylinder" built from three primitives sharing one glass
 * material: a cylinder body, a squashed sphere that rounds the shoulder,
 * and a blush lid. Cheap to render, reads as a high-end bottle silhouette.
 */
function ProductBottle({
  groupRef,
  materials,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  materials: BottleMaterials;
}) {
  return (
    <group ref={groupRef}>
      {/* Gentle idle float, nested INSIDE the scroll-driven group so GSAP
          (outer transforms) and Float (inner offset) never fight. */}
      <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.4}>
        {/* Body */}
        <mesh castShadow material={materials.glass}>
          <cylinderGeometry args={[0.55, 0.55, 1.6, 64]} />
        </mesh>

        {/* Rounded shoulder */}
        <mesh
          castShadow
          material={materials.glass}
          position={[0, 0.8, 0]}
          scale={[1, 0.35, 1]}
        >
          <sphereGeometry args={[0.55, 48, 32]} />
        </mesh>

        {/* Blush lid */}
        <mesh castShadow material={materials.cap} position={[0, 1.12, 0]}>
          <cylinderGeometry args={[0.28, 0.3, 0.42, 48]} />
        </mesh>
      </Float>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scroll rig — one master GSAP timeline scrubbed across the whole page       */
/* -------------------------------------------------------------------------- */

/**
 * A SINGLE timeline drives everything (3D transforms + HTML panels) so all
 * layers are interpolated from the same scroll progress value — this is what
 * keeps the 3D and DOM perfectly phase-locked with zero drift.
 *
 * Timeline time-space (total duration = 2):
 *   t = 0 → 1   scrolling Section 1 → Section 2  (Milestone 1: macro zoom)
 *   t = 1 → 2   scrolling Section 2 → Section 3  (Milestone 2: slide aside)
 */
function ScrollRig({
  bottleRef,
  materials,
}: {
  bottleRef: React.RefObject<THREE.Group | null>;
  materials: BottleMaterials;
}) {
  const { viewport } = useThree();

  useLayoutEffect(() => {
    const bottle = bottleRef.current;
    if (!bottle) return;

    // World-space anchors derived from the live viewport, so the composition
    // holds on any aspect ratio. Effect re-runs when viewport.width changes
    // (resize), rebuilding the timeline against fresh measurements.
    const vw = viewport.width;
    const HERO_X = vw * 0.22; // floats right of the hero copy
    const EDGE_X = vw * 0.34; // parked at the right edge for Section 3

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // ---- Initial pose (Section 1) ----
      bottle.position.set(HERO_X, -0.15, 0);
      bottle.rotation.set(0, -0.4, 0.05);
      bottle.scale.setScalar(1);
      materials.glass.opacity = 1;
      materials.cap.opacity = 1;

      const tl = gsap.timeline({
        defaults: { ease: "none" }, // linear tweens: scrub:1 supplies the easing
        scrollTrigger: {
          trigger: "#scroll-container",
          start: "top top",
          end: "bottom bottom", // spans ALL panels — auto-matches their height
          scrub: 1, // 1s catch-up = buttery interpolation, no jitter
          invalidateOnRefresh: true,
        },
      });

      /* ------------------- Milestone 1 · t ∈ [0, 1] -------------------
         Bottle rotates 180°, scales up, and pulls toward the camera for a
         macro "texture" view while the hero copy yields to the formula card. */
      tl.to(bottle.rotation, { y: `+=${Math.PI}`, duration: 1 }, 0)
        .to(bottle.scale, { x: 1.35, y: 1.35, z: 1.35, duration: 1 }, 0)
        .to(bottle.position, { x: 0, y: 0.05, z: 1.5, duration: 1 }, 0)
        .to(
          "[data-panel='hero']",
          { autoAlpha: 0, y: -40, duration: 0.35 },
          0.05
        )
        .fromTo(
          "[data-panel='formula']",
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          0.5
        );

      /* ------------------- Milestone 2 · t ∈ [1, 2] -------------------
         Bottle glides to the right edge and dissolves to a ghosted accent,
         clearing the stage for the interactive shade picker. */
      tl.to(
        "[data-panel='formula']",
        { autoAlpha: 0, y: -40, duration: 0.3 },
        1.0
      )
        .to(bottle.position, { x: EDGE_X, y: -0.1, z: 0.3, duration: 1 }, 1)
        .to(bottle.rotation, { y: `+=${Math.PI * 0.35}`, duration: 1 }, 1)
        .to(bottle.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 1 }, 1)
        .to(materials.glass, { opacity: 0.16, duration: 0.7 }, 1.15)
        .to(materials.cap, { opacity: 0.16, duration: 0.7 }, 1.15)
        .fromTo(
          "[data-panel='shades']",
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          1.5
        );
    });

    // Reduced motion: skip the choreography, make every panel readable.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      bottle.position.set(HERO_X, -0.15, 0);
      gsap.set(
        "[data-panel='hero'], [data-panel='formula'], [data-panel='shades']",
        { autoAlpha: 1, y: 0 }
      );
    });

    return () => mm.revert(); // kills timelines + ScrollTriggers on unmount/resize
  }, [viewport.width, bottleRef, materials]);

  return null;
}

/* -------------------------------------------------------------------------- */
/*  Canvas                                                                     */
/* -------------------------------------------------------------------------- */

export default function ThreeScene() {
  const bottleRef = useRef<THREE.Group>(null);
  const materials = useBottleMaterials();

  return (
    <Canvas
      // Clamp DPR so 4k/retina displays don't tank the frame budget —
      // a stable framerate matters more than pixel density for scrub feel.
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{
        antialias: true,
        alpha: true, // let the vanilla page background show through
        powerPreference: "high-performance",
      }}
      shadows
    >
      {/* ------------------------- Studio lighting ------------------------ */}
      <ambientLight intensity={0.55} color="#FBF7F4" />

      {/* Key light — soft shadows from upper left */}
      <directionalLight
        castShadow
        position={[4, 6, 5]}
        intensity={1.6}
        color="#fff6ef"
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />

      {/* Rim light — cool-neutral edge separation from behind right */}
      <directionalLight position={[-5, 2, -4]} intensity={0.9} color="#f0e4de" />

      {/* Blush fill bounce from below */}
      <pointLight position={[0, -3, 2]} intensity={0.35} color="#F3E1DC" />

      {/* HDRI reflections — essential for believable glass transmission */}
      <Environment resolution={256}>
  {/* Overhead softbox */}
  <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
  {/* Left + right wall panels — these create the long vertical
      reflections that make the glass read as "studio-lit" */}
  <Lightformer intensity={1.5} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[12, 4, 1]} />
  <Lightformer intensity={1.5} position={[10, 1, 0]} rotation-y={-Math.PI / 2} scale={[16, 2, 1]} />
  {/* Blush bounce card from below, matching the brand accent */}
  <Lightformer intensity={1} color="#F3E1DC" position={[0, -2, 5]} scale={[8, 3, 1]} />
</Environment>
      <ProductBottle groupRef={bottleRef} materials={materials} />

      {/* Soft grounding shadow (cheaper + softer than a shadow-catcher plane) */}
      <ContactShadows
        position={[0, -1.6, 0]}
        opacity={0.28}
        scale={16}
        blur={2.6}
        far={3}
        color="#2B2927"
      />

      <ScrollRig bottleRef={bottleRef} materials={materials} />
    </Canvas>
  );
}