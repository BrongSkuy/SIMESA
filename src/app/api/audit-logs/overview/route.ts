import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAuditSummary } from "@/lib/audit-server";

// GET /api/audit-logs/overview — Ringkasan statistik aktivitas sistem untuk Cockpit Banner
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
