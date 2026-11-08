import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { classes, teachers, students } from "@/db/schema";
import { eq } from "drizzle-orm";

const MAX_IMAGE_DATA_URI_LENGTH = 2_800_000; // ~2 MB decoded
const DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i;

function isValidProfileImage(image: unknown): boolean {
  if (image === null) return true;
  if (typeof image !== "string") return false;
  if (image.length > MAX_IMAGE_DATA_URI_LENGTH) return false;
  if (DATA_IMAGE_RE.test(image)) return true;
  if (image.startsWith("https://") && image.length <= 1024) return true;
  return false;
}

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const appRole = (session.user as Record<string, unknown>)?.appRole as string;

  let body: { name?: unknown; image?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Format payload tidak valid" },
      { status: 400 }
    );
  }

  const { name, image } = body;

  try {
    const updateData: { name?: string; image?: string | null } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { error: "Nama lengkap tidak boleh kosong" },
          { status: 400 }
        );
      }
      if (name.trim().length > 120) {
        return NextResponse.json(
          { error: "Nama lengkap maksimal 120 karakter" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (image !== undefined) {
      if (!isValidProfileImage(image)) {
        return NextResponse.json(
          {
            error:
              "Format foto profil tidak valid atau ukuran melebihi batas (maks 2 MB).",
          },
          { status: 400 }
        );
      }
      updateData.image = image as string | null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diperbarui" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx.update(user).set(updateData).where(eq(user.id, userId)).run();

      if (appRole === "GURU") {
        const [oldTeacher] = await tx
          .select()
          .from(teachers)
          .where(eq(teachers.userId, userId))
          .all();

        const teacherUpdate: { namaLengkap?: string; foto?: string | null } = {};
        if (updateData.name) teacherUpdate.namaLengkap = updateData.name;
        if (updateData.image !== undefined)
          teacherUpdate.foto = updateData.image;

        if (Object.keys(teacherUpdate).length > 0) {
          await tx
            .update(teachers)
            .set(teacherUpdate)
            .where(eq(teachers.userId, userId))
            .run();
        }

        // Sync classes.waliKelas so teacher homeroom links never become stale
        if (
          updateData.name &&
          oldTeacher &&
          oldTeacher.namaLengkap !== updateData.name
        ) {
          await tx
            .update(classes)
            .set({ waliKelas: updateData.name })
            .where(eq(classes.waliKelas, oldTeacher.namaLengkap))
            .run();
        }
      }

      if (appRole === "SISWA") {
        const studentUpdate: { namaLengkap?: string; foto?: string | null } = {};
        if (updateData.name) studentUpdate.namaLengkap = updateData.name;
        if (updateData.image !== undefined)
          studentUpdate.foto = updateData.image;

        if (Object.keys(studentUpdate).length > 0) {
          await tx
            .update(students)
            .set(studentUpdate)
            .where(eq(students.userId, userId))
            .run();
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Profil berhasil diperbarui",
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Gagal memperbarui profil";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
