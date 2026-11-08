import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, attendance, academicYears } from "@/db/schema";
import { eq, desc, and, isNotNull, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_PERIODE } from "@/lib/utils";

// GET /api/students/me/attendance — get curriculum-subject attendance records for logged-in student
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "SISWA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find student profile
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, session.user.id));

  if (!student) {
    return NextResponse.json(
      { error: "Profil siswa tidak ditemukan" },
      { status: 404 }
    );
  }

  // Get active period
  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true));
  const periode = activeYear
    ? `${activeYear.tahunAjaran}-${activeYear.semester}`
    : DEFAULT_PERIODE;

  // Get curriculum attendance records (excluding legacy "Umum" / null records)
  const allRecords = await db
    .select({
      id: attendance.id,
      tanggal: attendance.tanggal,
      mapel: attendance.mapel,
      status: attendance.status,
      periode: attendance.periode,
    })
    .from(attendance)
    .where(
      and(
        eq(attendance.studentId, student.id),
        eq(attendance.periode, periode),
        isNotNull(attendance.mapel),
        ne(attendance.mapel, "Umum")
      )
    )
    .orderBy(desc(attendance.tanggal))
    .all();

  return NextResponse.json(allRecords);
}
