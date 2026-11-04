import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  students,
  teachers,
  attendance,
  academicYears,
  classes,
  spkCriteria,
  spkPublishStatus,
} from "@/db/schema";
import { eq, sql, count } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getTodayWIB } from "@/lib/utils";

// GET /api/dashboard/stats — enriched enterprise dashboard statistics
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [[studentCount], [teacherCount], [classCount], [criteriaCount]] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(students)
        .where(eq(students.status, "aktif")),
      db
        .select({ count: count() })
        .from(teachers)
        .where(eq(teachers.status, "aktif")),
      db.select({ count: count() }).from(classes),
      db.select({ count: count() }).from(spkCriteria),
    ]);

  // Active academic period
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true));
  const periode = activeYear
    ? `${activeYear.tahunAjaran}-${activeYear.semester}`
    : "2025/2026-Genap";
  const semesterDisplay = activeYear
    ? `Semester ${activeYear.semester} ${activeYear.tahunAjaran}`
    : "Semester Genap 2025/2026";

  const [pubStatus] = await db
    .select()
    .from(spkPublishStatus)
    .where(eq(spkPublishStatus.periode, periode));

  // Fetch attendance records for active students in active period
  // Deduplicate per (tanggal, studentId) so multiple mapel records on the same day count 1 student once
  const rawAttendanceRows = await db
    .select({
      tanggal: attendance.tanggal,
      studentId: attendance.studentId,
      mapel: attendance.mapel,
      status: attendance.status,
    })
    .from(attendance)
    .innerJoin(students, eq(attendance.studentId, students.id))
    .where(
      sql`${attendance.periode} = ${periode} AND ${students.status} = 'aktif'`
    )
    .orderBy(sql`${attendance.tanggal} ASC`);

  // Deduplicate per date & studentId:
  // Prioritize "Umum" (daily homeroom attendance) if present, otherwise resolve status priority: Hadir > Sakit > Izin > Alfa
  const perDateStudentStatus: Record<
    string,
    Record<string, { status: string; isUmum: boolean }>
  > = {};

  const statusRank: Record<string, number> = {
    Hadir: 4,
    Sakit: 3,
    Izin: 2,
    Alfa: 1,
  };

  for (const row of rawAttendanceRows) {
    if (!perDateStudentStatus[row.tanggal]) {
      perDateStudentStatus[row.tanggal] = {};
    }
    const existing = perDateStudentStatus[row.tanggal][row.studentId];
    const isUmum = row.mapel === "Umum";
    const normalizedStatus =
      row.status === "Hadir" ||
      row.status === "Izin" ||
      row.status === "Sakit" ||
      row.status === "Alfa"
        ? row.status
        : "Alfa";

    if (!existing) {
      perDateStudentStatus[row.tanggal][row.studentId] = {
        status: normalizedStatus,
        isUmum,
      };
    } else if (isUmum && !existing.isUmum) {
      perDateStudentStatus[row.tanggal][row.studentId] = {
        status: normalizedStatus,
        isUmum: true,
      };
    } else if (!existing.isUmum && !isUmum) {
      if ((statusRank[normalizedStatus] || 0) > (statusRank[existing.status] || 0)) {
        perDateStudentStatus[row.tanggal][row.studentId] = {
          status: normalizedStatus,
          isUmum: false,
        };
      }
    }
  }

  const attendanceMap: Record<
    string,
    { hadir: number; izin: number; sakit: number; alfa: number }
  > = {};
  let grandTotalRecords = 0;
  let grandTotalHadir = 0;

  for (const [tanggal, studentMap] of Object.entries(perDateStudentStatus)) {
    attendanceMap[tanggal] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    for (const entry of Object.values(studentMap)) {
      const st = entry.status.toLowerCase() as
        | "hadir"
        | "izin"
        | "sakit"
        | "alfa";
      attendanceMap[tanggal][st] += 1;
      grandTotalRecords += 1;
      if (st === "hadir") grandTotalHadir += 1;
    }
  }

  // Today's attendance (WIB)
  const today = getTodayWIB();
  const todaySummary = attendanceMap[today] || {
    hadir: 0,
    izin: 0,
    sakit: 0,
    alfa: 0,
  };
  const todayHadir = todaySummary.hadir;
  const todayIzinSakit = todaySummary.izin + todaySummary.sakit;
  const todayAlfa = todaySummary.alfa;
  const todayTotal = todayHadir + todayIzinSakit + todayAlfa;

  const sortedDates = Object.keys(attendanceMap).sort();

  const weeklyAttendance = sortedDates.map((tanggal) => {
    const dObj = new Date(tanggal + "T00:00:00");
    const hari = isNaN(dObj.getTime())
      ? tanggal
      : dObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    return {
      tanggal,
      hari,
      hadir: attendanceMap[tanggal].hadir,
      izin: attendanceMap[tanggal].izin,
      sakit: attendanceMap[tanggal].sakit,
      alfa: attendanceMap[tanggal].alfa,
    };
  });

  // Fallback to latest recorded date metrics if today has no entries yet
  let activeDayHadir = todayHadir;
  let activeDayTotal = todayTotal;
  let activeDayIzinSakit = todayIzinSakit;
  let activeDayAlfa = todayAlfa;
  let isTodayData = todayTotal > 0;

  if (todayTotal === 0 && sortedDates.length > 0) {
    const lastDate = sortedDates[sortedDates.length - 1];
    const lastEntry = attendanceMap[lastDate];
    activeDayHadir = lastEntry.hadir;
    activeDayIzinSakit = lastEntry.izin + lastEntry.sakit;
    activeDayAlfa = lastEntry.alfa;
    activeDayTotal =
      lastEntry.hadir + lastEntry.izin + lastEntry.sakit + lastEntry.alfa;
    isTodayData = false;
  }

  const kehadiranPersen =
    activeDayTotal > 0
      ? Number(((activeDayHadir / activeDayTotal) * 100).toFixed(1))
      : 0;

  const avgAttendance =
    grandTotalRecords > 0
      ? Number(((grandTotalHadir / grandTotalRecords) * 100).toFixed(1))
      : 0;

  // Format period date range label
  let periodeRangeLabel = "Belum ada presensi";
  let monthYearLabel = new Date().toLocaleDateString("id-ID", {
    month: "short",
    year: "numeric",
  });

  if (sortedDates.length > 0) {
    const firstD = new Date(sortedDates[0] + "T00:00:00");
    const lastD = new Date(sortedDates[sortedDates.length - 1] + "T00:00:00");
    if (!isNaN(firstD.getTime()) && !isNaN(lastD.getTime())) {
      const fStr = firstD.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
      });
      const lStr = lastD.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      periodeRangeLabel = `${fStr} - ${lStr}`;
      monthYearLabel = lastD.toLocaleDateString("id-ID", {
        month: "short",
        year: "numeric",
      });
    }
  }

  return NextResponse.json({
    totalSiswa: studentCount.count,
    totalGuru: teacherCount.count,
    totalKelas: classCount.count,
    totalCriteria: criteriaCount.count,
    kehadiranHariIni: kehadiranPersen,
    activeDayHadir,
    activeDayTotal,
    activeDayIzinSakit,
    activeDayAlfa,
    isTodayData,
    avgAttendance,
    tahunAjaran: periode,
    semesterDisplay,
    periodeRangeLabel,
    monthYearLabel,
    isSpkPublished: pubStatus?.isPublished ?? false,
    weeklyAttendance,
  });
}
