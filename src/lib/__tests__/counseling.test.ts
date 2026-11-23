import { describe, it, expect } from "vitest";
import {
  COUNSELING_CATEGORIES,
  COUNSELING_SERVICES,
  CONFIDENTIALITY_LEVELS,
  CASE_STATUSES,
  MONITORING_ASPECTS,
  DISPENSATION_REASONS,
  DISPENSATION_STATUSES,
  formatTanggalIndonesia,
  generateDispensationDocNumber,
  formatRentangWaktu,
  getStatusKasusBadge,
  getKerahasiaanBadge,
  getDispensasiStatusBadge,
  resolveFilterSelectLabel,
  getKerahasiaanOptionLabel,
  getLocalIsoDate,
} from "../counseling";

describe("Counseling BK & Kesiswaan Helpers (Fitur 12)", () => {
  describe("Pencegahan Simbol Garis Miring ('/') di Tampilan Web", () => {
    it("memastikan tidak ada karakter slash ('/') di kategori konseling", () => {
      COUNSELING_CATEGORIES.forEach((cat) => {
        expect(cat).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di bentuk layanan bimbingan", () => {
      COUNSELING_SERVICES.forEach((srv) => {
        expect(srv).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di tingkat kerahasiaan", () => {
      CONFIDENTIALITY_LEVELS.forEach((lvl) => {
        expect(lvl).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di status kasus", () => {
      CASE_STATUSES.forEach((st) => {
        expect(st).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di aspek pemantauan karakter", () => {
      MONITORING_ASPECTS.forEach((asp) => {
        expect(asp).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di keperluan dispensasi", () => {
      DISPENSATION_REASONS.forEach((reason) => {
        expect(reason).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di status dispensasi", () => {
      DISPENSATION_STATUSES.forEach((st) => {
        expect(st).not.toContain("/");
      });
    });
  });

  describe("formatTanggalIndonesia", () => {
    it("memformat tanggal YYYY-MM-DD ke bahasa Indonesia tanpa karakter slash", () => {
      const formatted = formatTanggalIndonesia("2026-11-17");
      expect(formatted).toBe("17 November 2026");
      expect(formatted).not.toContain("/");
    });

    it("menangani string tanggal kosong dengan aman", () => {
      expect(formatTanggalIndonesia("")).toBe("-");
    });
  });

  describe("generateDispensationDocNumber", () => {
    it("menghasilkan nomor surat berformat dinas dengan tanda hubung strip tanpa garis miring", () => {
      const fixedDate = new Date(2026, 10, 17); // Bulan 11 (November = XI)
      const docNo = generateDispensationDocNumber(1, fixedDate);
      expect(docNo).toBe("001-DSP-SMK-DIRGANTARA-XI-2026");
      expect(docNo).not.toContain("/");
    });

    it("menambahkan leading zeros pada urutan nomor", () => {
      const fixedDate = new Date(2026, 0, 5); // Bulan 1 (Januari = I)
      const docNo = generateDispensationDocNumber(42, fixedDate);
      expect(docNo).toBe("042-DSP-SMK-DIRGANTARA-I-2026");
      expect(docNo).not.toContain("/");
    });
  });

  describe("formatRentangWaktu", () => {
    it("memformat jam mulai dan jam selesai dengan kata hubung 'sampai' tanpa garis miring", () => {
      const timeStr = formatRentangWaktu("09:00", "10:30");
      expect(timeStr).toBe("Pukul 09:00 sampai 10:30 WIB");
      expect(timeStr).not.toContain("/");
    });

    it("menangani jika jam selesai sama dengan jam mulai", () => {
      const timeStr = formatRentangWaktu("08:00", "08:00");
      expect(timeStr).toBe("Pukul 08:00 WIB");
      expect(timeStr).not.toContain("/");
    });
  });

  describe("Badge Helper Functions", () => {
    it("menghasilkan badge status kasus yang sesuai", () => {
      const badgePantau = getStatusKasusBadge("Dalam Pemantauan");
      expect(badgePantau.label).toBe("Dalam Pemantauan");
      expect(badgePantau.badgeClass).toContain("amber");

      const badgeSelesai = getStatusKasusBadge("Selesai");
      expect(badgeSelesai.label).toBe("Selesai");
      expect(badgeSelesai.badgeClass).toContain("emerald");

      const badgeRujukan = getStatusKasusBadge("Rujukan Kasus");
      expect(badgeRujukan.label).toBe("Rujukan Kasus");
      expect(badgeRujukan.badgeClass).toContain("purple");
    });

    it("menghasilkan badge kerahasiaan yang sesuai", () => {
      const umum = getKerahasiaanBadge("Umum");
      expect(umum.label).toBe("Umum");
      expect(umum.badgeClass).toContain("blue");

      const rahasia = getKerahasiaanBadge("Rahasia");
      expect(rahasia.label).toBe("Rahasia");
      expect(rahasia.badgeClass).toContain("rose");
    });

    it("menghasilkan badge status dispensasi yang sesuai", () => {
      const aktif = getDispensasiStatusBadge("Aktif");
      expect(aktif.label).toBe("Aktif");

      const selesai = getDispensasiStatusBadge("Selesai");
      expect(selesai.label).toBe("Selesai");

      const dibatalkan = getDispensasiStatusBadge("Dibatalkan");
      expect(dibatalkan.label).toBe("Dibatalkan");
    });
  });

  describe("Dropdown SelectValue Label Helpers (Base UI)", () => {
    it("mengonversi nilai filter 'all' atau kosong menjadi label ramah pengguna", () => {
      expect(resolveFilterSelectLabel("all", "Semua Kategori")).toBe("Semua Kategori");
      expect(resolveFilterSelectLabel("", "Semua Kelas")).toBe("Semua Kelas");
      expect(resolveFilterSelectLabel(undefined, "Semua Status")).toBe("Semua Status");
      expect(resolveFilterSelectLabel("XI-A", "Semua Kelas")).toBe("XI-A");
    });

    it("mengembalikan label kerahasiaan lengkap bebas karakter slash", () => {
      const umum = getKerahasiaanOptionLabel("Umum");
      const rahasia = getKerahasiaanOptionLabel("Rahasia");
      expect(umum).toContain("Umum");
      expect(rahasia).toContain("Rahasia");
      expect(umum).not.toContain("/");
      expect(rahasia).not.toContain("/");
    });

    it("memformat tanggal lokal YYYY-MM-DD tanpa pergeseran UTC", () => {
      const fixed = new Date(2026, 10, 5, 1, 30, 0); // 5 Nov 2026 01:30 lokal
      expect(getLocalIsoDate(fixed)).toBe("2026-11-05");
    });
  });
});
