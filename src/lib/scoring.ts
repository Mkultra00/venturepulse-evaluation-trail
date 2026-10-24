export type DimKey =
  | "team" | "fmf" | "market" | "product" | "traction"
  | "retention" | "unit" | "defense" | "learning" | "terms";

export const DIMENSIONS: { key: DimKey; label: string; weight: number }[] = [
  { key: "team", label: "Team", weight: 18 },
  { key: "fmf", label: "Founder-market fit", weight: 12 },
  { key: "market", label: "Market & timing", weight: 12 },
  { key: "product", label: "Product", weight: 10 },
  { key: "traction", label: "Traction", weight: 12 },
  { key: "retention", label: "Retention", weight: 10 },
  { key: "unit", label: "Unit economics", weight: 6 },
  { key: "defense", label: "Defensibility", weight: 10 },
  { key: "learning", label: "Learning rate", weight: 5 },
  { key: "terms", label: "Deal terms & risk", weight: 5 },
];

/** Sub-score 1..5, or null when there is no verified evidence. */
export type DimScores = Record<DimKey, number | null>;

export const ABSTAIN_MIN = 6;

export function evidencedCount(s: DimScores) {
  return DIMENSIONS.filter((d) => s[d.key] != null).length;
}

/** Merit = weighted mean of evidenced dims rescaled 0-100, plus verification adj V (-15..+5). Null = abstain. */
export function merit(s: DimScores, v = 0, min = ABSTAIN_MIN): number | null {
  if (evidencedCount(s) < min) return null;
  let num = 0, den = 0;
  for (const d of DIMENSIONS) {
    const x = s[d.key];
    if (x == null) continue;
    num += d.weight * ((x - 1) / 4) * 100;
    den += d.weight;
  }
  const adj = Math.max(-15, Math.min(5, v));
  return Math.round(Math.max(0, Math.min(100, num / den + adj)));
}

export function grade(score: number | null) {
  if (score == null) return "—";
  if (score >= 85) return "A";
  if (score >= 75) return "B+";
  if (score >= 65) return "B";
  if (score >= 55) return "C+";
  if (score >= 45) return "C";
  return "D";
}

export function sinceLabel(fromIso: string, now: Date) {
  const ms = now.getTime() - new Date(fromIso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
