import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  subjects,
  attendance,
  spkScores,
  spkGradingCategories,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

// PUT /api/subjects/[id] — update subject and cascade rename across attendance & scores
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const namaMapel = String(body.namaMapel || "").trim();

  if (!namaMapel) {
    return NextResponse.json(
      { error: "Nama mata pelajaran wajib diisi" },
      { status: 400 }
    );
  }

  try {
    const updated = await db.transaction(async (tx) => {
      const [oldSubject] = await tx
        .select()
        .from(subjects)
        .where(eq(subjects.id, id))
        .all();

      if (!oldSubject) {
        throw new Error("NOT_FOUND");
      }

      if (oldSubject.namaMapel.toLowerCase() !== namaMapel.toLowerCase()) {
        const allSubjects = await tx.select().from(subjects).all();
        const duplicate = allSubjects.find(
          (s) =>
            s.id !== id &&
            s.namaMapel.toLowerCase().trim() === namaMapel.toLowerCase()
        );
        if (duplicate) {
          throw new Error("DUPLICATE_SUBJECT");
        }
      }

      const [updatedRow] = await tx
        .update(subjects)
        .set({
          namaMapel,
          teacherId: body.teacherId || null,
          kelasDiampu: body.kelasDiampu || null,
        })
        .where(eq(subjects.id, id))
        .returning();

      // Sync subject rename across attendance, spkScores, and spkGradingCategories
      if (oldSubject.namaMapel !== namaMapel) {
        await tx
          .update(attendance)
          .set({ mapel: namaMapel })
          .where(eq(attendance.mapel, oldSubject.namaMapel))
          .run();

        await tx
          .update(spkScores)
          .set({ mapel: namaMapel })
          .where(eq(spkScores.mapel, oldSubject.namaMapel))
          .run();

        await tx
          .update(spkGradingCategories)
          .set({ mapel: namaMapel })
          .where(eq(spkGradingCategories.mapel, oldSubject.namaMapel))
          .run();
      }

      return updatedRow;
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Mata pelajaran tidak ditemukan" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "DUPLICATE_SUBJECT") {
      return NextResponse.json(
        { error: `Mata pelajaran '${namaMapel}' sudah terdaftar` },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Gagal mengupdate pelajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/subjects/[id] — delete subject
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const [targetSubject] = await db
      .select()
      .from(subjects)
      .where(eq(subjects.id, id))
      .all();

    if (!targetSubject) {
      return NextResponse.json(
        { error: "Mata pelajaran tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check references in attendance table
    const attendanceRefs = await db
      .select()
      .from(attendance)
      .where(eq(attendance.mapel, targetSubject.namaMapel))
      .limit(1)
      .all();

    // Check references in spkScores table
    const scoreRefs = await db
      .select()
      .from(spkScores)
      .where(eq(spkScores.mapel, targetSubject.namaMapel))
      .limit(1)
      .all();

    if (attendanceRefs.length > 0 || scoreRefs.length > 0) {
      return NextResponse.json(
        {
          error:
            "Tidak dapat menghapus mata pelajaran karena memiliki data absensi atau nilai aktif.",
        },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(subjects)
      .where(eq(subjects.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Mata pelajaran tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus pelajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
