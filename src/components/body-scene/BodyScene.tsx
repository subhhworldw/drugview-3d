import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Drug } from "@/lib/drugs-data";
import { ORGAN_POSITIONS, ORGAN_LABELS } from "@/lib/anatomy";
import { buildPhases, phaseAtTime, totalDuration } from "@/lib/animation-phases";
import {
  makeTorsoGeometry,
  makeHeadGeometry,
  makeLimbGeometry,
  makeHeartLobeGeometry,
  makeHeartApexGeometry,
  makeLungGeometry,
  makeLiverGeometry,
  makeStomachGeometry,
  makeKidneyGeometry,
  makeIntestineGeometry,
  makeBrainGeometry,
  makeBoneGeometry,
  makeMuscleGeometry,
  makeBlobGeometry,
  makePanelGeometry,
  makeDeltoidGeometry,
  makeBulgeGeometry,
  makeMidlineGeometry,
} from "./anatomy-geometry";


interface Props {
  drug: Drug;
  time: number; // seconds
  playing: boolean;
  onTimeChange: (t: number) => void;
}

// Geometry is procedural and shared across all instances (built once per module load).
const G = {
  torso: makeTorsoGeometry(),
  head: makeHeadGeometry(),
  arm: makeLimbGeometry(0.16, 0.12, 0.085, 1.95),
  leg: makeLimbGeometry(0.26, 0.18, 0.11, 2.1),
  hips: makeBlobGeometry(5.2, 3.0, 3.0),
  heartLobe: makeHeartLobeGeometry(),
  heartApex: makeHeartApexGeometry(),
  lungL: makeLungGeometry(-1),
  lungR: makeLungGeometry(1),
  liver: makeLiverGeometry(),
  stomach: makeStomachGeometry(),
  kidneyL: makeKidneyGeometry(-1),
  kidneyR: makeKidneyGeometry(1),
  intestine: makeIntestineGeometry(),
  brain: makeBrainGeometry(),
  bone: makeBoneGeometry(0.85),
  muscle: makeMuscleGeometry(0.7),
  pancreas: makeBlobGeometry(2.0, 0.55, 0.7),
  thyroid: makeBlobGeometry(1.1, 0.6, 0.7),
  joint: makeBlobGeometry(1.1, 1.0, 1.1),
  skin: makeBlobGeometry(1.1, 1.4, 0.2),
  vessel: makeBlobGeometry(0.5, 3.0, 0.5),
  node: makeBlobGeometry(0.42, 0.5, 0.42),
  pec: makePanelGeometry(0.42, 0.3),
  abPanel: makePanelGeometry(0.16, 0.13),
  obliquePanel: makePanelGeometry(0.13, 0.26),
  deltoid: makeDeltoidGeometry(0.21),
  biceps: makeBulgeGeometry(0.62, 0.1),
  forearm: makeBulgeGeometry(0.5, 0.075),
  quad: makeBulgeGeometry(0.95, 0.14),
  calf: makeBulgeGeometry(0.6, 0.1),
  midline: makeMidlineGeometry(1.5),
};

/** Base colour per organ so layers stay visually distinct, chart-style. */
const ORGAN_COLORS: Record<string, string> = {
  heart: "#d05a55",
  lungs: "#dd8a95",
  liver: "#a86a45",
  stomach: "#cf9a4e",
  kidney: "#9a6a92",
  small_intestine: "#d1a068",
  brain: "#c2a0c0",
  bone: "#ded7c2",
  bone_marrow: "#e0b7a0",
  muscle: "#c05a5a",
  lymph_node: "#6fbfa0",
  pancreas: "#cfc06a",
  thyroid: "#6fb0c8",
  vessels: "#cc5148",
  skin: "#d8a98c",
};


