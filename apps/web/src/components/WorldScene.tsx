"use client";

import { activityLabel } from "@life/simulation-core";
import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { activityTone } from "@/lib/format";
import { useSim } from "@/store/sim";
import { PLACE_LAYOUT, placePosition } from "@/world/layout";

function Block({ id }: { id: string }) {
  const layout = PLACE_LAYOUT[id];
  if (!layout) return null;
  return (
    <group position={[layout.x, layout.h / 2, layout.z]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[layout.w, layout.h, layout.d]} />
        <meshStandardMaterial color={layout.color} roughness={0.72} metalness={0.04} />
      </mesh>
    </group>
  );
}

function PersonMarker({
  personId,
  selected,
  onSelect,
}: {
  personId: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<Group>(null);
  const frame = useSim((s) => s.frame);
  const person = useSim((s) => s.world.people[personId]);
  const target = useMemo(
    () => (person ? placePosition(person.locationId) : ([0, 0, 0] as [number, number, number])),
    [person, person?.locationId, frame],
  );

  useFrame((_, dt) => {
    if (!group.current || !person) return;
    const jitter = (personId.charCodeAt(personId.length - 1) % 7) * 0.12 - 0.36;
    const [x, y, z] = target;
    group.current.position.x += (x + jitter - group.current.position.x) * Math.min(1, dt * 2.4);
    group.current.position.z += (z + jitter * 0.6 - group.current.position.z) * Math.min(1, dt * 2.4);
    group.current.position.y += (y - group.current.position.y) * Math.min(1, dt * 3);
  });

  if (!person?.alive) return null;

  return (
    <group ref={group} position={target} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh castShadow>
        <capsuleGeometry args={[selected ? 0.2 : 0.16, selected ? 0.38 : 0.3, 4, 8]} />
        <meshStandardMaterial color={activityTone(person.activity.type)} emissive={activityTone(person.activity.type)} emissiveIntensity={selected ? 0.35 : 0.08} />
      </mesh>
    </group>
  );
}

function SceneBody() {
  const frame = useSim((s) => s.frame);
  const selectedId = useSim((s) => s.selectedId);
  const select = useSim((s) => s.select);
  const hour = useSim((s) => s.world.clock.hour);
  const night = hour >= 19 || hour < 6;
  const people = Object.keys(useSim.getState().world.people);
  void frame;

  return (
    <>
      <color attach="background" args={[night ? "#0b0f0d" : "#8aa4b0"]} />
      <fog attach="fog" args={[night ? "#0b0f0d" : "#8aa4b0", 18, 42]} />
      <hemisphereLight args={[night ? "#1c2430" : "#fff1d6", night ? "#0a0c0a" : "#3d4a38", night ? 0.35 : 0.85]} />
      <directionalLight
        position={[10, 16, 8]}
        intensity={night ? 0.25 : 1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[36, 36]} />
        <meshStandardMaterial color={night ? "#1a221c" : "#6d8a5c"} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[8, 18]} />
        <meshStandardMaterial color={night ? "#2a2c2a" : "#9aa0a0"} />
      </mesh>
      {Object.keys(PLACE_LAYOUT).map((id) => (
        <Block key={id} id={id} />
      ))}
      {people.map((id) => (
        <PersonMarker key={id} personId={id} selected={id === selectedId} onSelect={() => select(id)} />
      ))}
      <OrbitControls enablePan maxPolarAngle={Math.PI / 2.15} minDistance={8} maxDistance={28} target={[0, 0.6, 0]} />
    </>
  );
}

export function WorldScene() {
  const frame = useSim((s) => s.frame);
  const selectedId = useSim((s) => s.selectedId);
  const person = useSim((s) => s.world.people[selectedId]);
  const place = useSim((s) => (person ? s.world.places[person.locationId] : undefined));
  void frame;

  return (
    <div className="relative h-[460px] overflow-hidden rounded-sm border border-[#2c352b] bg-[#10140f] lg:h-full lg:min-h-[420px]">
      <Canvas shadows camera={{ position: [14, 12, 14], fov: 42 }} className="h-full w-full">
        <SceneBody />
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 text-[11px] uppercase tracking-[0.18em] text-[#e7eadc]/70">
        Ari block · {place?.name ?? "City"}
      </div>
      {person ? (
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-[#e7eadc]/80">
          <span>{person.firstName} is {activityLabel(person.activity.type).toLowerCase()}</span>
          <span className="text-[#8d9586]">{place?.name}</span>
        </div>
      ) : null}
    </div>
  );
}
