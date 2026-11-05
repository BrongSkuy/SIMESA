import { db } from "@/db";
import { spkScores, students, spkCriteria, attendance, academicYears, classes as classesTable, subjects, spkGradingCategories, teachers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { DEFAULT_PERIODE } from "@/lib/utils";

export async function calculateSPK(kelas: string, targetPeriode?: string) {
  // 1. Fetch All Active Students (global school-wide normalization for consistent SAW scores)
  const allActiveStudents = await db.select().from(students).where(eq(students.status, "aktif")).all();
  
  if (allActiveStudents.length === 0) return [];

  // 2. Determine academic period
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;
  }

  // 3. Fetch Criteria
  const criteriaList = await db.select().from(spkCriteria).all();

  // 4. Fetch SPK Scores filtered by active period
  const allScores = await db
    .select()
    .from(spkScores)
    .where(eq(spkScores.periode, activePeriode))
    .all();

  // 5. Fetch Attendance filtered by active period
  const allAttendance = await db
    .select()
    .from(attendance)
    .where(eq(attendance.periode, activePeriode))
    .all();

  // 6. Pre-group attendance by studentId and scores by studentId & criteriaId for O(1) lookups
  const attendanceByStudent = new Map<string, typeof allAttendance>();
  allAttendance.forEach((a) => {
    if (a.status !== null) {
      let list = attendanceByStudent.get(a.studentId);
      if (!list) {
        list = [];
        attendanceByStudent.set(a.studentId, list);
      }
      list.push(a);
    }
  });

  const scoresByStudentAndCriteria = new Map<string, typeof allScores>();
  allScores.forEach((sc) => {
    const key = `${sc.studentId}-${sc.criteriaId}`;
    let list = scoresByStudentAndCriteria.get(key);
    if (!list) {
      list = [];
      scoresByStudentAndCriteria.set(key, list);
    }
    list.push(sc);
  });

  // Build raw Matrix across all active students
  const rawMatrix: Record<string, Record<string, number>> = {};
  allActiveStudents.forEach((s) => {
     rawMatrix[s.id] = {};
     criteriaList.forEach((c) => {
        rawMatrix[s.id][c.id] = 0; // initialize
     });
  });

  for (const c of criteriaList) {
     if (c.tipe === "Otomatis" && c.namaKriteria.toLowerCase().includes("kehadiran")) {
        // Calculate percentage from attendance
        allActiveStudents.forEach(s => {
           const sAtt = attendanceByStudent.get(s.id) || [];
           const hadir = sAtt.filter(a => a.status === "Hadir").length;
           const total = sAtt.length;
           rawMatrix[s.id][c.id] = total > 0 ? (hadir / total) * 100 : 0;
        });
     } else {
        // Manual or specific criteria (C1 for example)
        allActiveStudents.forEach(s => {
           const studentScoresForC = scoresByStudentAndCriteria.get(`${s.id}-${c.id}`) || [];
           if (studentScoresForC.length === 0) {
              rawMatrix[s.id][c.id] = 0;
           } else {
              // If multiple (e.g. multiple mapels), take average
              const sum = studentScoresForC.reduce((acc, curr) => acc + curr.nilai, 0);
              rawMatrix[s.id][c.id] = sum / studentScoresForC.length;
           }
        });
     }
  }

  // 7. Normalization (Simple Additive Weighting) — global max across all active students
  // Assume all criteria are BENEFIT (higher is better)
  const maxVals: Record<string, number> = {};
  criteriaList.forEach(c => {
     maxVals[c.id] = Math.max(...allActiveStudents.map(s => rawMatrix[s.id][c.id]), 0);
  });

  const normalizedMatrix: Record<string, Record<string, number>> = {};
  allActiveStudents.forEach(s => {
     normalizedMatrix[s.id] = {};
     criteriaList.forEach(c => {
        const max = maxVals[c.id];
        const raw = rawMatrix[s.id][c.id];
        normalizedMatrix[s.id][c.id] = max > 0 ? raw / max : 0;
     });
  });

  // 8. Compute Final Score & Filter by Class if requested
  const allResults = allActiveStudents.map((s) => {
     let finalScore = 0;
     const detailNormalisasi: Record<string, number> = {};
     
     criteriaList.forEach(c => {
        const w = c.bobot / 100; // e.g. 30% -> 0.3
        const norm = normalizedMatrix[s.id][c.id];
        detailNormalisasi[c.namaKriteria] = norm;
        finalScore += norm * w;
     });

     return {
        studentId: s.id,
        nis: s.nis,
        namaLengkap: s.namaLengkap,
        kelas: s.kelas,
        rawScore: finalScore, // 0-1 range
        persentase: Number((finalScore * 100).toFixed(2)),
        detailRaw: rawMatrix[s.id],
        detailNormalisasi,
     };
  });

  const targetKelas = (kelas || "umum").toLowerCase();
  const filteredResults =
    targetKelas === "all" || targetKelas === "umum"
      ? allResults
      : allResults.filter((r) => r.kelas.toLowerCase() === targetKelas);

  // Sort descending by score, with alphabetical tie-breaker
  filteredResults.sort((a, b) => b.rawScore - a.rawScore || a.namaLengkap.localeCompare(b.namaLengkap));

  // Assign rank (1..N within the target view)
  const rankedResults = filteredResults.map((r, i) => ({
     rank: i + 1,
     ...r
  }));

  return rankedResults;
}

