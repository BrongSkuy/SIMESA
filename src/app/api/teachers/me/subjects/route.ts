import { NextResponse } from "next/server";
import { db } from "@/db";
import { classes, teachers, subjects as mapelSubjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getPortalForRole } from "@/lib/rbac";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const appRole = (session?.user as Record<string, unknown>)?.appRole as string | undefined;
  const portal = getPortalForRole(appRole || "");

  if (!session || (portal !== "/guru" && portal !== "/admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get teacher profile
  const [teacherProfile] = await db
    .select()
    .from(teachers)
    .where(eq(teachers.userId, session.user.id));

  if (!teacherProfile) {
    return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 });
  }

  // Check if teacher is waliKelas for any class
  const waliKelasCheck = await db
    .select()
    .from(classes)
    .where(eq(classes.waliKelas, teacherProfile.namaLengkap));

  const waliClasses = waliKelasCheck.map((c) => c.namaKelas);

  // Get explicitly assigned curriculum subjects and classes (deduplicated by namaMapel)
  const mySubjects = await db
    .select({ namaMapel: mapelSubjects.namaMapel, kelas: mapelSubjects.kelasDiampu })
    .from(mapelSubjects)
    .where(eq(mapelSubjects.teacherId, teacherProfile.id));

  const subjectClassMap = new Map<string, Set<string>>();
  const assignedClasses = new Set<string>();

  for (const s of mySubjects) {
    if (!s.namaMapel || s.namaMapel === "Umum") continue;

    let classSet = subjectClassMap.get(s.namaMapel);
    if (!classSet) {
      classSet = new Set<string>();
      subjectClassMap.set(s.namaMapel, classSet);
    }

    if (s.kelas) {
      s.kelas.split(",").forEach((k) => {
        const trimmed = k.trim();
        if (trimmed) {
          classSet!.add(trimmed);
          assignedClasses.add(trimmed);
        }
      });
    }
  }

  const teachingClasses = Array.from(assignedClasses);
  // Combine waliClasses and teachingClasses uniquely (used by Rekap)
  const teacherClassNames = Array.from(new Set([...waliClasses, ...teachingClasses]));

  const subjects = Array.from(subjectClassMap.entries()).map(
    ([namaMapel, kelasSet]) => ({
      namaMapel,
      kelas: Array.from(kelasSet),
    })
  );

  return NextResponse.json({
    waliClasses,
    isWaliKelas: waliClasses.length > 0,
    classes: teacherClassNames,
    teachingClasses,
    subjects,
  });
}
