"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { INGREDIENTS } from "../../lib/aura";

/* -------------------------------------------------------------------------- */
/*  Ingredient specimens — four small objects that orbit the bottle during    */
/*  the formula act, one per ingredient:                                       */
/*    Niacinamide   → a faceted crystal                                        */
/*    Salicylic     → a clear droplet                                          */
/*    Azelaic       → a cluster of pearls                                      */
/*    Aloe vera     → a cube of gel                                            */
/*                                                                             */
/*  `visibility` (0–1) is driven by the scroll timeline; hovering a row in the */
/*  HTML ledger sends "aura:ingredient" and that specimen grows while the      */
/*  others step back. All motion is damped per frame — no React re-renders.   */
/* -------------------------------------------------------------------------- */

/** Droplet profile: rounded belly, pointed tip. */
function dropletGeometry() {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 32; i++) {
    const t = (i / 32) * Math.PI;
    pts.push(new THREE.Vector2(0.15 * Math.sin(t) * Math.sin(t / 2), 0.2 * Math.cos(t)));
  }
  return new THREE.LatheGeometry(pts, 48);
}

/* Each specimen's resting spot on the orbit: angle (rad), radius, height. */
const ORBIT = [
  { angle: 0.3, radius: 1.0, y: 0.95 },
  { angle: 1.9, radius: 0.95, y: -0.35 },
  { angle: 3.4, radius: 1.0, y: 0.45 },
  { angle: 4.9, radius: 0.9, y: -0.8 },
];

export default function Specimens({
  state,
  position,
}: {
  /** Shared mutable object; the timeline tweens `specimens` between 0 and 1. */
  state: { specimens: number };
  position: [number, number, number];
}) {
  const group = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const items = useRef<(THREE.Group | null)[]>([]);
  const hovered = useRef<number | null>(null);

  const assets = useMemo(() => {
    const crystal = new THREE.MeshPhysicalMaterial({
      color: INGREDIENTS[0].swatch,
      roughness: 0.05,
      transmission: 1,
      thickness: 0.35,
      ior: 1.6,
      iridescence: 0.7,
      iridescenceIOR: 1.4,
      flatShading: true,
    });
    const droplet = new THREE.MeshPhysicalMaterial({
      color: INGREDIENTS[1].swatch,
      roughness: 0.02,
      transmission: 1,
      thickness: 0.4,
      ior: 1.33,
      clearcoat: 1,
    });
    const pearl = new THREE.MeshPhysicalMaterial({
      color: INGREDIENTS[2].swatch,
      roughness: 0.35,
      sheen: 1,
      sheenColor: new THREE.Color("#FFFFFF"),
      sheenRoughness: 0.4,
      clearcoat: 1,
      clearcoatRoughness: 0.2,
    });
    const gel = new THREE.MeshPhysicalMaterial({
      color: INGREDIENTS[3].swatch,
      roughness: 0.12,
      transmission: 0.9,
      thickness: 0.5,
      ior: 1.35,
    });
    return {
      crystal,
      droplet,
      pearl,
      gel,
      crystalGeo: new THREE.IcosahedronGeometry(0.17, 0),
      dropletGeo: dropletGeometry(),
      pearlGeo: new THREE.SphereGeometry(1, 32, 24),
    };
  }, []);

  useEffect(() => {
    const onHover = (e: CustomEvent<number | null>) => {
      hovered.current = e.detail;
    };
    window.addEventListener("aura:ingredient", onHover);
    return () => window.removeEventListener("aura:ingredient", onHover);
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const appear = state.specimens;
    g.visible = appear > 0.001;
    if (!g.visible) return;

    // Slow orbit; eases almost to a stop while something is spotlighted.
    if (orbit.current) orbit.current.rotation.y += delta * (hovered.current === null ? 0.18 : 0.04);

    items.current.forEach((item, i) => {
      if (!item) return;
      // Staggered entrance: each specimen starts a little after the last.
      const own = THREE.MathUtils.clamp(appear * 1.6 - i * 0.2, 0, 1);
      const focus = hovered.current === null ? 1 : hovered.current === i ? 1.55 : 0.7;
      const s = THREE.MathUtils.damp(item.scale.x, own * focus, 8, delta);
      item.scale.setScalar(Math.max(s, 0.0001));
      item.rotation.x += delta * 0.25;
      item.rotation.y += delta * 0.35;
    });
  });

  const setItem = (i: number) => (el: THREE.Group | null) => {
    items.current[i] = el;
  };

  return (
    <group ref={group} position={position} visible={false}>
      <group ref={orbit}>
        {ORBIT.map((o, i) => (
          <group
            key={i}
            position={[Math.sin(o.angle) * o.radius, o.y, Math.cos(o.angle) * o.radius]}
          >
            <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
              <group ref={setItem(i)} scale={0.0001}>
                {i === 0 && <mesh geometry={assets.crystalGeo} material={assets.crystal} castShadow />}
                {i === 1 && <mesh geometry={assets.dropletGeo} material={assets.droplet} castShadow />}
                {i === 2 && (
                  <>
                    {[
                      [0, 0, 0, 0.08],
                      [0.11, 0.04, 0.02, 0.06],
                      [-0.09, 0.06, 0.05, 0.055],
                      [0.02, -0.1, 0.06, 0.065],
                      [-0.04, 0.02, -0.1, 0.05],
                    ].map(([x, y, z, r], k) => (
                      <mesh
                        key={k}
                        geometry={assets.pearlGeo}
                        material={assets.pearl}
                        position={[x, y, z]}
                        scale={r}
                        castShadow
                      />
                    ))}
                  </>
                )}
                {i === 3 && (
                  <RoundedBox args={[0.26, 0.26, 0.26]} radius={0.06} smoothness={4} material={assets.gel} castShadow />
                )}
              </group>
            </Float>
          </group>
        ))}
      </group>
    </group>
  );
}