import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { attendance, students, academicYears, spkPublishStatus } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { DEFAULT_PERIODE, getTodayWIB } from "@/lib/utils";
import { getPortalForRole } from "@/lib/rbac";
import { verifyTeacherSubjectAccess } from "@/lib/teacher-auth";

const VALID_STATUSES = new Set(["Hadir", "Izin", "Sakit", "Alfa"]);

// GET /api/attendance — get attendance by kelas and tanggal
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas")?.trim();
  const tanggal = searchParams.get("tanggal")?.trim();
  const rawMapel = searchParams.get("mapel")?.trim();

  if (!kelas || !tanggal) {
    return NextResponse.json(
      { error: "Parameter kelas dan tanggal wajib" },
      { status: 400 }
    );
  }

  if (portal === "/guru") {
    const authCheck = await verifyTeacherSubjectAccess(
      session.user.id,
      kelas,
      rawMapel || ""
    );
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }
  }

  const mapel = rawMapel || "Umum";

  // Get active students in this class
  const siswaKelas = await db
    .select()
    .from(students)
    .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
    .all();

  if (siswaKelas.length === 0) {
    return NextResponse.json([]);
  }

  const studentIds = siswaKelas.map((s) => s.id);

  const [activeYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true));
  const periode = activeYear
    ? `${activeYear.tahunAjaran}-${activeYear.semester}`
    : DEFAULT_PERIODE;

  // Get existing attendance records for this date and mapel and periode
  const existingRecords = await db
    .select()
    .from(attendance)
    .where(
      and(
        eq(attendance.tanggal, tanggal),
        eq(attendance.mapel, mapel),
        eq(attendance.periode, periode),
        inArray(attendance.studentId, studentIds)
      )
    )
    .all();

  // Map students with their attendance status
  const result = siswaKelas.map((s) => {
    const record = existingRecords.find((r) => r.studentId === s.id);
    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      status: record?.status || null,
      attendanceId: record?.id || null,
    };
  });

  return NextResponse.json(result);
}

// POST /api/attendance — batch save attendance for a class/date
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (!session || (portal !== "/guru" && portal !== "/admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: {
      tanggal: string;
      mapel?: string;
      records: Array<{
        studentId: string;
        status: "Hadir" | "Izin" | "Sakit" | "Alfa";
      }>;
    } = await request.json();

    const rawMapel = body.mapel?.trim();

    if (!body.tanggal || !Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json(
        { error: "Data absensi tidak valid" },
        { status: 400 }
      );
    }

    const hasInvalidStatus = body.records.some(
      (r) => !r.studentId || !VALID_STATUSES.has(r.status)
    );
    if (hasInvalidStatus) {
      return NextResponse.json(
        { error: "Terdapat ID siswa atau status kehadiran yang tidak valid." },
        { status: 400 }
      );
    }

    const todayStr = getTodayWIB();
    if (body.tanggal > todayStr) {
      return NextResponse.json(
        { error: "Tanggal presensi tidak boleh di masa depan (maksimal hari ini)." },
        { status: 400 }
      );
    }

    const studentIds = body.records.map((r) => r.studentId);
    const targetStudents = await db
      .select({ id: students.id, kelas: students.kelas })
      .from(students)
      .where(and(inArray(students.id, studentIds), eq(students.status, "aktif")))
      .all();

    const foundIdSet = new Set(targetStudents.map((s) => s.id));
    if (studentIds.some((id) => !foundIdSet.has(id))) {
      return NextResponse.json(
        { error: "Terdapat siswa yang tidak ditemukan atau berstatus nonaktif." },
        { status: 404 }
      );
    }

    const uniqueClasses = Array.from(new Set(targetStudents.map((s) => s.kelas)));

    // Strict Curriculum Subject & Ownership Check for GURU
    if (portal === "/guru") {
      if (uniqueClasses.length !== 1) {
        return NextResponse.json(
          { error: "Semua siswa dalam satu sesi presensi harus berasal dari kelas yang sama." },
          { status: 400 }
        );
      }

      const authCheck = await verifyTeacherSubjectAccess(
        session.user.id,
        uniqueClasses[0],
        rawMapel || ""
      );
      if (!authCheck.ok) {
        return NextResponse.json(
          { error: authCheck.error },
          { status: authCheck.status }
        );
      }
    }

    const mapel = rawMapel || "Umum";

    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;

    // Lockdown Check
    const [pubStatus] = await db
      .select()
      .from(spkPublishStatus)
      .where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json(
        { error: "Periode ini telah dikunci (Finalized). Data absensi tidak dapat diubah lagi." },
        { status: 403 }
      );
    }

    // Delete existing records for this date + these students, then insert new ones in transaction
    await db.transaction(async (tx) => {
      await tx
        .delete(attendance)
        .where(
          and(
            inArray(attendance.studentId, studentIds),
            eq(attendance.tanggal, body.tanggal),
            eq(attendance.mapel, mapel),
            eq(attendance.periode, periode)
          )
        );

      const valuesToInsert = body.records.map((record) => ({
        studentId: record.studentId,
        tanggal: body.tanggal,
        mapel,
        periode,
        status: record.status,
        recordedBy: session.user.id,
      }));

      if (valuesToInsert.length > 0) {
        await tx.insert(attendance).values(valuesToInsert);
      }
    });

    return NextResponse.json({
      success: true,
      count: body.records.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan absensi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/attendance?kelas=..&tanggal=..&mapel=.. — clear attendance for a specific class day
export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (!session || (portal !== "/guru" && portal !== "/admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const kelas = searchParams.get("kelas")?.trim();
  const tanggal = searchParams.get("tanggal")?.trim();
  const rawMapel = searchParams.get("mapel")?.trim();

  if (!kelas || !tanggal) {
    return NextResponse.json(
      { error: "Parameter kelas dan tanggal wajib" },
      { status: 400 }
    );
  }

  // Strict Role & Ownership Check for DELETE
  if (portal === "/guru") {
    const authCheck = await verifyTeacherSubjectAccess(
      session.user.id,
      kelas,
      rawMapel || ""
    );
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }
  }

  const mapel = rawMapel || "Umum";

  try {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;

    // Lockdown Check
    const [pubStatus] = await db
      .select()
      .from(spkPublishStatus)
      .where(eq(spkPublishStatus.periode, periode));
    if (pubStatus?.isPublished) {
      return NextResponse.json(
        { error: "Periode ini telah dikunci (Finalized). Data absensi tidak dapat dihapus lagi." },
        { status: 403 }
      );
    }

    const siswaKelas = await db
      .select()
      .from(students)
      .where(eq(students.kelas, kelas))
      .all();
    const siswaIds = siswaKelas.map((s) => s.id);

    if (siswaIds.length > 0) {
      await db
        .delete(attendance)
        .where(
          and(
            inArray(attendance.studentId, siswaIds),
            eq(attendance.tanggal, tanggal),
            eq(attendance.mapel, mapel),
            eq(attendance.periode, periode)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus absensi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
