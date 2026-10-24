import type { DimScores } from "./scoring";
import { RUN_SCRIPT, type StageId, type Step } from "./demo-data";

export type Kpi = { label: string; val: string; num: number | null };

export type Snapshot = {
  id: string;
  label: string;
  date: string;
  stageReached: StageId;
  scores: DimScores;
  v: number;
  fundFit: number;
  kpis: Kpi[];
  flags: string[];
  /** partner/associate comments recorded at this meeting */
  vc: string[];
  note: string;
};

export type Applicant = {
  id: string;
  name: string;
  tagline: string;
  stage: string;
  founders: string[];
  referrer: string;
  /** true = synthetic demo applicant */
  live: boolean;
  snapshots: Snapshot[];
  /** agent run replayed when the user presses "Run live evaluation" */
  script: Step[];
  /** note attached to the appended "Live re-eval" snapshot */
  liveNote: string;
};

/** Build a tailored agent run for a dataset applicant. */
function mkScript(o: {
  claims: number;
  scout: string;
  founder: string;
  metrics: string;
  memory: string;
  verifyFlags: string[];
  gatePass: boolean;
  dims: number;
  v: number;
  decide: string;
}): Step[] {
  const steps: Step[] = [
    { stage: "intake", from: "DILLY", to: "INTAKE", kind: "cmd", note: "Plan run · dispatch INTAKE" },
    { stage: "intake", from: "INTAKE", to: null, tool: "PDF", kind: "tool", note: `PDF parser → ${o.claims} claims extracted` },
    { stage: "gather", from: "INTAKE", to: "SCOUT", kind: "cmd", note: "Fan-out: SCOUT, FOUNDER, METRICS, MEMORY" },
    { stage: "gather", from: "SCOUT", to: null, tool: "GITHUB", kind: "tool", note: o.scout },
    { stage: "gather", from: "INTAKE", to: "FOUNDER", kind: "cmd", note: "Spawn 2 founder subagents" },
    { stage: "gather", from: "FOUNDER", to: null, tool: "LINKEDIN", kind: "tool", note: o.founder },
    { stage: "gather", from: "INTAKE", to: "METRICS", kind: "cmd", note: "Normalize ARR, NRR, burn multiple" },
    { stage: "gather", from: "METRICS", to: null, tool: "BENCH", kind: "tool", note: o.metrics },
    { stage: "gather", from: "INTAKE", to: "MEMORY", kind: "mem", note: o.memory },
    { stage: "verify", from: "SCOUT", to: "VERIFIER", kind: "cmd", note: "Cross-check claims vs signals" },
    ...o.verifyFlags.map((f): Step => ({ stage: "verify", from: "VERIFIER", to: null, tool: "LLM", kind: "err", note: `Red flag: ${f}` })),
    { stage: "verify", from: "METRICS", to: "RUBRIC", kind: "cmd", note: "Score 19 rubric criteria" },
    o.gatePass
      ? { stage: "gate", from: "RUBRIC", to: "SCORER", kind: "ok", note: `Gate passed · ${o.dims} of 10 dims evidenced` }
      : { stage: "gate", from: "RUBRIC", to: "DILLY", kind: "err", note: `Abstain · only ${o.dims} of 10 dims evidenced` },
  ];
  if (o.gatePass) {
    steps.push(
      { stage: "score", from: "VERIFIER", to: "SCORER", kind: "cmd", note: `Merit computed in code · V = ${o.v}` },
      { stage: "audit", from: "SCORER", to: "AUDITOR", kind: "cmd", note: "Send run to PRISM" },
      { stage: "audit", from: "AUDITOR", to: null, tool: "PRISM", kind: "ok", note: "PRISM: bias ✓ consistency ✓ explainability ✓" },
    );
  }
  steps.push({ stage: "decide", from: o.gatePass ? "AUDITOR" : "DILLY", to: "DILLY", kind: "ok", note: o.decide });
  return steps;
}

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
/** dataset scores are 0–10; the report card uses 0–5 */
const h = (x: number | null) => (x == null ? null : Math.round(x / 2));
/** dataset verification_adj is −100..100; the report card uses −15..+5 */
const vadj = (x: number) => Math.max(-15, Math.min(5, Math.round(x / 20)));

