import { describe, it, expect } from "vitest";
import { getPredikatAndDeskripsi, DEFAULT_KKM } from "../erapor";
import {
  sanitizeKkmInput,
  parseKkmNumber,
  getKkmAverageColorInfo,
  deduplicateSubjectsForKkm,
  DEFAULT_KKM_KEY,
} from "../erapor-utils";

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

  it("should enforce KKM priority when custom KKM is set above 80 or 90", () => {
    // KKM = 85, Nilai = 82 -> harus D / Belum Tuntas (bukan B / Tuntas)
    const belowHighKkm = getPredikatAndDeskripsi(82, "Avionika", 85);
    expect(belowHighKkm.predikat).toBe("D");
    expect(belowHighKkm.statusKetuntasan).toBe("Belum Tuntas");

    // KKM = 85, Nilai = 85 -> B / Tuntas
    const passHighKkm = getPredikatAndDeskripsi(85, "Avionika", 85);
    expect(passHighKkm.predikat).toBe("B");
    expect(passHighKkm.statusKetuntasan).toBe("Tuntas");

    // KKM = 92, Nilai = 91 -> harus D / Belum Tuntas (bukan A / Tuntas)
    const belowUltraKkm = getPredikatAndDeskripsi(91, "Praktik Khusus", 92);
    expect(belowUltraKkm.predikat).toBe("D");
    expect(belowUltraKkm.statusKetuntasan).toBe("Belum Tuntas");
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

describe("E-Rapor & KKM Utility Helpers (Input Leading Zero, 3-Color Zone, Deduplikasi)", () => {
  it("sanitizeKkmInput removes leading zeros, non-digits, and caps values above 100", () => {
    expect(sanitizeKkmInput("080")).toBe("80");
    expect(sanitizeKkmInput("0075")).toBe("75");
    expect(sanitizeKkmInput("00")).toBe("0");
    expect(sanitizeKkmInput("0")).toBe("0");
    expect(sanitizeKkmInput("")).toBe("");
    expect(sanitizeKkmInput("abc")).toBe("");
    expect(sanitizeKkmInput("7a5b")).toBe("75");
    expect(sanitizeKkmInput("100")).toBe("100");
    expect(sanitizeKkmInput("125")).toBe("100");
  });

  it("parseKkmNumber validates integer range 0..100 strictly", () => {
    expect(parseKkmNumber("75")).toBe(75);
    expect(parseKkmNumber("0")).toBe(0);
    expect(parseKkmNumber("100")).toBe(100);
    expect(parseKkmNumber("")).toBeNull();
    expect(parseKkmNumber("   ")).toBeNull();
    expect(parseKkmNumber("-5")).toBeNull();
    expect(parseKkmNumber("101")).toBeNull();
    expect(parseKkmNumber("75.5")).toBeNull();
    expect(parseKkmNumber(null)).toBeNull();
  });

  it("getKkmAverageColorInfo applies Opsi A 3-color tiers dynamically", () => {
    // KKM = 75 -> Merah (<75), Kuning (75..79.99), Hijau (>=80)
    expect(getKkmAverageColorInfo(null, 75).tier).toBe("empty");
    expect(getKkmAverageColorInfo(74.99, 75).tier).toBe("below");
    expect(getKkmAverageColorInfo(74.99, 75).textClass).toContain("rose");
    expect(getKkmAverageColorInfo(75, 75).tier).toBe("borderline");
    expect(getKkmAverageColorInfo(75, 75).textClass).toContain("amber");
    expect(getKkmAverageColorInfo(79.99, 75).tier).toBe("borderline");
    expect(getKkmAverageColorInfo(80, 75).tier).toBe("above");
    expect(getKkmAverageColorInfo(80, 75).textClass).toContain("emerald");

    // KKM Dinamis = 80 -> Merah (<80), Kuning (80..84.99), Hijau (>=85)
    expect(getKkmAverageColorInfo(79.5, 80).tier).toBe("below");
    expect(getKkmAverageColorInfo(80, 80).tier).toBe("borderline");
    expect(getKkmAverageColorInfo(84.99, 80).tier).toBe("borderline");
    expect(getKkmAverageColorInfo(85, 80).tier).toBe("above");
  });

  it("deduplicateSubjectsForKkm merges duplicate subject variants into 1 unique mapel row", () => {
    const subjects = [
      { id: "1", namaMapel: "Matematika", guruPengampu: "Budi", kelasDiampu: "X RPL 1, X RPL 2" },
      { id: "2", namaMapel: "matematika ", guruPengampu: "Siti", kelasDiampu: "XI RPL 1, X RPL 2" },
      { id: "3", namaMapel: "Fisika", guruPengampu: "Andi", kelasDiampu: "X RPL 1" },
    ];
    const curriculum = [
      { id: "c0", mapel: DEFAULT_KKM_KEY, kkm: 78 },
      { id: "c1", mapel: "Matematika", kkm: 82, capaianKompetensi: "Menguasai aljabar" },
    ];

    const rows = deduplicateSubjectsForKkm(subjects, curriculum, 78);
    expect(rows).toHaveLength(2);

    const fisika = rows.find((r) => r.namaMapel === "Fisika");
    expect(fisika?.kkm).toBe(78);
    expect(fisika?.isCustomKkm).toBe(false);
    expect(fisika?.jumlahAlokasi).toBe(1);

    const mtk = rows.find((r) => r.namaMapel === "Matematika");
    expect(mtk?.kkm).toBe(82);
    expect(mtk?.isCustomKkm).toBe(true);
    expect(mtk?.jumlahAlokasi).toBe(2);
    expect(mtk?.guruList).toEqual(["Budi", "Siti"]);
    expect(mtk?.kelasList).toEqual(["X RPL 1", "X RPL 2", "XI RPL 1"]);
    expect(mtk?.capaianKompetensi).toBe("Menguasai aljabar");
  });
});
