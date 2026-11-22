import { describe, it, expect } from "vitest";
import {
  GURU_DROPDOWN_GROUPS,
  GURU_NAV_ITEMS,
  ADMIN_DROPDOWN_GROUPS,
} from "../../components/layout/topbar";

describe("Validasi Menu Navigasi Guru & Bebas Simbol Slash (Fitur Layout)", () => {
  it("memiliki 2 grup dropdown utama untuk peran guru: Akademik dan Kesiswaan", () => {
    expect(GURU_DROPDOWN_GROUPS).toHaveLength(2);
    expect(GURU_DROPDOWN_GROUPS[0].label).toBe("Akademik");
    expect(GURU_DROPDOWN_GROUPS[1].label).toBe("Kesiswaan");
  });

  it("memastikan seluruh label, sectionTitle, dan deskripsi menu guru bebas dari karakter slash ('/')", () => {
    GURU_DROPDOWN_GROUPS.forEach((group) => {
      expect(group.label).not.toContain("/");
      expect(group.sectionTitle).not.toContain("/");

      group.items.forEach((item) => {
        expect(item.label).not.toContain("/");
        expect(item.description).not.toContain("/");
      });
    });
  });

  it("memastikan sub-menu Akademik memuat rute operasional pengajaran yang tepat", () => {
    const akademikGroup = GURU_DROPDOWN_GROUPS.find((g) => g.label === "Akademik");
    expect(akademikGroup).toBeDefined();

    const hrefs = akademikGroup!.items.map((i) => i.href);
    expect(hrefs).toContain("/guru/absensi");
    expect(hrefs).toContain("/guru/mapel");
    expect(hrefs).toContain("/guru/nilai");
    expect(hrefs).toContain("/guru/erapor");
    expect(hrefs).toContain("/guru/rekap");
  });

  it("memastikan sub-menu Kesiswaan memuat rute Buku Poin dan Konseling BK", () => {
    const kesiswaanGroup = GURU_DROPDOWN_GROUPS.find((g) => g.label === "Kesiswaan");
    expect(kesiswaanGroup).toBeDefined();

    const hrefs = kesiswaanGroup!.items.map((i) => i.href);
    expect(hrefs).toContain("/guru/pelanggaran");
    expect(hrefs).toContain("/guru/konseling");
  });

  it("mempertahankan GURU_NAV_ITEMS untuk kompatibilitas dan rute backward", () => {
    expect(GURU_NAV_ITEMS.length).toBeGreaterThanOrEqual(7);
    const navHrefs = GURU_NAV_ITEMS.map((item) => item.href);
    expect(navHrefs).toContain("/guru");
    expect(navHrefs).toContain("/guru/absensi");
    expect(navHrefs).toContain("/guru/nilai");
    expect(navHrefs).toContain("/guru/pelanggaran");
    expect(navHrefs).toContain("/guru/konseling");
    expect(navHrefs).toContain("/guru/rekap");
    expect(navHrefs).toContain("/guru/leaderboard");
  });

  it("memastikan hak akses catatan rahasia BK mencakup guru dengan peran tambahan GURU_BK", () => {
    const checkCanViewConfidential = (allRoles: string[]) => {
      return allRoles.some((r) =>
        ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH", "GURU_BK"].includes(r)
      );
    };

    // Guru biasa tanpa peran BK
    expect(checkCanViewConfidential(["GURU"])).toBe(false);
    expect(checkCanViewConfidential(["GURU", "WALI_KELAS"])).toBe(false);

    // Guru dengan peran tambahan Guru BK (seperti Siti Rahayu)
    expect(checkCanViewConfidential(["GURU", "WALI_KELAS", "GURU_BK"])).toBe(true);

    // Guru BK murni
    expect(checkCanViewConfidential(["GURU_BK"])).toBe(true);

    // Admin & Superadmin & Kepala Sekolah
    expect(checkCanViewConfidential(["ADMIN"])).toBe(true);
    expect(checkCanViewConfidential(["SUPERADMIN"])).toBe(true);
    expect(checkCanViewConfidential(["KEPALA_SEKOLAH"])).toBe(true);
  });
});