// A stylized human body composed from procedural geometry + highlighted organs.
function Body({ activeOrgan }: { activeOrgan: string }) {
  const isDark = useIsDark();
  const bodyMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#4a7a8c"),
        emissive: new THREE.Color(isDark ? "#1d4152" : "#000000"),
        emissiveIntensity: isDark ? 1 : 0,
        transparent: true,
        opacity: isDark ? 0.17 : 0.11,
        roughness: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [isDark],
  );
  // Slightly stronger material for the surface muscle relief so the
  // segmentation reads as raised panels without hiding the organs.
  const muscleMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(isDark ? "#68a2b5" : "#3f7185"),
        emissive: new THREE.Color(isDark ? "#24576b" : "#000000"),
        emissiveIntensity: isDark ? 1 : 0,
        transparent: true,
        opacity: isDark ? 0.3 : 0.22,
        roughness: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [isDark],
  );

  return (
    <group>
      {/* Head + neck + torso silhouette (lathed profile) */}
      <mesh position={[0, 3.2, 0]} geometry={G.head} material={bodyMat} />
      <mesh position={[0, 0.4, 0]} geometry={G.torso} material={bodyMat} />
      {/* Pelvis */}
      <mesh position={[0, -0.55, 0]} geometry={G.hips} material={bodyMat} />
      {/* Arms */}
      <mesh position={[0.92, 1.15, 0]} rotation={[0, 0, 0.12]} geometry={G.arm} material={bodyMat} />
      <mesh
        position={[-0.92, 1.15, 0]}
        rotation={[0, 0, -0.12]}
        geometry={G.arm}
        material={bodyMat}
      />
      {/* Legs */}
      <mesh
        position={[0.34, -1.6, 0]}
        rotation={[0, 0, 0.03]}
        geometry={G.leg}
        material={bodyMat}
      />
      <mesh
        position={[-0.34, -1.6, 0]}
        rotation={[0, 0, -0.03]}
        geometry={G.leg}
        material={bodyMat}
      />

      <SurfaceMuscles material={muscleMat} />


      {/* Organs */}
      {(Object.keys(ORGAN_LABELS) as Array<keyof typeof ORGAN_LABELS>).map((organ) => {
        const pos = ORGAN_POSITIONS[organ];
        const isActive = organ === activeOrgan;
        return (
          <Organ
            key={organ}
            organ={organ}
            position={pos}
            active={isActive}
            label={ORGAN_LABELS[organ]}
          />
        );
      })}
    </group>
  );
}

/**
 * Stylized surface muscle relief: pec/ab/oblique panels on the trunk, deltoid
 * caps at the shoulders and spindle bulges on the limbs. Purely decorative
 * geometry sitting just outside the body shell.
 */
function SurfaceMuscles({ material }: { material: THREE.Material }) {
  return (
    <group>
      {/* Pectorals */}
      <mesh position={[0.29, 1.72, 0.31]} rotation={[0, 0, -0.16]} geometry={G.pec} material={material} />
      <mesh position={[-0.29, 1.72, 0.31]} rotation={[0, 0, 0.16]} geometry={G.pec} material={material} />
      {/* Sternum / linea alba midline */}
      <mesh position={[0, 1.05, 0.33]} geometry={G.midline} material={material} />
      {/* Abdominal segmentation */}
      {[1.2, 0.94, 0.68].map((y, row) =>
        [-1, 1].map((sx) => (
          <mesh
            key={`${row}-${sx}`}
            position={[sx * 0.155, y, 0.315 - row * 0.012]}
            geometry={G.abPanel}
            material={material}
          />
        )),
      )}
      {/* Obliques */}
      <mesh position={[0.35, 0.9, 0.22]} rotation={[0, 0.5, 0.12]} geometry={G.obliquePanel} material={material} />
      <mesh position={[-0.35, 0.9, 0.22]} rotation={[0, -0.5, -0.12]} geometry={G.obliquePanel} material={material} />
      {/* Deltoids */}
      <mesh position={[0.89, 1.92, 0]} geometry={G.deltoid} material={material} />
      <mesh position={[-0.89, 1.92, 0]} geometry={G.deltoid} material={material} />
      {/* Biceps + forearm definition */}
      <mesh position={[0.96, 1.42, 0.06]} rotation={[0, 0, 0.12]} geometry={G.biceps} material={material} />
      <mesh position={[-0.96, 1.42, 0.06]} rotation={[0, 0, -0.12]} geometry={G.biceps} material={material} />
      <mesh position={[1.04, 0.72, 0.05]} rotation={[0, 0, 0.12]} geometry={G.forearm} material={material} />
      <mesh position={[-1.04, 0.72, 0.05]} rotation={[0, 0, -0.12]} geometry={G.forearm} material={material} />
      {/* Quadriceps + calves */}
      <mesh position={[0.37, -1.18, 0.1]} geometry={G.quad} material={material} />
      <mesh position={[-0.37, -1.18, 0.1]} geometry={G.quad} material={material} />
      <mesh position={[0.35, -2.0, -0.05]} geometry={G.calf} material={material} />
      <mesh position={[-0.35, -2.0, -0.05]} geometry={G.calf} material={material} />
    </group>
  );
}

