import { describe, it, expect } from "vitest";
import {
  AUDIT_ACTIONS,
  AUDIT_MODULES,
  AUDIT_KPI_CARD_INFO,
  MODULE_LABELS,
  ACTION_LABELS,
  ROLE_LABELS,
  formatRoleLabel,
  formatAuditTimestamp,
  getInitials,
  getActionBadgeStyle,
  getModuleBadgeStyle,
  buildActivityLogExportData,
  type ActivityLogItem,
} from "../audit";

describe("Riwayat Aktivitas Sistem Helpers (Fitur 15)", () => {
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

  describe("AUDIT_KPI_CARD_INFO (Popup Cakupan Kartu KPI)", () => {
    it("menyediakan informasi cakupan lengkap untuk seluruh 4 kartu KPI tanpa simbol terlarang dan jargon teknis", () => {
      const keys = Object.keys(AUDIT_KPI_CARD_INFO);
      expect(keys).toEqual([
        "hari_ini",
        "akademik_nilai",
        "kesiswaan_disiplin",
        "keamanan_akses",
      ]);

      Object.values(AUDIT_KPI_CARD_INFO).forEach((card) => {
        expect(card.halamanTercakup.length).toBeGreaterThan(0);
        const texts = [
          card.judul,
          card.ringkasan,
          card.catatan || "",
          ...card.halamanTercakup.flatMap((h) => [
            h.halaman,
            h.lokasiMenu,
            h.aktivitas,
          ]),
        ];

        texts.forEach((t) => {
          expect(t).not.toContain("/");
          expect(t).not.toContain("\u2022");
          expect(t).not.toContain("\u2014");
          expect(t.toLowerCase()).not.toContain("taruna");
          expect(t.toLowerCase()).not.toContain("taruni");
          expect(t.toLowerCase()).not.toContain("audit trail");
          expect(t.toLowerCase()).not.toContain("log usang");
        });
      });
    });
  });

  describe("buildActivityLogExportData (Ekspor Excel Multi-Sheet)", () => {
    const sampleLogs: ActivityLogItem[] = [
      {
        id: "1",
        userId: "u1",
        userName: "Budi Santoso, S.Pd.",
        userRole: "guru",
        action: "UPDATE",
        module: "AKADEMIK_NILAI",
        targetName: "Kelas X-A",
        description: "Memperbarui nilai UTS Matematika siswa",
        ipAddress: "192.168.1.25",
        createdAt: "2026-11-17T08:30:00.000Z",
      },
    ];

    it("menghasilkan sheet utama dengan kop judul dan 8 kolom terpisah saat includeIpAddress=false", () => {
      const result = buildActivityLogExportData(sampleLogs, {
        filterSummary: "Semua Modul dan Peran",
        includeIpAddress: false,
        exportedAt: "17 November 2026, 20:00:00 WIB",
      });

      expect(result.mainSheetRows[0][0]).toContain("LAPORAN RIWAYAT AKTIVITAS");
      expect(result.mainSheetRows[4]).toEqual([
        "No",
        "Waktu Pencatatan",
        "Nama Pengguna",
        "Peran",
        "Modul",
        "Jenis Aksi",
        "Data Terkait",
        "Uraian Aktivitas",
      ]);
      expect(result.mainLastColIndex).toBe(7);
      expect(result.mainSheetRows[5][0]).toBe(1);
      expect(result.mainSheetRows[5][2]).toBe("Budi Santoso, S.Pd.");
      expect(result.mainSheetRows[5][3]).toBe("Guru Mapel");
      expect(result.mainSheetRows[5]).toHaveLength(8);
      expect(result.mainColWidths).toHaveLength(8);
    });

    it("menyertakan kolom Alamat IP pada cadangan penuh dan menyusun sheet ringkasan statistik", () => {
      const result = buildActivityLogExportData(sampleLogs, {
        filterSummary: "Seluruh Riwayat Sistem",
        includeIpAddress: true,
        summary: {
          totalHariIni: 5,
          akademikNilaiCount: 12,
          kesiswaanDisiplinCount: 4,
          keamananAkunCount: 9,
        },
        exportedAt: "17 November 2026, 20:00:00 WIB",
      });

      expect(result.mainLastColIndex).toBe(8);
      expect(result.mainSheetRows[4][8]).toBe("Alamat IP");
      expect(result.mainSheetRows[5][8]).toBe("192.168.1.25");
      expect(result.summarySheetRows.some((r) => r[0] === "Akademik dan Nilai" && r[1] === 12)).toBe(true);
      expect(result.summarySheetRows.some((r) => r[0] === "Akademik dan Nilai" && r[1] === 1)).toBe(true);
    });
  });
});
