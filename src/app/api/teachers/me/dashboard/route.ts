import { NextResponse } from "next/server";
import { db } from "@/db";
import { teachers, classes, attendance, students, subjects, academicYears } from "@/db/schema";
import { eq, inArray, and, isNotNull, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_PERIODE, getTodayWIB } from "@/lib/utils";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/teachers/me/dashboard — get dashboard stats & classes for logged in teacher
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");

  if (portal !== "/guru" && portal !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    // 1. Get teacher profile
    const [teacher] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.userId, session.user.id));

    // Get active period
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;

    let assignedClasses: {
      id: string;
      namaKelas: string;
      tingkat: string;
      waliKelas: string | null;
      subjects: string[];
    }[] = [];

    if (teacher) {
      // Get subjects & classes explicitly assigned to teacher (curriculum only, exclude "Umum")
      const mySubjects = await db
        .select({ mapel: subjects.namaMapel, kelas: subjects.kelasDiampu })
        .from(subjects)
        .where(eq(subjects.teacherId, teacher.id))
        .all();

      const curriculumSubjects = mySubjects.filter(
        (s) => Boolean(s.mapel) && s.mapel !== "Umum"
      );

      const assignedKelasNamesSet = new Set<string>();
      for (const s of curriculumSubjects) {
        if (s.kelas) {
          s.kelas.split(",").forEach((k) => {
            if (k.trim()) assignedKelasNamesSet.add(k.trim());
          });
        }
      }
      const assignedKelasNames = Array.from(assignedKelasNamesSet);

      // Get classes where teacher is Wali Kelas
      const myWaliClasses = await db
        .select()
        .from(classes)
        .where(eq(classes.waliKelas, teacher.namaLengkap))
        .all();

      const waliKelasNames = myWaliClasses.map((c) => c.namaKelas);

      // Combine teaching classes + homeroom classes
      const allClassNames = [...new Set([...assignedKelasNames, ...waliKelasNames])];

      if (allClassNames.length > 0) {
        const fullClasses = await db
          .select()
          .from(classes)
          .where(inArray(classes.namaKelas, allClassNames))
          .all();

        assignedClasses = fullClasses
          .map((c) => {
            const classSubjects: string[] = [];

            for (const s of curriculumSubjects) {
              if (s.kelas) {
                const classesList = s.kelas
                  .split(",")
                  .map((k) => k.trim())
                  .filter(Boolean);
                if (classesList.includes(c.namaKelas)) {
                  classSubjects.push(s.mapel);
                }
              }
            }

            return {
              id: c.id,
              namaKelas: c.namaKelas,
              tingkat: c.tingkat,
              waliKelas: c.waliKelas,
              subjects: [...new Set(classSubjects)],
            };
          })
          .filter(
            (c) => c.subjects.length > 0 || c.waliKelas === teacher.namaLengkap
          );
      }
    } else if (portal === "/admin") {
      const allFullClasses = await db.select().from(classes).all();
      assignedClasses = allFullClasses.map((c) => ({
        id: c.id,
        namaKelas: c.namaKelas,
        tingkat: c.tingkat,
        waliKelas: c.waliKelas,
        subjects: ["Semua Mapel (Admin)"],
      }));
    }

    // 2. Check today's curriculum attendance for those classes
    const today = getTodayWIB();
    const classesStatus = [];
    let classesDiabsen = 0;

    const classNames = assignedClasses.map((c) => c.namaKelas);
    let allAttendanceToday: Array<{
      id: string;
      kelas: string;
      mapel: string | null;
    }> = [];

    if (classNames.length > 0) {
      allAttendanceToday = await db
        .select({
          id: attendance.id,
          kelas: students.kelas,
          mapel: attendance.mapel,
        })
        .from(attendance)
        .innerJoin(students, eq(attendance.studentId, students.id))
        .where(
          and(
            inArray(students.kelas, classNames),
            eq(attendance.tanggal, today),
            eq(attendance.periode, periode),
            isNotNull(attendance.mapel),
            ne(attendance.mapel, "Umum")
          )
        )
        .all();
    }

    for (const c of assignedClasses) {
      let hasAttendance = false;
      if (portal === "/admin") {
        hasAttendance = allAttendanceToday.some((a) => a.kelas === c.namaKelas);
      } else if (c.subjects.length > 0) {
        hasAttendance = c.subjects.every((m) =>
          allAttendanceToday.some(
            (a) => a.kelas === c.namaKelas && a.mapel === m
          )
        );
      } else {
        // Pure homeroom class (no subject taught by this teacher in this class)
        hasAttendance = allAttendanceToday.some((a) => a.kelas === c.namaKelas);
      }

      if (hasAttendance) {
        classesDiabsen++;
        classesStatus.push({ ...c, statusAbsensiHariIni: "Sudah Diabsen" });
      } else {
        classesStatus.push({ ...c, statusAbsensiHariIni: "Belum Diabsen" });
      }
    }

    // 3. Calculate rata-rata kehadiran strictly scoped to teacher's curriculum subjects
    let rataRataKehadiran = "-";
    if (assignedClasses.length > 0) {
      const properAtt = await db
        .select({
          kelas: students.kelas,
          mapel: attendance.mapel,
          status: attendance.status,
        })
        .from(attendance)
        .innerJoin(students, eq(attendance.studentId, students.id))
        .where(
          and(
            inArray(students.kelas, classNames),
            eq(attendance.periode, periode),
            isNotNull(attendance.mapel),
            ne(attendance.mapel, "Umum")
          )
        )
        .all();

      const classSubjectLookup = new Map<string, Set<string>>();
      assignedClasses.forEach((c) => {
        classSubjectLookup.set(c.namaKelas, new Set(c.subjects));
      });

      const scopedAtt =
        portal === "/admin"
          ? properAtt
          : properAtt.filter((row) => {
              const taughtSet = classSubjectLookup.get(row.kelas);
              if (!taughtSet || taughtSet.size === 0) {
                // Pure homeroom class: aggregate all curriculum attendance in this class
                return true;
              }
              return taughtSet.has(row.mapel || "");
            });

      if (scopedAtt.length > 0) {
        const hadir = scopedAtt.filter((a) => a.status === "Hadir").length;
        rataRataKehadiran =
          Math.round((hadir / scopedAtt.length) * 100) + "%";
      } else {
        rataRataKehadiran = "0%";
      }
    }

    return NextResponse.json({
      totalKelasDiampu: assignedClasses.length,
      sudahDiabsenHariIni: classesDiabsen,
      rataRataKehadiran,
      classes: classesStatus,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal mengambil data dashboard";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
