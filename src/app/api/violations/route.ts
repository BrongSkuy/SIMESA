import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  studentViolations,
  violationTypes,
  students,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc, and, like, or } from "drizzle-orm";
import { getClassDisciplineSummary } from "@/lib/violations-server";
import { logActivity } from "@/lib/audit-server";
import { getPortalForRole } from "@/lib/rbac";
import { parseJsonBody, violationCreateSchema } from "@/lib/api-validation";

// GET /api/violations — List violations with filters or class summary
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const kelas = searchParams.get("kelas") || undefined;
    const mode = searchParams.get("mode"); // "summary" | "list"
    const studentId = searchParams.get("studentId") || undefined;
    const kategori = searchParams.get("kategori") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    // Jika meminta ringkasan per kelas (untuk tab matriks siswa & KPI)
    if (mode === "summary") {
      const summary = await getClassDisciplineSummary(kelas);
      return NextResponse.json(summary);
    }

    // Default: List riwayat pelanggaran dengan relasi
    let baseQuery = db
      .select({
        id: studentViolations.id,
        studentId: studentViolations.studentId,
        violationTypeId: studentViolations.violationTypeId,
        reportedBy: studentViolations.reportedBy,
        tanggal: studentViolations.tanggal,
        poin: studentViolations.poin,
        lokasi: studentViolations.lokasi,
        keterangan: studentViolations.keterangan,
        status: studentViolations.status,
        tindakLanjut: studentViolations.tindakLanjut,
        createdAt: studentViolations.createdAt,
        // Dari students
        nis: students.nis,
        namaSiswa: students.namaLengkap,
        kelas: students.kelas,
        // Dari violation_types
        kodePelanggaran: violationTypes.kode,
        namaPelanggaran: violationTypes.namaPelanggaran,
        kategori: violationTypes.kategori,
        deskripsiSanksi: violationTypes.deskripsiSanksi,
      })
      .from(studentViolations)
      .innerJoin(students, eq(studentViolations.studentId, students.id))
      .innerJoin(violationTypes, eq(studentViolations.violationTypeId, violationTypes.id))
      .$dynamic();

    const conditions = [];

    if (kelas && kelas !== "all") {
      conditions.push(eq(students.kelas, kelas));
    }
    if (studentId) {
      conditions.push(eq(studentViolations.studentId, studentId));
    }
    if (kategori && kategori !== "all") {
      conditions.push(eq(violationTypes.kategori, kategori as "Ringan" | "Sedang" | "Berat"));
    }
    if (status && status !== "all") {
      conditions.push(eq(studentViolations.status, status as "Tercatat" | "Diproses BK" | "Selesai Dibina"));
    }
    if (search) {
      const s = `%${search}%`;
      conditions.push(
        or(
          like(students.namaLengkap, s),
          like(students.nis, s),
          like(violationTypes.namaPelanggaran, s),
          like(studentViolations.keterangan, s)
        )
      );
    }

    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    const rows = await baseQuery.orderBy(
      desc(studentViolations.tanggal),
      desc(studentViolations.createdAt)
    );

    return NextResponse.json({ violations: rows });
  } catch (error) {
    console.error("Error fetching violations:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pelanggaran" },
      { status: 500 }
    );
  }
}

// POST /api/violations — Catat pelanggaran baru siswa
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

    const parsed = await parseJsonBody(req, violationCreateSchema);
    if (!parsed.success) return parsed.response;
    const {
      studentId,
      violationTypeId,
      tanggal,
      poin,
      lokasi,
      keterangan,
      reportedByCustom,
    } = parsed.data;

    // Cek master violation type
    const [vType] = await db
      .select()
      .from(violationTypes)
      .where(eq(violationTypes.id, violationTypeId))
      .limit(1);

    if (!vType || !vType.isActive) {
      return NextResponse.json(
        { error: "Jenis pelanggaran tidak valid" },
        { status: 404 }
      );
    }

    // Tentukan poin: jika diinput manual pakai input, jika tidak pakai poinDefault
    const realPoint = typeof poin === "number" && poin >= 0 ? poin : vType.poinDefault;
    const realDate = tanggal || new Date().toISOString().split("T")[0];
    const reporterName = reportedByCustom || session.user.name || "Petugas Tata Tertib";

    const [inserted] = await db
      .insert(studentViolations)
      .values({
        studentId,
        violationTypeId,
        reportedBy: reporterName,
        tanggal: realDate,
        poin: realPoint,
        lokasi: lokasi || "Lingkungan Sekolah",
        keterangan: keterangan || "",
        status: "Tercatat",
      })
      .returning();

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
      userName: session.user.name || "Guru",
      userRole: appRole || "guru",
      action: "CREATE",
      module: "BUKU_POIN",
      targetId: studentId,
      targetName: targetStudent?.namaLengkap || "Siswa",
      description: `Mencatat pelanggaran tata tertib (${vType.namaPelanggaran}, ${realPoint} poin) untuk siswa ${targetStudent?.namaLengkap || "Siswa"}`,
      details: {
        violationId: inserted.id,
        kodePelanggaran: vType.kode,
        namaPelanggaran: vType.namaPelanggaran,
        poin: realPoint,
        lokasi: lokasi || "Lingkungan Sekolah",
      },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: "Catatan pelanggaran berhasil disimpan",
      violation: inserted,
    });
  } catch (error) {
    console.error("Error creating violation:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan pelanggaran" },
      { status: 500 }
    );
  }
}

