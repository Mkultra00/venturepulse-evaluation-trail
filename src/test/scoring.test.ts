import { describe, it, expect } from "vitest";
import { merit, type DimScores } from "@/lib/scoring";

const all = (n: number | null): DimScores => ({
  team: n, fmf: n, market: n, product: n, traction: n,
  retention: n, unit: n, defense: n, learning: n, terms: n,
});

describe("scoring", () => {
  it("abstains with fewer than 6 of 10 evidenced dimensions", () => {
    expect(merit({ ...all(null), team: 5, fmf: 5, market: 5, product: 5, traction: 5 })).toBeNull();
  });
  it("scores when 6 dims are evidenced", () => {
    expect(merit({ ...all(null), team: 5, fmf: 5, market: 5, product: 5, traction: 5, defense: 5 })).toBe(100);
  });
  it("clamps verification adjustment to -15", () => {
    expect(merit(all(3), -40)).toBe(35);
  });
});