/** Distinct low-poly silhouette per organ, sharing one material. */
function OrganShape({ organ, material }: { organ: string; material: THREE.Material }) {
  switch (organ) {
    case "heart":
      return (
        <group rotation={[0, 0, 0.3]}>
          <mesh position={[-0.085, 0.085, 0]} geometry={G.heartLobe} material={material} />
          <mesh position={[0.085, 0.085, 0]} geometry={G.heartLobe} material={material} />
          <mesh position={[0, -0.02, 0]} geometry={G.heartApex} material={material} />
        </group>
      );
    case "lungs":
      return (
        <>
          <mesh position={[-0.42, 0.05, -0.04]} geometry={G.lungL} material={material} />
          <mesh position={[0.42, 0.05, -0.04]} geometry={G.lungR} material={material} />
        </>
      );
    case "liver":
      return <mesh rotation={[0, 0, -0.15]} geometry={G.liver} material={material} />;
    case "stomach":
      return <mesh geometry={G.stomach} material={material} />;
    case "kidney":
      return (
        <>
          <mesh position={[-0.32, 0, 0]} geometry={G.kidneyL} material={material} />
          <mesh position={[0.32, 0, 0]} geometry={G.kidneyR} material={material} />
        </>
      );
    case "small_intestine":
      return <mesh geometry={G.intestine} material={material} />;
    case "brain":
      return <mesh geometry={G.brain} material={material} />;
    case "bone":
    case "bone_marrow":
      return <mesh geometry={G.bone} material={material} />;
    case "muscle":
      return <mesh geometry={G.muscle} material={material} />;
    case "lymph_node":
      return (
        <>
          {[
            [0, 0, 0],
            [0.09, 0.06, 0.02],
            [-0.07, 0.08, -0.02],
            [0.03, -0.09, 0.03],
            [-0.08, -0.05, 0.01],
          ].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} geometry={G.node} material={material} />
          ))}
        </>
      );
    case "pancreas":
      return <mesh rotation={[0, 0, 0.2]} geometry={G.pancreas} material={material} />;
    case "thyroid":
      return <mesh geometry={G.thyroid} material={material} />;
    case "skin":
      return <mesh rotation={[0, 0.5, 0]} geometry={G.skin} material={material} />;
    case "vessels":
      return <mesh geometry={G.vessel} material={material} />;
    default:
      return <mesh geometry={G.joint} material={material} />;
  }
}

function Organ({
  organ,
  position,
  active,
  label,
}: {
  organ: string;
  position: [number, number, number];
  active: boolean;
  label: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const material = useMemo(() => {
    const base = ORGAN_COLORS[organ] ?? "#5aa0b8";
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(active ? "#f7b955" : base),
      emissive: new THREE.Color(active ? "#f7b955" : base),
      emissiveIntensity: active ? 0.9 : 0.14,
      roughness: 0.45,
      metalness: 0.05,
    });
  }, [active, organ]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const s = active ? 1 + Math.sin(clock.elapsedTime * 4) * 0.08 : 1;
    ref.current.scale.setScalar(s);
  });
  return (
    <group position={position}>
      <group ref={ref}>
        <OrganShape organ={organ} material={material} />
      </group>
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

/**
 * Keeps the whole figure in frame: pulls the camera back when the canvas is
 * short or narrow so the model never overflows the viewport.
 */
function CameraFit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const figureHeight = 8.2;
    const figureWidth = 3.2;
    const vFov = (cam.fov * Math.PI) / 180;
    const distV = figureHeight / 2 / Math.tan(vFov / 2);
    const aspect = size.width / size.height;
    const distH = figureWidth / 2 / Math.tan(vFov / 2) / Math.max(aspect, 0.001);
    const dist = Math.max(distV, distH) * 1.05;
    cam.position.set(0, 0.9, dist);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
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


function useIsDark() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setIsDark(el.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export function BodyScene({ drug, time, playing, onTimeChange }: Props) {
  const phases = useMemo(() => buildPhases(drug), [drug]);
  const duration = totalDuration(phases);
  const isDark = useIsDark();
  const bg = isDark ? "#0e1a24" : "#e8eef2";

  // Reset time when drug changes
  useEffect(() => {
    onTimeChange(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drug.slug]);

  return (
    <Canvas camera={{ position: [0, 1.0, 9], fov: 45 }} dpr={[1, 2]}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 10, 22]} />

      <Scene drug={drug} time={time} />
      <Ticker playing={playing} onTick={onTimeChange} duration={duration} time={time} />
      <OrbitControls
        enablePan={false}
        minDistance={5}
        maxDistance={16}
        target={[0, 0.8, 0]}
        autoRotate={!playing}
        autoRotateSpeed={0.5}
      />
    </Canvas>
  );
}
