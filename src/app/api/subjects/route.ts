import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, subjectCreateSchema } from "@/lib/api-validation";
import { db } from "@/db";
import { subjects, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

// GET /api/subjects — list all subjects
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db.select({
    id: subjects.id,
    namaMapel: subjects.namaMapel,
    teacherId: subjects.teacherId,
    guruPengampu: teachers.namaLengkap,
    kelasDiampu: subjects.kelasDiampu
  })
    .from(subjects)
    .leftJoin(teachers, eq(subjects.teacherId, teachers.id))
    .all();
  
  return NextResponse.json(result);
}

// POST /api/subjects — create a new subject
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  if (!session || getPortalForRole(appRole || "") !== "/admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const parsed = await parseJsonBody(request, subjectCreateSchema);
    if (!parsed.success) return parsed.response;
    const { namaMapel, teacherId, kelasDiampu } = parsed.data;

    const [newSubject] = await db
      .insert(subjects)
      .values({
        namaMapel,
        teacherId: teacherId || null,
        kelasDiampu: kelasDiampu || null,
      })
      .returning();

    return NextResponse.json(newSubject, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menambahkan mata pelajaran";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
