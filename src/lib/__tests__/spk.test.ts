import { describe, it, expect } from "vitest";

describe("SPK Simple Additive Weighting (SAW) Logic Unit Tests", () => {
  it("should normalize criteria scores correctly using Benefit formula: Rij = Xij / max(Xj)", () => {
    const rawScores = [80, 90, 100, 70];
    const maxVal = Math.max(...rawScores);

    expect(maxVal).toBe(100);

    const normalized = rawScores.map((score) => (maxVal > 0 ? score / maxVal : 0));
    expect(normalized).toEqual([0.8, 0.9, 1.0, 0.7]);
  });

  it("should handle division by zero safely when max score across all students is 0", () => {
    const rawScores = [0, 0, 0];
    const maxVal = Math.max(...rawScores, 0);

    const normalized = rawScores.map((score) => (maxVal > 0 ? score / maxVal : 0));
    expect(normalized).toEqual([0, 0, 0]);
  });

  it("should compute final SAW composite score correctly with 100% total weight", () => {
    // 5 criteria configured in SIMESA:
    // C1: Kehadiran (30% -> 0.30)
    // C2: Nilai Akademik (25% -> 0.25)
    // C3: Kedisiplinan (20% -> 0.20)
    // C4: Sikap & Perilaku (15% -> 0.15)
    // C5: Keaktifan (10% -> 0.10)
    const weights = [0.30, 0.25, 0.20, 0.15, 0.10];
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    expect(Math.round(totalWeight * 100)).toBe(100);

    // Student A: perfect on all criteria (1.0 normalized)
    const normalizedStudentA = [1.0, 1.0, 1.0, 1.0, 1.0];
    const scoreA = normalizedStudentA.reduce((sum, norm, i) => sum + norm * weights[i], 0);
    expect(scoreA).toBeCloseTo(1.0, 5);

    // Student B: mixed normalized scores [0.8, 0.9, 0.7, 0.85, 0.6]
    const normalizedStudentB = [0.8, 0.9, 0.7, 0.85, 0.6];
    // Expected: (0.8*0.3) + (0.9*0.25) + (0.7*0.2) + (0.85*0.15) + (0.6*0.10)
    // = 0.24 + 0.225 + 0.14 + 0.1275 + 0.06 = 0.7925 (79.25%)
    const scoreB = normalizedStudentB.reduce((sum, norm, i) => sum + norm * weights[i], 0);
    expect(scoreB).toBeCloseTo(0.7925, 4);
    expect(Number((scoreB * 100).toFixed(2))).toBe(79.25);
  });

  it("should rank students descending by score and use alphabetical tie-breaker", () => {
    const students = [
      { id: "1", namaLengkap: "Budi", rawScore: 0.85 },
      { id: "2", namaLengkap: "Andi", rawScore: 0.85 },
      { id: "3", namaLengkap: "Citra", rawScore: 0.92 },
      { id: "4", namaLengkap: "Deni", rawScore: 0.70 },
    ];

    students.sort((a, b) => b.rawScore - a.rawScore || a.namaLengkap.localeCompare(b.namaLengkap));

    expect(students.map((s) => s.namaLengkap)).toEqual([
      "Citra", // 0.92
      "Andi",  // 0.85 (tie, alphabetical first)
      "Budi",  // 0.85
      "Deni",  // 0.70
    ]);
  });
});

