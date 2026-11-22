import { describe, it, expect } from "vitest";
import {
  APP_ROLES,
  ROLE_CONFIGS,
  STAFF_CREATABLE_ROLES,
  TEACHER_CATEGORY_ROLES,
  isTeacherCategoryRole,
  parseRoleMetadata,
  sanitizeAdditionalTeacherRoles,
} from "../rbac";

describe("Manajemen Akun & Multi-Role RBAC Helpers", () => {
  it("mengecualikan peran SISWA dari daftar pembuatan akun staf dan guru", () => {
    expect(STAFF_CREATABLE_ROLES).not.toContain("SISWA");
    expect(STAFF_CREATABLE_ROLES).toContain("SUPERADMIN");
    expect(STAFF_CREATABLE_ROLES).toContain("ADMIN");
    expect(STAFF_CREATABLE_ROLES).toContain("KEPALA_SEKOLAH");
    expect(STAFF_CREATABLE_ROLES).toContain("GURU");
    expect(STAFF_CREATABLE_ROLES).toContain("GURU_BK");
    expect(STAFF_CREATABLE_ROLES).toContain("STAF_PERPUS");
    expect(STAFF_CREATABLE_ROLES).toContain("STAF_SARPRAS");
    expect(STAFF_CREATABLE_ROLES.length).toBe(APP_ROLES.length - 1);
  });

  it("mengenali seluruh peran utama kategori guru yang dapat merangkap peran tambahan", () => {
    for (const role of TEACHER_CATEGORY_ROLES) {
      expect(isTeacherCategoryRole(role)).toBe(true);
    }
    expect(isTeacherCategoryRole("guru_bk")).toBe(true);
    expect(isTeacherCategoryRole("SUPERADMIN")).toBe(false);
    expect(isTeacherCategoryRole("KEPALA_SEKOLAH")).toBe(false);
    expect(isTeacherCategoryRole("SISWA")).toBe(false);
    expect(isTeacherCategoryRole(null)).toBe(false);
  });

  it("memvalidasi dan memformat peran tambahan guru beserta metadata kelas dan ekskul", () => {
    const result = sanitizeAdditionalTeacherRoles("GURU", [
      { role: "wali_kelas", kelas: "X-A" },
      { role: "GURU_BK" },
      { role: "PEMBINA_EKSKUL", ekskul: "Pramuka" },
      { role: "WALI_KELAS", kelas: "X-B" }, // duplikat harus diabaikan
      { role: "SUPERADMIN" }, // peran non-guru tambahan harus ditolak
    ]);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      role: "WALI_KELAS",
      metadata: JSON.stringify({ kelas: "X-A" }),
      kelas: "X-A",
    });
    expect(result[1]).toEqual({
      role: "GURU_BK",
      metadata: null,
    });
    expect(result[2]).toEqual({
      role: "PEMBINA_EKSKUL",
      metadata: JSON.stringify({ ekskul: "Pramuka" }),
    });
  });

  it("mengizinkan Guru BK murni merangkap peran tambahan guru lainnya tanpa menduplikasi peran utamanya", () => {
    const result = sanitizeAdditionalTeacherRoles("GURU_BK", [
      { role: "GURU_BK" }, // sama dengan peran utama -> di-skip
      { role: "PEMBINA_EKSKUL", ekskul: "PMR" },
      { role: "GURU_PIKET" },
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.role)).toEqual(["PEMBINA_EKSKUL", "GURU_PIKET"]);
  });

  it("menolak seluruh peran tambahan guru jika peran utama bukan kategori guru", () => {
    expect(
      sanitizeAdditionalTeacherRoles("KEPALA_SEKOLAH", [
        { role: "WALI_KELAS", kelas: "X-A" },
      ])
    ).toEqual([]);
    expect(
      sanitizeAdditionalTeacherRoles("SISWA", [{ role: "GURU_BK" }])
    ).toEqual([]);
  });

  it("mem-parsing metadata JSON peran tambahan secara aman", () => {
    expect(parseRoleMetadata('{"kelas":"XI-A"}')).toEqual({ kelas: "XI-A" });
    expect(parseRoleMetadata("invalid-json")).toEqual({});
    expect(parseRoleMetadata(null)).toEqual({});
  });

  it("memastikan label dan deskripsi ROLE_CONFIGS tidak mengandung karakter garis miring", () => {
    Object.values(ROLE_CONFIGS).forEach((cfg) => {
      expect(cfg.label).not.toContain("/");
      expect(cfg.description).not.toContain("/");
    });
  });

  it("menangani metadata kosong saat memilih WALI_KELAS atau PEMBINA_EKSKUL tanpa kelas atau ekskul", () => {
    const result = sanitizeAdditionalTeacherRoles("GURU", [
      { role: "WALI_KELAS", kelas: "   " },
      { role: "PEMBINA_EKSKUL", ekskul: "" },
    ]);
    expect(result).toEqual([
      { role: "WALI_KELAS", metadata: null },
      { role: "PEMBINA_EKSKUL", metadata: null },
    ]);
  });
});
