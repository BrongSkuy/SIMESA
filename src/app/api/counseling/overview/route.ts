import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCounselingOverviewSummary } from "@/lib/counseling-server";

// GET /api/counseling/overview — Ringkasan statistik layanan konseling
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const summary = await getCounselingOverviewSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error fetching counseling overview:", error);
    return NextResponse.json(
      { error: "Gagal mengambil ringkasan statistik konseling" },
      { status: 500 }
    );
  }
}
