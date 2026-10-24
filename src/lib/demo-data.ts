import type { DimScores } from "./scoring";

export type StageId =
  | "intake" | "gather" | "verify" | "gate" | "score" | "audit" | "decide";

export const STAGES: { id: StageId; label: string; hint: string }[] = [
  { id: "intake", label: "Intake", hint: "Deck & transcripts → claims" },
  { id: "gather", label: "Gather", hint: "Scout · Founder · Metrics · Memory" },
  { id: "verify", label: "Verify", hint: "Cross-check claims, rubric" },
  { id: "gate", label: "Abstain gate", hint: "≥ 6 of 10 dims evidenced" },
  { id: "score", label: "Score", hint: "Merit & Fund fit (code)" },
  { id: "audit", label: "PRISM audit", hint: "Bias · consistency" },
  { id: "decide", label: "Partner decision", hint: "Human-only" },
];

export type AgentId =
  | "KOSA" | "INTAKE" | "SCOUT" | "FOUNDER" | "METRICS" | "MEMORY"
  | "VERIFIER" | "RUBRIC" | "SCORER" | "AUDITOR";

export const AGENTS: { id: AgentId; x: number; y: number; stage: StageId; tools: string[] }[] = [
  { id: "KOSA", x: 70, y: 200, stage: "intake", tools: ["Job queue"] },
  { id: "INTAKE", x: 200, y: 200, stage: "intake", tools: ["PDF parser", "LLM"] },
  { id: "SCOUT", x: 350, y: 60, stage: "gather", tools: ["GitHub API", "Web fetch"] },
  { id: "FOUNDER", x: 350, y: 155, stage: "gather", tools: ["LinkedIn", "LLM"] },
  { id: "METRICS", x: 350, y: 250, stage: "gather", tools: ["Benchmarks"] },
  { id: "MEMORY", x: 350, y: 345, stage: "gather", tools: ["pgvector"] },
  { id: "VERIFIER", x: 510, y: 130, stage: "verify", tools: ["LLM"] },
  { id: "RUBRIC", x: 510, y: 275, stage: "verify", tools: ["19 criteria"] },
  { id: "SCORER", x: 660, y: 200, stage: "score", tools: ["Formula"] },
  { id: "AUDITOR", x: 790, y: 200, stage: "audit", tools: ["PRISM API"] },
];

export type Step = {
  stage: StageId;
  from: AgentId;
  to: AgentId | null;
  kind: "cmd" | "tool" | "ok" | "err" | "mem";
  note: string;
};

export const RUN_SCRIPT: Step[] = [
  { stage: "intake", from: "KOSA", to: "INTAKE", kind: "cmd", note: "Plan run · dispatch INTAKE" },
  { stage: "intake", from: "INTAKE", to: null, kind: "tool", note: "PDF parser → 41 claims extracted" },
  { stage: "gather", from: "INTAKE", to: "SCOUT", kind: "cmd", note: "Fan-out: SCOUT, FOUNDER, METRICS, MEMORY" },
  { stage: "gather", from: "SCOUT", to: null, kind: "tool", note: "GitHub API · 312 commits / 30d, 6 contributors" },
  { stage: "gather", from: "INTAKE", to: "FOUNDER", kind: "cmd", note: "Spawn 2 founder subagents" },
  { stage: "gather", from: "FOUNDER", to: null, kind: "tool", note: "Learning diff M1→M3: churn number corrected" },
  { stage: "gather", from: "INTAKE", to: "METRICS", kind: "cmd", note: "Normalize ARR, NRR, burn multiple" },
  { stage: "gather", from: "METRICS", to: null, kind: "tool", note: "Benchmarks · NRR 118% = top quartile" },
  { stage: "gather", from: "INTAKE", to: "MEMORY", kind: "mem", note: "Fund memory: 1 prior pass (Q1, too early)" },
  { stage: "verify", from: "SCOUT", to: "VERIFIER", kind: "cmd", note: "Cross-check claims vs signals" },
  { stage: "verify", from: "VERIFIER", to: null, kind: "err", note: "Red flag: deck says 14 FTE, careers page implies 9" },
  { stage: "verify", from: "METRICS", to: "RUBRIC", kind: "cmd", note: "Score 19 rubric criteria" },
  { stage: "gate", from: "RUBRIC", to: "SCORER", kind: "ok", note: "Gate passed · 10 of 10 dims evidenced" },
  { stage: "score", from: "VERIFIER", to: "SCORER", kind: "cmd", note: "Merit computed in code · V = −3" },
  { stage: "audit", from: "SCORER", to: "AUDITOR", kind: "cmd", note: "Send run to PRISM" },
  { stage: "audit", from: "AUDITOR", to: null, kind: "ok", note: "PRISM: bias ✓ consistency ✓ explainability ✓" },
  { stage: "decide", from: "AUDITOR", to: "KOSA", kind: "ok", note: "Scorecard ready for partner" },
];

export type Snapshot = {
  id: string;
  label: string;
  date: string;
  stageReached: StageId;
  scores: DimScores;
  v: number;
  fundFit: number;
  kpis: { arr: number; nrr: number; burnMultiple: number; grossMargin: number; week8: number; fte: number };
  flags: string[];
  note: string;
};

export const STARTUP = {
  name: "Lumen Ledger",
  tagline: "AI close-the-books agent for mid-market finance teams",
  stage: "Seed",
  founders: ["Priya Raman · CEO, ex-Stripe finance eng", "Diego Alvarez · CTO, ex-Ramp ML"],
  referrer: "Northwind Angels (hit rate 31%)",
};

const days = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

export const SNAPSHOTS: Snapshot[] = [
  {
    id: "s1", label: "Meeting 1", date: days(118), stageReached: "gate",
    scores: { team: 4, fmf: 4, market: 3, product: 2, traction: null, retention: null, unit: null, defense: null, learning: null, terms: 3 },
    v: 0, fundFit: 58,
    kpis: { arr: 0.12, nrr: 0, burnMultiple: 0, grossMargin: 52, week8: 0, fte: 5 },
    flags: [], note: "Abstained: only 5 of 10 dimensions evidenced.",
  },
  {
    id: "s2", label: "Meeting 2", date: days(64), stageReached: "decide",
    scores: { team: 4, fmf: 4, market: 3, product: 3, traction: 3, retention: 3, unit: 2, defense: null, learning: 3, terms: 3 },
    v: -2, fundFit: 66,
    kpis: { arr: 0.48, nrr: 104, burnMultiple: 3.1, grossMargin: 58, week8: 61, fte: 8 },
    flags: ["Churn figure differs between deck and transcript"], note: "Decision: Monitor.",
  },
  {
    id: "s3", label: "Meeting 3", date: days(19), stageReached: "decide",
    scores: { team: 5, fmf: 4, market: 4, product: 4, traction: 4, retention: 4, unit: 3, defense: 3, learning: 5, terms: 3 },
    v: -3, fundFit: 79,
    kpis: { arr: 1.35, nrr: 118, burnMultiple: 1.6, grossMargin: 67, week8: 74, fte: 11 },
    flags: ["Deck says 14 FTE, careers page implies ~9"], note: "Decision pending · strong learning rate.",
  },
];
