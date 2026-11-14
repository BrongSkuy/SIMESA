import { describe, it, expect } from "vitest";
import { getPredikatAndDeskripsi, DEFAULT_KKM } from "../erapor";

describe("E-Rapor Akademik & Penilaian Bagi Rata Unit Tests", () => {
  it("should calculate unweighted average (bagi rata) correctly across components", () => {
    // Skenario: Komponen Tugas: 80, UTS: 85, UAS: 75, Praktik: 80
    const components = [80, 85, 75, 80];
    const sum = components.reduce((acc, val) => acc + val, 0);
    const mean = Number((sum / components.length).toFixed(2));

    expect(mean).toBe(80.0);
  });

  it("should assign Predikat A (Sangat Baik) for scores >= 90", () => {
    const result = getPredikatAndDeskripsi(92, "Matematika", DEFAULT_KKM);
    expect(result.predikat).toBe("A");
    expect(result.statusKetuntasan).toBe("Tuntas");
    expect(result.kategori).toBe("Sangat Baik");
    expect(result.deskripsi).toContain("sangat unggul");
  });

  it("should assign Predikat B (Baik) for scores between 80 and 89.99", () => {
    const result = getPredikatAndDeskripsi(84.5, "Bahasa Inggris", DEFAULT_KKM);
    expect(result.predikat).toBe("B");
    expect(result.statusKetuntasan).toBe("Tuntas");
    expect(result.kategori).toBe("Baik");
    expect(result.deskripsi).toContain("baik dan tuntas");
  });

  it("should assign Predikat C (Cukup / Tuntas) for scores between KKM (75) and 79.99", () => {
    const result = getPredikatAndDeskripsi(75, "Fisika Terapan", DEFAULT_KKM);
    expect(result.predikat).toBe("C");
    expect(result.statusKetuntasan).toBe("Tuntas");
    expect(result.kategori).toBe("Cukup");
    expect(result.deskripsi).toContain("kriteria ketuntasan minimal");
  });

  it("should assign Predikat D (Perlu Bimbingan / Belum Tuntas) for scores below KKM", () => {
    const result = getPredikatAndDeskripsi(72.5, "Aerodinamika", DEFAULT_KKM);
    expect(result.predikat).toBe("D");
    expect(result.statusKetuntasan).toBe("Belum Tuntas");
    expect(result.kategori).toBe("Perlu Bimbingan");
    expect(result.deskripsi).toContain("Perlu pendampingan");
  });

  it("should handle null or unrecorded subject scores safely", () => {
    const result = getPredikatAndDeskripsi(null, "Sistem Pesawat", DEFAULT_KKM);
    expect(result.predikat).toBe("-");
    expect(result.statusKetuntasan).toBe("Belum Dinilai");
    expect(result.kategori).toBe("Belum Dinilai");
    expect(result.deskripsi).toContain("belum tuntas diinput");
  });

  it("should handle exact threshold boundaries accurately", () => {
    // 74.99 -> D
    const dScore = getPredikatAndDeskripsi(74.99, "Matematika", DEFAULT_KKM);
    expect(dScore.predikat).toBe("D");
    expect(dScore.statusKetuntasan).toBe("Belum Tuntas");

    // 75.00 -> C (Tuntas KKM)
    const cScore = getPredikatAndDeskripsi(75.0, "Matematika", DEFAULT_KKM);
    expect(cScore.predikat).toBe("C");
    expect(cScore.statusKetuntasan).toBe("Tuntas");

    // 89.99 -> B
    const bScore = getPredikatAndDeskripsi(89.99, "Matematika", DEFAULT_KKM);
    expect(bScore.predikat).toBe("B");

    // 90.00 -> A
    const aScore = getPredikatAndDeskripsi(90.0, "Matematika", DEFAULT_KKM);
    expect(aScore.predikat).toBe("A");
  });

  it("should prioritize academic criteria components over single behavioral score", () => {
    // Simulasi 2 record score untuk mapel yang sama:
    // 1. Nilai Akademik: { Tugas: 75, UTS: 79, UAS: 72 } -> Rata-rata 75.33
    // 2. Keaktifan: { Nilai: 81 } -> 81
    const scores = [
      { mapel: "Matematika", details: JSON.stringify({ Tugas: 75, UTS: 79, UAS: 72 }), nilai: 75.33 },
      { mapel: "Matematika", details: JSON.stringify({ Nilai: 81 }), nilai: 81 },
    ];

    const scoreByMapel = new Map<string, (typeof scores)[0]>();
    scores.forEach((sc) => {
      const key = sc.mapel.trim().toLowerCase();
      const existing = scoreByMapel.get(key);
      const isAcademic =
        sc.details &&
        (sc.details.includes("Tugas") ||
          sc.details.includes("UTS") ||
          sc.details.includes("UAS") ||
          sc.details.includes("Praktek"));

      if (!existing || isAcademic) {
        scoreByMapel.set(key, sc);
      }
    });

    const chosen = scoreByMapel.get("matematika");
    expect(chosen?.nilai).toBe(75.33);
    expect(chosen?.details).toContain("Tugas");
  });
});
