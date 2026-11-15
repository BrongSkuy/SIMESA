import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { studentViolations } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/violations/[id] — Update status / tindak lanjut pembinaan
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, tindakLanjut, poin, keterangan, lokasi } = body;

    const [existing] = await db
      .select()
      .from(studentViolations)
      .where(eq(studentViolations.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Catatan pelanggaran tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData: Partial<typeof studentViolations.$inferInsert> = {};
    if (status) updateData.status = status;
    if (tindakLanjut !== undefined) updateData.tindakLanjut = tindakLanjut;
    if (typeof poin === "number") updateData.poin = poin;
    if (keterangan !== undefined) updateData.keterangan = keterangan;
    if (lokasi !== undefined) updateData.lokasi = lokasi;

    const [updated] = await db
      .update(studentViolations)
      .set(updateData)
      .where(eq(studentViolations.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Data pelanggaran berhasil diperbarui",
      violation: updated,
    });
  } catch (error) {
    console.error("Error updating violation:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui catatan pelanggaran" },
      { status: 500 }
    );
  }
}

// DELETE /api/violations/[id] — Hapus / batalkan catatan pelanggaran
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [existing] = await db
      .select()
      .from(studentViolations)
      .where(eq(studentViolations.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Catatan pelanggaran tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.delete(studentViolations).where(eq(studentViolations.id, id));

    return NextResponse.json({
      success: true,
      message: "Catatan pelanggaran berhasil dihapus",
    });
  } catch (error) {
    console.error("Error deleting violation:", error);
    return NextResponse.json(
      { error: "Gagal menghapus catatan pelanggaran" },
      { status: 500 }
    );
  }
}

