import { describe, it, expect } from "vitest";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  MODULE_LABELS,
  ACTION_LABELS,
  ROLE_LABELS,
  formatRoleLabel,
  formatAuditTimestamp,
  getInitials,
  getActionBadgeStyle,
  getModuleBadgeStyle,
} from "../audit";

describe("Riwayat Aktivitas & Audit Trail Helpers (Fitur 15)", () => {
  describe("Pencegahan Simbol Garis Miring ('/') di Tampilan Web", () => {
    it("memastikan tidak ada karakter slash ('/') di label modul sistem", () => {
      Object.values(MODULE_LABELS).forEach((label) => {
        expect(label).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di label jenis aksi", () => {
      Object.values(ACTION_LABELS).forEach((label) => {
        expect(label).not.toContain("/");
      });
    });

    it("memastikan tidak ada karakter slash ('/') di label peran pengguna", () => {
      Object.values(ROLE_LABELS).forEach((label) => {
        expect(label).not.toContain("/");
      });
    });
  });

  describe("Peristilahan Baku Siswa dan Siswi", () => {
    it("memastikan tidak ada kata 'taruna' atau 'taruni' dalam label", () => {
      const allLabels = [
        ...Object.values(MODULE_LABELS),
        ...Object.values(ACTION_LABELS),
        ...Object.values(ROLE_LABELS),
      ];

      allLabels.forEach((label) => {
        expect(label.toLowerCase()).not.toContain("taruna");
        expect(label.toLowerCase()).not.toContain("taruni");
      });
    });

    it("memastikan label siswa menggunakan kata 'Siswa'", () => {
      expect(ROLE_LABELS.siswa).toBe("Siswa");
    });
  });

  describe("formatAuditTimestamp", () => {
    it("memformat ISO timestamp ke bahasa Indonesia lengkap dengan WIB tanpa garis miring", () => {
      const formatted = formatAuditTimestamp("2026-11-17T20:30:00.000Z");
      expect(formatted).toContain("November 2026");
      expect(formatted).toContain("WIB");
      expect(formatted).not.toContain("/");
    });

    it("menangani string kosong dengan aman", () => {
      expect(formatAuditTimestamp("")).toBe("-");
    });
  });

  describe("getInitials", () => {
    it("mengambil inisial dua huruf untuk nama dua kata atau lebih", () => {
      expect(getInitials("Budi Santoso")).toBe("BS");
      expect(getInitials("Dimas Arya Pratama")).toBe("DP");
      expect(getInitials("Super Admin")).toBe("SA");
    });

    it("mengambil dua huruf pertama untuk nama satu kata", () => {
      expect(getInitials("Administrator")).toBe("AD");
      expect(getInitials("Guru")).toBe("GU");
    });

    it("menangani nama kosong dengan aman", () => {
      expect(getInitials("")).toBe("??");
    });
  });

  describe("Styling Badge Modul & Aksi", () => {
    it("menghasilkan style warna yang valid untuk seluruh jenis aksi", () => {
      AUDIT_ACTIONS.forEach((action) => {
        const style = getActionBadgeStyle(action);
        expect(style.bg).toBeDefined();
        expect(style.text).toBeDefined();
        expect(style.border).toBeDefined();
        expect(style.bg.length).toBeGreaterThan(0);
      });
    });

    it("menghasilkan style warna yang valid untuk seluruh modul sistem", () => {
      AUDIT_MODULES.forEach((module) => {
        const style = getModuleBadgeStyle(module);
        expect(style.bg).toBeDefined();
        expect(style.text).toBeDefined();
        expect(style.border).toBeDefined();
        expect(style.bg.length).toBeGreaterThan(0);
      });
    });
  });

  describe("formatRoleLabel", () => {
    it("memetakan peran huruf kecil dan huruf besar ke label resmi", () => {
      expect(formatRoleLabel("superadmin")).toBe("Super Administrator");
      expect(formatRoleLabel("SUPERADMIN")).toBe("Super Administrator");
      expect(formatRoleLabel("admin")).toBe("Administrator");
      expect(formatRoleLabel("ADMIN")).toBe("Administrator");
      expect(formatRoleLabel("kepala_sekolah")).toBe("Kepala Sekolah");
      expect(formatRoleLabel("KEPALA_SEKOLAH")).toBe("Kepala Sekolah");
      expect(formatRoleLabel("guru")).toBe("Guru Mapel");
      expect(formatRoleLabel("siswa")).toBe("Siswa");
    });

    it("menangani nilai kosong atau null dengan fallback aman", () => {
      expect(formatRoleLabel(null)).toBe("Pengguna");
      expect(formatRoleLabel(undefined)).toBe("Pengguna");
      expect(formatRoleLabel("")).toBe("Pengguna");
    });
  });
});