export async function validateSPKCriteriaFilled(kelas: string, targetPeriode?: string) {
  // 1. Fetch Students (active only)
  let siswaKelas = [];
  if (kelas === "all" || kelas === "umum") {
    siswaKelas = await db.select().from(students).where(eq(students.status, "aktif")).all();
  } else {
    siswaKelas = await db.select().from(students).where(and(eq(students.kelas, kelas), eq(students.status, "aktif"))).all();
  }
  
  if (siswaKelas.length === 0) {
    return { isValid: true, missing: [] };
  }

  // 2. Determine academic period
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true));
    activePeriode = activeYear ? `${activeYear.tahunAjaran}-${activeYear.semester}` : DEFAULT_PERIODE;
  }

  // 3. Fetch Criteria
  const criteriaList = await db.select().from(spkCriteria).all();
  const manualCriteriaList = criteriaList.filter(c => c.tipe === "Manual");

  const studentIds = siswaKelas.map((s) => s.id);

  // 4. Fetch SPK Scores filtered by active period and studentIds
  const allScores = await db
    .select()
    .from(spkScores)
    .where(
      kelas === "all" || kelas === "umum"
        ? eq(spkScores.periode, activePeriode)
        : and(
            eq(spkScores.periode, activePeriode),
            inArray(spkScores.studentId, studentIds)
          )
    )
    .all();

  // 5. Fetch Attendance filtered by active period and studentIds
  const allAttendance = await db
    .select()
    .from(attendance)
    .where(
      kelas === "all" || kelas === "umum"
        ? eq(attendance.periode, activePeriode)
        : and(
            eq(attendance.periode, activePeriode),
            inArray(attendance.studentId, studentIds)
          )
    )
    .all();

  // 6. Fetch metadata for strict validation
  const classNames = [...new Set(siswaKelas.map(s => s.kelas))];
  const classMeta = await db.select().from(classesTable).all();

  // Fetch all curriculum subjects from the subjects table
  const subjectsList = await db.select().from(subjects).all();
  const curriculumMapels = subjectsList.map(s => s.namaMapel);

  // Fetch all dynamic grading category configs
  const allGradingCategories = await db
    .select()
    .from(spkGradingCategories)
    .where(eq(spkGradingCategories.periode, activePeriode))
    .all();

  // Construct lookup maps for O(1) checks
  // scoresMap key: studentId:criteriaId:mapelKey
  const scoresMap = new Map<string, typeof allScores[0]>();
  allScores.forEach(sc => {
    const mapelKey = sc.mapel && sc.mapel !== "Umum" ? sc.mapel : "Umum";
    scoresMap.set(`${sc.studentId}:${sc.criteriaId}:${mapelKey}`, sc);
  });

  // attendanceKeys format: studentId:mapelKey
  const attendanceKeys = new Set<string>();
  allAttendance.forEach(a => {
    const mapelKey = a.mapel && a.mapel !== "Umum" ? a.mapel : "Umum";
    attendanceKeys.add(`${a.studentId}:${mapelKey}`);
  });

  // gradingCategoriesMap key: kelas:criteriaId:mapelKey
  const gradingCategoriesMap = new Map<string, string[]>();
  allGradingCategories.forEach(gc => {
    const mapelKey = gc.mapel && gc.mapel !== "Umum" ? gc.mapel : "Umum";
    const key = `${gc.kelas}:${gc.criteriaId}:${mapelKey}`;
    try {
      gradingCategoriesMap.set(key, JSON.parse(gc.categories));
    } catch (e) {
      gradingCategoriesMap.set(key, []);
    }
  });

  const missingEntries: Array<{
    studentId: string;
    studentName: string;
    kelas: string;
    criteriaId: string;
    criteriaName: string;
    reason: string;
  }> = [];

  for (const cName of classNames) {
    const requiredMapels = new Set<string>();
    for (const s of subjectsList) {
      if (s.kelasDiampu) {
        const classes = s.kelasDiampu.split(",").map(k => k.trim());
        if (classes.includes(cName)) {
          requiredMapels.add(s.namaMapel);
        }
      }
    }
    
    // Add "Umum" if class has Wali Kelas
    const classInfo = classMeta.find(c => c.namaKelas === cName);
    if (classInfo?.waliKelas) {
      requiredMapels.add("Umum");
    }

    // Get active students in this class
    const studentsInThisClass = siswaKelas.filter(s => s.kelas === cName);
    if (studentsInThisClass.length === 0) continue;

    const mapelList = Array.from(requiredMapels);

    for (const mapel of mapelList) {
      // 1. Check Attendance (Otomatis)
      const studentsMissingAttendance = studentsInThisClass.filter(
        s => !attendanceKeys.has(`${s.id}:${mapel}`)
      );

      if (studentsMissingAttendance.length === studentsInThisClass.length) {
        missingEntries.push({
          studentId: "ALL",
          studentName: "Semua Siswa",
          kelas: cName,
          criteriaId: "attendance",
          criteriaName: `Kehadiran (${mapel})`,
          reason: `Guru mapel ${mapel} belum mengisi absensi sama sekali`
        });
      } else if (studentsMissingAttendance.length > 0) {
        studentsMissingAttendance.forEach(s => {
          missingEntries.push({
            studentId: s.id,
            studentName: s.namaLengkap,
            kelas: cName,
            criteriaId: "attendance",
            criteriaName: `Kehadiran (${mapel})`,
            reason: `Siswa belum memiliki data absensi untuk mata pelajaran ${mapel}`
          });
        });
      }

      // 2. Check Scores (Manual)
      for (const c of manualCriteriaList) {
        const isAcademic = c.namaKriteria.toLowerCase().includes("akademik");

        // Skip academic criteria check for general homeroom (Umum)
        if (isAcademic && mapel === "Umum") continue;

        let categoriesRequired: string[] = [];
        if (isAcademic) {
          categoriesRequired = gradingCategoriesMap.get(`${cName}:${c.id}:${mapel}`) || [];
        } else {
          categoriesRequired = ["Nilai"];
        }

        if (isAcademic && categoriesRequired.length === 0) {
          // If no categories are configured for academic criteria, report group error
          missingEntries.push({
            studentId: "ALL",
            studentName: "Semua Siswa",
            kelas: cName,
            criteriaId: c.id,
            criteriaName: `${c.namaKriteria} (${mapel})`,
            reason: `Guru mapel ${mapel} belum mengatur kategori penilaian (Tugas, UTS, UAS, dll)`
          });
          continue;
        }

        // Check each student for missing scores or empty categories
        const studentsMissingScore: Array<{ student: typeof siswaKelas[0]; missingCats: string[] }> = [];

        studentsInThisClass.forEach(s => {
          const scoreRecord = scoresMap.get(`${s.id}:${c.id}:${mapel}`);

          if (!scoreRecord) {
            studentsMissingScore.push({ student: s, missingCats: categoriesRequired });
          } else {
            let detailsObj: Record<string, number> = {};
            if (scoreRecord.details) {
              try {
                detailsObj = JSON.parse(scoreRecord.details);
              } catch (e) {
                detailsObj = {};
              }
            }

            const missingCats = categoriesRequired.filter(cat => {
              const val = detailsObj[cat];
              return val === undefined || val === null || isNaN(parseFloat(String(val)));
            });

            if (missingCats.length > 0) {
              studentsMissingScore.push({ student: s, missingCats });
            }
          }
        });

        if (studentsMissingScore.length === studentsInThisClass.length) {
          missingEntries.push({
            studentId: "ALL",
            studentName: "Semua Siswa",
            kelas: cName,
            criteriaId: c.id,
            criteriaName: `${c.namaKriteria} (${mapel})`,
            reason: `Guru mapel ${mapel} belum mengisi nilai kriteria ${c.namaKriteria} sama sekali`
          });
        } else if (studentsMissingScore.length > 0) {
          studentsMissingScore.forEach(({ student, missingCats }) => {
            missingEntries.push({
              studentId: student.id,
              studentName: student.namaLengkap,
              kelas: cName,
              criteriaId: c.id,
              criteriaName: `${c.namaKriteria} (${mapel})`,
              reason: `Nilai kriteria ${c.namaKriteria} mata pelajaran ${mapel} belum lengkap (${missingCats.join(", ")})`
            });
          });
        }
      }
    }
  }

  return {
    isValid: missingEntries.length === 0,
    missing: missingEntries
  };
}

