import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { violationTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { getUserFullRoles } from "@/lib/rbac-server";
import { logActivity } from "@/lib/audit-server";
import {
  SANCTION_THRESHOLDS,
  THRESHOLDS_CONFIG_CODE,
  validateSanctionThresholds,
} from "@/lib/violations";
import { getSanctionThresholds } from "@/lib/violations-server";

export const dynamic = "force-dynamic";

// GET /api/violations/thresholds — Ambil ambang batas meter poin aktif
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const thresholds = await getSanctionThresholds();
    return NextResponse.json({ thresholds });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal memuat pengaturan ambang poin";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/violations/thresholds — Simpan pengaturan ambang batas meter poin (Khusus SUPERADMIN dan ADMIN)
export async function POST(req: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allRoles } = await getUserFullRoles(session.user.id);
  const canEdit = allRoles.some((r) => r === "SUPERADMIN" || r === "ADMIN");
  if (!canEdit) {
    return NextResponse.json(
      {
        error:
          "Akses ditolak. Hanya Administrator yang berwenang mengatur ambang batas meter poin.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const targetInput =
      body.resetToDefault === true ? SANCTION_THRESHOLDS : body;
    const validation = validateSanctionThresholds(targetInput);

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const nextThresholds = validation.data;
    const serialized = JSON.stringify(nextThresholds);

    const [existing] = await db
      .select({ id: violationTypes.id })
      .from(violationTypes)
      .where(eq(violationTypes.kode, THRESHOLDS_CONFIG_CODE))
      .limit(1);

    if (existing) {
      await db
        .update(violationTypes)
        .set({
          poinDefault: nextThresholds.SP_3,
          deskripsiSanksi: serialized,
          isActive: false,
        })
        .where(eq(violationTypes.id, existing.id));
    } else {
      await db.insert(violationTypes).values({
        kode: THRESHOLDS_CONFIG_CODE,
        namaPelanggaran: "Konfigurasi Ambang Batas Meter Poin",
        kategori: "Ringan",
        poinDefault: nextThresholds.SP_3,
        deskripsiSanksi: serialized,
        isActive: false,
      });
    }

    const ipAddress =
      reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      reqHeaders.get("x-real-ip") ||
      "127.0.0.1";
    const userRole =
      ((session.user as Record<string, unknown>).appRole as string) || "admin";

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Administrator",
      userRole,
      action: "UPDATE",
      module: "BUKU_POIN",
      targetId: THRESHOLDS_CONFIG_CODE,
      targetName: "Ambang Batas Meter Poin",
      description: `Memperbarui ambang batas meter poin (Pembinaan: ${nextThresholds.PEMBINAAN_LISAN}, SP 1: ${nextThresholds.SP_1}, SP 2: ${nextThresholds.SP_2}, SP 3: ${nextThresholds.SP_3})`,
      details: nextThresholds as unknown as Record<string, unknown>,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      thresholds: nextThresholds,
      message: "Ambang batas meter poin kedisiplinan berhasil diperbarui",
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Gagal menyimpan ambang batas meter poin";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