const RF: Record<string, string> = {
  RF_PILOT_ARR: "Headline ARR includes paid pilots",
  RF_CUSTOMER_CONCENTRATION: "Top customer > 30% of revenue",
  RF_SINGLE_MODEL_PROVIDER: "Single model provider, no fallback",
  RF_PRE_INFERENCE_MARGIN: "Quoted margin excludes inference/GPU cost",
  RF_VELOCITY_DROP: "Commit velocity down > 40% last quarter",
  RF_HIRING_FREEZE: "Open roles down > 50% in 90 days",
  RF_TITLE_INFLATION: "Founder title exceeds public record",
  RF_IP_NOT_ASSIGNED: "Core IP not assigned to the company",
  RF_FOUNDER_NOT_FULLTIME: "A founder is not full time",
  RF_VALUATION_STRETCH: "Post-money > 20x durable ARR",
  RF_DISCOUNTING: "New discounting in the last 90 days",
  RF_UNVERIFIABLE_TRACTION: "Traction claims with no verifiable data",
};
const flags = (ids: string[]) => ids.map((id) => RF[id] ?? id);

type Dims = { team?: number | null; market?: number | null; product?: number | null; traction?: number | null; unit?: number | null; defense?: number | null; terms?: number | null };
const scores = (d: Dims): DimScores => ({
  team: h(d.team ?? null), fmf: null, market: h(d.market ?? null), product: h(d.product ?? null),
  traction: h(d.traction ?? null), retention: null, unit: h(d.unit ?? null),
  defense: h(d.defense ?? null), learning: null, terms: h(d.terms ?? null),
});

const k = (label: string, val: string, num: number | null): Kpi => ({ label, val, num });

