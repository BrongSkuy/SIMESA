import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/db";
import { studentViolations, students } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { getPortalForRole } from "@/lib/rbac";
import { logActivity } from "@/lib/audit-server";

const ALLOWED_STATUSES = ["Tercatat", "Diproses BK", "Selesai Dibina"] as const;

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
    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: "Status pembinaan tidak valid" },
          { status: 400 }
        );
      }
      updateData.status = status;
    }
    if (tindakLanjut !== undefined) updateData.tindakLanjut = tindakLanjut;
    if (poin !== undefined) {
      if (!Number.isInteger(poin) || poin < 1 || poin > 100) {
        return NextResponse.json(
          { error: "Bobot poin harus berupa bilangan bulat antara 1 sampai 100" },
          { status: 400 }
        );
      }
      updateData.poin = poin;
    }
    if (keterangan !== undefined) updateData.keterangan = keterangan;
    if (lokasi !== undefined) updateData.lokasi = lokasi;

    const [updated] = await db
      .update(studentViolations)
      .set(updateData)
      .where(eq(studentViolations.id, id))
      .returning();

    const [targetStudent] = await db
      .select({ namaLengkap: students.namaLengkap })
      .from(students)
      .where(eq(students.id, existing.studentId))
      .limit(1);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Guru",
      userRole: appRole || "guru",
      action: "UPDATE",
      module: "BUKU_POIN",
      targetId: existing.studentId,
      targetName: targetStudent?.namaLengkap || "Siswa",
      description: `Memperbarui status pelanggaran siswa ${targetStudent?.namaLengkap || "Siswa"} menjadi ${updated.status}`,
      details: {
        violationId: id,
        previousStatus: existing.status,
        newStatus: updated.status,
        poin: updated.poin,
      },
    });

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
    const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
    const portal = getPortalForRole(appRole || "");
    if (portal !== "/admin" && portal !== "/guru") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const [targetStudent] = await db
      .select({ namaLengkap: students.namaLengkap })
      .from(students)
      .where(eq(students.id, existing.studentId))
      .limit(1);

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Guru",
      userRole: appRole || "guru",
      action: "DELETE",
      module: "BUKU_POIN",
      targetId: existing.studentId,
      targetName: targetStudent?.namaLengkap || "Siswa",
      description: `Menghapus catatan pelanggaran (${existing.poin} poin) milik siswa ${targetStudent?.namaLengkap || "Siswa"}`,
      details: {
        violationId: id,
        poin: existing.poin,
        status: existing.status,
      },
    });

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

