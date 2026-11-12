import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildStudentScoreTranscript } from "@/lib/spk";
import { getPortalForRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/students/[id]/scores
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");
  if (portal !== "/admin" && portal !== "/guru") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: studentId } = await params;

  // Find student profile
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) {
    return NextResponse.json(
      { error: "Profil siswa tidak ditemukan" },
      { status: 404 }
    );
  }

  try {
    const transcript = await buildStudentScoreTranscript(student);
    return NextResponse.json(transcript);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat nilai siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
