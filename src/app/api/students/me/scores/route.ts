import { NextResponse } from "next/server";
import { db } from "@/db";
import { students, spkScores, spkCriteria, academicYears, attendance } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateSPK } from "@/lib/spk";
import { DEFAULT_PERIODE } from "@/lib/utils";

// GET /api/students/me/scores — get the logged-in student's detailed scores
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
    // Get active academic year (with fallback to DEFAULT_PERIODE)
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));

    const periode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
    const periodeDisplay = activeYear
      ? `${activeYear.tahunAjaran} - ${activeYear.semester}`
      : DEFAULT_PERIODE.replace("-", " - ");

    // 1. Get all criteria
    const allCriteria = await db.select().from(spkCriteria).all();

    // 2. Get all student's scores in this period
    const periodScores = await db
      .select()
      .from(spkScores)
      .where(
        and(eq(spkScores.studentId, student.id), eq(spkScores.periode, periode))
      )
      .all();

    // 3. Get attendance stats for the "Kehadiran" criteria
    const periodAttendance = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, student.id),
          eq(attendance.periode, periode)
        )
      )
      .all();

    let totalHadir = 0;
    let totalIzin = 0;
    let totalSakit = 0;
    let totalAlfa = 0;

    periodAttendance.forEach((a) => {
      if (a.status === "Hadir") totalHadir++;
      else if (a.status === "Izin") totalIzin++;
      else if (a.status === "Sakit") totalSakit++;
      else if (a.status === "Alfa") totalAlfa++;
    });

    const totalRecords = totalHadir + totalIzin + totalSakit + totalAlfa;
    const rawPersentaseKehadiran =
      totalRecords > 0 ? (totalHadir / totalRecords) * 100 : 0;
    const persentaseKehadiran =
      totalRecords > 0 ? Math.round(rawPersentaseKehadiran) : 0;

    // 4. Compute official global SAW normalization via calculateSPK
    const spkResults = await calculateSPK("umum", periode);
    const mySpk = spkResults.find((r) => r.studentId === student.id);

    // 5. Build criteria result with raw scores, category details, and SAW normalization
    const criteriaResult = allCriteria.map((c) => {
      const crScores = periodScores.filter((s) => s.criteriaId === c.id);

      // Group by mapel + parse component details (Tugas, UTS, UAS, dll.)
      const mapelScores: Record<string, number> = {};
      const detailKategoriMapel: Record<string, Record<string, number>> = {};

      crScores.forEach((s) => {
        const key = s.mapel || "Umum";
        mapelScores[key] = Number(Number(s.nilai).toFixed(2));
        if (s.details) {
          try {
            const parsed = JSON.parse(s.details);
            if (parsed && typeof parsed === "object") {
              const cleanObj: Record<string, number> = {};
              for (const [k, v] of Object.entries(parsed)) {
                const num = Number(v);
                if (!isNaN(num)) {
                  cleanObj[k] = Number(num.toFixed(2));
                }
              }
              if (Object.keys(cleanObj).length > 0) {
                detailKategoriMapel[key] = cleanObj;
              }
            }
          } catch {
            // ignore invalid JSON
          }
        }
      });

      // Calculate raw average with 2-decimal precision
      let rawAvg = 0;
      if (
        c.tipe === "Otomatis" &&
        c.namaKriteria.toLowerCase().includes("kehadiran")
      ) {
        rawAvg =
          mySpk?.detailRaw?.[c.id] !== undefined
            ? mySpk.detailRaw[c.id]
            : rawPersentaseKehadiran;
      } else if (crScores.length > 0) {
        rawAvg =
          crScores.reduce((acc, curr) => acc + curr.nilai, 0) / crScores.length;
      }

      const nilaiRataRata = Number(rawAvg.toFixed(2));
      const normVal =
        mySpk?.detailNormalisasi?.[c.namaKriteria] !== undefined
          ? mySpk.detailNormalisasi[c.namaKriteria]
          : rawAvg / 100;
      const nilaiNormalisasi = Number(normVal.toFixed(4));
      const nilaiTerbobot = Number((normVal * c.bobot).toFixed(2));

      return {
        id: c.id,
        namaKriteria: c.namaKriteria,
        bobot: c.bobot,
        tipe: c.tipe,
        deskripsi: c.deskripsi,
        nilaiRataRata,
        nilaiNormalisasi,
        detailMapel: mapelScores,
        detailKategoriMapel,
        nilaiTerbobot,
      };
    });

    // 6. Total Skor SPK SAW (100% identical to Leaderboard & Beranda)
    const fallbackTotal = Number(
      criteriaResult.reduce((acc, c) => acc + c.nilaiTerbobot, 0).toFixed(2)
    );
    const totalSkorSPK =
      mySpk?.persentase !== undefined ? mySpk.persentase : fallbackTotal;

    return NextResponse.json({
      student: {
        id: student.id,
        nis: student.nis,
        namaLengkap: student.namaLengkap,
        kelas: student.kelas,
      },
      periode: periodeDisplay,
      criteria: criteriaResult,
      kehadiran: {
        hadir: totalHadir,
        izin: totalIzin,
        sakit: totalSakit,
        alfa: totalAlfa,
        total: totalRecords,
        persentase: persentaseKehadiran,
      },
      totalSkorSPK,
      rankUmum: mySpk?.rank ?? null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Gagal memuat nilai siswa";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
