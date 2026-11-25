import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { curriculumTargets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getUserFullRoles } from "@/lib/rbac-server";
import { logActivity } from "@/lib/audit-server";
import {
  DEFAULT_KKM_FALLBACK,
  DEFAULT_KKM_KEY,
  parseKkmNumber,
} from "@/lib/erapor-utils";

export const dynamic = "force-dynamic";

function extractIp(reqHeaders: Headers): string {
  return (
    reqHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    reqHeaders.get("x-real-ip") ||
    "127.0.0.1"
  );
}

// GET /api/academic/curriculum — Ambil KKM default dan daftar target KKM per mapel (Semua role login)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const list = await db.select().from(curriculumTargets).all();
    const defaultRow = list.find((item) => item.mapel === DEFAULT_KKM_KEY);
    const defaultKkm = defaultRow ? defaultRow.kkm : DEFAULT_KKM_FALLBACK;
    const perMapel = list.filter((item) => item.mapel !== DEFAULT_KKM_KEY);

    return NextResponse.json({
      defaultKkm,
      data: perMapel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal memuat kurikulum";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/academic/curriculum — Simpan KKM default atau per mapel (Khusus SUPERADMIN dan ADMIN)
export async function POST(request: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allRoles } = await getUserFullRoles(session.user.id);
  const canEditKkm = allRoles.some(
    (r) => r === "SUPERADMIN" || r === "ADMIN"
  );
  if (!canEditKkm) {
    return NextResponse.json(
      {
        error:
          "Akses ditolak. Hanya Administrator yang berwenang mengubah angka KKM.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const ipAddress = extractIp(reqHeaders);
    const userRole =
      ((session.user as Record<string, unknown>).appRole as string) || "admin";

    // Mode 1: Ubah KKM Default Sekolah
    if (body.type === "default") {
      const kkm = parseKkmNumber(body.kkm);
      if (kkm === null || kkm < 1 || kkm > 100) {
        return NextResponse.json(
          { error: "Nilai KKM default harus berupa bilangan bulat antara 1 sampai 100" },
          { status: 400 }
        );
      }

      const existingDefault = await db
        .select()
        .from(curriculumTargets)
        .where(eq(curriculumTargets.mapel, DEFAULT_KKM_KEY))
        .all();

      if (existingDefault.length > 0) {
        await db
          .update(curriculumTargets)
          .set({
            kkm,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(curriculumTargets.mapel, DEFAULT_KKM_KEY));
      } else {
        await db.insert(curriculumTargets).values({
          mapel: DEFAULT_KKM_KEY,
          kkm,
          tingkat: "Semua",
          capaianKompetensi: "Standar KKM Default Sekolah",
          updatedAt: new Date().toISOString(),
        });
      }

      await logActivity({
        userId: session.user.id,
        userName: session.user.name || "Administrator",
        userRole,
        action: "UPDATE",
        module: "AKADEMIK_NILAI",
        targetId: DEFAULT_KKM_KEY,
        targetName: "KKM Default Sekolah",
        description: `Mengubah standar KKM default sekolah menjadi ${kkm}`,
        details: { defaultKkm: kkm },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        defaultKkm: kkm,
        message: `KKM default sekolah berhasil diperbarui menjadi ${kkm}`,
      });
    }

    // Mode 2: Reset KKM per mapel kembali ke Default Sekolah
    const mapel = typeof body.mapel === "string" ? body.mapel.trim() : "";
    if (!mapel || mapel === DEFAULT_KKM_KEY) {
      return NextResponse.json(
        { error: "Nama mata pelajaran wajib diisi" },
        { status: 400 }
      );
    }

    const allExisting = await db.select().from(curriculumTargets).all();
    const matchedRow = allExisting.find(
      (item) =>
        item.mapel !== DEFAULT_KKM_KEY &&
        item.mapel.trim().toLowerCase() === mapel.toLowerCase()
    );

    if (body.resetToDefault === true) {
      if (matchedRow) {
        await db
          .delete(curriculumTargets)
          .where(eq(curriculumTargets.id, matchedRow.id));
      }

      await logActivity({
        userId: session.user.id,
        userName: session.user.name || "Administrator",
        userRole,
        action: "UPDATE",
        module: "AKADEMIK_NILAI",
        targetId: matchedRow?.id || null,
        targetName: mapel,
        description: `Mengembalikan KKM mata pelajaran ${mapel} ke standar default sekolah`,
        details: { mapel, resetToDefault: true },
        ipAddress,
      });

      return NextResponse.json({
        success: true,
        message: `KKM ${mapel} dikembalikan ke standar default sekolah`,
      });
    }

    // Mode 3: Simpan atau perbarui KKM khusus per mapel
    const kkm = parseKkmNumber(body.kkm);
    if (kkm === null || kkm < 1 || kkm > 100) {
      return NextResponse.json(
        { error: "Nilai KKM harus berupa bilangan bulat antara 1 sampai 100" },
        { status: 400 }
      );
    }

    const tingkat =
      typeof body.tingkat === "string" && body.tingkat.trim()
        ? body.tingkat.trim()
        : "Semua";
    const capaianKompetensi =
      typeof body.capaianKompetensi === "string" &&
      body.capaianKompetensi.trim()
        ? body.capaianKompetensi.trim()
        : null;

    if (matchedRow) {
      await db
        .update(curriculumTargets)
        .set({
          mapel,
          kkm,
          tingkat,
          capaianKompetensi,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(curriculumTargets.id, matchedRow.id));
    } else {
      await db.insert(curriculumTargets).values({
        mapel,
        kkm,
        tingkat,
        capaianKompetensi,
        updatedAt: new Date().toISOString(),
      });
    }

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Administrator",
      userRole,
      action: "UPDATE",
      module: "AKADEMIK_NILAI",
      targetId: matchedRow?.id || null,
      targetName: mapel,
      description: `Menetapkan KKM khusus mata pelajaran ${mapel} menjadi ${kkm}`,
      details: { mapel, kkm, capaianKompetensi },
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: `KKM ${mapel} berhasil diperbarui (${kkm})`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menyimpan kurikulum";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
