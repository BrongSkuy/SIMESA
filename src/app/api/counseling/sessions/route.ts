import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFullRoles } from "@/lib/rbac-server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getCounselingSessions,
  createCounselingSession,
} from "@/lib/counseling-server";
import { logActivity } from "@/lib/audit-server";

// GET /api/counseling/sessions — Mengambil daftar riwayat sesi konseling
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const kategori = searchParams.get("kategori") || undefined;
    const statusKasus = searchParams.get("statusKasus") || undefined;
    const kelas = searchParams.get("kelas") || undefined;
    const studentId = searchParams.get("studentId") || undefined;

    // Akses catatan rahasia hanya untuk Superadmin, Admin, Kepala Sekolah, dan Guru BK (termasuk multi-role dewan guru)
    const { allRoles } = await getUserFullRoles(session.user.id);
    const canViewConfidential = allRoles.some((r) =>
      ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH", "GURU_BK"].includes(r)
    );

    const sessions = await getCounselingSessions({
      search,
      kategori,
      statusKasus,
      kelas,
      studentId,
      canViewConfidential,
    });

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Error fetching counseling sessions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data sesi konseling" },
      { status: 500 }
    );
  }
}

// POST /api/counseling/sessions — Mencatat sesi konseling baru
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      studentId,
      tanggal,
      waktuMulai,
      waktuSelesai,
      kategori,
      jenisLayanan,
      tingkatKerahasiaan,
      pokokMasalah,
      pendekatanKonseling,
      hasilKonseling,
      tindakLanjut,
      statusKasus,
      counselorNameCustom,
      createDispensation,
    } = body;

    if (!studentId || !tanggal || !waktuMulai || !waktuSelesai || !kategori || !jenisLayanan || !pokokMasalah) {
      return NextResponse.json(
        { error: "Semua kolom bertanda bintang wajib diisi" },
        { status: 400 }
      );
    }

    const counselorId = counselorNameCustom || session.user.name || "Guru BK";

    const result = await createCounselingSession({
      studentId,
      counselorId,
      tanggal,
      waktuMulai,
      waktuSelesai,
      kategori,
      jenisLayanan,
      tingkatKerahasiaan,
      pokokMasalah,
      pendekatanKonseling,
      hasilKonseling,
      tindakLanjut,
      statusKasus,
      createDispensation: Boolean(createDispensation),
    });

    // Catat ke riwayat aktivitas (audit trail)
    const [targetStudent] = await db
      .select({ namaLengkap: students.namaLengkap })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Guru BK",
      userRole: (session.user as any).role || "guru_bk",
      action: "CREATE",
      module: "KONSELING_BK",
      targetId: studentId,
      targetName: targetStudent?.namaLengkap || "Siswa",
      description: `Mencatat sesi konseling ${jenisLayanan} (${kategori}) untuk siswa ${targetStudent?.namaLengkap || "Siswa"}`,
      details: {
        sessionId: result.session?.id,
        kategori,
        jenisLayanan,
        statusKasus,
        adaDispensasi: Boolean(createDispensation),
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating counseling session:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan data sesi konseling" },
      { status: 500 }
    );
  }
}
