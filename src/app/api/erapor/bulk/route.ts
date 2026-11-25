import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { classes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";
import { getBulkStudentReportCards } from "@/lib/erapor";

export const dynamic = "force-dynamic";

// GET /api/erapor/bulk?kelas=all|X-A,X-B&statusRapor=all&ketuntasan=all&sortBy=nama_asc
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as
    | string
    | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const rawKelas = (searchParams.get("kelas") || "all").trim();
  const statusRapor = searchParams.get("statusRapor") || "all";
  const ketuntasan = searchParams.get("ketuntasan") || "all";
  const sortBy = searchParams.get("sortBy") || "nama_asc";
  const periode = searchParams.get("periode") || undefined;

  try {
    const allClasses = await db.select({ namaKelas: classes.namaKelas }).from(classes).all();
    const validClassNames = allClasses.map((c) => c.namaKelas);

    let targetKelasList: string[];
    if (!rawKelas || rawKelas === "all") {
      targetKelasList = validClassNames;
    } else {
      const requested = rawKelas
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const validSet = new Set(validClassNames);
      targetKelasList = requested.filter((k) => validSet.has(k));
    }

    const result = await getBulkStudentReportCards({
      kelasList: targetKelasList,
      statusRapor,
      ketuntasan,
      sortBy,
      periode,
    });

    return NextResponse.json({
      total: result.reports.length,
      periode: result.periode,
      defaultKkm: result.defaultKkm,
      reports: result.reports,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal memuat data cetak massal rapor";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
