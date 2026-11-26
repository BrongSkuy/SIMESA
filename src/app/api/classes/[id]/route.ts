import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, classUpdateSchema } from "@/lib/api-validation";
import { db } from "@/db";
import {
  classes,
  students,
  subjects,
  spkGradingCategories,
  spkResults,
} from "@/db/schema";
import { userRoles } from "@/db/auth-schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole, parseRoleMetadata } from "@/lib/rbac";

// PUT /api/classes/[id] — update class and cascade rename across related tables
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
  const parsed = await parseJsonBody(request, classUpdateSchema);
  if (!parsed.success) return parsed.response;
  const body = parsed.data;
  const { namaKelas, tingkat } = body;

  try {
    const updated = await db.transaction(async (tx) => {
      const [oldClass] = await tx
        .select()
        .from(classes)
        .where(eq(classes.id, id))
        .all();

      if (!oldClass) {
        throw new Error("NOT_FOUND");
      }

      if (oldClass.namaKelas.toLowerCase() !== namaKelas.toLowerCase()) {
        const allClasses = await tx.select().from(classes).all();
        const duplicate = allClasses.find(
          (c) =>
            c.id !== id &&
            c.namaKelas.toLowerCase().trim() === namaKelas.toLowerCase()
        );
        if (duplicate) {
          throw new Error("DUPLICATE_CLASS");
        }
      }

      const [updatedRow] = await tx
        .update(classes)
        .set({
          namaKelas,
          tingkat,
          waliKelas: body.waliKelas || null,
        })
        .where(eq(classes.id, id))
        .returning();

      // Cascade class rename to students, subjects, spkGradingCategories, and spkResults
      if (oldClass.namaKelas !== namaKelas) {
        await tx
          .update(students)
          .set({ kelas: namaKelas })
          .where(eq(students.kelas, oldClass.namaKelas))
          .run();

        await tx
          .update(spkGradingCategories)
          .set({ kelas: namaKelas })
          .where(eq(spkGradingCategories.kelas, oldClass.namaKelas))
          .run();

        await tx
          .update(spkResults)
          .set({ kelas: namaKelas })
          .where(eq(spkResults.kelas, oldClass.namaKelas))
          .run();

        const allSubjects = await tx.select().from(subjects).all();
        for (const subj of allSubjects) {
          if (!subj.kelasDiampu) continue;
          const parts = subj.kelasDiampu
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean);
          if (parts.includes(oldClass.namaKelas)) {
            const newParts = parts.map((k) =>
              k === oldClass.namaKelas ? namaKelas : k
            );
            await tx
              .update(subjects)
              .set({ kelasDiampu: newParts.join(", ") })
              .where(eq(subjects.id, subj.id))
              .run();
          }
        }

        const waliRoleRows = await tx
          .select()
          .from(userRoles)
          .where(eq(userRoles.role, "WALI_KELAS"))
          .all();
        for (const wr of waliRoleRows) {
          const meta = parseRoleMetadata(wr.metadata);
          if (meta.kelas === oldClass.namaKelas) {
            await tx
              .update(userRoles)
              .set({ metadata: JSON.stringify({ ...meta, kelas: namaKelas }) })
              .where(eq(userRoles.id, wr.id))
              .run();
          }
        }
      }

      return updatedRow;
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "DUPLICATE_CLASS") {
      return NextResponse.json(
        { error: `Kelas '${namaKelas}' sudah terdaftar` },
        { status: 400 }
      );
    }
    const message =
      error instanceof Error ? error.message : "Gagal mengupdate kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/classes/[id] — delete class
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
    // Check if class exists and get its name
    const [classToDelete] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, id));

    if (!classToDelete) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check for related students (prevent orphan data)
    const [studentCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(students)
      .where(eq(students.kelas, classToDelete.namaKelas));

    if (studentCount.count > 0) {
      return NextResponse.json(
        {
          error:
            "Tidak dapat menghapus kelas karena masih ada siswa yang terdaftar di kelas ini.",
        },
        { status: 400 }
      );
    }

    const [deleted] = await db
      .delete(classes)
      .where(eq(classes.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted: deleted });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal menghapus kelas";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
