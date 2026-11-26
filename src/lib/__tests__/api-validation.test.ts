import { describe, it, expect } from "vitest";
import {
  parseJsonBody,
  attendancePostSchema,
  auditLogPostSchema,
  loginSecurityPostSchema,
  authAccountCreateSchema,
  authAccountResetPasswordSchema,
  authAccountStatusSchema,
  userProfilePatchSchema,
  classCreateSchema,
  studentCreateSchema,
  studentBulkSchema,
  teacherCreateSchema,
  academicYearCreateSchema,
  spkCriteriaPutSchema,
  spkScoresPostSchema,
  eraporNotePostSchema,
  eraporPublishClassSchema,
  counselingSessionCreateSchema,
  dispensationPatchSchema,
  monitoringCreateSchema,
  violationCreateSchema,
  violationPatchSchema,
  violationTypePostSchema,
  violationThresholdsPostSchema,
  warningLetterPostSchema,
} from "../api-validation";

function makeJsonRequest(rawBody: string): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: rawBody,
  });
}

describe("API Zod Validation Helper & Schemas", () => {
  describe("parseJsonBody()", () => {
    it("mengembalikan HTTP 400 bila body JSON rusak/tidak valid", async () => {
      const req = makeJsonRequest("{ invalid json");
      const result = await parseJsonBody(req, classCreateSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const payload = await result.response.json();
        expect(payload.error).toContain("JSON");
      }
    });

    it("mengembalikan HTTP 400 dengan rincian error bila skema tidak terpenuhi", async () => {
      const req = makeJsonRequest(JSON.stringify({ namaKelas: "", tingkat: "" }));
      const result = await parseJsonBody(req, classCreateSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(400);
        const payload = await result.response.json();
        expect(payload.error).toBeDefined();
        expect(Array.isArray(payload.details)).toBe(true);
        expect(payload.details.length).toBeGreaterThan(0);
      }
    });

    it("mengembalikan data yang sudah di-trim saat payload valid", async () => {
      const req = makeJsonRequest(
        JSON.stringify({ namaKelas: "  X RPL 1  ", tingkat: " X ", waliKelas: "  " })
      );
      const result = await parseJsonBody(req, classCreateSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namaKelas).toBe("X RPL 1");
        expect(result.data.tingkat).toBe("X");
        expect(result.data.waliKelas).toBeUndefined();
      }
    });
  });

  describe("Attendance & Presensi", () => {
    it("menerima payload presensi valid", () => {
      const parsed = attendancePostSchema.safeParse({
        tanggal: "2026-11-25",
        mapel: "Matematika",
        records: [
          { studentId: "stu-1", status: "Hadir" },
          { studentId: "stu-2", status: "Izin" },
        ],
      });
      expect(parsed.success).toBe(true);
    });

    it("menolak format tanggal non-ISO, status tidak dikenal, atau array kosong", () => {
      expect(
        attendancePostSchema.safeParse({
          tanggal: "25/11/2026",
          records: [{ studentId: "stu-1", status: "Hadir" }],
        }).success
      ).toBe(false);

      expect(
        attendancePostSchema.safeParse({
          tanggal: "2026-11-25",
          records: [{ studentId: "stu-1", status: "Bolos" }],
        }).success
      ).toBe(false);

      expect(
        attendancePostSchema.safeParse({
          tanggal: "2026-11-25",
          records: [],
        }).success
      ).toBe(false);
    });
  });

  describe("Auth, Akun & Keamanan Login", () => {
    it("menormalisasi appRole ke huruf besar dan memvalidasi panjang minimal", () => {
      const valid = authAccountCreateSchema.safeParse({
        name: "Budi Santoso",
        username: "guru01",
        password: "secret",
        appRole: "guru",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.appRole).toBe("GURU");
      }

      expect(
        authAccountCreateSchema.safeParse({
          name: "Budi",
          username: "abc",
          password: "secret",
          appRole: "GURU",
        }).success
      ).toBe(false);

      expect(
        authAccountCreateSchema.safeParse({
          name: "Budi",
          username: "guru01",
          password: "secret",
          appRole: "HACKER",
        }).success
      ).toBe(false);
    });

    it("mewajibkan boolean murni pada status penangguhan dan panjang minimal password reset", () => {
      expect(authAccountStatusSchema.safeParse({ banned: true }).success).toBe(true);
      expect(authAccountStatusSchema.safeParse({ banned: "true" }).success).toBe(false);

      expect(
        authAccountResetPasswordSchema.safeParse({ newPassword: "123" }).success
      ).toBe(false);
      expect(
        authAccountResetPasswordSchema.safeParse({ newPassword: "1234" }).success
      ).toBe(true);
    });

    it("memvalidasi aksi login-security dan pembaruan profil pengguna", () => {
      expect(
        loginSecurityPostSchema.safeParse({ action: "failed", identifier: "1001" }).success
      ).toBe(true);
      expect(
        loginSecurityPostSchema.safeParse({ action: "bypass", identifier: "1001" }).success
      ).toBe(false);

      expect(userProfilePatchSchema.safeParse({ image: null }).success).toBe(true);
      expect(userProfilePatchSchema.safeParse({ name: "   " }).success).toBe(false);
    });
  });

  describe("Master Data (Siswa, Guru, Tahun Ajaran)", () => {
    it("mengonversi angkatan numerik ke string dan menolak NIS terlalu pendek", () => {
      const res = studentCreateSchema.safeParse({
        nis: "2026001",
        namaLengkap: "Ani Wijaya",
        kelas: "X RPL 1",
        angkatan: 2026,
        jenisKelamin: "P",
      });
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.data.angkatan).toBe("2026");
      }

      expect(
        studentCreateSchema.safeParse({
          nis: "123",
          namaLengkap: "Ani",
          kelas: "X RPL 1",
          angkatan: "2026",
          jenisKelamin: "P",
        }).success
      ).toBe(false);
    });

    it("menolak impor siswa kosong dan menerima semester hanya Ganjil/Genap", () => {
      expect(studentBulkSchema.safeParse({ students: [] }).success).toBe(false);
      expect(
        teacherCreateSchema.safeParse({ nip: "12", namaLengkap: "Guru A" }).success
      ).toBe(false);

      expect(
        academicYearCreateSchema.safeParse({
          tahunAjaran: "2026/2027",
          semester: "Ganjil",
        }).success
      ).toBe(true);
      expect(
        academicYearCreateSchema.safeParse({
          tahunAjaran: "2026/2027",
          semester: "Triwulan",
        }).success
      ).toBe(false);
    });
  });

  describe("SPK, Nilai & E-Rapor", () => {
    it("memvalidasi rentang bobot SPK 0..100 dan menolak nilai di luar batas", () => {
      expect(
        spkCriteriaPutSchema.safeParse([
          { id: "c1", bobot: 60 },
          { id: "c2", bobot: 40 },
        ]).success
      ).toBe(true);

      expect(
        spkCriteriaPutSchema.safeParse([{ id: "c1", bobot: -5 }]).success
      ).toBe(false);
      expect(
        spkCriteriaPutSchema.safeParse([{ id: "c1", bobot: 120 }]).success
      ).toBe(false);
    });

    it("memvalidasi skor SPK, catatan E-Rapor, dan status publikasi kelas", () => {
      expect(
        spkScoresPostSchema.safeParse({
          kelas: "X RPL 1",
          criteriaId: "crit-1",
          records: [{ studentId: "stu-1", details: { Tugas: 85, UTS: 90 } }],
        }).success
      ).toBe(true);

      expect(
        eraporNotePostSchema.safeParse({
          studentId: "stu-1",
          statusRapor: "Disahkan",
        }).success
      ).toBe(true);

      expect(
        eraporPublishClassSchema.safeParse({
          kelas: "X RPL 1",
          targetStatus: "TidakValid",
        }).success
      ).toBe(false);
    });
  });

  describe("Konseling BK, Pelanggaran & Audit", () => {
    it("memvalidasi enum konseling, monitoring, dispensasi, dan audit log", () => {
      expect(
        counselingSessionCreateSchema.safeParse({
          studentId: "stu-1",
          tanggal: "2026-11-25",
          waktuMulai: "09:00",
          waktuSelesai: "09:45",
          kategori: "Akademik dan Belajar",
          jenisLayanan: "Konseling Perorangan",
          pokokMasalah: "Penurunan konsentrasi belajar",
        }).success
      ).toBe(true);

      expect(
        monitoringCreateSchema.safeParse({
          studentId: "stu-1",
          aspekPengamatan: "Aspek Sembarang",
          catatanPerkembangan: "Tes",
        }).success
      ).toBe(false);

      expect(
        dispensationPatchSchema.safeParse({
          id: "disp-1",
          statusDispensasi: "Selesai",
        }).success
      ).toBe(true);

      expect(
        auditLogPostSchema.safeParse({
          action: "CREATE",
          module: "E_RAPOR",
          description: "Menerbitkan rapor kelas X",
        }).success
      ).toBe(true);
    });

    it("memvalidasi batas poin pelanggaran dan tingkat SP 1..3", () => {
      expect(
        violationCreateSchema.safeParse({
          studentId: "stu-1",
          violationTypeId: "vt-1",
          poin: 15,
        }).success
      ).toBe(true);

      expect(
        violationCreateSchema.safeParse({
          studentId: "stu-1",
          violationTypeId: "vt-1",
          poin: -10,
        }).success
      ).toBe(false);

      expect(
        violationPatchSchema.safeParse({ status: "Selesai Dibina" }).success
      ).toBe(true);
      expect(
        violationPatchSchema.safeParse({ poin: 0 }).success
      ).toBe(false);
      expect(
        violationPatchSchema.safeParse({ poin: 101 }).success
      ).toBe(false);
      expect(
        violationPatchSchema.safeParse({ poin: 25 }).success
      ).toBe(true);

      expect(
        violationTypePostSchema.safeParse({
          kode: "TATIB-01",
          namaPelanggaran: "Terlambat masuk sekolah",
          kategori: "Ringan",
          poinDefault: 10,
        }).success
      ).toBe(true);
      expect(
        violationTypePostSchema.safeParse({
          kode: "TATIB-01",
          namaPelanggaran: "Terlambat masuk sekolah",
          kategori: "Ringan",
          poinDefault: 0,
        }).success
      ).toBe(false);

      expect(
        violationThresholdsPostSchema.safeParse({ resetToDefault: true })
          .success
      ).toBe(true);
      expect(
        violationThresholdsPostSchema.safeParse({
          PEMBINAAN_LISAN: 10,
          SP_1: 25,
          SP_2: 50,
          SP_3: 75,
        }).success
      ).toBe(true);
      expect(
        violationThresholdsPostSchema.safeParse({
          PEMBINAAN_LISAN: 0,
          SP_1: 25,
          SP_2: 50,
          SP_3: 75,
        }).success
      ).toBe(false);

      expect(
        warningLetterPostSchema.safeParse({ studentId: "stu-1", tingkatSp: 2 }).success
      ).toBe(true);
      expect(
        warningLetterPostSchema.safeParse({ studentId: "stu-1", tingkatSp: 4 }).success
      ).toBe(false);
      expect(
        warningLetterPostSchema.safeParse({ studentId: "stu-1", tingkatSp: 0 }).success
      ).toBe(false);
    });
  });
});
