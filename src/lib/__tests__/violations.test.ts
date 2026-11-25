import { describe, it, expect } from "vitest";
import {
  toRomanNumeral,
  evaluateSanctionTier,
  generateWarningLetterNumber,
  SANCTION_THRESHOLDS,
  sanitizePoinInput,
  sanitizeThresholdInput,
  validateSanctionThresholds,
  calculateActiveViolationPoints,
  getSpTingkatLabel,
} from "../violations";

describe("violations helper functions", () => {
  describe("toRomanNumeral", () => {
    it("converts numbers to roman numerals correctly", () => {
      expect(toRomanNumeral(1)).toBe("I");
      expect(toRomanNumeral(2)).toBe("II");
      expect(toRomanNumeral(3)).toBe("III");
      expect(toRomanNumeral(4)).toBe("IV");
      expect(toRomanNumeral(5)).toBe("V");
      expect(toRomanNumeral(9)).toBe("IX");
      expect(toRomanNumeral(10)).toBe("X");
      expect(toRomanNumeral(11)).toBe("XI");
      expect(toRomanNumeral(12)).toBe("XII");
    });
  });

  describe("evaluateSanctionTier", () => {
    it("classifies 0 points as Disiplin Baik (aman)", () => {
      const tier = evaluateSanctionTier(0);
      expect(tier.level).toBe("aman");
      expect(tier.status).toBe("Disiplin Baik");
      expect(tier.recommendedSp).toBeNull();
      expect(tier.nextThreshold).toBe(SANCTION_THRESHOLDS.PEMBINAAN_LISAN);
    });

    it("classifies 15 points as Catatan Ringan", () => {
      const tier = evaluateSanctionTier(15);
      expect(tier.level).toBe("ringan");
      expect(tier.status).toBe("Catatan Ringan");
      expect(tier.recommendedSp).toBeNull();
      expect(tier.nextThreshold).toBe(SANCTION_THRESHOLDS.PEMBINAAN_LISAN);
    });

    it("classifies 35 points as Peringatan Lisan", () => {
      const tier = evaluateSanctionTier(35);
      expect(tier.level).toBe("pembinaan");
      expect(tier.status).toBe("Peringatan Lisan");
      expect(tier.recommendedSp).toBeNull();
      expect(tier.nextThreshold).toBe(SANCTION_THRESHOLDS.SP_1);
    });

    it("classifies 55 points as Surat Peringatan I (SP 1)", () => {
      const tier = evaluateSanctionTier(55);
      expect(tier.level).toBe("sp1");
      expect(tier.status).toBe("Surat Peringatan I");
      expect(tier.recommendedSp).toBe(1);
      expect(tier.nextThreshold).toBe(SANCTION_THRESHOLDS.SP_2);
    });

    it("classifies 80 points as Surat Peringatan II (SP 2)", () => {
      const tier = evaluateSanctionTier(80);
      expect(tier.level).toBe("sp2");
      expect(tier.status).toBe("Surat Peringatan II");
      expect(tier.recommendedSp).toBe(2);
      expect(tier.nextThreshold).toBe(SANCTION_THRESHOLDS.SP_3);
    });

    it("classifies >= 100 points as Surat Peringatan III (SP 3)", () => {
      const tier = evaluateSanctionTier(100);
      expect(tier.level).toBe("sp3");
      expect(tier.status).toBe("Surat Peringatan III (Terakhir)");
      expect(tier.recommendedSp).toBe(3);
      expect(tier.nextThreshold).toBeNull();

      const tier120 = evaluateSanctionTier(120);
      expect(tier120.level).toBe("sp3");
      expect(tier120.recommendedSp).toBe(3);
    });
  });

  describe("generateWarningLetterNumber", () => {
    it("generates correct official warning letter format for SP 1", () => {
      const d = new Date(2026, 10, 15); // Month index 10 is November (11)
      const num = generateWarningLetterNumber(1, 1, d);
      expect(num).toBe("001/SP-I/SMK-DIRGANTARA/XI/2026");
    });

    it("generates correct official warning letter format for SP 2 with higher sequence", () => {
      const d = new Date(2026, 4, 10); // Month index 4 is May (5)
      const num = generateWarningLetterNumber(2, 42, d);
      expect(num).toBe("042/SP-II/SMK-DIRGANTARA/V/2026");
    });

    it("generates correct official warning letter format for SP 3", () => {
      const d = new Date(2026, 0, 5); // Month index 0 is January (1)
      const num = generateWarningLetterNumber(3, 9, d);
      expect(num).toBe("009/SP-III/SMK-DIRGANTARA/I/2026");
    });
  });

  describe("sanitizePoinInput & getSpTingkatLabel", () => {
    it("strips leading zeros and non-digits, and caps values at 100", () => {
      expect(sanitizePoinInput("015")).toBe("15");
      expect(sanitizePoinInput("00")).toBe("0");
      expect(sanitizePoinInput("")).toBe("");
      expect(sanitizePoinInput("2a5")).toBe("25");
      expect(sanitizePoinInput("150")).toBe("100");
    });

    it("returns clear Indonesian labels for SP levels", () => {
      expect(getSpTingkatLabel(1)).toBe("Surat Peringatan I (SP 1)");
      expect(getSpTingkatLabel("2")).toBe("Surat Peringatan II (SP 2)");
      expect(getSpTingkatLabel(3)).toBe("Surat Peringatan III (SP 3 atau Terakhir)");
    });
  });

  describe("calculateActiveViolationPoints & dynamic sanction thresholds", () => {
    it("excludes Selesai Dibina violations from active point totals", () => {
      const list = [
        { poin: 40, status: "Tercatat" },
        { poin: 75, status: "Selesai Dibina" },
        { poin: 15, status: "Diproses BK" },
      ];
      expect(calculateActiveViolationPoints(list)).toBe(55);
    });

    it("evaluates tiers accurately using custom admin thresholds", () => {
      const custom = { PEMBINAAN_LISAN: 50, SP_1: 100, SP_2: 150, SP_3: 200 };
      expect(evaluateSanctionTier(40, custom).level).toBe("ringan");
      expect(evaluateSanctionTier(60, custom).level).toBe("pembinaan");
      expect(evaluateSanctionTier(120, custom).level).toBe("sp1");
      expect(evaluateSanctionTier(185, custom).level).toBe("sp2");
      expect(evaluateSanctionTier(200, custom).level).toBe("sp3");
    });

    it("validates strictly increasing thresholds and sanitizes leading zeros", () => {
      expect(sanitizeThresholdInput("050")).toBe("50");
      expect(sanitizeThresholdInput("1500")).toBe("1000");

      const ok = validateSanctionThresholds({
        PEMBINAAN_LISAN: 40,
        SP_1: 80,
        SP_2: 120,
        SP_3: 200,
      });
      expect(ok.valid).toBe(true);

      const badOrder = validateSanctionThresholds({
        PEMBINAAN_LISAN: 60,
        SP_1: 50,
        SP_2: 75,
        SP_3: 100,
      });
      expect(badOrder.valid).toBe(false);
    });
  });
});

