import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { academicYears, spkCriteria, spkPublishStatus, spkResults } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateSPK } from "@/lib/spk";
import { DEFAULT_PERIODE } from "@/lib/utils";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/spk-criteria — list all criteria
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.select().from(spkCriteria).all();
  return NextResponse.json(result);
}

// PUT /api/spk-criteria — batch update bobot & auto-sync published leaderboard cache
export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown> | undefined)?.appRole as string | undefined;
  const isAdmin =
    session?.user?.role === "admin" ||
    session?.user?.role === "super_admin" ||
    getPortalForRole(appRole || "") === "/admin";

  if (!session || !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body: Array<{ id: string; bobot: number }> = await request.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: "Data bobot kriteria tidak valid" },
        { status: 400 }
      );
    }

    // Validate each weight is 0..100
    for (const item of body) {
      if (
        typeof item.bobot !== "number" ||
        !Number.isFinite(item.bobot) ||
        item.bobot < 0 ||
        item.bobot > 100
      ) {
        return NextResponse.json(
          { error: "Setiap bobot kriteria harus bernilai antara 0% hingga 100%" },
          { status: 400 }
        );
      }
    }

    // Validate total = 100
    const total = body.reduce((sum, c) => sum + c.bobot, 0);
    if (total !== 100) {
      return NextResponse.json(
        { error: `Total bobot harus 100%. Saat ini: ${total}%` },
        { status: 400 }
      );
    }

    // Update each criteria
    for (const item of body) {
      await db
        .update(spkCriteria)
        .set({ bobot: item.bobot })
        .where(eq(spkCriteria.id, item.id));
    }

    // Auto-sync cached spkResults if active period leaderboard is already published
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    const activePeriode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;

    const [pubStatus] = await db
      .select()
      .from(spkPublishStatus)
      .where(eq(spkPublishStatus.periode, activePeriode));

    if (pubStatus?.isPublished) {
      const recalculated = await calculateSPK("umum", activePeriode);
      await db.transaction(async (tx) => {
        await tx
          .delete(spkResults)
          .where(eq(spkResults.periode, activePeriode));
        if (recalculated.length > 0) {
          await tx.insert(spkResults).values(
            recalculated.map((r) => ({
              studentId: r.studentId,
              periode: activePeriode,
              kelas: r.kelas,
              rank: r.rank,
              rawScore: r.rawScore,
              persentase: r.persentase,
              details: JSON.stringify(r.detailRaw || {}),
            }))
          );
        }
      });
    }

    const updated = await db.select().from(spkCriteria).all();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan bobot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
