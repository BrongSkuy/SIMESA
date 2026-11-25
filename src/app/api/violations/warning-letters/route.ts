import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  warningLetters,
  students,
  studentViolations,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";
import {
  generateWarningLetterNumber,
  calculateActiveViolationPoints,
} from "@/lib/violations";
import { logActivity } from "@/lib/audit-server";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/violations/warning-letters — Ambil riwayat surat peringatan
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");

    let query = db
      .select({
        id: warningLetters.id,
        studentId: warningLetters.studentId,
        nomorSurat: warningLetters.nomorSurat,
        tingkatSp: warningLetters.tingkatSp,
        totalPoinSaatSp: warningLetters.totalPoinSaatSp,
        tanggalTerbit: warningLetters.tanggalTerbit,
        diterbitkanOleh: warningLetters.diterbitkanOleh,
        statusPanggilan: warningLetters.statusPanggilan,
        catatanMediasi: warningLetters.catatanMediasi,
        createdAt: warningLetters.createdAt,
        // Siswa
        namaSiswa: students.namaLengkap,
        nis: students.nis,
        kelas: students.kelas,
      })
      .from(warningLetters)
      .innerJoin(students, eq(warningLetters.studentId, students.id))
      .$dynamic();

    if (studentId) {
      query = query.where(eq(warningLetters.studentId, studentId));
    }

    const rows = await query.orderBy(desc(warningLetters.createdAt));

    return NextResponse.json({ letters: rows });
  } catch (error) {
    console.error("Error fetching warning letters:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data surat peringatan" },
      { status: 500 }
    );
  }
}

// POST /api/violations/warning-letters — Terbitkan Surat Peringatan (SP) baru
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, tingkatSp, tanggalTerbit, nomorSuratCustom, statusPanggilan, catatanMediasi } = body;

    const parsedTingkat = Number(tingkatSp);
    if (!studentId || ![1, 2, 3].includes(parsedTingkat)) {
      return NextResponse.json(
        { error: "Siswa dan tingkat SP (1, 2, atau 3) wajib ditentukan" },
        { status: 400 }
      );
    }

    const [targetStudent] = await db
      .select({ id: students.id, namaLengkap: students.namaLengkap })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    if (!targetStudent) {
      return NextResponse.json(
        { error: "Data siswa tidak ditemukan" },
        { status: 404 }
      );
    }

    // Hitung akumulasi poin aktif saat ini (status !== "Selesai Dibina")
    const violations = await db
      .select({ poin: studentViolations.poin, status: studentViolations.status })
      .from(studentViolations)
      .where(eq(studentViolations.studentId, studentId));

    const totalPoints = calculateActiveViolationPoints(violations);

    // Hitung urutan surat yang sudah ada di database untuk sequence number
    const countLetters = await db.select().from(warningLetters);
    const seq = countLetters.length + 1;

    const realNomor = nomorSuratCustom || generateWarningLetterNumber(Number(tingkatSp), seq);
    const issuer = session.user.name || "Guru Bimbingan Konseling (BK)";
    const dateStr = tanggalTerbit || new Date().toISOString().split("T")[0];

    const [inserted] = await db
      .insert(warningLetters)
      .values({
        studentId,
        nomorSurat: realNomor,
        tingkatSp: Number(tingkatSp),
        totalPoinSaatSp: totalPoints,
        tanggalTerbit: dateStr,
        diterbitkanOleh: issuer,
        statusPanggilan: statusPanggilan || "Menunggu Panggilan",
        catatanMediasi: catatanMediasi || "",
      })
      .returning();

    // Catat ke riwayat aktivitas (audit trail)
    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Guru BK",
      userRole: appRole || "guru_bk",
      action: "APPROVE",
      module: "BUKU_POIN",
      targetId: studentId,
      targetName: targetStudent.namaLengkap || "Siswa",
      description: `Menerbitkan Surat Peringatan (SP ${parsedTingkat}) Nomor ${realNomor} untuk siswa ${targetStudent.namaLengkap || "Siswa"}`,
      details: {
        letterId: inserted.id,
        nomorSurat: realNomor,
        tingkatSp: parsedTingkat,
        totalPoinSaatSp: totalPoints,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Surat Peringatan ${tingkatSp} berhasil diterbitkan`,
      letter: inserted,
    });
  } catch (error) {
    console.error("Error issuing warning letter:", error);
    return NextResponse.json(
      { error: "Gagal menerbitkan surat peringatan" },
      { status: 500 }
    );
  }
}

