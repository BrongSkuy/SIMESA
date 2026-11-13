import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";
import { getClassReportSummary } from "@/lib/erapor";

export const dynamic = "force-dynamic";

// GET /api/erapor/class/[kelas]?periode=...
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ kelas: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { kelas } = await params;
  const decodedKelas = decodeURIComponent(kelas).trim();

  if (!decodedKelas) {
    return NextResponse.json(
      { error: "Parameter kelas wajib diisi" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const periode = searchParams.get("periode") || undefined;

  try {
    const summary = await getClassReportSummary(decodedKelas, periode);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat rekap rapor kelas";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
