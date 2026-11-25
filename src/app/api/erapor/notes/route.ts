import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { studentReportNotes, academicYears, students, spkScores } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";
import { DEFAULT_PERIODE } from "@/lib/utils";
import { logActivity } from "@/lib/audit-server";

export const dynamic = "force-dynamic";

// GET /api/erapor/notes?studentId=...&periode=...
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId")?.trim();
  let periode = searchParams.get("periode")?.trim();

  if (!studentId) {
    return NextResponse.json(
      { error: "Parameter studentId wajib diisi" },
      { status: 400 }
    );
  }

  if (!periode) {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
  }

  try {
    const [notes] = await db
      .select()
      .from(studentReportNotes)
      .where(
        and(
          eq(studentReportNotes.studentId, studentId),
          eq(studentReportNotes.periode, periode)
        )
      );

    return NextResponse.json({ data: notes || null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat catatan rapor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/erapor/notes — Simpan / update catatan wali kelas & ekskul
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const studentId = body.studentId?.trim();
    let periode = body.periode?.trim();
    const catatanWaliKelas = body.catatanWaliKelas?.trim() || null;
    const ekskulNama = body.ekskulNama?.trim() || null;
    const ekskulNilai = body.ekskulNilai?.trim() || null;
    const ekskulKeterangan = body.ekskulKeterangan?.trim() || null;
    const statusRapor = (body.statusRapor || "Draf") as "Draf" | "Disahkan" | "Diterbitkan";

    if (!studentId) {
      return NextResponse.json(
        { error: "ID Siswa wajib diisi" },
        { status: 400 }
      );
    }

    const [existingStudent] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.id, studentId));
    if (!existingStudent) {
      return NextResponse.json(
        { error: "Siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    if (!periode) {
      const [activeYear] = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.isActive, true));
      periode = activeYear
        ? `${activeYear.tahunAjaran}-${activeYear.semester}`
        : DEFAULT_PERIODE;
    }

    // Validasi: jangan izinkan menerbitkan rapor bila belum ada nilai mapel sama sekali
    if (statusRapor === "Diterbitkan") {
      const studentScores = await db
        .select({ mapel: spkScores.mapel })
        .from(spkScores)
        .where(
          and(
            eq(spkScores.studentId, studentId),
            eq(spkScores.periode, periode)
          )
        )
        .all();

      const hasMapelScore = studentScores.some(
        (s) => s.mapel && s.mapel !== "Umum"
      );
      if (!hasMapelScore) {
        return NextResponse.json(
          {
            error:
              "Rapor belum dapat diterbitkan karena siswa belum memiliki nilai mata pelajaran pada periode ini.",
          },
          { status: 400 }
        );
      }
    }

    const existing = await db
      .select()
      .from(studentReportNotes)
      .where(
        and(
          eq(studentReportNotes.studentId, studentId),
          eq(studentReportNotes.periode, periode)
        )
      )
      .all();

    if (existing.length > 0) {
      await db
        .update(studentReportNotes)
        .set({
          catatanWaliKelas,
          ekskulNama,
          ekskulNilai,
          ekskulKeterangan,
          statusRapor,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(studentReportNotes.studentId, studentId),
            eq(studentReportNotes.periode, periode)
          )
        );
    } else {
      await db.insert(studentReportNotes).values({
        studentId,
        periode,
        catatanWaliKelas,
        ekskulNama,
        ekskulNilai,
        ekskulKeterangan,
        statusRapor,
        updatedAt: new Date().toISOString(),
      });
    }

    // Catat ke riwayat aktivitas (audit trail)
    const [targetStudent] = await db
      .select({ namaLengkap: students.namaLengkap })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    const reqHeaders = await headers();
    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Wali Kelas",
      userRole: (session.user as any).role || (session.user as any).appRole || "wali_kelas",
      action: "UPDATE",
      module: "E_RAPOR",
      targetId: studentId,
      targetName: targetStudent?.namaLengkap || "Siswa",
      description: `Menyimpan catatan wali kelas dan status rapor (${statusRapor}) untuk siswa ${targetStudent?.namaLengkap || "Siswa"} (Periode ${periode})`,
      details: {
        periode,
        statusRapor,
        ekskulNama,
        ekskulNilai,
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Catatan wali kelas dan kegiatan ekstrakurikuler berhasil disimpan",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan catatan rapor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

