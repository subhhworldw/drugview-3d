import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Drug } from "@/lib/drugs-data";
import { ORGAN_POSITIONS, ORGAN_LABELS } from "@/lib/anatomy";
import { buildPhases, phaseAtTime, totalDuration } from "@/lib/animation-phases";

interface Props {
  drug: Drug;
  time: number; // seconds
  playing: boolean;
  onTimeChange: (t: number) => void;
}

// A stylized human body composed from primitives + highlighted organs.
function Body({ activeOrgan }: { activeOrgan: string }) {
  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#4a7a8c"),
        transparent: true,
        opacity: 0.18,
        roughness: 0.4,
        transmission: 0.6,
        thickness: 0.8,
      }),
    [],
  );

  return (
    <group>
      {/* Head */}
      <mesh position={[0, 3.2, 0]} material={bodyMat}>
        <sphereGeometry args={[0.55, 32, 32]} />
      </mesh>
      {/* Neck */}
      <mesh position={[0, 2.55, 0]} material={bodyMat}>
        <cylinderGeometry args={[0.18, 0.22, 0.35, 16]} />
      </mesh>
      {/* Torso */}
      <mesh position={[0, 1.2, 0]} material={bodyMat}>
        <capsuleGeometry args={[0.85, 1.6, 8, 24]} />
      </mesh>
      {/* Hips */}
      <mesh position={[0, -0.4, 0]} material={bodyMat}>
        <capsuleGeometry args={[0.75, 0.5, 8, 24]} />
      </mesh>
      {/* Arms */}
      <mesh position={[1.0, 1.3, 0]} rotation={[0, 0, -0.15]} material={bodyMat}>
        <capsuleGeometry args={[0.2, 1.8, 8, 16]} />
      </mesh>
      <mesh position={[-1.0, 1.3, 0]} rotation={[0, 0, 0.15]} material={bodyMat}>
        <capsuleGeometry args={[0.2, 1.8, 8, 16]} />
      </mesh>
      {/* Legs */}
      <mesh position={[0.35, -1.7, 0]} material={bodyMat}>
        <capsuleGeometry args={[0.25, 1.8, 8, 16]} />
      </mesh>
      <mesh position={[-0.35, -1.7, 0]} material={bodyMat}>
        <capsuleGeometry args={[0.25, 1.8, 8, 16]} />
      </mesh>

      {/* Organs */}
      {(Object.keys(ORGAN_LABELS) as Array<keyof typeof ORGAN_LABELS>).map((organ) => {
        const pos = ORGAN_POSITIONS[organ];
        const isActive = organ === activeOrgan;
        return <Organ key={organ} position={pos} active={isActive} label={ORGAN_LABELS[organ]} />;
      })}
    </group>
  );
}

function Organ({
  position,
  active,
  label,
}: {
  position: [number, number, number];
  active: boolean;
  label: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = active ? 1 + Math.sin(clock.elapsedTime * 4) * 0.08 : 1;
    ref.current.scale.setScalar(s);
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial
          color={active ? "#f7b955" : "#5aa0b8"}
          emissive={active ? "#f7b955" : "#000000"}
          emissiveIntensity={active ? 0.8 : 0}
          roughness={0.3}
        />
      </mesh>
      {active && (
        <Html position={[0.25, 0.25, 0]} style={{ pointerEvents: "none" }}>
          <div className="rounded-md border border-primary/40 bg-card/95 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-primary whitespace-nowrap">
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

// Particle system representing drug molecules moving along a curve from A → B.
function DrugParticles({
  from,
  to,
  count = 180,
  color,
  progress,
}: {
  from: [number, number, number];
  to: [number, number, number];
  count?: number;
  color: string;
  progress: number; // 0..1 through the current phase
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const curve = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = start.clone().lerp(end, 0.5);
    mid.x += (Math.random() - 0.5) * 0.6;
    mid.z += 0.4;
    return new THREE.CatmullRomCurve3([start, mid, end]);
  }, [from, to]);

  const offsets = useMemo(
    () => Array.from({ length: count }, () => Math.random() * 0.35),
    [count],
  );

  useFrame(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      const t = Math.max(0, Math.min(1, progress - offsets[i] + 0.1));
      const p = curve.getPoint(t);
      const jitter = 0.03;
      dummy.position.set(
        p.x + (Math.random() - 0.5) * jitter,
        p.y + (Math.random() - 0.5) * jitter,
        p.z + (Math.random() - 0.5) * jitter,
      );
      const scale = t > 0 && t < 1 ? 1 : 0.001;
      dummy.scale.setScalar(scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.035, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} />
    </instancedMesh>
  );
}

function Scene({ drug, time }: { drug: Drug; time: number }) {
  const phases = useMemo(() => buildPhases(drug), [drug]);
  const { phase, localT } = phaseAtTime(phases, time);
  const from = ORGAN_POSITIONS[phase.fromOrgan];
  const to = ORGAN_POSITIONS[phase.toOrgan];

  const colorMap: Record<typeof phase.color, string> = {
    primary: "#f7b955",
    accent: "#5accd7",
    destructive: "#e46b5c",
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} color="#5accd7" />
      <Body activeOrgan={phase.toOrgan} />
      <DrugParticles from={from} to={to} color={colorMap[phase.color]} progress={localT} />
    </>
  );
}

function Ticker({
  playing,
  onTick,
  duration,
  time,
}: {
  playing: boolean;
  onTick: (t: number) => void;
  duration: number;
  time: number;
}) {
  useFrame((_, delta) => {
    if (!playing) return;
    const next = time + delta;
    onTick(next >= duration ? 0 : next);
  });
  return null;
}

export function BodyScene({ drug, time, playing, onTimeChange }: Props) {
  const phases = useMemo(() => buildPhases(drug), [drug]);
  const duration = totalDuration(phases);

  // Reset time when drug changes
  useEffect(() => {
    onTimeChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drug.slug]);

  return (
    <Canvas camera={{ position: [0, 1.2, 7], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={["#0e1a24"]} />
      <fog attach="fog" args={["#0e1a24", 8, 18]} />
      <Scene drug={drug} time={time} />
      <Ticker playing={playing} onTick={onTimeChange} duration={duration} time={time} />
      <OrbitControls
        enablePan={false}
        minDistance={4}
        maxDistance={12}
        target={[0, 0.8, 0]}
        autoRotate={!playing}
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
