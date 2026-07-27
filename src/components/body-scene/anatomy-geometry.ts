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
    [0.55, -0.9],
    [0.68, -0.6],
    [0.7, -0.25],
    [0.6, 0.15],
    [0.55, 0.5],
    [0.62, 0.95],
    [0.75, 1.35],
    [0.84, 1.62],
    [0.68, 1.78],
    [0.34, 1.86],
    [0.19, 2.02],
    [0.17, 2.24],
    [0.0, 2.3],
  ];
  const curve = new THREE.SplineCurve(raw.map(([r, h]) => v2(r, h)));
  const pts = curve.getPoints(28).map((p) => v2(Math.max(p.x, 0.001), p.y));
  const geo = new THREE.LatheGeometry(pts, 32);
  // flatten front-to-back so the torso reads as a human trunk, not a cylinder
  geo.scale(1, 1, 0.55);
  return geo;
}

/** Head: slightly egg-shaped ellipsoid with a hint of a jaw. */
export function makeHeadGeometry() {
  const geo = new THREE.SphereGeometry(0.42, 24, 20);
  geo.scale(0.82, 1.15, 0.92);
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

/** Heart lobe: one of the two rounded upper chambers. */
export function makeHeartLobeGeometry() {
  const geo = new THREE.SphereGeometry(0.115, 16, 14);
  geo.scale(1, 0.95, 0.85);
  return geo;
}

/** Heart apex: tapered cone forming the pointed lower tip. */
export function makeHeartApexGeometry() {
  const raw: Array<[number, number]> = [
    [0.001, -0.19],
    [0.06, -0.13],
    [0.13, -0.02],
    [0.165, 0.06],
    [0.15, 0.12],
    [0.001, 0.14],
  ];
  const curve = new THREE.SplineCurve(raw.map(([r, h]) => v2(r, h)));
  const pts = curve.getPoints(16).map((p) => v2(Math.max(p.x, 0.001), p.y));
  const geo = new THREE.LatheGeometry(pts, 18);
  geo.scale(1, 1, 0.88);
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

/** Liver: large asymmetric wedge, thick on the right, tapering to a thin left lobe. */
export function makeLiverGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.36, 0.04);
  shape.bezierCurveTo(-0.14, 0.2, 0.16, 0.2, 0.32, 0.04);
  shape.bezierCurveTo(0.4, -0.08, 0.24, -0.2, 0.02, -0.2);
  shape.bezierCurveTo(-0.16, -0.19, -0.3, -0.08, -0.36, 0.04);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.16,
    bevelEnabled: true,
    bevelSize: 0.04,
    bevelThickness: 0.04,
    bevelSegments: 2,
    curveSegments: 10,
  });
  geo.translate(0, 0, -0.12);
  // wedge: thin the left lobe
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const k = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(x, -0.36, 0.32, 0.4, 1.0), 0.4, 1);
    pos.setZ(i, pos.getZ(i) * k);
  }
  geo.scale(0.82, 0.82, 0.82);
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

/** Kidney: bean — ellipsoid with an indented hilum on the medial side. */
export function makeKidneyGeometry(side: 1 | -1) {
  const geo = new THREE.SphereGeometry(0.11, 18, 14);
  geo.scale(0.72, 1.35, 0.68);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // concave notch on the medial face, strongest at mid-height
    if (v.x * side < 0) {
      const notch = Math.max(0, 1 - Math.abs(v.y) / 0.06);
      v.x *= 1 - 0.75 * notch;
    }
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
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
    pts.push(new THREE.Vector3(Math.cos(a) * r, -0.16 + t * 0.3, Math.sin(a) * r * 0.85));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return new THREE.TubeGeometry(curve, 120, 0.055, 7, false);
}

/** Brain: ellipsoid with a central sulcus and a cerebellum bump. */
export function makeBrainGeometry() {
  const geo = new THREE.SphereGeometry(0.24, 22, 18);
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
