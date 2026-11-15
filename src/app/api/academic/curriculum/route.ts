import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { curriculumTargets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

// GET /api/academic/curriculum — Ambil seluruh target KKM kurikulum
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db.select().from(curriculumTargets).all();
    return NextResponse.json({ data: list });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat kurikulum";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/academic/curriculum — Simpan atau perbarui KKM & capaian mapel
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const mapel = body.mapel?.trim();
    const kkm = Number.isFinite(Number(body.kkm)) ? Number(body.kkm) : 75;
    const tingkat = body.tingkat?.trim() || "Semua";
    const capaianKompetensi = body.capaianKompetensi?.trim() || null;

    if (!mapel) {
      return NextResponse.json(
        { error: "Nama mata pelajaran wajib diisi" },
        { status: 400 }
      );
    }

    if (kkm < 0 || kkm > 100) {
      return NextResponse.json(
        { error: "Nilai KKM harus berada di antara 0 dan 100" },
        { status: 400 }
      );
    }

    // Periksa apakah mapel sudah ada di curriculum_targets
    const existing = await db
      .select()
      .from(curriculumTargets)
      .where(eq(curriculumTargets.mapel, mapel))
      .all();

    if (existing.length > 0) {
      await db
        .update(curriculumTargets)
        .set({
          kkm,
          tingkat,
          capaianKompetensi,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(curriculumTargets.mapel, mapel));
    } else {
      await db.insert(curriculumTargets).values({
        mapel,
        kkm,
        tingkat,
        capaianKompetensi,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: `KKM ${mapel} berhasil diperbarui (${kkm})`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan kurikulum";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

