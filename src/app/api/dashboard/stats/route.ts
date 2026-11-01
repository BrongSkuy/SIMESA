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

  // Today's attendance (WIB)
  const today = getTodayWIB();
  const todayRows = await db
    .select({
      status: attendance.status,
      count: count(),
    })
    .from(attendance)
    .where(
      sql`${attendance.tanggal} = ${today} AND ${attendance.periode} = ${periode}`
    )
    .groupBy(attendance.status);

  let todayTotal = 0;
  let todayHadir = 0;
  let todayIzinSakit = 0;
  let todayAlfa = 0;
  for (const r of todayRows) {
    todayTotal += r.count;
    if (r.status === "Hadir") todayHadir += r.count;
    else if (r.status === "Izin" || r.status === "Sakit")
      todayIzinSakit += r.count;
    else todayAlfa += r.count;
  }

  // All-time attendance trend (grouped by date) for active period
  const allPeriodAttendance = await db
    .select({
      tanggal: attendance.tanggal,
      status: attendance.status,
      count: count(),
    })
    .from(attendance)
    .where(eq(attendance.periode, periode))
    .groupBy(attendance.tanggal, attendance.status)
    .orderBy(sql`${attendance.tanggal} ASC`);

  const attendanceMap: Record<
    string,
    { hadir: number; izin: number; sakit: number; alfa: number }
  > = {};
  let grandTotalRecords = 0;
  let grandTotalHadir = 0;

  for (const row of allPeriodAttendance) {
    if (!attendanceMap[row.tanggal]) {
      attendanceMap[row.tanggal] = { hadir: 0, izin: 0, sakit: 0, alfa: 0 };
    }
    const st = row.status ? row.status.toLowerCase() : "alfa";
    if (st === "hadir" || st === "izin" || st === "sakit" || st === "alfa") {
      attendanceMap[row.tanggal][st] = row.count;
      grandTotalRecords += row.count;
      if (st === "hadir") grandTotalHadir += row.count;
    }
  }

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
