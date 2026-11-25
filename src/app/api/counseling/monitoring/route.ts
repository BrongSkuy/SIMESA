import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPortalForRole } from "@/lib/rbac";
import { logActivity } from "@/lib/audit-server";
import { getLocalIsoDate, MONITORING_ASPECTS, type MonitoringAspect } from "@/lib/counseling";
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

    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    if (
      !studentId ||
      !aspekPengamatan ||
      !catatanPerkembangan ||
      !MONITORING_ASPECTS.includes(aspekPengamatan as MonitoringAspect)
    ) {
      return NextResponse.json(
        { error: "Siswa, aspek pengamatan yang valid, dan catatan perkembangan wajib diisi" },
        { status: 400 }
      );
    }

    const recordedBy = recordedByCustom || session.user.name || "Guru Pendamping";
    const realDate = tanggal || getLocalIsoDate();

    const created = await createStudentMonitoringLog({
      studentId,
      recordedBy,
      tanggal: realDate,
      aspekPengamatan,
      catatanPerkembangan,
      rekomendasi,
    });

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Guru Pendamping",
      userRole: appRole || "guru",
      action: "CREATE",
      module: "KONSELING_BK",
      targetId: studentId,
      targetName: "Catatan Pantauan Siswa",
      description: `Menambahkan catatan pantauan karakter (${aspekPengamatan})`,
      details: { monitoringId: created.id, aspekPengamatan },
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
