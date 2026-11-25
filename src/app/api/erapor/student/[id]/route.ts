import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";
import { getStudentReportCard } from "@/lib/erapor";
import { canStudentPrintErapor } from "@/lib/erapor-utils";

export const dynamic = "force-dynamic";

// GET /api/erapor/student/[id]?periode=...
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const studentId = id?.trim();

  if (!studentId) {
    return NextResponse.json(
      { error: "Parameter ID siswa wajib diisi" },
      { status: 400 }
    );
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");

  // Jika siswa mengakses, pastikan siswa hanya mengakses rapor dirinya sendiri
  if (portal === "/siswa") {
    const [ownStudent] = await db
      .select({ id: students.id })
      .from(students)
      .where(eq(students.userId, session.user.id));

    if (!ownStudent || ownStudent.id !== studentId) {
      return NextResponse.json(
        { error: "Akses ditolak: Anda hanya dapat melihat rapor Anda sendiri" },
        { status: 403 }
      );
    }
  } else if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode") || undefined;

  try {
    const reportCard = await getStudentReportCard(studentId, periode);
    if (!reportCard) {
      return NextResponse.json(
        { error: "Data rapor siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Untuk portal siswa: kunci lembar rapor sebelum berstatus "Diterbitkan"
    if (portal === "/siswa" && !canStudentPrintErapor(reportCard.statusRapor)) {
      const jumlahMapelTerisi = reportCard.subjects.filter(
        (s) => s.nilaiAkhir !== null
      ).length;
      return NextResponse.json({
        locked: true,
        statusRapor: reportCard.statusRapor,
        periode: reportCard.periode,
        periodeDisplay: reportCard.periodeDisplay,
        defaultKkm: reportCard.defaultKkm,
        waliKelas: reportCard.waliKelas,
        student: reportCard.student,
        totalMapel: reportCard.subjects.length,
        jumlahMapelTerisi,
      });
    }

    return NextResponse.json({
      locked: false,
      ...reportCard,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat data rapor siswa";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

