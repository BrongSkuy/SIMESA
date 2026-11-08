import { db } from "@/db";
import { classes, subjects, teachers, type Teacher } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type TeacherSubjectAuthResult =
  | { ok: true; teacher: Teacher }
  | { ok: false; status: number; error: string };

export type TeacherClassAuthResult =
  | {
      ok: true;
      teacher: Teacher;
      isWaliKelas: boolean;
      taughtMapelsInClass: string[];
    }
  | { ok: false; status: number; error: string };

function parseAssignedClasses(kelasDiampu: string | null): string[] {
  if (!kelasDiampu) return [];
  return kelasDiampu
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * Verifikasi bahwa akun Guru benar-benar ditugaskan mengajar mata pelajaran
 * kurikulum (`mapel`) tertentu di `kelas` tersebut. Menolak `"Umum"` dan mapel kosong.
 */
export async function verifyTeacherSubjectAccess(
  userId: string,
  kelas: string,
  mapel: string
): Promise<TeacherSubjectAuthResult> {
  const trimmedKelas = kelas.trim();
  const trimmedMapel = mapel.trim();

  if (!trimmedKelas || !trimmedMapel) {
    return {
      ok: false,
      status: 400,
      error: "Parameter kelas dan mata pelajaran wajib diisi.",
    };
  }

  if (trimmedMapel === "Umum") {
    return {
      ok: false,
      status: 403,
      error:
        "Akses Ditolak: Kategori Umum / Non-Mapel tidak berlaku untuk akun Guru. Pilih mata pelajaran kurikulum yang Anda ampu.",
    };
  }

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId));

  if (!teacher) {
    return {
      ok: false,
      status: 404,
      error: "Data guru tidak ditemukan.",
    };
  }

  const subjectRows = await db
    .select()
    .from(subjects)
    .where(
      and(
        eq(subjects.teacherId, teacher.id),
        eq(subjects.namaMapel, trimmedMapel)
      )
    )
    .all();

  if (subjectRows.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "Akses Ditolak: Anda tidak ditugaskan untuk mata pelajaran ini.",
    };
  }

  const teachesInClass = subjectRows.some((row) =>
    parseAssignedClasses(row.kelasDiampu).includes(trimmedKelas)
  );

  if (!teachesInClass) {
    return {
      ok: false,
      status: 403,
      error:
        "Akses Ditolak: Anda tidak ditugaskan untuk mengajar mata pelajaran ini di kelas tersebut.",
    };
  }

  return { ok: true, teacher };
}

/**
 * Verifikasi bahwa akun Guru memiliki akses ke `kelas` (mengajar minimal
 * satu mata pelajaran di kelas tersebut atau ditunjuk sebagai Wali Kelas).
 */
export async function verifyTeacherClassAccess(
  userId: string,
  kelas: string
): Promise<TeacherClassAuthResult> {
  const trimmedKelas = kelas.trim();

  if (!trimmedKelas) {
    return {
      ok: false,
      status: 400,
      error: "Parameter kelas wajib diisi.",
    };
  }

  const [teacher] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, userId));

  if (!teacher) {
    return {
      ok: false,
      status: 404,
      error: "Data guru tidak ditemukan.",
    };
  }

  const [kelasRecord] = await db
    .select()
    .from(classes)
    .where(eq(classes.namaKelas, trimmedKelas));

  const isWaliKelas = kelasRecord?.waliKelas === teacher.namaLengkap;

  const mySubjects = await db
    .select()
    .from(subjects)
    .where(eq(subjects.teacherId, teacher.id))
    .all();

  const taughtMapelsInClass = Array.from(
    new Set(
      mySubjects
        .filter(
          (s) =>
            s.namaMapel &&
            s.namaMapel !== "Umum" &&
            parseAssignedClasses(s.kelasDiampu).includes(trimmedKelas)
        )
        .map((s) => s.namaMapel)
    )
  );

  if (!isWaliKelas && taughtMapelsInClass.length === 0) {
    return {
      ok: false,
      status: 403,
      error: "Akses Ditolak: Anda tidak memiliki penugasan di kelas ini.",
    };
  }

  return {
    ok: true,
    teacher,
    isWaliKelas,
    taughtMapelsInClass,
  };
}

