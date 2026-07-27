import * as THREE from "three";

/**
 * Procedural, low/medium-poly geometry for a stylized human figure and its organs.
 * Everything here is generated from Three.js primitives (lathe / tube / extrude /
 * deformed spheres) so the scene stays self-contained with no external assets.
 */

function v2(x: number, y: number) {
  return new THREE.Vector2(x, y);
}

/** Smooth human-ish silhouette (head → neck → shoulders → waist → hips) as a lathe. */
export function makeTorsoGeometry() {
  // profile points: [radius, height]
  const raw: Array<[number, number]> = [
    [0.0, -0.95],
    [0.62, -0.9],
    [0.78, -0.6],
    [0.8, -0.25],
    [0.72, 0.15],
    [0.66, 0.5],
    [0.72, 0.95],
    [0.86, 1.35],
    [0.95, 1.62],
    [0.78, 1.78],
    [0.4, 1.85],
    [0.24, 1.98],
    [0.22, 2.2],
    [0.0, 2.26],
  ];
  const curve = new THREE.SplineCurve(raw.map(([r, h]) => v2(r, h)));
  const pts = curve.getPoints(28).map((p) => v2(Math.max(p.x, 0.001), p.y));
  const geo = new THREE.LatheGeometry(pts, 32);
  // flatten front-to-back so the torso reads as a human trunk, not a cylinder
  geo.scale(1, 1, 0.62);
  return geo;
}

/** Head: slightly egg-shaped ellipsoid with a hint of a jaw. */
export function makeHeadGeometry() {
  const geo = new THREE.SphereGeometry(0.52, 24, 20);
  geo.scale(0.86, 1.12, 0.9);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < 0) {
      const k = 1 + y * 0.18; // taper the chin
      pos.setX(i, pos.getX(i) * k);
      pos.setZ(i, pos.getZ(i) * k);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Tapered limb (upper→lower) built as a lathe, so it swells at the muscle belly. */
export function makeLimbGeometry(topR: number, midR: number, botR: number, length: number) {
  const raw: Array<[number, number]> = [
    [0.001, 0],
    [topR * 0.9, 0.02],
    [topR, length * 0.12],
    [midR, length * 0.45],
    [botR * 1.05, length * 0.8],
    [botR, length * 0.97],
    [0.001, length],
  ];
  const curve = new THREE.SplineCurve(raw.map(([r, h]) => v2(r, h)));
  const pts = curve.getPoints(16).map((p) => v2(Math.max(p.x, 0.001), p.y));
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.translate(0, -length / 2, 0);
  return geo;
}

/** Heart: two rounded lobes merged with a tapered apex. */
export function makeHeartGeometry() {
  const geo = new THREE.SphereGeometry(0.16, 18, 16);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + 0.16) / 0.32; // 0 bottom → 1 top
    // taper into an apex at the bottom
    const taper = 0.35 + 0.9 * Math.pow(t, 0.7);
    // cleft between the two upper lobes
    const cleft = t > 0.72 ? 1 - 0.45 * Math.cos((v.x / 0.16) * Math.PI * 0.5) * (t - 0.72) * 4 : 1;
    v.x *= taper * 1.05;
    v.z *= taper * 0.95;
    v.y *= cleft;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.scale(1.05, 1.35, 1.0);
  geo.rotateZ(0.28);
  geo.computeVertexNormals();
  return geo;
}

/** One lung lobe: rounded outer wall, flattened inner (mediastinal) face, notched top. */
export function makeLungGeometry(side: 1 | -1) {
  const geo = new THREE.SphereGeometry(0.22, 18, 16);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = (v.y + 0.22) / 0.44;
    // narrow apex, broad base
    const taper = 0.45 + 0.75 * (1 - t);
    v.x *= taper;
    v.z *= taper;
    // flatten the medial side facing the heart
    if (v.x * side < 0) v.x *= 0.42;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.scale(1, 1.5, 0.85);
  geo.computeVertexNormals();
  return geo;
}

/** Liver: large asymmetric wedge with a bevelled edge. */
export function makeLiverGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0.1);
  shape.bezierCurveTo(-0.1, 0.24, 0.2, 0.22, 0.36, 0.06);
  shape.bezierCurveTo(0.4, -0.06, 0.26, -0.18, 0.05, -0.2);
  shape.bezierCurveTo(-0.12, -0.21, -0.28, -0.1, -0.34, 0.1);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelSize: 0.05,
    bevelThickness: 0.05,
    bevelSegments: 2,
    curveSegments: 8,
  });
  geo.translate(0, 0, -0.15);
  // wedge: thin the left tip
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const k = THREE.MathUtils.mapLinear(x, -0.34, 0.36, 0.45, 1.0);
    pos.setZ(i, pos.getZ(i) * k);
    pos.setY(i, pos.getY(i) * (0.7 + 0.3 * k));
  }
  geo.computeVertexNormals();
  return geo;
}