export async function buildStudentScoreTranscript(student: {
  id: string;
  nis: string;
  namaLengkap: string;
  kelas: string;
}) {
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

  // 1. Fetch all required tables in parallel
  const [
    allCriteria,
    periodScores,
    periodAttendance,
    allSubjects,
    allTeachers,
    allClasses,
    gradingCategories,
    spkResults,
  ] = await Promise.all([
    db.select().from(spkCriteria).all(),
    db
      .select()
      .from(spkScores)
      .where(
        and(eq(spkScores.studentId, student.id), eq(spkScores.periode, periode))
      )
      .all(),
    db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, student.id),
          eq(attendance.periode, periode)
        )
      )
      .all(),
    db.select().from(subjects).all(),
    db.select().from(teachers).all(),
    db.select().from(classesTable).all(),
    db
      .select()
      .from(spkGradingCategories)
      .where(
        and(
          eq(spkGradingCategories.kelas, student.kelas),
          eq(spkGradingCategories.periode, periode)
        )
      )
      .all(),
    calculateSPK("umum", periode),
  ]);

  // 2. Overall attendance stats
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

  const mySpk = spkResults.find((r) => r.studentId === student.id);

  // 3. Build criteria result with raw scores, category details, and SAW normalization
  const criteriaResult = allCriteria.map((c) => {
    const crScores = periodScores.filter((s) => s.criteriaId === c.id);

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

  // 4. Build Per-Subject Transcript (subjectsTranscript)
  const teacherById = new Map<string, string>();
  allTeachers.forEach((t) => teacherById.set(t.id, t.namaLengkap));

  const classInfo = allClasses.find((c) => c.namaKelas === student.kelas);

  // Identify curriculum subjects assigned to student.kelas
  const subjectEntries: Array<{
    namaMapel: string;
    guruPengampu: string;
    isHomeroom: boolean;
  }> = [];
  const seenMapels = new Set<string>();

  for (const subj of allSubjects) {
    const assignedClasses = (subj.kelasDiampu || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (assignedClasses.includes(student.kelas)) {
      seenMapels.add(subj.namaMapel);
      subjectEntries.push({
        namaMapel: subj.namaMapel,
        guruPengampu:
          (subj.teacherId && teacherById.get(subj.teacherId)) ||
          "Guru Mata Pelajaran",
        isHomeroom: false,
      });
    }
  }

  // Also include any other non-Umum mapel present in student's scores/attendance
  for (const sc of periodScores) {
    const m = sc.mapel || "Umum";
    if (m !== "Umum" && !seenMapels.has(m)) {
      seenMapels.add(m);
      const subjRow = allSubjects.find((s) => s.namaMapel === m);
      subjectEntries.push({
        namaMapel: m,
        guruPengampu:
          (subjRow?.teacherId && teacherById.get(subjRow.teacherId)) ||
          "Guru Mata Pelajaran",
        isHomeroom: false,
      });
    }
  }

  // Add Evaluasi Wali Kelas (Umum) if class has waliKelas or has Umum records
  const hasUmumRecords =
    periodScores.some((s) => !s.mapel || s.mapel === "Umum") ||
    periodAttendance.some((a) => !a.mapel || a.mapel === "Umum");
  if (classInfo?.waliKelas || hasUmumRecords) {
    subjectEntries.push({
      namaMapel: "Umum",
      guruPengampu: classInfo?.waliKelas || "Wali Kelas",
      isHomeroom: true,
    });
  }

  const academicCriteria = allCriteria.find(
    (c) =>
      c.tipe === "Manual" && c.namaKriteria.toLowerCase().includes("akademik")
  );
  const nonAcademicManualCriteria = allCriteria.filter(
    (c) =>
      c.tipe === "Manual" && !c.namaKriteria.toLowerCase().includes("akademik")
  );

  const subjectsTranscript = subjectEntries.map((entry) => {
    const mapelKey = entry.namaMapel;

    // Attendance for this subject
    const mapelAtt = periodAttendance.filter(
      (a) => (a.mapel || "Umum") === mapelKey
    );
    let mHadir = 0;
    let mIzin = 0;
    let mSakit = 0;
    let mAlfa = 0;
    mapelAtt.forEach((a) => {
      if (a.status === "Hadir") mHadir++;
      else if (a.status === "Izin") mIzin++;
      else if (a.status === "Sakit") mSakit++;
      else if (a.status === "Alfa") mAlfa++;
    });
    const mTotalAtt = mHadir + mIzin + mSakit + mAlfa;
    const mPersenAtt =
      mTotalAtt > 0 ? Math.round((mHadir / mTotalAtt) * 100) : null;

    // Academic score & component categories for this subject
    let akademik: {
      criteriaId: string;
      namaKriteria: string;
      nilaiAkhir: number | null;
      komponen: Record<string, number>;
      kategoriWajib: string[];
    } | null = null;

    if (!entry.isHomeroom && academicCriteria) {
      const acadScore = periodScores.find(
        (s) =>
          s.criteriaId === academicCriteria.id &&
          (s.mapel || "Umum") === mapelKey
      );
      const gcRow = gradingCategories.find(
        (g) =>
          g.criteriaId === academicCriteria.id &&
          (g.mapel || "Umum") === mapelKey
      );
      let configuredCats: string[] = [];
      if (gcRow?.categories) {
        try {
          const parsed = JSON.parse(gcRow.categories);
          if (Array.isArray(parsed)) configuredCats = parsed;
        } catch {
          configuredCats = [];
        }
      }

      const komponen: Record<string, number> = {};
      if (acadScore?.details) {
        try {
          const parsed = JSON.parse(acadScore.details);
          if (parsed && typeof parsed === "object") {
            for (const [k, v] of Object.entries(parsed)) {
              const num = Number(v);
              if (!isNaN(num)) {
                komponen[k] = Number(num.toFixed(2));
              }
            }
          }
        } catch {
          // ignore
        }
      }

      const kategoriWajib =
        configuredCats.length > 0
          ? configuredCats
          : Object.keys(komponen).length > 0
            ? Object.keys(komponen)
            : ["Tugas", "UTS", "UAS"];

      akademik = {
        criteriaId: academicCriteria.id,
        namaKriteria: academicCriteria.namaKriteria,
        nilaiAkhir:
          acadScore !== undefined
            ? Number(Number(acadScore.nilai).toFixed(2))
            : null,
        komponen,
        kategoriWajib,
      };
    }

    // Non-academic manual criteria scores for this subject
    const kriteriaLain = nonAcademicManualCriteria.map((c) => {
      const sc = periodScores.find(
        (s) => s.criteriaId === c.id && (s.mapel || "Umum") === mapelKey
      );
      return {
        criteriaId: c.id,
        namaKriteria: c.namaKriteria,
        bobot: c.bobot,
        nilai: sc !== undefined ? Number(Number(sc.nilai).toFixed(2)) : null,
      };
    });

    // Compute completeness & average
    const numericScores: number[] = [];
    if (akademik && akademik.nilaiAkhir !== null) {
      numericScores.push(akademik.nilaiAkhir);
    }
    kriteriaLain.forEach((kl) => {
      if (kl.nilai !== null) numericScores.push(kl.nilai);
    });

    const rataRataMapel =
      numericScores.length > 0
        ? Number(
            (
              numericScores.reduce((acc, v) => acc + v, 0) /
              numericScores.length
            ).toFixed(2)
          )
        : null;

    const totalExpectedCriteria =
      (entry.isHomeroom ? 0 : academicCriteria ? 1 : 0) +
      nonAcademicManualCriteria.length;
    const filledCriteriaCount = numericScores.length;

    let isAcademicComponentsComplete = true;
    if (!entry.isHomeroom && akademik) {
      if (akademik.nilaiAkhir === null) {
        isAcademicComponentsComplete = false;
      } else if (Object.keys(akademik.komponen).length > 0) {
        isAcademicComponentsComplete = akademik.kategoriWajib.every(
          (cat) =>
            akademik!.komponen[cat] !== undefined &&
            !isNaN(Number(akademik!.komponen[cat]))
        );
      }
    }

    let statusPenilaian: "Lengkap" | "Sebagian" | "Belum Dinilai" =
      "Belum Dinilai";
    if (filledCriteriaCount === 0 && mTotalAtt === 0) {
      statusPenilaian = "Belum Dinilai";
    } else if (
      filledCriteriaCount >= totalExpectedCriteria &&
      isAcademicComponentsComplete &&
      mTotalAtt > 0
    ) {
      statusPenilaian = "Lengkap";
    } else {
      statusPenilaian = "Sebagian";
    }

    return {
      namaMapel: entry.namaMapel,
      labelMapel: entry.isHomeroom
        ? "Evaluasi Wali Kelas (Umum)"
        : entry.namaMapel,
      guruPengampu: entry.guruPengampu,
      isHomeroom: entry.isHomeroom,
      kehadiran: {
        hadir: mHadir,
        izin: mIzin,
        sakit: mSakit,
        alfa: mAlfa,
        total: mTotalAtt,
        persentase: mPersenAtt,
      },
      akademik,
      kriteriaLain,
      rataRataMapel,
      statusPenilaian,
    };
  });

  // 5. Total Skor SPK SAW (100% identical to Leaderboard & Beranda)
  const fallbackTotal = Number(
    criteriaResult.reduce((acc, c) => acc + c.nilaiTerbobot, 0).toFixed(2)
  );
  const totalSkorSPK =
    mySpk?.persentase !== undefined ? mySpk.persentase : fallbackTotal;

  return {
    student: {
      id: student.id,
      nis: student.nis,
      namaLengkap: student.namaLengkap,
      kelas: student.kelas,
    },
    periode: periodeDisplay,
    criteria: criteriaResult,
    subjectsTranscript,
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
  };
}
