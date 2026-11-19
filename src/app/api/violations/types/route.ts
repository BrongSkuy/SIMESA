import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { violationTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq, desc, asc } from "drizzle-orm";

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

    const body = await req.json();
    const { id, kode, namaPelanggaran, kategori, poinDefault, deskripsiSanksi } = body;

    if (!kode || !namaPelanggaran || !kategori) {
      return NextResponse.json(
        { error: "Kode, nama pelanggaran, dan kategori wajib diisi" },
        { status: 400 }
      );
    }

    if (id) {
      // Update existing
      const [updated] = await db
        .update(violationTypes)
        .set({
          kode,
          namaPelanggaran,
          kategori,
          poinDefault: Number(poinDefault) || 10,
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

    // Insert new
    const [inserted] = await db
      .insert(violationTypes)
      .values({
        kode,
        namaPelanggaran,
        kategori,
        poinDefault: Number(poinDefault) || 10,
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

