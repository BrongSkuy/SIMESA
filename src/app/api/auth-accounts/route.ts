import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { user, userRoles } from "@/db/auth-schema";
import { teachers } from "@/db/schema";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  APP_ROLES,
  isTeacherCategoryRole,
  sanitizeAdditionalTeacherRoles,
  type AppRole,
} from "@/lib/rbac";
import {
  getRequestIp,
  getUserFullRoles,
  syncWaliKelasAssignment,
} from "@/lib/rbac-server";
import { logActivity } from "@/lib/audit-server";

// GET /api/auth-accounts — list all registered accounts beserta peran tambahan
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allRoles } = await getUserFullRoles(session.user.id);
  if (!allRoles.some((r) => r === "SUPERADMIN" || r === "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [allUsers, allExtraRoles] = await Promise.all([
    db.select().from(user).all(),
    db.select().from(userRoles).all(),
  ]);

  const rolesByUser = new Map<
    string,
    Array<{ id: string; role: string; metadata: string | null }>
  >();

  for (const r of allExtraRoles) {
    const existing = rolesByUser.get(r.userId) || [];
    existing.push({
      id: r.id,
      role: r.role,
      metadata: r.metadata,
    });
    rolesByUser.set(r.userId, existing);
  }

  const mapped = allUsers.map((u) => ({
    ...u,
    additionalRoles: rolesByUser.get(u.id) || [],
    isCurrentUser: u.id === session.user.id,
  }));

  return NextResponse.json(mapped);
}

// POST /api/auth-accounts — buat akun baru lintas peran (khusus SUPERADMIN)
export async function POST(request: NextRequest) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allRoles } = await getUserFullRoles(session.user.id);
  if (!allRoles.includes("SUPERADMIN")) {
    return NextResponse.json(
      {
        error:
          "Akses ditolak. Hanya Superadmin yang berwenang menambahkan akun pengguna baru.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const cleanName = typeof body.name === "string" ? body.name.trim() : "";
    const cleanUsername =
      typeof body.username === "string" ? body.username.trim() : "";
    const cleanPassword =
      typeof body.password === "string" ? body.password.trim() : "";
    const rawRole = String(body.appRole || "")
      .toUpperCase()
      .trim() as AppRole;
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const cleanJenisKelamin = body.jenisKelamin === "P" ? "P" : "L";

    if (!cleanName) {
      return NextResponse.json(
        { error: "Nama lengkap wajib diisi" },
        { status: 400 }
      );
    }

    if (cleanUsername.length < 4) {
      return NextResponse.json(
        { error: "Username login minimal harus 4 karakter" },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 4) {
      return NextResponse.json(
        { error: "Kata sandi awal minimal harus 4 karakter" },
        { status: 400 }
      );
    }

    if (!APP_ROLES.includes(rawRole)) {
      return NextResponse.json(
        { error: "Peran utama yang dipilih tidak valid" },
        { status: 400 }
      );
    }

    if (rawRole === "SISWA") {
      return NextResponse.json(
        {
          error:
            "Pembuatan akun siswa harus melalui menu Data Siswa agar data kelas dan angkatan tercatat lengkap.",
        },
        { status: 400 }
      );
    }

    const cleanEmail = rawEmail || `${cleanUsername.toLowerCase()}@sekolah.id`;

    // Cek duplikasi username atau email di tabel user
    const existingAuth = await db
      .select({ id: user.id })
      .from(user)
      .where(or(eq(user.username, cleanUsername), eq(user.email, cleanEmail)))
      .all();

    if (existingAuth.length > 0) {
      return NextResponse.json(
        { error: "Username atau email tersebut sudah terdaftar." },
        { status: 400 }
      );
    }

    // Jika peran kategori guru, pastikan NIP belum terdaftar di tabel teachers
    if (isTeacherCategoryRole(rawRole)) {
      const existingTeacher = await db
        .select({ id: teachers.id })
        .from(teachers)
        .where(eq(teachers.nip, cleanUsername))
        .all();
      if (existingTeacher.length > 0) {
        return NextResponse.json(
          {
            error:
              "NIP tersebut sudah terdaftar di Data Guru. Gunakan username atau NIP lain.",
          },
          { status: 400 }
        );
      }
    }

    const sanitizedExtra = sanitizeAdditionalTeacherRoles(
      rawRole,
      body.additionalRoles
    );

    const created = await auth.api.signUpEmail({
      body: {
        email: cleanEmail,
        password: cleanPassword,
        name: cleanName,
        username: cleanUsername,
        appRole: rawRole,
      },
    });

    const createdUserId = created.user.id;

    try {
      const betterAuthRole =
        rawRole === "SUPERADMIN" || rawRole === "ADMIN" ? "admin" : "user";
      await db
        .update(user)
        .set({ role: betterAuthRole })
        .where(eq(user.id, createdUserId))
        .run();

      if (isTeacherCategoryRole(rawRole)) {
        await db
          .insert(teachers)
          .values({
            userId: createdUserId,
            nip: cleanUsername,
            namaLengkap: cleanName,
            jenisKelamin: cleanJenisKelamin,
            status: "aktif",
          })
          .run();

        if (sanitizedExtra.length > 0) {
          await db
            .insert(userRoles)
            .values(
              sanitizedExtra.map((er) => ({
                userId: createdUserId,
                role: er.role,
                metadata: er.metadata,
              }))
            )
            .run();

          const waliEntry = sanitizedExtra.find((er) => er.role === "WALI_KELAS");
          const targetWaliKelas =
            waliEntry?.kelas ||
            (rawRole === "WALI_KELAS" &&
            typeof body.waliKelasTarget === "string" &&
            body.waliKelasTarget.trim()
              ? body.waliKelasTarget.trim()
              : null);
          if (targetWaliKelas) {
            await syncWaliKelasAssignment(db, {
              userId: createdUserId,
              teacherName: cleanName,
              newKelas: targetWaliKelas,
            });
          }
        } else if (
          rawRole === "WALI_KELAS" &&
          typeof body.waliKelasTarget === "string" &&
          body.waliKelasTarget.trim()
        ) {
          await syncWaliKelasAssignment(db, {
            userId: createdUserId,
            teacherName: cleanName,
            newKelas: body.waliKelasTarget.trim(),
          });
        }
      }
    } catch (syncError) {
      await db.delete(user).where(eq(user.id, createdUserId)).run();
      throw syncError;
    }

    const [finalUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, createdUserId))
      .all();

    const finalExtraRoles = await db
      .select({
        id: userRoles.id,
        role: userRoles.role,
        metadata: userRoles.metadata,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, createdUserId))
      .all();

    await logActivity({
      userId: session.user.id,
      userName: session.user.name || "Super Administrator",
      userRole:
        ((session.user as Record<string, unknown>).appRole as string) ||
        "superadmin",
      action: "CREATE",
      module: "MANAJEMEN_PENGGUNA",
      targetId: createdUserId,
      targetName: cleanName,
      description: `Menambahkan akun pengguna baru ${cleanName} (${cleanUsername}) dengan peran ${rawRole}`,
      details: {
        username: cleanUsername,
        appRole: rawRole,
        additionalRoles: sanitizedExtra.map((r) => ({
          role: r.role,
          metadata: r.metadata,
        })),
      },
      ipAddress: getRequestIp(reqHeaders),
    });

    return NextResponse.json(
      {
        ...(finalUser || created.user),
        additionalRoles: finalExtraRoles,
        isCurrentUser: false,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal membuat akun pengguna baru";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
