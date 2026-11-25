import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, userRoles } from "@/db/auth-schema";
import { students, teachers, classes } from "@/db/schema";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  APP_ROLES,
  isTeacherCategoryRole,
  parseRoleMetadata,
  sanitizeAdditionalTeacherRoles,
  type AppRole,
} from "@/lib/rbac";
import {
  getRequestIp,
  getUserFullRoles,
  syncWaliKelasAssignment,
} from "@/lib/rbac-server";
import { logActivity } from "@/lib/audit-server";

// PUT /api/auth-accounts/[id]/edit — edit profil, peran utama, dan peran tambahan akun
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allRoles } = await getUserFullRoles(session.user.id);
  const isSuperadmin = allRoles.includes("SUPERADMIN");
  const isAdmin = allRoles.includes("ADMIN");

  if (!isSuperadmin && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const wantsRoleChange =
    body.appRole !== undefined || body.additionalRoles !== undefined;

  if (wantsRoleChange && !isSuperadmin) {
    return NextResponse.json(
      {
        error:
          "Akses ditolak. Hanya Superadmin yang berwenang mengubah peran atau hak akses pengguna.",
      },
      { status: 403 }
    );
  }

  const cleanName = typeof body.name === "string" ? body.name.trim() : "";
  const cleanUsername =
    typeof body.username === "string" && body.username.trim()
      ? body.username.trim()
      : null;

  if (!cleanName) {
    return NextResponse.json(
      { error: "Nama wajib diisi" },
      { status: 400 }
    );
  }

  if (cleanUsername && cleanUsername.length < 4) {
    return NextResponse.json(
      { error: "Username login minimal harus 4 karakter" },
      { status: 400 }
    );
  }

  try {
    // Cek duplikasi username
    if (cleanUsername) {
      const existingUsers = await db
        .select()
        .from(user)
        .where(eq(user.username, cleanUsername))
        .all();
      const duplicateUser = existingUsers.find((u) => u.id !== id);
      if (duplicateUser) {
        return NextResponse.json(
          {
            error:
              "Username (NIS atau NIP) tersebut sudah digunakan oleh akun lain",
          },
          { status: 400 }
        );
      }
    }

    const txResult = await db.transaction(async (tx) => {
      const [existingUser] = await tx
        .select()
        .from(user)
        .where(eq(user.id, id))
        .all();

      if (!existingUser) {
        throw new Error("USER_NOT_FOUND");
      }

      if (existingUser.username && !cleanUsername && body.username !== undefined) {
        throw new Error("EMPTY_USERNAME");
      }

      const currentAppRole = (
        (existingUser.appRole as string) || "SISWA"
      ).toUpperCase() as AppRole;

      const nextAppRole: AppRole =
        body.appRole !== undefined
          ? (String(body.appRole).toUpperCase().trim() as AppRole)
          : currentAppRole;

      if (!APP_ROLES.includes(nextAppRole)) {
        throw new Error("INVALID_ROLE");
      }

      if (id === session.user.id && nextAppRole !== currentAppRole) {
        throw new Error("SELF_ROLE_CHANGE");
      }

      const involvesStudentToggle =
        (currentAppRole === "SISWA" && nextAppRole !== "SISWA") ||
        (currentAppRole !== "SISWA" && nextAppRole === "SISWA");

      if (involvesStudentToggle) {
        throw new Error("SISWA_ROLE_LOCK");
      }

      if (
        currentAppRole === "SISWA" &&
        Array.isArray(body.additionalRoles) &&
        body.additionalRoles.length > 0
      ) {
        throw new Error("SISWA_ROLE_LOCK");
      }

      const userUpdate: Record<string, unknown> = {
        name: cleanName,
        username: cleanUsername,
        displayUsername: cleanUsername,
      };

      if (isSuperadmin && body.appRole !== undefined) {
        userUpdate.appRole = nextAppRole;
        userUpdate.role =
          nextAppRole === "SUPERADMIN" || nextAppRole === "ADMIN"
            ? "admin"
            : "user";
      }

      if (cleanUsername) {
        if (nextAppRole === "SISWA") {
          userUpdate.email = `${cleanUsername}@siswa.sekolah.id`;
        } else if (isTeacherCategoryRole(nextAppRole)) {
          userUpdate.email = `${cleanUsername}@sekolah.id`;
        }
      }

      const [updated] = await tx
        .update(user)
        .set(userUpdate)
        .where(eq(user.id, id))
        .returning();

      let oldTeacherName: string | null = null;

      // Sinkronisasi ke tabel students atau teachers
      if (nextAppRole === "SISWA") {
        if (cleanUsername) {
          const dupStudent = await tx
            .select({ id: students.id })
            .from(students)
            .where(and(eq(students.nis, cleanUsername), ne(students.userId, id)))
            .all();
          if (dupStudent.length > 0) {
            throw new Error("DUPLICATE_NIS");
          }
        }
        const syncPayload: Record<string, unknown> = { namaLengkap: cleanName };
        if (cleanUsername) {
          syncPayload.nis = cleanUsername;
        }
        await tx
          .update(students)
          .set(syncPayload)
          .where(eq(students.userId, id))
          .run();
      } else if (isTeacherCategoryRole(nextAppRole)) {
        const [oldTeacher] = await tx
          .select()
          .from(teachers)
          .where(eq(teachers.userId, id))
          .all();

        const targetNip =
          cleanUsername ||
          oldTeacher?.nip ||
          existingUser.username ||
          `G-${id.replace(/-/g, "").slice(0, 10)}`;

        const dupTeacher = await tx
          .select({ id: teachers.id })
          .from(teachers)
          .where(and(eq(teachers.nip, targetNip), ne(teachers.userId, id)))
          .all();
        if (dupTeacher.length > 0) {
          throw new Error("DUPLICATE_NIP");
        }

        if (oldTeacher) {
          oldTeacherName = oldTeacher.namaLengkap;
          const syncPayload: Record<string, unknown> = {
            namaLengkap: cleanName,
            status: updated.banned ? "nonaktif" : "aktif",
          };
          if (cleanUsername) {
            syncPayload.nip = cleanUsername;
          }
          await tx
            .update(teachers)
            .set(syncPayload)
            .where(eq(teachers.userId, id))
            .run();

          if (oldTeacher.namaLengkap !== cleanName) {
            await tx
              .update(classes)
              .set({ waliKelas: cleanName })
              .where(eq(classes.waliKelas, oldTeacher.namaLengkap))
              .run();
          }
        } else {
          await tx
            .insert(teachers)
            .values({
              userId: id,
              nip: targetNip,
              namaLengkap: cleanName,
              jenisKelamin: "L",
              status: updated.banned ? "nonaktif" : "aktif",
            })
            .run();
        }
      } else if (isTeacherCategoryRole(currentAppRole)) {
        // Jika guru dipindahkan ke peran non-guru (misal Kepsek/Admin), nonaktifkan di Data Guru tanpa merusak FK mapel
        const [oldTeacher] = await tx
          .select({ namaLengkap: teachers.namaLengkap })
          .from(teachers)
          .where(eq(teachers.userId, id))
          .all();
        if (oldTeacher) {
          oldTeacherName = oldTeacher.namaLengkap;
          await tx
            .update(teachers)
            .set({ status: "nonaktif" })
            .where(eq(teachers.userId, id))
            .run();
        }
      }

      // Sinkronisasi tabel user_roles dan wali kelas bila Superadmin mengubah peran
      const shouldSyncExtraRoles =
        isSuperadmin &&
        (body.additionalRoles !== undefined ||
          (isTeacherCategoryRole(currentAppRole) &&
            !isTeacherCategoryRole(nextAppRole)));

      if (shouldSyncExtraRoles) {
        const oldRoleRows = await tx
          .select()
          .from(userRoles)
          .where(eq(userRoles.userId, id))
          .all();

        const oldWaliRow = oldRoleRows.find(
          (r) => r.role.toUpperCase() === "WALI_KELAS"
        );
        const oldWaliKelas = oldWaliRow
          ? parseRoleMetadata(oldWaliRow.metadata).kelas || null
          : null;

        const sanitizedExtra = sanitizeAdditionalTeacherRoles(
          nextAppRole,
          body.additionalRoles ?? []
        );

        await tx.delete(userRoles).where(eq(userRoles.userId, id)).run();

        if (sanitizedExtra.length > 0) {
          await tx
            .insert(userRoles)
            .values(
              sanitizedExtra.map((er) => ({
                userId: id,
                role: er.role,
                metadata: er.metadata,
              }))
            )
            .run();
        }

        const newWaliEntry = sanitizedExtra.find(
          (er) => er.role === "WALI_KELAS"
        );
        const newWaliKelas =
          newWaliEntry?.kelas ||
          (nextAppRole === "WALI_KELAS" &&
          typeof body.waliKelasTarget === "string" &&
          body.waliKelasTarget.trim()
            ? body.waliKelasTarget.trim()
            : null);

        await syncWaliKelasAssignment(tx, {
          userId: id,
          teacherName: cleanName,
          previousNames: [existingUser.name, oldTeacherName || ""].filter(
            Boolean
          ),
          oldKelas: oldWaliKelas,
          newKelas: newWaliKelas,
        });
      }

      const finalExtraRoles = await tx
        .select({
          id: userRoles.id,
          role: userRoles.role,
          metadata: userRoles.metadata,
        })
        .from(userRoles)
        .where(eq(userRoles.userId, id))
        .all();

      return {
        updated,
        finalExtraRoles,
        currentAppRole,
        nextAppRole,
      };
    });

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Administrator",
      userRole:
        ((session.user as Record<string, unknown>).appRole as string) ||
        "admin",
      action: "UPDATE",
      module: "MANAJEMEN_PENGGUNA",
      targetId: id,
      targetName: cleanName,
      description: wantsRoleChange
        ? `Memperbarui profil dan hak akses peran akun ${cleanName} (${txResult.nextAppRole})`
        : `Memperbarui profil dasar akun ${cleanName}`,
      details: {
        previousAppRole: txResult.currentAppRole,
        nextAppRole: txResult.nextAppRole,
        additionalRoles: txResult.finalExtraRoles.map((r) => ({
          role: r.role,
          metadata: r.metadata,
        })),
      },
      ipAddress: getRequestIp(reqHeaders),
    });

    return NextResponse.json({
      ...txResult.updated,
      additionalRoles: txResult.finalExtraRoles,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "USER_NOT_FOUND") {
        return NextResponse.json(
          { error: "User tidak ditemukan" },
          { status: 404 }
        );
      }
      if (error.message === "INVALID_ROLE") {
        return NextResponse.json(
          { error: "Peran utama yang dipilih tidak valid" },
          { status: 400 }
        );
      }
      if (error.message === "SELF_ROLE_CHANGE") {
        return NextResponse.json(
          {
            error:
              "Tidak dapat mengubah peran utama akun Anda sendiri yang sedang digunakan login.",
          },
          { status: 400 }
        );
      }
      if (error.message === "SISWA_ROLE_LOCK") {
        return NextResponse.json(
          {
            error:
              "Peran akun siswa terhubung langsung dengan Data Siswa dan tidak dapat ditukar dengan peran staf atau guru.",
          },
          { status: 400 }
        );
      }
      if (error.message === "EMPTY_USERNAME") {
        return NextResponse.json(
          { error: "Username login tidak boleh dikosongkan." },
          { status: 400 }
        );
      }
      if (error.message === "DUPLICATE_NIP") {
        return NextResponse.json(
          { error: "NIP tersebut sudah digunakan pada data guru lain." },
          { status: 400 }
        );
      }
      if (error.message === "DUPLICATE_NIS") {
        return NextResponse.json(
          { error: "NIS tersebut sudah digunakan pada data siswa lain." },
          { status: 400 }
        );
      }
    }
    const message =
      error instanceof Error ? error.message : "Gagal mengupdate profil akun";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