export const APPLICANTS: Applicant[] = [
  {
    id: "doughdilly",
    name: "DoughDilly",
    tagline: "AI close-the-books agent for mid-market finance teams",
    stage: "Seed",
    founders: ["Priya Raman · CEO, ex-Stripe finance eng", "Diego Alvarez · CTO, ex-Ramp ML"],
    referrer: "Northwind Angels (hit rate 31%)",
    live: true,
    script: RUN_SCRIPT,
    liveNote: "Live run complete · PRISM passed.",
    snapshots: [
      {
        id: "s1", label: "Meeting 1", date: days(118), stageReached: "gate",
        scores: { team: 4, fmf: 4, market: 3, product: 2, traction: null, retention: null, unit: null, defense: null, learning: null, terms: 3 },
        v: 0, fundFit: 58,
        kpis: [k("ARR", "$0.12M", 0.12), k("NRR", "—", null), k("Burn multiple", "—", null), k("Gross margin", "52%", 52), k("Week-8 retention", "—", null), k("FTE", "5", 5)],
        flags: [], vc: ["Interesting intro from Northwind — verify traction claims before meeting 2.", "Too early to score; asked for metrics access."], note: "Abstained: only 5 of 10 dimensions evidenced.",
      },
      {
        id: "s2", label: "Meeting 2", date: days(64), stageReached: "decide",
        scores: { team: 4, fmf: 4, market: 3, product: 3, traction: 3, retention: 3, unit: 2, defense: null, learning: 3, terms: 3 },
        v: -2, fundFit: 66,
        kpis: [k("ARR", "$0.48M", 0.48), k("NRR", "104%", 104), k("Burn multiple", "3.1x", 3.1), k("Gross margin", "58%", 58), k("Week-8 retention", "61%", 61), k("FTE", "8", 8)],
        flags: ["Churn figure differs between deck and transcript"], vc: ["Churn number changed between deck and transcript — flagged for follow-up.", "Learning rate is impressive; keep warm."], note: "Decision: Monitor.",
      },
      {
        id: "s3", label: "Meeting 3", date: days(19), stageReached: "decide",
        scores: { team: 5, fmf: 4, market: 4, product: 4, traction: 4, retention: 4, unit: 3, defense: 3, learning: 5, terms: 3 },
        v: -3, fundFit: 79,
        kpis: [k("ARR", "$1.35M", 1.35), k("NRR", "118%", 118), k("Burn multiple", "1.6x", 1.6), k("Gross margin", "67%", 67), k("Week-8 retention", "74%", 74), k("FTE", "11", 11)],
        flags: ["Deck says 14 FTE, careers page implies ~9"], vc: ["Headcount discrepancy is likely stale deck, not deception — confirm at next call.", "Strongest learning rate in the pipeline this quarter."], note: "Decision pending · strong learning rate.",
      },
    ],
  },
  {
    id: "ledgerline",
    name: "Ledgerline",
    tagline: "AI agent that runs accounts payable end to end for mid-market finance teams",
    stage: "Seed · $4M at $28M post",
    founders: ["Nadia Farouk · CEO", "Daniel Okafor · CTO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 41,
      scout: "GitHub API · commits 212 → 41 QoQ (−81%), 2 contributors inactive",
      founder: "Speaker page: 'Senior Manager, AP Product' — not Head of AP",
      metrics: "Durable ARR $1.2M · $0.9M is paid pilots · top customer ~33%",
      memory: "Fund memory: no prior contact",
      verifyFlags: ["ARR includes pilots", "velocity −81%", "roles 11 → 2", "title inflation", "3-months-free banner", "margin excludes model costs"],
      gatePass: true, dims: 7, v: -3,
      decide: "Scorecard ready · recommend re-underwrite at lower valuation",
    }),
    liveNote: "Live run complete · 6 of 8 deck claims contradicted · PRISM passed.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · deck claims", date: "2026-09-29T00:00:00Z", stageReached: "intake",
        scores: scores({ team: 8, market: 9, product: 9, traction: 9, unit: 8, defense: 8, terms: 7 }),
        v: 0, fundFit: 84,
        kpis: [k("ARR (deck)", "$2.10M", 2.1), k("Gross margin (deck)", "70%", 70), k("Growth (deck)", "40% MoM", 40), k("Open roles", "11", 11), k("Team page", "14", 14), k("Commit velocity", "—", null)],
        flags: [], vc: ["Great pitch — but every number needs verification before we lean in.", "Asked for data room and GitHub access."], note: "Deck claims taken at face value. Verification not yet run.",
      },
      {
        id: "m3", label: "Meeting 3 · verified", date: "2026-10-20T00:00:00Z", stageReached: "decide",
        scores: scores({ team: 6, market: 7, product: 4, traction: 5, unit: 4, defense: 3, terms: 3 }),
        v: vadj(-68.8), fundFit: 84,
        kpis: [k("Durable ARR", "$1.20M", 1.2), k("Gross margin", "~52%", 52), k("Commit velocity", "−81%", -81), k("Open roles", "2", 2), k("Team page", "14", 14), k("Largest customer", "~33%", 33)],
        flags: flags(["RF_PILOT_ARR", "RF_CUSTOMER_CONCENTRATION", "RF_SINGLE_MODEL_PROVIDER", "RF_PRE_INFERENCE_MARGIN", "RF_VELOCITY_DROP", "RF_HIRING_FREEZE", "RF_TITLE_INFLATION", "RF_VALUATION_STRETCH", "RF_DISCOUNTING"]),
        vc: ["COO admitted $0.9M of the $2.1M is paid pilots — that changes the round math.", "Re-underwrite on $1.2M durable ARR; valuation should reset.", "Velocity and hiring collapse suggest the team is winding down."],
        note: "Do not take to IC as pitched. Re-underwrite on ~$1.2M durable ARR; valuation should reset. 6 of 8 deck claims contradicted.",
      },
    ],
  },
  {
    id: "haulmark",
    name: "Haulmark",
    tagline: "AI dispatcher that books, tracks, and re-routes loads for mid-size brokerages",
    stage: "Seed",
    founders: ["Tomas Herrera · CEO", "Aisha Bello · CTO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 36,
      scout: "GitHub API · commits +53% QoQ, 4 contributors",
      founder: "Bios check out against public record",
      metrics: "ARR $655k verified, above deck · NRR 116–121% across cohorts",
      memory: "Fund memory: 1 prior pass (too early)",
      verifyFlags: ["quoted margin excludes GPU cost"],
      gatePass: true, dims: 7, v: 5,
      decide: "Scorecard ready · recommend partner meeting this week",
    }),
    liveNote: "Live run complete · claims hold · PRISM passed.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · deck claims", date: "2026-10-01T00:00:00Z", stageReached: "intake",
        scores: scores({ team: 9, market: 7, product: 8, traction: 7, unit: 8, defense: 7, terms: 7 }),
        v: 0, fundFit: 92,
        kpis: [k("ARR (deck)", "$0.60M", 0.6), k("Customers", "19", 19), k("Pilots", "none", 0), k("Open roles", "3", 3), k("Commit velocity", "—", null), k("NRR", "—", null)],
        flags: [], vc: ["No free pilots — paid first month. Good sign.", "Claims look conservative; verify and move."], note: "Control case: claims expected to hold up.",
      },
      {
        id: "m3", label: "Meeting 3 · verified", date: "2026-10-21T00:00:00Z", stageReached: "decide",
        scores: scores({ team: 9, market: 7, product: 8, traction: 7.5, unit: 6.5, defense: 7, terms: 6 }),
        v: vadj(91.7), fundFit: 92,
        kpis: [k("ARR (verified)", "$0.66M", 0.66), k("Cohort NRR", "116–121%", 118), k("Commit velocity", "+53%", 53), k("Open roles", "7", 7), k("Case studies", "6", 6), k("Gross margin", "70%", 70)],
        flags: flags(["RF_PRE_INFERENCE_MARGIN"]),
        vc: ["ARR came in above deck — rare and welcome.", "Move fast; competing term sheet expires next Friday."],
        note: "Take to partner meeting this week. Move fast; competing term sheet expires next Friday.",
      },
    ],
  },
  {
    id: "cinderwell",
    name: "Cinderwell",
    tagline: "AI takeoff and estimating for commercial electrical and mechanical subcontractors",
    stage: "Seed · $2M SAFE, $8M cap",
    founders: ["Maya Chen-Ortiz · CEO", "Ben Adeyemi · CTO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 22,
      scout: "GitHub API · commits +89% QoQ · 2025 snapshot stale (pre-incorporation)",
      founder: "OSS takeoff tool, 1.1k stars · 2024 innovation award",
      metrics: "Data room: $34.2k MRR = $410k ARR, above deck · largest account 7%",
      memory: "Fund memory: no prior contact",
      verifyFlags: [],
      gatePass: true, dims: 7, v: 5,
      decide: "Scorecard ready · founder undersells; data beats the deck",
    }),
    liveNote: "Live run complete · verified polygon outside claimed · PRISM passed.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · deck claims", date: "2026-10-02T00:00:00Z", stageReached: "intake",
        scores: scores({ team: 6, market: 6, product: 6, traction: 5, unit: 6, defense: 5, terms: 7 }),
        v: 0, fundFit: 90,
        kpis: [k("ARR (deck)", "~$0.30M", 0.3), k("Customers", "a few dozen", null), k("Open roles (2025)", "0", 0), k("Commit velocity (2025)", "−42%", -42), k("Price/seat", "$400", 400), k("Gross margin", "~70%", 70)],
        flags: [], note: "Quiet founder; deck undersells. 2025 snapshots pre-date incorporation.",
      },
      {
        id: "m3", label: "Meeting 3 · verified", date: "2026-10-21T00:00:00Z", stageReached: "decide",
        scores: scores({ team: 8, market: 7, product: 7.5, traction: 7, unit: 6.5, defense: 6, terms: 7 }),
        v: vadj(100), fundFit: 90,
        kpis: [k("ARR (data room)", "$0.41M", 0.41), k("Paying accounts", "46", 46), k("Largest account", "7%", 7), k("Commit velocity", "+89%", 89), k("Price/seat", "$650", 650), k("Gross margin", "74%", 74)],
        flags: [],
        note: "Take to partner meeting. Founder undersells; the data is better than the deck. Verified polygon sits outside claimed.",
      },
    ],
  },
  {
    id: "parcelwise",
    name: "Parcelwise",
    tagline: "AI returns-processing for third-party logistics warehouses",
    stage: "Seed",
    founders: ["Grace Whitfield · CEO", "Sam Whitaker · CTO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 28,
      scout: "GitHub API · velocity −4%, steady · single external model provider",
      founder: "CTO still part-time at Reverso (competitor)",
      metrics: "ARR $790k verified · 5 customers / 14 warehouses · GM 70% incl. API",
      memory: "Fund memory: no prior contact",
      verifyFlags: ["core IP not assigned to company", "CTO not full time", "single model provider"],
      gatePass: true, dims: 7, v: 0,
      decide: "Scorecard ready · hold until IP assignment signed",
    }),
    liveNote: "Live run complete · metrics real, legal risk confirmed · PRISM passed.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · deck claims", date: "2026-10-05T00:00:00Z", stageReached: "intake",
        scores: scores({ team: 8, market: 7, product: 8, traction: 7, unit: 7, defense: 7, terms: 7 }),
        v: 0, fundFit: 88,
        kpis: [k("ARR", "$0.79M", 0.79), k("Customers", "5", 5), k("Warehouses", "14", 14), k("Gross margin", "70%", 70), k("Largest customer", "24%", 24), k("Commit velocity", "—", null)],
        flags: [], note: "Good metrics on paper. Legal diligence not yet run.",
      },
      {
        id: "m3", label: "Meeting 3 · verified", date: "2026-10-21T00:00:00Z", stageReached: "decide",
        scores: scores({ team: 5, market: 7, product: 6, traction: 7, unit: 6, defense: 4, terms: 2 }),
        v: vadj(0), fundFit: 88,
        kpis: [k("ARR", "$0.79M", 0.79), k("Customers", "5", 5), k("Warehouses", "14", 14), k("Gross margin", "70%", 70), k("Commit velocity", "−4%", -4), k("Open roles", "2", 2)],
        flags: flags(["RF_IP_NOT_ASSIGNED", "RF_FOUNDER_NOT_FULLTIME", "RF_SINGLE_MODEL_PROVIDER"]),
        note: "Do not proceed until the CTO's IP assignment is signed and Reverso's invention-assignment clause is reviewed by counsel. Metrics are real.",
      },
    ],
  },
  {
    id: "quillstack",
    name: "Quillstack",
    tagline: "AI copilot that drafts coverage decisions for property and casualty underwriters",
    stage: "Pre-seed · $1.5M SAFE",
    founders: ["Ryan Castellano · CEO", "Undisclosed · CTO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 14,
      scout: "GitHub API · no public repos found",
      founder: "CTO undisclosed · CEO second job unconfirmed",
      metrics: "No revenue data · site is waitlist only",
      memory: "Fund memory: no prior contact",
      verifyFlags: ["traction claims unverifiable", "founder possibly not full time"],
      gatePass: false, dims: 3, v: 0,
      decide: "Abstained · 4 diligence items requested before meeting 2",
    }),
    liveNote: "Live run complete · abstained, not enough verifiable evidence.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · only data", date: "2026-10-17T00:00:00Z", stageReached: "gate",
        scores: scores({ team: 5, market: 7, terms: 5 }),
        v: 0, fundFit: 86,
        kpis: [k("ARR", "—", null), k("Site", "waitlist only", null), k("GitHub", "none found", null), k("Careers", "none found", null), k("Customers", "—", null), k("Team", "2", 2)],
        flags: flags(["RF_FOUNDER_NOT_FULLTIME", "RF_UNVERIFIABLE_TRACTION"]),
        note: "Abstained: only 3 of 7 dimensions have verifiable evidence (minimum 4). Unverified claims are not marked contradicted — ask for the four diligence items before a second meeting.",
      },
    ],
  },
  {
    id: "tessellate-bio",
    name: "Tessellate Bio",
    tagline: "Generative protein design for industrial enzymes, with an in-house lab",
    stage: "Series A",
    founders: ["Dr. Lena Vogt · CEO", "Dr. Kenji Mori · CSO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 19,
      scout: "GitHub API · commits +9% QoQ · 2.3k stars · in-house model",
      founder: "Two PhD founders, publications check out",
      metrics: "Pre-revenue · wet-lab cost structure",
      memory: "Fund memory: thesis check → biotech out of scope",
      verifyFlags: [],
      gatePass: true, dims: 7, v: 4,
      decide: "Scorecard ready · strong merit, fit 18 — pass on thesis, refer out",
    }),
    liveNote: "Live run complete · merit strong, off thesis · PRISM passed.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · verified", date: "2026-10-06T00:00:00Z", stageReached: "decide",
        scores: scores({ team: 9, market: 8, product: 9, traction: 8, unit: 5, defense: 8, terms: 6 }),
        v: vadj(80), fundFit: 18,
        kpis: [k("Revenue", "pre-revenue", null), k("Commit velocity", "+9%", 9), k("Repo stars", "2,318", 2318), k("Open roles", "9", 9), k("Model", "in-house", null), k("Publications", "yes", null)],
        flags: [],
        note: "Pass on fit, not on merit. Biotech is out of thesis for Halyard Fund II — refer to a bio-focused co-investor and keep warm.",
      },
    ],
  },
  {
    id: "vantor",
    name: "Vantor",
    tagline: "AI revenue-recognition and audit prep for SaaS finance teams",
    stage: "Seed",
    founders: ["Jordan Pike · CEO", "Elena Sokolova · CTO"],
    referrer: "Halyard Ventures pipeline",
    live: false,
    script: mkScript({
      claims: 33,
      scout: "GitHub API · commits +8% QoQ · two model providers (router)",
      founder: "CEO press overstated · CTO record is the real signal",
      metrics: "ARR $930k verified (7% under deck, within tolerance) · largest customer 6%",
      memory: "Fund memory: no prior contact",
      verifyFlags: ["post-money 32x durable ARR"],
      gatePass: true, dims: 7, v: 2,
      decide: "Scorecard ready · solid business, priced high",
    }),
    liveNote: "Live run complete · valuation flag confirmed · PRISM passed.",
    snapshots: [
      {
        id: "m1", label: "Meeting 1 · deck claims", date: "2026-10-03T00:00:00Z", stageReached: "intake",
        scores: scores({ team: 10, market: 8, product: 8, traction: 8, unit: 8, defense: 7, terms: 7 }),
        v: 0, fundFit: 82,
        kpis: [k("ARR (deck)", "$1.00M", 1.0), k("Customers", "50+", 50), k("Open roles (site)", "10", 10), k("Commit velocity", "—", null), k("CEO press", "extensive", null), k("Gross margin", "—", null)],
        flags: [], note: "Hype-heavy CEO bio. Check whether the numbers or the press carry the team score.",
      },
      {
        id: "m3", label: "Meeting 3 · verified", date: "2026-10-20T00:00:00Z", stageReached: "decide",
        scores: scores({ team: 6, market: 7, product: 7, traction: 7, unit: 7, defense: 5, terms: 5 }),
        v: vadj(30), fundFit: 82,
        kpis: [k("ARR (verified)", "$0.93M", 0.93), k("Customers", "52", 52), k("Largest customer", "6%", 6), k("Commit velocity", "+8%", 8), k("Open roles (ATS)", "12", 12), k("Model providers", "2", 2)],
        flags: flags(["RF_VALUATION_STRETCH"]),
        note: "Solid business, priced high (32x). Team score rests on the CTO and the numbers, not the CEO's press. Empty careers page = jobs moved to an ATS, not a hiring freeze.",
      },
    ],
  },
];
