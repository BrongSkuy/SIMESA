import { NextResponse } from "next/server";
import { db } from "@/db";
import { students } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { buildStudentScoreTranscript } from "@/lib/spk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/students/me/scores — get the logged-in student's detailed scores & per-subject transcript
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appRole = (session.user as Record<string, unknown>)?.appRole;
  if (appRole !== "SISWA") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Find student profile
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.userId, session.user.id));

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
