import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  getDispensationLetters,
  createDispensationLetter,
  updateDispensationLetter,
} from "@/lib/counseling-server";
import { logActivity } from "@/lib/audit-server";

// GET /api/counseling/dispensation — Mengambil daftar surat dispensasi kelas
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || undefined;
    const kelas = searchParams.get("kelas") || undefined;
    const statusDispensasi = searchParams.get("statusDispensasi") || undefined;
    const tanggal = searchParams.get("tanggal") || undefined;

    const letters = await getDispensationLetters({
      studentId,
      kelas,
      statusDispensasi,
      tanggal,
    });

    return NextResponse.json(letters);
  } catch (error) {
    console.error("Error fetching dispensations:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar surat dispensasi" },
      { status: 500 }
    );
  }
}

// POST /api/counseling/dispensation — Menerbitkan surat dispensasi kelas baru
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
      jamMulai,
      jamSelesai,
      keperluan,
      keterangan,
      diterbitkanOlehCustom,
    } = body;

    if (!studentId || !jamMulai || !jamSelesai || !keperluan) {
      return NextResponse.json(
        { error: "Semua kolom bertanda bintang wajib diisi" },
        { status: 400 }
      );
    }

    const diterbitkanOleh = diterbitkanOlehCustom || session.user.name || "Petugas BK";
    const realDate = tanggal || new Date().toISOString().split("T")[0];

    const created = await createDispensationLetter({
      studentId,
      tanggal: realDate,
      jamMulai,
      jamSelesai,
      keperluan,
      keterangan,
      diterbitkanOleh,
    });

    // Catat ke riwayat aktivitas (audit trail)
    const [targetStudent] = await db
      .select({ namaLengkap: students.namaLengkap })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Petugas BK",
      userRole: (session.user as any).role || "guru_bk",
      action: "APPROVE",
      module: "KONSELING_BK",
      targetId: studentId,
      targetName: targetStudent?.namaLengkap || "Siswa",
      description: `Menerbitkan Surat Dispensasi (${created.nomorSurat}) untuk siswa ${targetStudent?.namaLengkap || "Siswa"}`,
      details: {
        dispensationId: created.id,
        nomorSurat: created.nomorSurat,
        keperluan,
        jamMulai,
        jamSelesai,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating dispensation:", error);
    return NextResponse.json(
      { error: "Gagal menerbitkan surat dispensasi" },
      { status: 500 }
    );
  }
}

// PATCH /api/counseling/dispensation — Memperbarui status surat dispensasi
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, statusDispensasi, keterangan } = body;

    if (!id || !statusDispensasi) {
      return NextResponse.json(
        { error: "ID surat dan status baru wajib ditentukan" },
        { status: 400 }
      );
    }

    const updated = await updateDispensationLetter(id, {
      statusDispensasi,
      keterangan,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating dispensation:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui status dispensasi" },
      { status: 500 }
    );
  }
}
