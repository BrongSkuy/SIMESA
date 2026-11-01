import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { teachers, students } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const appRole = (session.user as Record<string, unknown>)?.appRole as string;
  const body = await request.json();
  const { name, image } = body;

  try {
    const updateData: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) {
      updateData.name = name.trim();
    }
    if (typeof image === "string" || image === null) {
      updateData.image = image;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada data yang diperbarui" },
        { status: 400 }
      );
    }

    // Update in user table
    await db.update(user).set(updateData).where(eq(user.id, userId)).run();

    // If GURU, also sync teachers table
    if (appRole === "GURU") {
      const teacherUpdate: Record<string, unknown> = {};
      if (updateData.name) teacherUpdate.namaLengkap = updateData.name;
      if (updateData.image !== undefined) teacherUpdate.foto = updateData.image;
      if (Object.keys(teacherUpdate).length > 0) {
        await db
          .update(teachers)
          .set(teacherUpdate)
          .where(eq(teachers.userId, userId))
          .run();
      }
    }

    // If SISWA, also sync students table
    if (appRole === "SISWA") {
      const studentUpdate: Record<string, unknown> = {};
      if (updateData.name) studentUpdate.namaLengkap = updateData.name;
      if (updateData.image !== undefined) studentUpdate.foto = updateData.image;
      if (Object.keys(studentUpdate).length > 0) {
        await db
          .update(students)
          .set(studentUpdate)
          .where(eq(students.userId, userId))
          .run();
      }
    }

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

