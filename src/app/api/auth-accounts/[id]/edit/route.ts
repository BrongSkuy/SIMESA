import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/auth-schema";
import { students, teachers, classes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

// PUT /api/auth-accounts/[id]/edit — edit name and username
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

  const cleanName = typeof body.name === "string" ? body.name.trim() : "";
  const cleanUsername =
    typeof body.username === "string" && body.username.trim()
      ? body.username.trim()
      : null;

  if (!cleanName) {
    return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
  }

  try {
    // Check if username is already taken by another user
    if (cleanUsername) {
      const existingUsers = await db
        .select()
        .from(user)
        .where(eq(user.username, cleanUsername))
        .all();
      const duplicateUser = existingUsers.find((u) => u.id !== id);
      if (duplicateUser) {
        return NextResponse.json(
          { error: "Username (NIS/NIP) tersebut sudah digunakan oleh akun lain" },
          { status: 400 }
        );
      }
    }

    const result = await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select()
        .from(user)
        .where(eq(user.id, id))
        .all();

      if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
      }

      const appRole = (existingUser as Record<string, unknown>).appRole;
      const userUpdate: Record<string, unknown> = {
        name: cleanName,
        username: cleanUsername,
        displayUsername: cleanUsername,
      };

      if (cleanUsername) {
        if (appRole === "SISWA") {
          userUpdate.email = `${cleanUsername}@siswa.sekolah.id`;
        } else if (appRole === "GURU") {
          userUpdate.email = `${cleanUsername}@sekolah.id`;
        }
      }

      const [updated] = await tx
        .update(user)
        .set(userUpdate)
        .where(eq(user.id, id))
        .returning();

      // Sync name and username (NIS/NIP) to students/teachers table
      if (appRole === "SISWA") {
        const syncPayload: Record<string, unknown> = { namaLengkap: cleanName };
        if (cleanUsername) {
          syncPayload.nis = cleanUsername;
        }
        await tx
          .update(students)
          .set(syncPayload)
          .where(eq(students.userId, id))
          .run();
      } else if (appRole === "GURU") {
        const [oldTeacher] = await tx
          .select()
          .from(teachers)
          .where(eq(teachers.userId, id))
          .all();

        const syncPayload: Record<string, unknown> = { namaLengkap: cleanName };
        if (cleanUsername) {
          syncPayload.nip = cleanUsername;
        }
        await tx
          .update(teachers)
          .set(syncPayload)
          .where(eq(teachers.userId, id))
          .run();

        // Sync classes.waliKelas if teacher's name changed
        if (oldTeacher && oldTeacher.namaLengkap !== cleanName) {
          await tx
            .update(classes)
            .set({ waliKelas: cleanName })
            .where(eq(classes.waliKelas, oldTeacher.namaLengkap))
            .run();
        }
      }

      return updated;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }
    const message = error instanceof Error ? error.message : "Gagal mengupdate profil akun";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
