"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Float, Lightformer, SoftShadows } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

/* -------------------------------------------------------------------------- */
/*  Palette — abstract pastel surrealism on a warm studio base                 */
/* -------------------------------------------------------------------------- */

const PALETTE = {
  vanilla: "#FBF7F4", // page + floor (shadows appear to float on the page)
  pink: "#F2C9C0", // millennial pastel pink
  terracotta: "#C97B5D", // terracotta clay
  nude: "#E8D5C4", // warm nude beige
  amber: "#E8A852", // soft marigold amber
  charcoal: "#2B2927",
} as const;

/** Matte "clay" finish shared by all stage architecture. */
function clay(color: string) {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.92,
    metalness: 0,
  });
}

/* -------------------------------------------------------------------------- */
/*  Bottle materials (frosted glass + blush cap)                               */
/* -------------------------------------------------------------------------- */

type BottleMaterials = {
  glass: THREE.MeshPhysicalMaterial;
  cap: THREE.MeshStandardMaterial;
};

function useBottleMaterials(): BottleMaterials {
  return useMemo(
    () => ({
      glass: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#F5E2DB"),
        roughness: 0.2,
        transmission: 0.7,
        thickness: 1,
        ior: 1.4,
        clearcoat: 0.6,
        clearcoatRoughness: 0.35,
        attenuationColor: new THREE.Color(PALETTE.pink),
        attenuationDistance: 2.5,
        transparent: true,
        opacity: 1,
      }),
      cap: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE.nude),
        roughness: 0.5,
        metalness: 0.05,
        transparent: true,
        opacity: 1,
      }),
    }),
    []
  );
}

/* -------------------------------------------------------------------------- */
/*  Scene object refs — one bag of refs shared with the scroll rig             */
/* -------------------------------------------------------------------------- */

type StageRefs = {
  bottle: React.RefObject<THREE.Group | null>;
  heroPedestal: React.RefObject<THREE.Group | null>;
  sidePedestal: React.RefObject<THREE.Group | null>;
  steps: React.RefObject<THREE.Group | null>;
  sphere: React.RefObject<THREE.Mesh | null>;
  ring: React.RefObject<THREE.Mesh | null>;
  column: React.RefObject<THREE.Mesh | null>;
};

/* -------------------------------------------------------------------------- */
/*  Product bottle                                                             */
/* -------------------------------------------------------------------------- */

