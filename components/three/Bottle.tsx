"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Caustics, Decal, Float } from "@react-three/drei";
import * as THREE from "three";
import { createLabelTexture } from "./textures";

/* -------------------------------------------------------------------------- */
/*  The dropper bottle, modelled in code.                                      */
/*                                                                             */
/*  The glass is a lathe (a 2D profile spun around the Y axis): flat base,     */
/*  straight walls, a curved shoulder and a short neck. On top: a rose-gold    */
/*  collar and a matte rubber bulb, with a dropper tube running down inside.   */
/*  Units: radius 0.55, base at y = −0.8, top of the bulb at y ≈ 1.58.         */
/* -------------------------------------------------------------------------- */

export const BOTTLE_BASE_Y = -0.8;

/** Quadratic Bézier sampled into lathe points — gives the shoulder its curve. */
function curve(a: THREE.Vector2, control: THREE.Vector2, b: THREE.Vector2, steps: number) {
  const pts: THREE.Vector2[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * control.x + t ** 2 * b.x;
    const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * control.y + t ** 2 * b.y;
    pts.push(new THREE.Vector2(x, y));
  }
  return pts;
}

export type BottleKit = {
  body: THREE.LatheGeometry;
  liquid: THREE.LatheGeometry;
  pipette: THREE.CylinderGeometry;
  collar: THREE.CylinderGeometry;
  lip: THREE.TorusGeometry;
  bulb: THREE.CapsuleGeometry;
  glass: THREE.MeshPhysicalMaterial;
  collarMat: THREE.MeshStandardMaterial;
  bulbMat: THREE.MeshStandardMaterial;
  pipetteMat: THREE.MeshStandardMaterial;
  label: THREE.CanvasTexture;
};

/** Geometry and materials shared by every bottle in the scene. */
export function createBottleKit(): BottleKit {
  const V = (x: number, y: number) => new THREE.Vector2(x, y);

  const body = new THREE.LatheGeometry(
    [
      V(0, -0.8),
      V(0.5, -0.8),
      ...curve(V(0.5, -0.8), V(0.55, -0.8), V(0.55, -0.74), 4), // rounded foot
      V(0.55, 0.45),
      ...curve(V(0.55, 0.45), V(0.55, 0.9), V(0.22, 0.96), 14), // shoulder
      V(0.2, 0.98),
      V(0.2, 1.06),
      V(0, 1.06),
    ],
    96
  );

  const liquid = new THREE.LatheGeometry(
    [
      V(0, -0.74),
      V(0.46, -0.74),
      ...curve(V(0.46, -0.74), V(0.5, -0.74), V(0.5, -0.69), 3),
      V(0.5, 0.28),
      V(0, 0.28),
    ],
    64
  );

  return {
    body,
    liquid,
    pipette: new THREE.CylinderGeometry(0.045, 0.03, 1.7, 16),
    collar: new THREE.CylinderGeometry(0.25, 0.25, 0.2, 64),
    lip: new THREE.TorusGeometry(0.25, 0.018, 12, 64),
    bulb: new THREE.CapsuleGeometry(0.155, 0.16, 12, 32),
    glass: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#FDF8F6"), // near-white, so the serum's colour reads true
      roughness: 0.15,
      transmission: 0.7,
      thickness: 1,
      ior: 1.4,
      clearcoat: 0.7,
      clearcoatRoughness: 0.3,
      iridescence: 0.15,
      iridescenceIOR: 1.3,
      envMapIntensity: 1.2,
      attenuationColor: new THREE.Color("#F8E4DE"),
      attenuationDistance: 4,
    }),
    collarMat: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#D8A48C"), // rose gold
      metalness: 0.9,
      roughness: 0.28,
    }),
    bulbMat: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#C97B5D"), // terracotta rubber
      roughness: 0.75,
    }),
    pipetteMat: new THREE.MeshStandardMaterial({
      color: new THREE.Color("#FFFFFF"),
      roughness: 0.2,
    }),
    label: createLabelTexture(),
  };
}

/** Opaque serum material. Opaque on purpose: three.js only renders opaque
    objects into the transmission buffer, so this is what shows through. */
export function createLiquidMaterial(hex: string) {
  // A gentle emissive glow in the same colour keeps each shade saturated
  // after the frosted glass and ACES tone mapping have softened it.
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex),
    emissive: new THREE.Color(hex),
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });
}

/* -------------------------------------------------------------------------- */
/*  Sloshing serum                                                             */
/*                                                                             */
/*  The liquid's surface is its top ring of vertices (y ≥ 0.27). A few lines  */
/*  injected into the material's vertex shader tilt that ring by a slope      */
/*  (uSlosh.x per unit x, uSlosh.y per unit z). Each frame, a damped spring    */
/*  drives the slope from the bottle's horizontal acceleration: when the       */
/*  bottle is pushed one way the serum lags and piles up on the other side,    */
/*  overshoots, and settles — exactly how a real liquid behaves.               */
/* -------------------------------------------------------------------------- */

const SURFACE_Y = 0.27; // just below the liquid's flat top (0.28)

