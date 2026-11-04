import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { leaderboardArchives } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db
      .select()
      .from(leaderboardArchives)
      .orderBy(desc(leaderboardArchives.uploadedAt))
      .all();
    return NextResponse.json(rows);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memuat arsip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  const isAdmin =
    session.user.role === "admin" ||
    session.user.role === "super_admin" ||
    appRole === "ADMIN" ||
    appRole === "SUPER_ADMIN";

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { namaFile, pathFile, periode } = body;

    if (!namaFile || !pathFile) {
      return NextResponse.json(
        { error: "Nama file dan konten file wajib diisi" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const uploadedAt = new Date().toISOString();

    await db.insert(leaderboardArchives).values({
      id,
      namaFile: String(namaFile),
      pathFile: String(pathFile),
      periode: String(periode || "Semester Aktif"),
      uploadedAt,
    });

    return NextResponse.json({
      id,
      namaFile: String(namaFile),
      pathFile: String(pathFile),
      periode: String(periode || "Semester Aktif"),
      uploadedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan arsip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  const isAdmin =
    session.user.role === "admin" ||
    session.user.role === "super_admin" ||
    appRole === "ADMIN" ||
    appRole === "SUPER_ADMIN";

  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "ID arsip wajib disertakan" }, { status: 400 });
  }

  try {
    await db.delete(leaderboardArchives).where(eq(leaderboardArchives.id, id));
    return NextResponse.json({ message: "Arsip berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menghapus arsip";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
