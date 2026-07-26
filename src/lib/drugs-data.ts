// Curated drug catalog for Drug-View v1.
// Each record drives the 3D animation engine plus the clinician info panel.
// Data compiled from public FDA labels and standard pharmacology references.

export type Route = "oral" | "iv" | "im" | "inhaled" | "topical" | "sublingual" | "subcutaneous";
export type Organ =
  | "brain"
  | "heart"
  | "lungs"
  | "liver"
  | "kidney"
  | "stomach"
  | "small_intestine"
  | "joints"
  | "vessels"
  | "pancreas"
  | "thyroid"
  | "skin"
  | "bone";
export type Elimination = "renal" | "hepatic" | "biliary" | "mixed" | "pulmonary";

export interface Drug {
  slug: string;
  name: string;
  brand?: string;
  drugClass: string;
  indication: string;
  route: Route;
  absorptionSite: Organ;
  targetOrgan: Organ;
  receptors: string[];
  mechanism: string;
  metabolism: { organ: Organ; enzymes: string[] };
  elimination: Elimination;
  halfLifeHours: number;
  onsetMinutes: number;
  peakMinutes: number;
  typicalDose: string;
  clinicalNotes: string[];
}

export const DRUGS: Drug[] = [
  {
    slug: "ibuprofen",
    name: "Ibuprofen",
    brand: "Advil, Motrin",
    drugClass: "NSAID (non-selective COX inhibitor)",
    indication: "Pain, fever, inflammation",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "joints",
    receptors: ["COX-1", "COX-2"],
    mechanism:
      "Reversible non-selective inhibition of cyclooxygenase reduces prostaglandin synthesis, decreasing pain, fever and inflammatory signalling.",
    metabolism: { organ: "liver", enzymes: ["CYP2C9", "CYP2C8"] },
    elimination: "renal",
    halfLifeHours: 2,
    onsetMinutes: 30,
    peakMinutes: 90,
    typicalDose: "200–400 mg PO q4–6h",
    clinicalNotes: [
      "GI bleeding risk via COX-1 inhibition",
      "Avoid in advanced CKD and 3rd-trimester pregnancy",
      "Antiplatelet effect is reversible (unlike aspirin)",
    ],
  },
  {
    slug: "aspirin",
    name: "Aspirin",
    brand: "Bayer",
    drugClass: "NSAID / antiplatelet",
    indication: "Antiplatelet, pain, fever",
    route: "oral",
    absorptionSite: "stomach",
    targetOrgan: "vessels",
    receptors: ["COX-1"],
    mechanism:
      "Irreversible acetylation of COX-1 in platelets blocks thromboxane A₂ production for the platelet's lifetime (~7–10 days).",
    metabolism: { organ: "liver", enzymes: ["esterases", "CYP2C9"] },
    elimination: "renal",
    halfLifeHours: 0.3,
    onsetMinutes: 20,
    peakMinutes: 60,
    typicalDose: "81 mg PO daily (antiplatelet)",
    clinicalNotes: [
      "Reye syndrome risk in children with viral illness",
      "Antiplatelet effect outlasts serum half-life",
      "Bleeding risk before surgery",
    ],
  },
  {
    slug: "acetaminophen",
    name: "Acetaminophen",
    brand: "Tylenol, Paracetamol",
    drugClass: "Analgesic / antipyretic",
    indication: "Pain, fever",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "brain",
    receptors: ["central COX (proposed)"],
    mechanism:
      "Central inhibition of prostaglandin synthesis in the CNS; minimal peripheral anti-inflammatory effect.",
    metabolism: { organ: "liver", enzymes: ["CYP2E1", "glucuronidation", "sulfation"] },
    elimination: "hepatic",
    halfLifeHours: 2.5,
    onsetMinutes: 30,
    peakMinutes: 60,
    typicalDose: "500–1000 mg PO q6h (max 4 g/day)",
    clinicalNotes: [
      "Hepatotoxicity above 4 g/day; NAPQI depletes glutathione",
      "N-acetylcysteine is the antidote",
      "Safe in pregnancy",
    ],
  },
  {
    slug: "atorvastatin",
    name: "Atorvastatin",
    brand: "Lipitor",
    drugClass: "HMG-CoA reductase inhibitor (statin)",
    indication: "Hyperlipidemia, ASCVD prevention",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "liver",
    receptors: ["HMG-CoA reductase"],
    mechanism:
      "Competitive inhibition of HMG-CoA reductase reduces hepatic cholesterol synthesis and upregulates LDL receptors.",
    metabolism: { organ: "liver", enzymes: ["CYP3A4"] },
    elimination: "biliary",
    halfLifeHours: 14,
    onsetMinutes: 120,
    peakMinutes: 120,
    typicalDose: "10–80 mg PO daily",
    clinicalNotes: [
      "Myopathy and rhabdomyolysis risk (check CK on symptoms)",
      "CYP3A4 interactions (grapefruit, macrolides)",
      "Monitor LFTs at baseline",
    ],
  },
  {
    slug: "metformin",
    name: "Metformin",
    brand: "Glucophage",
    drugClass: "Biguanide",
    indication: "Type 2 diabetes mellitus",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "liver",
    receptors: ["AMPK activation (indirect)"],
    mechanism:
      "Decreases hepatic gluconeogenesis, reduces intestinal glucose absorption, increases peripheral insulin sensitivity.",
    metabolism: { organ: "liver", enzymes: ["not metabolized"] },
    elimination: "renal",
    halfLifeHours: 6,
    onsetMinutes: 60,
    peakMinutes: 150,
    typicalDose: "500–1000 mg PO BID",
    clinicalNotes: [
      "Hold if eGFR < 30 (lactic acidosis risk)",
      "GI upset most common side effect",
      "Weight-neutral, no hypoglycemia as monotherapy",
    ],
  },
  {
    slug: "lisinopril",
    name: "Lisinopril",
    brand: "Prinivil, Zestril",
    drugClass: "ACE inhibitor",
    indication: "Hypertension, HFrEF, post-MI",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "vessels",
    receptors: ["Angiotensin-converting enzyme"],
    mechanism:
      "Blocks conversion of angiotensin I to angiotensin II, reducing vasoconstriction and aldosterone secretion.",
    metabolism: { organ: "kidney", enzymes: ["not metabolized"] },
    elimination: "renal",
    halfLifeHours: 12,
    onsetMinutes: 60,
    peakMinutes: 360,
    typicalDose: "10–40 mg PO daily",
    clinicalNotes: [
      "Dry cough (bradykinin) in ~10%",
      "Angioedema — contraindicated if prior history",
      "Monitor K⁺ and creatinine",
    ],
  },
  {
    slug: "metoprolol",
    name: "Metoprolol",
    brand: "Lopressor, Toprol-XL",
    drugClass: "β1-selective adrenergic blocker",
    indication: "HTN, angina, HFrEF, arrhythmias",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "heart",
    receptors: ["β1 adrenergic receptor"],
    mechanism:
      "Selective β1 blockade reduces heart rate, contractility and AV nodal conduction.",
    metabolism: { organ: "liver", enzymes: ["CYP2D6"] },
    elimination: "hepatic",
    halfLifeHours: 4,
    onsetMinutes: 60,
    peakMinutes: 120,
    typicalDose: "25–200 mg PO BID",
    clinicalNotes: [
      "Use succinate (XL) for HFrEF",
      "Avoid abrupt discontinuation (rebound tachycardia)",
      "Mask hypoglycemia symptoms in diabetics",
    ],
  },
  {
    slug: "amlodipine",
    name: "Amlodipine",
    brand: "Norvasc",
    drugClass: "Dihydropyridine calcium channel blocker",
    indication: "Hypertension, angina",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "vessels",
    receptors: ["L-type Ca²⁺ channel (vascular)"],
    mechanism:
      "Blocks L-type calcium channels in vascular smooth muscle, causing peripheral vasodilation.",
    metabolism: { organ: "liver", enzymes: ["CYP3A4"] },
    elimination: "hepatic",
    halfLifeHours: 35,
    onsetMinutes: 60,
    peakMinutes: 360,
    typicalDose: "2.5–10 mg PO daily",
    clinicalNotes: [
      "Peripheral edema common (dose-dependent)",
      "Long half-life — steady state in ~7 days",
      "Safe in HFrEF (unlike non-DHP CCBs)",
    ],
  },
  {
    slug: "warfarin",
    name: "Warfarin",
    brand: "Coumadin",
    drugClass: "Vitamin K antagonist",
    indication: "AFib, VTE, mechanical valves",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "liver",
    receptors: ["VKORC1"],
    mechanism:
      "Inhibits vitamin K epoxide reductase, reducing synthesis of factors II, VII, IX, X and proteins C/S.",
    metabolism: { organ: "liver", enzymes: ["CYP2C9", "CYP3A4"] },
    elimination: "hepatic",
    halfLifeHours: 40,
    onsetMinutes: 2880,
    peakMinutes: 4320,
    typicalDose: "2–10 mg PO daily, INR-titrated",
    clinicalNotes: [
      "Requires INR monitoring (target 2–3)",
      "Numerous drug + dietary interactions",
      "Reverse with vitamin K ± 4F-PCC",
    ],
  },
  {
    slug: "apixaban",
    name: "Apixaban",
    brand: "Eliquis",
    drugClass: "Direct factor Xa inhibitor (DOAC)",
    indication: "AFib, VTE treatment/prevention",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "vessels",
    receptors: ["Factor Xa"],
    mechanism: "Direct, reversible inhibition of factor Xa halts thrombin generation.",
    metabolism: { organ: "liver", enzymes: ["CYP3A4"] },
    elimination: "mixed",
    halfLifeHours: 12,
    onsetMinutes: 180,
    peakMinutes: 240,
    typicalDose: "5 mg PO BID (AFib)",
    clinicalNotes: [
      "No routine monitoring",
      "Andexanet alfa as reversal agent",
      "Dose-reduce for age ≥80, weight ≤60 kg, Cr ≥1.5",
    ],
  },
  {
    slug: "sertraline",
    name: "Sertraline",
    brand: "Zoloft",
    drugClass: "SSRI",
    indication: "Depression, anxiety, OCD, PTSD",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "brain",
    receptors: ["Serotonin transporter (SERT)"],
    mechanism:
      "Selective inhibition of presynaptic 5-HT reuptake increases synaptic serotonin over weeks.",
    metabolism: { organ: "liver", enzymes: ["CYP2C19", "CYP2D6"] },
    elimination: "hepatic",
    halfLifeHours: 26,
    onsetMinutes: 20160,
    peakMinutes: 360,
    typicalDose: "50–200 mg PO daily",
    clinicalNotes: [
      "Clinical response in 2–4 weeks",
      "Serotonin syndrome risk with MAOIs, tramadol, linezolid",
      "Sexual dysfunction, GI upset common",
    ],
  },
  {
    slug: "morphine",
    name: "Morphine",
    drugClass: "Opioid agonist",
    indication: "Severe pain",
    route: "iv",
    absorptionSite: "vessels",
    targetOrgan: "brain",
    receptors: ["μ-opioid receptor"],
    mechanism:
      "μ-opioid receptor agonism in CNS inhibits ascending pain pathways and modulates descending inhibition.",
    metabolism: { organ: "liver", enzymes: ["UGT2B7"] },
    elimination: "renal",
    halfLifeHours: 3,
    onsetMinutes: 5,
    peakMinutes: 20,
    typicalDose: "2–4 mg IV q4h PRN",
    clinicalNotes: [
      "Respiratory depression — reverse with naloxone",
      "M6G metabolite active, accumulates in renal failure",
      "Histamine release → itching, hypotension",
    ],
  },
  {
    slug: "albuterol",
    name: "Albuterol",
    brand: "Ventolin, ProAir",
    drugClass: "Short-acting β2 agonist (SABA)",
    indication: "Acute bronchospasm, asthma, COPD",
    route: "inhaled",
    absorptionSite: "lungs",
    targetOrgan: "lungs",
    receptors: ["β2 adrenergic receptor"],
    mechanism:
      "β2 agonism on bronchial smooth muscle → cAMP↑ → smooth-muscle relaxation → bronchodilation.",
    metabolism: { organ: "liver", enzymes: ["SULT1A3"] },
    elimination: "renal",
    halfLifeHours: 4,
    onsetMinutes: 5,
    peakMinutes: 30,
    typicalDose: "2 puffs (90 µg) inhaled q4–6h PRN",
    clinicalNotes: [
      "Tachycardia, tremor, hypokalemia at high doses",
      "Overuse → paradoxical worsening",
      "Pair with ICS for persistent asthma",
    ],
  },
  {
    slug: "omeprazole",
    name: "Omeprazole",
    brand: "Prilosec",
    drugClass: "Proton pump inhibitor",
    indication: "GERD, PUD, H. pylori regimens",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "stomach",
    receptors: ["H⁺/K⁺-ATPase (gastric parietal cell)"],
    mechanism:
      "Irreversible inhibition of the gastric proton pump reduces basal and stimulated acid secretion.",
    metabolism: { organ: "liver", enzymes: ["CYP2C19", "CYP3A4"] },
    elimination: "hepatic",
    halfLifeHours: 1,
    onsetMinutes: 60,
    peakMinutes: 120,
    typicalDose: "20–40 mg PO daily",
    clinicalNotes: [
      "Long-term: ↓Mg, ↓B12, ↑fracture risk, C. difficile",
      "Reduces clopidogrel activation (CYP2C19)",
      "Take 30–60 min before meals",
    ],
  },
  {
    slug: "amoxicillin",
    name: "Amoxicillin",
    drugClass: "Aminopenicillin (β-lactam)",
    indication: "Otitis media, pharyngitis, UTI, dental",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "vessels",
    receptors: ["Penicillin-binding proteins"],
    mechanism:
      "Binds PBPs → inhibits transpeptidation of peptidoglycan → bacterial cell-wall lysis.",
    metabolism: { organ: "liver", enzymes: ["minimal"] },
    elimination: "renal",
    halfLifeHours: 1,
    onsetMinutes: 60,
    peakMinutes: 90,
    typicalDose: "500 mg PO TID",
    clinicalNotes: [
      "Rash in mononucleosis (nearly universal)",
      "Extend spectrum with clavulanate",
      "Renal dosing in CKD",
    ],
  },
  {
    slug: "azithromycin",
    name: "Azithromycin",
    brand: "Zithromax",
    drugClass: "Macrolide antibiotic",
    indication: "CAP, atypicals, STIs",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "lungs",
    receptors: ["50S ribosomal subunit"],
    mechanism:
      "Binds 50S ribosomal subunit → inhibits bacterial protein synthesis (bacteriostatic).",
    metabolism: { organ: "liver", enzymes: ["minimal"] },
    elimination: "biliary",
    halfLifeHours: 68,
    onsetMinutes: 120,
    peakMinutes: 180,
    typicalDose: "500 mg PO day 1, then 250 mg × 4 days",
    clinicalNotes: [
      "QT prolongation — check for interacting drugs",
      "Long tissue half-life → 5-day course",
      "GI upset common",
    ],
  },
  {
    slug: "furosemide",
    name: "Furosemide",
    brand: "Lasix",
    drugClass: "Loop diuretic",
    indication: "Volume overload, HFrEF, pulmonary edema",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "kidney",
    receptors: ["Na⁺/K⁺/2Cl⁻ cotransporter (NKCC2)"],
    mechanism:
      "Inhibits NKCC2 in the thick ascending limb → natriuresis, kaliuresis and free-water loss.",
    metabolism: { organ: "kidney", enzymes: ["glucuronidation"] },
    elimination: "renal",
    halfLifeHours: 2,
    onsetMinutes: 60,
    peakMinutes: 90,
    typicalDose: "20–80 mg PO daily",
    clinicalNotes: [
      "Hypokalemia, hypomagnesemia, hyperuricemia",
      "Sulfa allergy cross-reactivity is rare",
      "Ototoxicity with rapid IV push",
    ],
  },
  {
    slug: "levothyroxine",
    name: "Levothyroxine",
    brand: "Synthroid",
    drugClass: "Thyroid hormone (T4)",
    indication: "Hypothyroidism",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "thyroid",
    receptors: ["Nuclear thyroid hormone receptor"],
    mechanism:
      "Synthetic T4, peripherally deiodinated to active T3, binds nuclear receptors and drives transcription of metabolic genes.",
    metabolism: { organ: "liver", enzymes: ["deiodination"] },
    elimination: "hepatic",
    halfLifeHours: 168,
    onsetMinutes: 4320,
    peakMinutes: 240,
    typicalDose: "1.6 µg/kg PO daily",
    clinicalNotes: [
      "Take on empty stomach, separate from Ca/Fe/PPIs",
      "Titrate every 6–8 weeks by TSH",
      "Overdose → atrial fibrillation, osteoporosis",
    ],
  },
  {
    slug: "insulin-lispro",
    name: "Insulin Lispro",
    brand: "Humalog",
    drugClass: "Rapid-acting insulin analog",
    indication: "Type 1 & 2 diabetes (prandial)",
    route: "subcutaneous",
    absorptionSite: "vessels",
    targetOrgan: "liver",
    receptors: ["Insulin receptor tyrosine kinase"],
    mechanism:
      "Binds the insulin receptor → GLUT4 translocation, glycogenesis, lipogenesis, ↓hepatic gluconeogenesis.",
    metabolism: { organ: "liver", enzymes: ["insulin-degrading enzyme"] },
    elimination: "hepatic",
    halfLifeHours: 1,
    onsetMinutes: 15,
    peakMinutes: 60,
    typicalDose: "Individualized (carb-count based)",
    clinicalNotes: [
      "Hypoglycemia is the main risk",
      "Give 15 min before meals",
      "Rotate injection sites",
    ],
  },
  {
    slug: "prednisone",
    name: "Prednisone",
    drugClass: "Systemic glucocorticoid",
    indication: "Autoimmune, allergic, inflammatory disease",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "joints",
    receptors: ["Glucocorticoid receptor"],
    mechanism:
      "Prodrug → prednisolone → binds cytosolic GR → nuclear translocation → broad anti-inflammatory transcription changes.",
    metabolism: { organ: "liver", enzymes: ["11β-HSD1"] },
    elimination: "hepatic",
    halfLifeHours: 3,
    onsetMinutes: 60,
    peakMinutes: 120,
    typicalDose: "5–60 mg PO daily",
    clinicalNotes: [
      "Taper if >2 weeks (HPA-axis suppression)",
      "Hyperglycemia, weight gain, osteoporosis",
      "Increased infection risk",
    ],
  },
  {
    slug: "diazepam",
    name: "Diazepam",
    brand: "Valium",
    drugClass: "Long-acting benzodiazepine",
    indication: "Anxiety, seizures, alcohol withdrawal",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "brain",
    receptors: ["GABA-A receptor (α subunit)"],
    mechanism:
      "Positive allosteric modulation of GABA-A increases Cl⁻ influx frequency → CNS depression.",
    metabolism: { organ: "liver", enzymes: ["CYP3A4", "CYP2C19"] },
    elimination: "hepatic",
    halfLifeHours: 48,
    onsetMinutes: 30,
    peakMinutes: 60,
    typicalDose: "2–10 mg PO q6–12h",
    clinicalNotes: [
      "Long-acting metabolite (nordiazepam) accumulates",
      "Reverse with flumazenil (rare — seizure risk)",
      "Avoid with opioids (respiratory depression)",
    ],
  },
  {
    slug: "clopidogrel",
    name: "Clopidogrel",
    brand: "Plavix",
    drugClass: "P2Y12 inhibitor (antiplatelet)",
    indication: "ACS, post-PCI, secondary stroke prevention",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "vessels",
    receptors: ["P2Y12 ADP receptor"],
    mechanism:
      "Prodrug → active metabolite irreversibly blocks P2Y12 on platelets → inhibits ADP-mediated aggregation.",
    metabolism: { organ: "liver", enzymes: ["CYP2C19"] },
    elimination: "mixed",
    halfLifeHours: 6,
    onsetMinutes: 120,
    peakMinutes: 240,
    typicalDose: "75 mg PO daily (± 300–600 mg load)",
    clinicalNotes: [
      "CYP2C19 poor metabolizers → reduced efficacy",
      "PPI omeprazole may blunt activation",
      "Hold 5 days before major surgery",
    ],
  },
  {
    slug: "sildenafil",
    name: "Sildenafil",
    brand: "Viagra, Revatio",
    drugClass: "PDE5 inhibitor",
    indication: "Erectile dysfunction, pulmonary HTN",
    route: "oral",
    absorptionSite: "small_intestine",
    targetOrgan: "vessels",
    receptors: ["Phosphodiesterase-5"],
    mechanism:
      "Inhibits PDE5 → sustained cGMP → smooth-muscle relaxation in corpus cavernosum and pulmonary vasculature.",
    metabolism: { organ: "liver", enzymes: ["CYP3A4"] },
    elimination: "hepatic",
    halfLifeHours: 4,
    onsetMinutes: 30,
    peakMinutes: 60,
    typicalDose: "50 mg PO 1 h before activity",
    clinicalNotes: [
      "Contraindicated with nitrates (severe hypotension)",
      "Blue-tinted vision (PDE6 cross-reactivity)",
      "Caution with α-blockers",
    ],
  },
  {
    slug: "epinephrine",
    name: "Epinephrine",
    brand: "EpiPen",
    drugClass: "Non-selective adrenergic agonist",
    indication: "Anaphylaxis, cardiac arrest",
    route: "im",
    absorptionSite: "vessels",
    targetOrgan: "heart",
    receptors: ["α1, α2, β1, β2 adrenergic receptors"],
    mechanism:
      "Full agonism at all adrenergic receptors → vasoconstriction (α1), ↑HR/contractility (β1), bronchodilation (β2).",
    metabolism: { organ: "liver", enzymes: ["COMT", "MAO"] },
    elimination: "hepatic",
    halfLifeHours: 0.05,
    onsetMinutes: 5,
    peakMinutes: 10,
    typicalDose: "0.3 mg IM (adult anaphylaxis)",
    clinicalNotes: [
      "Give IM lateral thigh — never delay in anaphylaxis",
      "Tachyarrhythmia, hypertension",
      "Repeat q5–15 min if symptoms persist",
    ],
  },
];

export const DRUG_CLASSES = Array.from(new Set(DRUGS.map((d) => d.drugClass))).sort();

export function getDrug(slug: string): Drug | undefined {
  return DRUGS.find((d) => d.slug === slug);
}

export function searchDrugs(q: string): Drug[] {
  const query = q.trim().toLowerCase();
  if (!query) return DRUGS;
  return DRUGS.filter(
    (d) =>
      d.name.toLowerCase().includes(query) ||
      d.brand?.toLowerCase().includes(query) ||
      d.drugClass.toLowerCase().includes(query) ||
      d.indication.toLowerCase().includes(query),
  );
}
