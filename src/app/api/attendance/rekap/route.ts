import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, academicYears, spkScores, spkCriteria } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { verifyTeacherClassAccess } from "@/lib/teacher-auth";

// GET /api/attendance/rekap?kelas=X-A
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "ADMIN" && appRole !== "GURU") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas")?.trim();
  const mapel = searchParams.get("mapel")?.trim();

  if (!kelas) {
    return NextResponse.json({ error: "Kelas wajib diisi" }, { status: 400 });
  }

  let guruScopeMapels: string[] | null = null;

  if (appRole === "GURU") {
    if (mapel === "Umum") {
      return NextResponse.json(
        { error: "Akses Ditolak: Kategori Umum tidak berlaku untuk akun Guru." },
        { status: 403 }
      );
    }

    const authCheck = await verifyTeacherClassAccess(session.user.id, kelas);
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    if (!authCheck.isWaliKelas) {
      guruScopeMapels = authCheck.taughtMapelsInClass;
    }

    if (
      mapel &&
      mapel !== "Semua Mata Pelajaran" &&
      !authCheck.isWaliKelas &&
      !authCheck.taughtMapelsInClass.includes(mapel)
    ) {
      return NextResponse.json(
        {
          error:
            "Akses Ditolak: Anda tidak ditugaskan untuk mata pelajaran ini di kelas tersebut.",
        },
        { status: 403 }
      );
    }
  }

  try {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    if (!activeYear) return NextResponse.json([]); // Strict active year requirement
    const periode = `${activeYear.tahunAjaran}-${activeYear.semester}`;

    // 1. Get all active students in this class
    const siswaKelas = await db
      .select({
        id: students.id,
        nama: students.namaLengkap,
        nis: students.nis,
      })
      .from(students)
      .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
      .all();

    if (siswaKelas.length === 0) {
      return NextResponse.json([]);
    }

    const studentIds = siswaKelas.map((s) => s.id);

    // 2. Get all attendance records for these students in this PERIODE
    let existingRecords = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.periode, periode),
          inArray(attendance.studentId, studentIds)
        )
      )
      .all();

    const tanggal = searchParams.get("tanggal");
    if (tanggal) {
      existingRecords = existingRecords.filter((a) => a.tanggal === tanggal);
    }

    // 3. Get spkScores and criteria
    let existingScores = await db
      .select()
      .from(spkScores)
      .where(
        and(
          eq(spkScores.periode, periode),
          inArray(spkScores.studentId, studentIds)
        )
      )
      .all();
    const mCriteria = await db
      .select()
      .from(spkCriteria)
      .where(eq(spkCriteria.tipe, "Manual"))
      .all();

    if (mapel && mapel !== "Semua Mata Pelajaran") {
      existingRecords = existingRecords.filter((a) => a.mapel === mapel);
      if (mapel === "Umum") {
        existingScores = existingScores.filter(
          (sc) => sc.mapel === "Umum" || !sc.mapel
        );
      } else {
        existingScores = existingScores.filter((sc) => sc.mapel === mapel);
      }
    } else {
      // Align with curriculum-subject-only policy in SPK & Student Transcript;
      // non-homeroom GURU only sees subjects they actually teach in this class.
      existingRecords = existingRecords.filter(
        (a) =>
          Boolean(a.mapel) &&
          a.mapel !== "Umum" &&
          (guruScopeMapels === null || guruScopeMapels.includes(a.mapel!))
      );
      existingScores = existingScores.filter(
        (sc) =>
          Boolean(sc.mapel) &&
          sc.mapel !== "Umum" &&
          (guruScopeMapels === null || guruScopeMapels.includes(sc.mapel!))
      );
    }

    // 4. Pre-group attendance records by studentId and scores by studentId & criteriaId for O(1) lookups
    const attendanceByStudent = new Map<string, typeof existingRecords>();
    existingRecords.forEach((r) => {
      let list = attendanceByStudent.get(r.studentId);
      if (!list) {
        list = [];
        attendanceByStudent.set(r.studentId, list);
      }
      list.push(r);
    });

    const scoresByStudentAndCriteria = new Map<string, typeof existingScores>();
    existingScores.forEach((sc) => {
      const key = `${sc.studentId}-${sc.criteriaId}`;
      let list = scoresByStudentAndCriteria.get(key);
      if (!list) {
        list = [];
        scoresByStudentAndCriteria.set(key, list);
      }
      list.push(sc);
    });

    // 5. Aggregate data per student
    const result = siswaKelas.map((siswa) => {
      let hadir = 0;
      let izin = 0;
      let sakit = 0;
      let alfa = 0;

      const records = attendanceByStudent.get(siswa.id) || [];

      records.forEach((r) => {
        if (r.status === "Hadir") hadir++;
        else if (r.status === "Izin") izin++;
        else if (r.status === "Sakit") sakit++;
        else if (r.status === "Alfa") alfa++;
      });

      const total = hadir + izin + sakit + alfa;
      const persen = total > 0 ? Math.round((hadir / total) * 100) : 0;

      // Extract specific scores logic (null when ungraded so UI can distinguish null vs 0)
      const studentScores: Record<string, number | null> = {};
      mCriteria.forEach((c) => {
        const crScores =
          scoresByStudentAndCriteria.get(`${siswa.id}-${c.id}`) || [];
        if (crScores.length > 0) {
          const sum = crScores.reduce((acc, curr) => acc + curr.nilai, 0);
          studentScores[c.namaKriteria] = Math.round(sum / crScores.length);
        } else {
          studentScores[c.namaKriteria] = null;
        }
      });

      return {
        id: siswa.id,
        nama: siswa.nama,
        nis: siswa.nis,
        hadir,
        izin,
        sakit,
        alfa,
        persen,
        nilai: studentScores,
      };
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat rekap kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