function ProductBottle({
  groupRef,
  materials,
}: {
  groupRef: StageRefs["bottle"];
  materials: BottleMaterials;
}) {
  return (
    <group ref={groupRef}>
      <Float speed={1.3} rotationIntensity={0.12} floatIntensity={0.35}>
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
      </Float>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*  Studio stage — geometric pedestals, steps, and floating accents            */
/*  All positions are set by ScrollRig (viewport-relative), so meshes render   */
/*  at origin here and get placed once measurements are known.                 */
/* -------------------------------------------------------------------------- */

function StudioStage({ refs }: { refs: StageRefs }) {
  const mats = useMemo(
    () => ({
      nude: clay(PALETTE.nude),
      terracotta: clay(PALETTE.terracotta),
      pink: clay(PALETTE.pink),
      amber: clay(PALETTE.amber),
      floor: new THREE.MeshStandardMaterial({
        color: new THREE.Color(PALETTE.vanilla),
        roughness: 1,
        metalness: 0,
      }),
    }),
    []
  );

  return (
    <>
      {/* Infinite studio floor — same color as the page, so only the cast
          shadows are perceived, "floating" on the vanilla background. */}
      <mesh
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -1.45, 0]}
        material={mats.floor}
      >
        <planeGeometry args={[80, 80]} />
      </mesh>

      {/* Hero pedestal — the bottle's plinth in Section 1 */}
      <group ref={refs.heroPedestal}>
        <mesh castShadow receiveShadow material={mats.nude}>
          <cylinderGeometry args={[0.95, 0.95, 0.5, 64]} />
        </mesh>
        {/* thin terracotta reveal line under the plinth top */}
        <mesh castShadow material={mats.terracotta} position={[0, -0.18, 0]}>
          <cylinderGeometry args={[0.97, 0.97, 0.06, 64]} />
        </mesh>
      </group>

      {/* Side pedestal — rises from below in Milestone 2 to catch the bottle */}
      <group ref={refs.sidePedestal}>
        <mesh castShadow receiveShadow material={mats.terracotta}>
          <cylinderGeometry args={[0.8, 0.8, 1.1, 64]} />
        </mesh>
      </group>

      {/* Geometric steps — stacked offset slabs, back-left of the stage */}
      <group ref={refs.steps}>
        <mesh castShadow receiveShadow material={mats.terracotta} position={[0, 0, 0]}>
          <boxGeometry args={[2.6, 0.4, 2.6]} />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          material={mats.nude}
          position={[-0.5, 0.4, 0.4]}
        >
          <boxGeometry args={[1.9, 0.4, 1.9]} />
        </mesh>
        <mesh
          castShadow
          receiveShadow
          material={mats.pink}
          position={[-0.9, 0.8, 0.7]}
        >
          <boxGeometry args={[1.2, 0.4, 1.2]} />
        </mesh>
      </group>

      {/* Marigold sphere — free-floating amber accent */}
      <mesh ref={refs.sphere} castShadow material={mats.amber}>
        <sphereGeometry args={[0.38, 48, 48]} />
      </mesh>

      {/* Pastel ring — a halo that travels with the bottle between acts */}
      <mesh ref={refs.ring} material={mats.pink}>
        <torusGeometry args={[1.55, 0.055, 24, 96]} />
      </mesh>

      {/* Distant terracotta monolith — depth anchor in the fog */}
      <mesh ref={refs.column} castShadow material={mats.terracotta}>
        <boxGeometry args={[0.9, 6.5, 0.9]} />
      </mesh>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scroll rig — one master timeline drives 3D + HTML from the same progress   */
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
    if (
      !bottle ||
      !heroPedestal ||
      !sidePedestal ||
      !steps ||
      !sphere ||
      !ring ||
      !column
    )
      return;

    const vw = viewport.width;
    const HERO_X = vw * 0.22;
    const EDGE_X = vw * 0.3;

    // ---- Initial composition (Section 1) — shared by both motion branches --
    const setInitialPose = () => {
      bottle.position.set(HERO_X, -0.05, 0);
      bottle.rotation.set(0, -0.4, 0.05);
      bottle.scale.setScalar(1);

      heroPedestal.position.set(HERO_X, -1.2, 0);
      sidePedestal.position.set(EDGE_X, -3.4, 0.2); // hidden under the floor
      steps.position.set(-vw * 0.1, -1.25, -2.6);
      sphere.position.set(vw * 0.04, -0.7, -1.2);
      ring.position.set(HERO_X, 0.15, -2.1);
      ring.rotation.set(0, 0, 0.2);
      column.position.set(-vw * 0.28, 1.4, -4.5);
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

      /* ---------------- Milestone 1 · t ∈ [0, 1] — macro zoom ----------------
         Bottle lifts off its plinth toward the camera; the stage architecture
         parallaxes apart to make room; the pastel ring becomes a halo. */
      tl.to(bottle.rotation, { y: `+=${Math.PI}`, duration: 1 }, 0)
        .to(bottle.scale, { x: 1.32, y: 1.32, z: 1.32, duration: 1 }, 0)
        .to(bottle.position, { x: 0, y: 0.15, z: 1.6, duration: 1 }, 0)
        .to(heroPedestal.position, { y: -2.7, duration: 1 }, 0)
        .to(steps.position, { x: `-=${1.6}`, y: "-=1.4", z: "-=2", duration: 1 }, 0)
        .to(sphere.position, { x: -vw * 0.12, y: 0.45, duration: 1 }, 0)
        .to(ring.position, { x: 0, y: 0.15, duration: 1 }, 0)
        .to(ring.rotation, { z: "+=0.6", duration: 1 }, 0)
        .to(ring.scale, { x: 1.25, y: 1.25, z: 1.25, duration: 1 }, 0)
        .to(column.position, { x: `-=${vw * 0.06}`, duration: 1 }, 0)
        // HTML layer, same timeline — phase-locked with the 3D
        .to("[data-panel='hero']", { autoAlpha: 0, y: -40, duration: 0.35 }, 0.05)
        .fromTo(
          "[data-panel='formula']",
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          0.5
        )
        // progress rail: 01 → 02
        .to("[data-progress='1']", { opacity: 0.3, duration: 0.2 }, 0.5)
        .to("[data-progress='2']", { opacity: 1, duration: 0.2 }, 0.5);

      /* ------------- Milestone 2 · t ∈ [1, 2] — the shade counter -----------
         Bottle glides right; a terracotta pedestal rises through the floor to
         catch it. The bottle STAYS visible — the shade picker tints it live. */
      tl.to("[data-panel='formula']", { autoAlpha: 0, y: -40, duration: 0.3 }, 1.0)
        .to(bottle.position, { x: EDGE_X, y: -0.15, z: 0.3, duration: 1 }, 1)
        .to(bottle.rotation, { y: `+=${Math.PI * 0.35}`, duration: 1 }, 1)
        .to(bottle.scale, { x: 0.95, y: 0.95, z: 0.95, duration: 1 }, 1)
        .to(sidePedestal.position, { y: -1.3, duration: 0.8 }, 1.15)
        .to(ring.position, { x: EDGE_X, duration: 1 }, 1)
        .to(ring.rotation, { z: "+=0.4", duration: 1 }, 1)
        .to(ring.scale, { x: 0.9, y: 0.9, z: 0.9, duration: 1 }, 1)
        .to(sphere.position, { x: -vw * 0.05, y: -0.95, duration: 1 }, 1)
        .fromTo(
          "[data-panel='shades']",
          { autoAlpha: 0, y: 56 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          1.5
        )
        // progress rail: 02 → 03
        .to("[data-progress='2']", { opacity: 0.3, duration: 0.2 }, 1.5)
        .to("[data-progress='3']", { opacity: 1, duration: 0.2 }, 1.5);
    });

    // Reduced motion: static composition, all content readable.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      setInitialPose();
      gsap.set(
        "[data-panel='hero'], [data-panel='formula'], [data-panel='shades'], [data-progress]",
        { autoAlpha: 1, y: 0, opacity: 1 }
      );
    });

    return () => mm.revert();
  }, [viewport.width, refs, materials]);

  /* ---- Live shade tinting: DOM UI → WebGL bridge -------------------------
     The shade picker dispatches a CustomEvent; we tween the physical glass
     color toward a lightened version of the swatch. No scroll involvement —
     this runs on top of whatever the scrub timeline is doing. */
  useEffect(() => {
    const onShade = (e: Event) => {
      const hex = (e as CustomEvent<string>).detail;
      const target = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.45);
      const atten = new THREE.Color(hex).lerp(new THREE.Color("#ffffff"), 0.2);
      gsap.to(materials.glass.color, {
        r: target.r,
        g: target.g,
        b: target.b,
        duration: 0.7,
        ease: "power2.out",
      });
      gsap.to(materials.glass.attenuationColor, {
        r: atten.r,
        g: atten.g,
        b: atten.b,
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

  const refs: StageRefs = {
    bottle: useRef<THREE.Group>(null),
    heroPedestal: useRef<THREE.Group>(null),
    sidePedestal: useRef<THREE.Group>(null),
    steps: useRef<THREE.Group>(null),
    sphere: useRef<THREE.Mesh>(null),
    ring: useRef<THREE.Mesh>(null),
    column: useRef<THREE.Mesh>(null),
  };

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0.2, 6.2], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      shadows
    >
      {/* Depth fade: distant stage elements melt into the page color —
          this is what sells the "infinite studio" cyclorama look. */}
      <fog attach="fog" args={[PALETTE.vanilla, 7, 15]} />

      {/* PCSS soft shadows — penumbra widens with distance, the signature
          "Octane render" softness. Tune `samples` down if perf dips. */}
      <SoftShadows size={24} samples={12} focus={0.6} />

      {/* ------------------------- Studio lighting ------------------------ */}
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

      {/* Procedural studio HDRI — local Lightformers, zero network fetch */}
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
      <ProductBottle groupRef={refs.bottle} materials={materials} />
      <ScrollRig refs={refs} materials={materials} />
    </Canvas>
  );
}