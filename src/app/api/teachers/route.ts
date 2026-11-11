import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { teachers } from "@/db/schema";
import { like, or, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/teachers — list all teachers
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  if (getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";

  let query = db.select().from(teachers);

  if (search) {
    query = query.where(
      or(
        like(teachers.namaLengkap, `%${search}%`),
        like(teachers.nip, `%${search}%`)
      )
    ) as typeof query;
  }

  const result = await query.all();

  return NextResponse.json(result);
}

// POST /api/teachers — create a new teacher
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const nip = String(body.nip || "").trim();
    const namaLengkap = String(body.namaLengkap || "").trim();
    const { jenisKelamin, foto } = body;

    if (!nip || !namaLengkap) {
      return NextResponse.json({ error: "NIP dan nama wajib diisi" }, { status: 400 });
    }

    if (nip.length < 4) {
      return NextResponse.json(
        { error: "NIP minimal harus 4 karakter (untuk keamanan password)" },
        { status: 400 }
      );
    }

    // Check explicit existing auth to prevent crash or dangling rows
    const { user } = await import("@/db/auth-schema");
    const existingAuth = await db
      .select()
      .from(user)
      .where(or(eq(user.username, nip), eq(user.email, `${nip}@sekolah.id`)));
    if (existingAuth.length > 0) {
      return NextResponse.json(
        { error: "Username atau NIP sudah dipakai di sistem authentikasi. Harap gunakan NIP lain." },
        { status: 400 }
      );
    }

    const newUser = await auth.api.signUpEmail({
      body: {
        email: `${nip}@sekolah.id`,
        password: nip, // default password set to NIP
        name: namaLengkap,
        username: nip,
        appRole: "GURU",
      },
    });

    try {
      if (foto) {
        await db.update(user).set({ image: foto }).where(eq(user.id, newUser.user.id)).run();
      }

      const [teacher] = await db
        .insert(teachers)
        .values({
          userId: newUser.user.id,
          nip,
          namaLengkap,
          jenisKelamin: jenisKelamin || "L",
          status: "aktif",
          foto: foto || null,
        })
        .returning();

      return NextResponse.json(teacher, { status: 201 });
    } catch (insertError) {
      await db.delete(user).where(eq(user.id, newUser.user.id)).run();
      throw insertError;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan guru";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