function enableSlosh(material: THREE.Material) {
  const existing = material.userData.slosh as { value: THREE.Vector2 } | undefined;
  if (existing) return existing;

  const uniform = { value: new THREE.Vector2() };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSlosh = uniform;
    shader.vertexShader =
      "uniform vec2 uSlosh;\n" +
      shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        if (position.y > ${SURFACE_Y.toFixed(2)}) {
          transformed.y += uSlosh.x * position.x + uSlosh.y * position.z;
        }`
      );
  };
  material.customProgramCacheKey = () => "aura-slosh";
  material.userData.slosh = uniform;
  material.needsUpdate = true;
  return uniform;
}

/* -------------------------------------------------------------------------- */

export function BottleModel({
  kit,
  liquid,
  anchorRef,
  causticsRef,
  spinSpeed = 0.12,
  floatIntensity = 0.3,
  caustics = true,
}: {
  kit: BottleKit;
  liquid: THREE.Material;
  /** Group that follows the bottle AND its idle float (hotspots, DoF focus). */
  anchorRef?: React.RefObject<THREE.Group | null>;
  /** Caustics group — its projection plane is the one child mesh. */
  causticsRef?: React.RefObject<THREE.Group | null>;
  spinSpeed?: number;
  floatIntensity?: number;
  /** Off for the finale lineup: their small plinths can't catch the pattern. */
  caustics?: boolean;
}) {
  const spin = useRef<THREE.Group>(null);
  const slosh = useMemo(() => enableSlosh(liquid), [liquid]);
  const sim = useMemo(
    () => ({
      ready: false,
      pos: new THREE.Vector3(),
      prevPos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      prevVel: new THREE.Vector3(),
      acc: new THREE.Vector3(),
      tilt: new THREE.Vector2(), // current surface slope (world x, world z)
      tiltVel: new THREE.Vector2(),
      q: new THREE.Quaternion(),
      local: new THREE.Vector3(),
    }),
    []
  );

  useFrame((_, delta) => {
    const g = spin.current;
    if (!g) return;
    g.rotation.y += delta * spinSpeed;

    const dt = Math.min(Math.max(delta, 1 / 240), 1 / 30);
    const s = sim;
    g.getWorldPosition(s.pos);
    if (!s.ready) {
      s.prevPos.copy(s.pos);
      s.ready = true;
      return;
    }

    // Velocity → acceleration, lightly smoothed (frame-to-frame values are noisy).
    s.vel.subVectors(s.pos, s.prevPos).divideScalar(dt);
    s.acc.lerp(s.local.subVectors(s.vel, s.prevVel).divideScalar(dt), 0.25);
    s.prevPos.copy(s.pos);
    s.prevVel.copy(s.vel);

    // The surface wants to lean against the push; a damped spring chases it.
    const GAIN = 0.035;
    const MAX = 0.32;
    const targetX = THREE.MathUtils.clamp(-s.acc.x * GAIN, -MAX, MAX);
    const targetZ = THREE.MathUtils.clamp(-s.acc.z * GAIN, -MAX, MAX);
    const STIFFNESS = 55;
    const DAMPING = 5;
    s.tiltVel.x += ((targetX - s.tilt.x) * STIFFNESS - s.tiltVel.x * DAMPING) * dt;
    s.tiltVel.y += ((targetZ - s.tilt.y) * STIFFNESS - s.tiltVel.y * DAMPING) * dt;
    s.tilt.x = THREE.MathUtils.clamp(s.tilt.x + s.tiltVel.x * dt, -MAX, MAX);
    s.tilt.y = THREE.MathUtils.clamp(s.tilt.y + s.tiltVel.y * dt, -MAX, MAX);

    // The slope lives in world space; the liquid mesh spins with the bottle,
    // so rotate the slope into the mesh's own frame before handing it over.
    g.getWorldQuaternion(s.q).invert();
    s.local.set(s.tilt.x, 0, s.tilt.y).applyQuaternion(s.q);
    slosh.value.set(s.local.x, s.local.z);
  });

  return (
    <Float speed={1.3} rotationIntensity={0.08} floatIntensity={floatIntensity}>
      <group ref={anchorRef}>
        <group ref={spin}>
          {/* Caustics: light focused by the glass, projected onto a plane at
              the bottle's base (the Caustics group's local y = 0). Computed
              once — in the bottle's own space nothing changes afterwards. */}
          {caustics ? (
            <Caustics
              ref={causticsRef}
              position={[0, BOTTLE_BASE_Y, 0]}
              causticsOnly={false}
              backside={false}
              color="#FFE6CC"
              intensity={0.06}
              worldRadius={0.35}
              ior={1.2}
              resolution={512}
              lightSource={[5, 8, 4]}
            >
              <mesh castShadow geometry={kit.body} material={kit.glass} position={[0, -BOTTLE_BASE_Y, 0]}>
                {/* The label, projected onto the curved glass */}
                <Decal
                  position={[0, 0.02, 0.55]}
                  rotation={[0, 0, 0]}
                  scale={[0.78, 0.49, 0.5]}
                  map={kit.label}
                  polygonOffsetFactor={-10}
                />
              </mesh>
            </Caustics>
          ) : (
            <mesh castShadow geometry={kit.body} material={kit.glass}>
              {/* The label, projected onto the curved glass */}
              <Decal
                position={[0, 0.02, 0.55]}
                rotation={[0, 0, 0]}
                scale={[0.78, 0.49, 0.5]}
                map={kit.label}
                polygonOffsetFactor={-10}
              />
            </mesh>
          )}

          <mesh geometry={kit.liquid} material={liquid} />
          <mesh geometry={kit.pipette} material={kit.pipetteMat} position={[0, 0.2, 0]} />
          <mesh castShadow geometry={kit.collar} material={kit.collarMat} position={[0, 1.13, 0]} />
          <mesh geometry={kit.lip} material={kit.collarMat} position={[0, 1.03, 0]} rotation={[Math.PI / 2, 0, 0]} />
          <mesh castShadow geometry={kit.bulb} material={kit.bulbMat} position={[0, 1.4, 0]} />
        </group>
      </group>
    </Float>
  );
}