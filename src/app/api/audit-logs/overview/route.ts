import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getUserFullRoles } from "@/lib/rbac-server";
import { getAuditSummary } from "@/lib/audit-server";

// GET /api/audit-logs/overview — Ringkasan statistik aktivitas sistem untuk Cockpit Banner
// Hak akses terbatas khusus untuk: SUPERADMIN, ADMIN, dan KEPALA_SEKOLAH
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allRoles } = await getUserFullRoles(session.user.id);
    const hasAccess = allRoles.some((r) =>
      ["SUPERADMIN", "ADMIN", "KEPALA_SEKOLAH"].includes(r)
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          error:
            "Akses ditolak. Fitur ini hanya dapat diakses oleh Superadmin, Admin, dan Kepala Sekolah.",
        },
        { status: 403 }
      );
    }

    const summary = await getAuditSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error in GET /api/audit-logs/overview:", error);
    return NextResponse.json(
      { error: "Gagal mengambil ringkasan statistik riwayat aktivitas" },
      { status: 500 }
    );
  }
}