/** Stomach: J-curved tube. */
export function makeStomachGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, 0.24, 0),
    new THREE.Vector3(0.02, 0.12, 0.02),
    new THREE.Vector3(-0.14, -0.02, 0.03),
    new THREE.Vector3(-0.14, -0.18, 0.02),
    new THREE.Vector3(0.02, -0.24, 0),
    new THREE.Vector3(0.14, -0.14, -0.02),
  ]);
  // fat in the body, narrow at the ends
  const geo = new THREE.TubeGeometry(curve, 28, 0.09, 10, false);
  const pos = geo.attributes.position;
  const seg = 28 + 1;
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / 11);
    const t = ring / (seg - 1);
    const k = 0.5 + 1.0 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    const c = curve.getPoint(t);
    pos.setXYZ(
      i,
      c.x + (pos.getX(i) - c.x) * k,
      c.y + (pos.getY(i) - c.y) * k,
      c.z + (pos.getZ(i) - c.z) * k,
    );
  }
  geo.computeVertexNormals();
  return geo;
}

/** Kidney: bean — a thick tube swept along a short arc. */
export function makeKidneyGeometry(side: 1 | -1) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 0.02, 0.13, 0),
    new THREE.Vector3(side * 0.07, 0.0, 0),
    new THREE.Vector3(side * 0.02, -0.13, 0),
  ]);
  const geo = new THREE.TubeGeometry(curve, 16, 0.085, 12, false);
  geo.scale(1, 1, 0.8);
  return geo;
}

/** Small intestine: coiled tube mass. */
export function makeIntestineGeometry() {
  const pts: THREE.Vector3[] = [];
  const turns = 3.2;
  const steps = 90;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * Math.PI * 2 * turns;
    const r = 0.3 - 0.19 * t;
    pts.push(new THREE.Vector3(Math.cos(a) * r, -0.22 + t * 0.42, Math.sin(a) * r * 0.7));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 120, 0.055, 7, false);
}

/** Brain: ellipsoid with a central sulcus and a cerebellum bump. */
export function makeBrainGeometry() {
  const geo = new THREE.SphereGeometry(0.3, 22, 18);
  geo.scale(0.85, 0.86, 1.05);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // longitudinal fissure along the top
    if (v.y > 0.05) {
      const d = 1 - Math.min(1, Math.abs(v.x) / 0.07);
      v.y -= d * 0.045;
    }
    // gentle lobed waviness
    const w = 1 + 0.025 * Math.sin(v.z * 22) * Math.sin(v.y * 16);
    pos.setXYZ(i, v.x * w, v.y, v.z * w);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Long bone: shaft with two rounded epiphyses. */
export function makeBoneGeometry(length = 0.8) {
  const raw: Array<[number, number]> = [
    [0.001, -length / 2],
    [0.085, -length / 2 + 0.03],
    [0.095, -length / 2 + 0.08],
    [0.045, -length / 2 + 0.16],
    [0.04, 0],
    [0.045, length / 2 - 0.16],
    [0.095, length / 2 - 0.08],
    [0.085, length / 2 - 0.03],
    [0.001, length / 2],
  ];
  const curve = new THREE.SplineCurve(raw.map(([r, h]) => v2(r, h)));
  const pts = curve.getPoints(20).map((p) => v2(Math.max(p.x, 0.001), p.y));
  return new THREE.LatheGeometry(pts, 14);
}

/** Muscle belly: spindle-shaped band. */
export function makeMuscleGeometry(length = 0.75) {
  const raw: Array<[number, number]> = [
    [0.001, -length / 2],
    [0.05, -length / 2 + 0.08],
    [0.13, -length / 6],
    [0.14, length / 8],
    [0.06, length / 2 - 0.1],
    [0.001, length / 2],
  ];
  const curve = new THREE.SplineCurve(raw.map(([r, h]) => v2(r, h)));
  const pts = curve.getPoints(18).map((p) => v2(Math.max(p.x, 0.001), p.y));
  const geo = new THREE.LatheGeometry(pts, 14);
  geo.scale(1, 1, 0.8);
  return geo;
}

/** Generic small blob used for pancreas / thyroid / joints / skin patch. */
export function makeBlobGeometry(sx: number, sy: number, sz: number) {
  const geo = new THREE.SphereGeometry(0.12, 14, 12);
  geo.scale(sx, sy, sz);
  return geo;
}
