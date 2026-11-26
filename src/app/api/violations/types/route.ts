import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { violationTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, asc } from "drizzle-orm";
import { THRESHOLDS_CONFIG_CODE } from "@/lib/violations";
import { getPortalForRole } from "@/lib/rbac";
import { parseJsonBody, violationTypePostSchema } from "@/lib/api-validation";

// GET /api/violations/types — Ambil katalog jenis pelanggaran
export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const types = await db
      .select()
      .from(violationTypes)
      .where(eq(violationTypes.isActive, true))
      .orderBy(asc(violationTypes.kategori), asc(violationTypes.kode));

    return NextResponse.json({ types });
  } catch (error) {
    console.error("Error fetching violation types:", error);
    return NextResponse.json(
      { error: "Gagal mengambil katalog jenis pelanggaran" },
      { status: 500 }
    );
  }
}

// POST /api/violations/types — Tambah atau perbarui jenis pelanggaran (konfigurasi master)
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

    const parsed = await parseJsonBody(req, violationTypePostSchema);
    if (!parsed.success) return parsed.response;
    const { id, kode, namaPelanggaran, kategori, poinDefault, deskripsiSanksi } =
      parsed.data;

    const normalizedKode = kode;
    const parsedPoin = poinDefault;

    if (normalizedKode === THRESHOLDS_CONFIG_CODE) {
      return NextResponse.json(
        { error: "Kode aturan ini dicadangkan oleh sistem" },
        { status: 400 }
      );
    }

    if (id) {
      const [existingRule] = await db
        .select({ id: violationTypes.id, kode: violationTypes.kode })
        .from(violationTypes)
        .where(eq(violationTypes.id, id))
        .limit(1);

      if (!existingRule || existingRule.kode === THRESHOLDS_CONFIG_CODE) {
        return NextResponse.json(
          { error: "Aturan pelanggaran tidak ditemukan" },
          { status: 404 }
        );
      }

      // Cek bentrok kode dengan aturan lain
      const [duplicate] = await db
        .select({ id: violationTypes.id })
        .from(violationTypes)
        .where(eq(violationTypes.kode, normalizedKode))
        .limit(1);

      if (duplicate && duplicate.id !== id) {
        return NextResponse.json(
          { error: `Kode aturan ${normalizedKode} sudah digunakan` },
          { status: 409 }
        );
      }

      // Update existing
      const [updated] = await db
        .update(violationTypes)
        .set({
          kode: normalizedKode,
          namaPelanggaran,
          kategori,
          poinDefault: parsedPoin,
          deskripsiSanksi: deskripsiSanksi || "",
        })
        .where(eq(violationTypes.id, id))
        .returning();

      return NextResponse.json({
        success: true,
        message: "Jenis pelanggaran berhasil diperbarui",
        type: updated,
      });
    }

    // Cek kode unik sebelum insert baru
    const [existingByKode] = await db
      .select({ id: violationTypes.id })
      .from(violationTypes)
      .where(eq(violationTypes.kode, normalizedKode))
      .limit(1);

    if (existingByKode) {
      return NextResponse.json(
        { error: `Kode aturan ${normalizedKode} sudah terdaftar` },
        { status: 409 }
      );
    }

    // Insert new
    const [inserted] = await db
      .insert(violationTypes)
      .values({
        kode: normalizedKode,
        namaPelanggaran,
        kategori,
        poinDefault: parsedPoin,
        deskripsiSanksi: deskripsiSanksi || "",
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Jenis pelanggaran berhasil ditambahkan",
      type: inserted,
    });
  } catch (error) {
    console.error("Error saving violation type:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan jenis pelanggaran" },
      { status: 500 }
    );
  }
}

