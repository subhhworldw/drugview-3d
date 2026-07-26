import type { Organ } from "./drugs-data";

// Approximate 3D positions for each organ in the body model.
// Coordinate system: x = left-right, y = up-down, z = front-back
export const ORGAN_POSITIONS: Record<Organ | "outside", [number, number, number]> = {
  brain: [0, 3.2, 0],
  heart: [-0.25, 1.4, 0.15],
  lungs: [0, 1.5, 0],
  liver: [0.5, 0.6, 0.1],
  kidney: [0, 0.2, -0.3],
  stomach: [-0.15, 0.75, 0.15],
  small_intestine: [0, 0.0, 0.15],
  joints: [1.1, -0.9, 0],
  vessels: [0, 1.0, 0],
  pancreas: [-0.1, 0.45, 0],
  thyroid: [0, 2.4, 0.2],
  skin: [0.9, 0.5, 0.35],
  bone: [-1.0, -1.0, 0],
  outside: [0, 4.5, 1.5],
};

export const ORGAN_LABELS: Record<Organ, string> = {
  brain: "Brain",
  heart: "Heart",
  lungs: "Lungs",
  liver: "Liver",
  kidney: "Kidneys",
  stomach: "Stomach",
  small_intestine: "Small intestine",
  joints: "Joint",
  vessels: "Bloodstream",
  pancreas: "Pancreas",
  thyroid: "Thyroid",
  skin: "Skin",
  bone: "Bone",
};
