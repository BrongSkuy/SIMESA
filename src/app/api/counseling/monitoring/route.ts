import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  getStudentMonitoringLogs,
  createStudentMonitoringLog,
} from "@/lib/counseling-server";

// GET /api/counseling/monitoring — Mengambil log pemantauan perkembangan karakter siswa
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId") || undefined;
    const kelas = searchParams.get("kelas") || undefined;
    const aspekPengamatan = searchParams.get("aspekPengamatan") || undefined;

    const logs = await getStudentMonitoringLogs({
      studentId,
      kelas,
      aspekPengamatan,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching monitoring logs:", error);
    return NextResponse.json(
      { error: "Gagal mengambil catatan pemantauan siswa" },
      { status: 500 }
    );
  }
}

// POST /api/counseling/monitoring — Menambahkan catatan pemantauan baru
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
      aspekPengamatan,
      catatanPerkembangan,
      rekomendasi,
      recordedByCustom,
    } = body;

    if (!studentId || !aspekPengamatan || !catatanPerkembangan) {
      return NextResponse.json(
        { error: "Siswa, aspek pengamatan, dan catatan perkembangan wajib diisi" },
        { status: 400 }
      );
    }

    const recordedBy = recordedByCustom || session.user.name || "Guru Pendamping";
    const realDate = tanggal || new Date().toISOString().split("T")[0];

    const created = await createStudentMonitoringLog({
      studentId,
      recordedBy,
      tanggal: realDate,
      aspekPengamatan,
      catatanPerkembangan,
      rekomendasi,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating monitoring log:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan pemantauan siswa" },
      { status: 500 }
    );
  }
}
