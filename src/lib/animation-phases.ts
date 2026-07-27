import { isGenericTarget, type Drug, type Organ } from "./drugs-data";

export interface Phase {
  id: string;
  label: string;
  description: string;
  duration: number; // seconds in animation
  fromOrgan: Organ | "outside";
  toOrgan: Organ;
  color: "primary" | "accent" | "destructive";
}

// Convert a drug record into an ordered set of animation phases.
export function buildPhases(drug: Drug): Phase[] {
  const phases: Phase[] = [];

  // 1. Route in
  const routeLabel: Record<Drug["route"], { label: string; from: Organ | "outside"; to: Organ }> = {
    oral: { label: "Ingestion", from: "outside", to: "stomach" },
    iv: { label: "IV infusion", from: "outside", to: "vessels" },
    im: { label: "IM injection", from: "outside", to: "vessels" },
    subcutaneous: { label: "SC injection", from: "outside", to: "vessels" },
    inhaled: { label: "Inhalation", from: "outside", to: "lungs" },
    topical: { label: "Topical application", from: "outside", to: "skin" },
    sublingual: { label: "Sublingual", from: "outside", to: "vessels" },
  };
  const r = routeLabel[drug.route];
  phases.push({
    id: "route",
    label: r.label,
    description: `${drug.name} administered via ${drug.route.toUpperCase()} route.`,
    duration: 2.5,
    fromOrgan: r.from,
    toOrgan: r.to,
    color: "primary",
  });

  // 2. Absorption (if not already in bloodstream)
  if (drug.absorptionSite !== "vessels") {
    phases.push({
      id: "absorption",
      label: "Absorption",
      description: `Crosses ${humanizeOrgan(drug.absorptionSite)} into systemic circulation.`,
      duration: 3.5,
      fromOrgan: r.to,
      toOrgan: "vessels",
      color: "primary",
    });
  }

  // 3. Distribution — generic systemic template when the target organ is unconfident.
  if (isGenericTarget(drug)) {
    phases.push({
      id: "distribution",
      label: "Systemic circulation",
      description: `${drug.name} distributes through the bloodstream to body tissues. A specific organ target isn't available in the structured FDA data.`,
      duration: 5,
      fromOrgan: "vessels",
      toOrgan: "vessels",
      color: "primary",
    });
    phases.push({
      id: "metabolism",
      label: "Clearance",
      description: "Gradually cleared from the circulation; detailed metabolic pathway not available in structured data.",
      duration: 4,
      fromOrgan: "vessels",
      toOrgan: "liver",
      color: "accent",
    });
    phases.push({
      id: "elimination",
      label: "Elimination",
      description: "Excreted from the body.",
      duration: 3,
      fromOrgan: "liver",
      toOrgan: "kidney",
      color: "destructive",
    });
    return phases;
  }

  // 3. Distribution
  phases.push({
    id: "distribution",
    label: "Distribution",
    description: `Circulates through the bloodstream toward ${humanizeOrgan(drug.targetOrgan)}.`,
    duration: 4,
    fromOrgan: "vessels",
    toOrgan: drug.targetOrgan,
    color: "primary",
  });

  // 4. Target binding
  phases.push({
    id: "target",
    label: "Target binding",
    description: `Binds ${drug.receptors.join(", ")} in ${humanizeOrgan(drug.targetOrgan)}.`,
    duration: 3,
    fromOrgan: drug.targetOrgan,
    toOrgan: drug.targetOrgan,
    color: "accent",
  });

  // 5. Metabolism
  phases.push({
    id: "metabolism",
    label: "Metabolism",
    description: `Processed in ${humanizeOrgan(drug.metabolism.organ)} by ${drug.metabolism.enzymes.join(", ")}.`,
    duration: 3.5,
    fromOrgan: drug.targetOrgan,
    toOrgan: drug.metabolism.organ,
    color: "accent",
  });

  // 6. Elimination
  const elimOrgan: Organ =
    drug.elimination === "renal"
      ? "kidney"
      : drug.elimination === "biliary" || drug.elimination === "hepatic"
        ? "liver"
        : drug.elimination === "pulmonary"
          ? "lungs"
          : "kidney";
  phases.push({
    id: "elimination",
    label: "Elimination",
    description: `Excreted primarily via ${drug.elimination} route.`,
    duration: 3,
    fromOrgan: drug.metabolism.organ,
    toOrgan: elimOrgan,
    color: "destructive",
  });

  return phases;
}

export function totalDuration(phases: Phase[]): number {
  return phases.reduce((s, p) => s + p.duration, 0);
}

export function phaseAtTime(phases: Phase[], t: number): { phase: Phase; localT: number; index: number } {
  let acc = 0;
  for (let i = 0; i < phases.length; i++) {
    const p = phases[i];
    if (t < acc + p.duration) {
      return { phase: p, localT: (t - acc) / p.duration, index: i };
    }
    acc += p.duration;
  }
  const last = phases[phases.length - 1];
  return { phase: last, localT: 1, index: phases.length - 1 };
}

export function humanizeOrgan(o: Organ | "outside"): string {
  const map: Record<Organ | "outside", string> = {
    brain: "brain",
    heart: "heart",
    lungs: "lungs",
    liver: "liver",
    kidney: "kidneys",
    stomach: "stomach",
    small_intestine: "small intestine",
    joints: "joint tissue",
    vessels: "bloodstream",
    pancreas: "pancreas",
    thyroid: "thyroid",
    skin: "skin",
    bone: "bone",
    bone_marrow: "bone marrow",
    muscle: "muscle",
    lymph_node: "lymph node",
    outside: "outside the body",
  };
  return map[o];
}
