import { db } from "@/db";
import {
  students,
  classes,
  subjects,
  teachers,
  spkScores,
  attendance,
  academicYears,
  curriculumTargets,
  studentReportNotes,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { DEFAULT_PERIODE } from "@/lib/utils";
import { DEFAULT_KKM_FALLBACK, DEFAULT_KKM_KEY } from "@/lib/erapor-utils";

export const DEFAULT_KKM = DEFAULT_KKM_FALLBACK;

export interface SubjectReportItem {
  mapel: string;
  guruPengampu: string;
  kkm: number;
  nilaiAkhir: number | null;
  predikat: "A" | "B" | "C" | "D" | "-";
  statusKetuntasan: "Tuntas" | "Belum Tuntas" | "Belum Dinilai";
  deskripsi: string;
  komponen: Record<string, number>;
}

export interface StudentReportCardData {
  student: {
    id: string;
    nis: string;
    namaLengkap: string;
    kelas: string;
    angkatan: string;
    jenisKelamin: "L" | "P";
  };
  periode: string;
  periodeDisplay: string;
  defaultKkm: number;
  waliKelas: {
    nama: string;
    nip: string;
  };
  kepalaSekolah: {
    nama: string;
    nip: string;
  };
  sekolah: {
    nama: string;
    npsn: string;
    alamat: string;
    telepon: string;
    email: string;
  };
  subjects: SubjectReportItem[];
  rekapNilai: {
    totalNilai: number;
    rataRata: number;
    jumlahMapel: number;
    jumlahTuntas: number;
    jumlahBelumTuntas: number;
    predikatUmum: string;
  };
  presensi: {
    sakit: number;
    izin: number;
    alfa: number;
    hadir: number;
    total: number;
    persentase: number;
  };
  ekskul: {
    nama: string;
    nilai: string;
    keterangan: string;
  };
  catatanWaliKelas: string;
  statusRapor: "Draf" | "Disahkan" | "Diterbitkan";
  updatedAt: string;
}

export interface ClassReportSummaryItem {
  studentId: string;
  nis: string;
  namaLengkap: string;
  jenisKelamin: "L" | "P";
  rataRata: number | null;
  totalNilai: number;
  jumlahMapelTerisi: number;
  totalMapel: number;
  statusKetuntasan: "Semua Tuntas" | "Perlu Perbaikan" | "Belum Lengkap";
  statusRapor: "Draf" | "Disahkan" | "Diterbitkan";
  hasCatatan: boolean;
  presensi: {
    sakit: number;
    izin: number;
    alfa: number;
    hadir: number;
  };
}

/**
 * Menghitung Predikat, Status, dan Narasi Capaian Pembelajaran Otomatis
 * Berbasis KKM dan Nilai Akhir (Bagi Rata).
 */
export function getPredikatAndDeskripsi(
  nilai: number | null,
  mapel: string,
  kkm: number = DEFAULT_KKM,
  materiTemplate?: string | null
): {
  predikat: "A" | "B" | "C" | "D" | "-";
  statusKetuntasan: "Tuntas" | "Belum Tuntas" | "Belum Dinilai";
  deskripsi: string;
  kategori: string;
} {
  if (nilai === null || !Number.isFinite(nilai)) {
    return {
      predikat: "-",
      statusKetuntasan: "Belum Dinilai",
      deskripsi: `Penilaian mata pelajaran ${mapel} belum tuntas diinput oleh guru pengampu.`,
      kategori: "Belum Dinilai",
    };
  }

  const rounded = Number(nilai.toFixed(2));
  const materi = materiTemplate
    ? materiTemplate.trim()
    : `capaian pembelajaran ${mapel}`;

  // Cek batas KKM terlebih dahulu agar nilai < KKM selalu berstatus Belum Tuntas
  // meskipun KKM ditetapkan >= 80 atau >= 90
  if (rounded < kkm) {
    return {
      predikat: "D",
      statusKetuntasan: "Belum Tuntas",
      deskripsi: `Perlu pendampingan dan bimbingan belajar tambahan untuk meningkatkan penguasaan materi pada ${materi}.`,
      kategori: "Perlu Bimbingan",
    };
  }

  if (rounded >= 90) {
    return {
      predikat: "A",
      statusKetuntasan: "Tuntas",
      deskripsi: `Menunjukkan penguasaan yang sangat unggul dalam memahami seluruh materi ${materi} dengan kedisiplinan dan keterampilan yang amat baik.`,
      kategori: "Sangat Baik",
    };
  }

  if (rounded >= 80) {
    return {
      predikat: "B",
      statusKetuntasan: "Tuntas",
      deskripsi: `Menunjukkan penguasaan yang baik dan tuntas dalam memahami sebagian besar materi ${materi}.`,
      kategori: "Baik",
    };
  }

  return {
    predikat: "C",
    statusKetuntasan: "Tuntas",
    deskripsi: `Menunjukkan pemahaman yang cukup dan telah memenuhi kriteria ketuntasan minimal pada materi ${materi}.`,
    kategori: "Cukup",
  };
}

/**
 * Mengambil data terpadu E-Rapor Internal seorang siswa untuk dicetak/dilihat.
 */
export async function getStudentReportCard(
  studentId: string,
  targetPeriode?: string
): Promise<StudentReportCardData | null> {
  // 1. Ambil data siswa
  const [student] = await db
    .select()
    .from(students)
    .where(eq(students.id, studentId));

  if (!student) return null;

  // 2. Tentukan periode aktif
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    activePeriode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
  }
  const periodeDisplay = activePeriode.replace("-", " Semester ");

  // 3. Ambil data pendukung secara paralel
  const [
    allClasses,
    allTeachers,
    allSubjects,
    scoresRows,
    attendanceRows,
    curriculumRows,
    reportNotesRows,
  ] = await Promise.all([
    db.select().from(classes).where(eq(classes.namaKelas, student.kelas)),
    db.select().from(teachers).all(),
    db.select().from(subjects).all(),
    db
      .select()
      .from(spkScores)
      .where(
        and(
          eq(spkScores.studentId, student.id),
          eq(spkScores.periode, activePeriode)
        )
      )
      .all(),
    db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.studentId, student.id),
          eq(attendance.periode, activePeriode)
        )
      )
      .all(),
    db.select().from(curriculumTargets).all(),
    db
      .select()
      .from(studentReportNotes)
      .where(
        and(
          eq(studentReportNotes.studentId, student.id),
          eq(studentReportNotes.periode, activePeriode)
        )
      )
      .all(),
  ]);

  // Map Wali Kelas & Kepala Sekolah
  const kelasRow = allClasses[0];
  const waliKelasNama = kelasRow?.waliKelas || "Wali Kelas";
  const matchedWaliTeacher = allTeachers.find(
    (t) => t.namaLengkap.toLowerCase() === waliKelasNama.toLowerCase()
  );
  const waliKelasNip = matchedWaliTeacher?.nip || "-";

  // Ambil data Kepala Sekolah (jika ada guru bertitel Kepala Sekolah atau default)
  const kepalaSekolahNama = "Drs. H. Hendra Dirgantara, M.Pd.";
  const kepalaSekolahNip = "19720315 199802 1 003";

  // Identifikasi Mata Pelajaran yang diampu untuk kelas siswa
  const teacherById = new Map<string, string>();
  allTeachers.forEach((t) => teacherById.set(t.id, t.namaLengkap));

  const defaultKkmRow = curriculumRows.find(
    (c) => c.mapel === DEFAULT_KKM_KEY
  );
  const defaultKkm = defaultKkmRow ? defaultKkmRow.kkm : DEFAULT_KKM_FALLBACK;

  const kkmByMapel = new Map<string, number>();
  const capaianByMapel = new Map<string, string>();
  curriculumRows.forEach((c) => {
    if (c.mapel === DEFAULT_KKM_KEY) return;
    const key = c.mapel.trim().toLowerCase();
    kkmByMapel.set(key, c.kkm);
    if (c.capaianKompetensi) {
      capaianByMapel.set(key, c.capaianKompetensi);
    }
  });

  // Map scores by mapel name — prioritaskan nilai akademik (komponen Tugas/UTS/UAS/Praktek)
  const scoreByMapel = new Map<string, typeof scoresRows[0]>();
  scoresRows.forEach((sc) => {
    if (sc.mapel && sc.mapel !== "Umum") {
      const key = sc.mapel.trim().toLowerCase();
      const existing = scoreByMapel.get(key);
      const isAcademic =
        sc.details &&
        (sc.details.includes("Tugas") ||
          sc.details.includes("UTS") ||
          sc.details.includes("UAS") ||
          sc.details.includes("Praktek"));

      if (!existing || isAcademic) {
        scoreByMapel.set(key, sc);
      }
    }
  });

  // Susun daftar mapel unik
  const subjectItems: SubjectReportItem[] = [];
  const seenMapelNames = new Set<string>();

  for (const subj of allSubjects) {
    const assignedClasses = (subj.kelasDiampu || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    if (assignedClasses.includes(student.kelas) || assignedClasses.length === 0) {
      const lowerName = subj.namaMapel.trim().toLowerCase();
      if (!seenMapelNames.has(lowerName)) {
        seenMapelNames.add(lowerName);

        const scoreRow = scoreByMapel.get(lowerName);
        const kkm = kkmByMapel.get(lowerName) ?? defaultKkm;
        const materiTemplate = capaianByMapel.get(lowerName);

        let finalScore: number | null = null;
        let komponenParsed: Record<string, number> = {};

        if (scoreRow) {
          if (scoreRow.details) {
            try {
              const det = JSON.parse(scoreRow.details);
              if (det && typeof det === "object") {
                const vals = Object.values(det).map(Number).filter(Number.isFinite);
                if (vals.length > 0) {
                  // Bagi rata (mean)
                  const sum = vals.reduce((a, b) => a + b, 0);
                  finalScore = Number((sum / vals.length).toFixed(2));
                  komponenParsed = det as Record<string, number>;
                }
              }
            } catch {
              finalScore = scoreRow.nilai;
            }
          } else if (Number.isFinite(scoreRow.nilai)) {
            finalScore = scoreRow.nilai;
          }
        }

        const evaluation = getPredikatAndDeskripsi(
          finalScore,
          subj.namaMapel,
          kkm,
          materiTemplate
        );

        subjectItems.push({
          mapel: subj.namaMapel,
          guruPengampu:
            (subj.teacherId && teacherById.get(subj.teacherId)) ||
            "Guru Mata Pelajaran",
          kkm,
          nilaiAkhir: finalScore,
          predikat: evaluation.predikat,
          statusKetuntasan: evaluation.statusKetuntasan,
          deskripsi: evaluation.deskripsi,
          komponen: komponenParsed,
        });
      }
    }
  }

  // Tambahkan mapel lain jika siswa punya nilai di mapel itu namun belum terdaftar
  for (const sc of scoresRows) {
    if (!sc.mapel || sc.mapel === "Umum") continue;
    const lowerName = sc.mapel.trim().toLowerCase();
    if (!seenMapelNames.has(lowerName)) {
      seenMapelNames.add(lowerName);
      const kkm = kkmByMapel.get(lowerName) ?? defaultKkm;
      const materiTemplate = capaianByMapel.get(lowerName);
      let finalScore: number | null = sc.nilai;
      let komponenParsed: Record<string, number> = {};

      if (sc.details) {
        try {
          const det = JSON.parse(sc.details);
          if (det && typeof det === "object") {
            const vals = Object.values(det).map(Number).filter(Number.isFinite);
            if (vals.length > 0) {
              const sum = vals.reduce((a, b) => a + b, 0);
              finalScore = Number((sum / vals.length).toFixed(2));
              komponenParsed = det as Record<string, number>;
            }
          }
        } catch {
          // ignore parse error
        }
      }

      const evaluation = getPredikatAndDeskripsi(
        finalScore,
        sc.mapel,
        kkm,
        materiTemplate
      );

      subjectItems.push({
        mapel: sc.mapel,
        guruPengampu: "Guru Mata Pelajaran",
        kkm,
        nilaiAkhir: finalScore,
        predikat: evaluation.predikat,
        statusKetuntasan: evaluation.statusKetuntasan,
        deskripsi: evaluation.deskripsi,
        komponen: komponenParsed,
      });
    }
  }

  // Hitung ringkasan nilai rapor
  const scoredSubjects = subjectItems.filter((s) => s.nilaiAkhir !== null);
  const totalNilai = scoredSubjects.reduce(
    (acc, curr) => acc + (curr.nilaiAkhir || 0),
    0
  );
  const rataRata =
    scoredSubjects.length > 0
      ? Number((totalNilai / scoredSubjects.length).toFixed(2))
      : 0;
  const jumlahTuntas = subjectItems.filter(
    (s) => s.statusKetuntasan === "Tuntas"
  ).length;
  const jumlahBelumTuntas = subjectItems.filter(
    (s) => s.statusKetuntasan === "Belum Tuntas"
  ).length;

  let predikatUmum = "-";
  if (scoredSubjects.length > 0) {
    if (rataRata < defaultKkm) predikatUmum = "D (Perlu Bimbingan)";
    else if (rataRata >= 90) predikatUmum = "A (Sangat Baik)";
    else if (rataRata >= 80) predikatUmum = "B (Baik)";
    else predikatUmum = "C (Cukup)";
  }

  // Hitung presensi
  let sakit = 0;
  let izin = 0;
  let alfa = 0;
  let hadir = 0;

  attendanceRows.forEach((att) => {
    if (att.status === "Sakit") sakit++;
    else if (att.status === "Izin") izin++;
    else if (att.status === "Alfa") alfa++;
    else if (att.status === "Hadir") hadir++;
  });

  const totalAbsen = sakit + izin + alfa + hadir;
  const persentaseKehadiran =
    totalAbsen > 0 ? Number(((hadir / totalAbsen) * 100).toFixed(1)) : 100;

  // Catatan Wali Kelas & Ekskul (jangan isi teks palsu bila memang belum diinput)
  const noteRow = reportNotesRows[0];
  const catatanWaliKelas = noteRow?.catatanWaliKelas?.trim() || "";
  const ekskulNama = noteRow?.ekskulNama?.trim() || "";
  const ekskulNilai = noteRow?.ekskulNilai?.trim() || "";
  const ekskulKeterangan = noteRow?.ekskulKeterangan?.trim() || "";
  const statusRapor = (noteRow?.statusRapor as "Draf" | "Disahkan" | "Diterbitkan") || "Draf";
  const updatedAt = noteRow?.updatedAt || new Date().toISOString();

  return {
    student: {
      id: student.id,
      nis: student.nis,
      namaLengkap: student.namaLengkap,
      kelas: student.kelas,
      angkatan: student.angkatan,
      jenisKelamin: student.jenisKelamin,
    },
    periode: activePeriode,
    periodeDisplay,
    defaultKkm,
    waliKelas: {
      nama: waliKelasNama,
      nip: waliKelasNip,
    },
    kepalaSekolah: {
      nama: kepalaSekolahNama,
      nip: kepalaSekolahNip,
    },
    sekolah: {
      nama: "SMK Penerbangan Dirgantara",
      npsn: "20235678",
      alamat: "Jl. Marsekal Suryadarma No. 12, Kompleks Bandara",
      telepon: "(021) 5567-8901",
      email: "info@smkpenerbangan.sch.id",
    },
    subjects: subjectItems,
    rekapNilai: {
      totalNilai: Number(totalNilai.toFixed(2)),
      rataRata,
      jumlahMapel: subjectItems.length,
      jumlahTuntas,
      jumlahBelumTuntas,
      predikatUmum,
    },
    presensi: {
      sakit,
      izin,
      alfa,
      hadir,
      total: totalAbsen,
      persentase: persentaseKehadiran,
    },
    ekskul: {
      nama: ekskulNama,
      nilai: ekskulNilai,
      keterangan: ekskulKeterangan,
    },
    catatanWaliKelas,
    statusRapor,
    updatedAt,
  };
}

/**
 * Mengambil ringkasan data E-Rapor satu kelas untuk Wali Kelas / Admin.
 */
export async function getClassReportSummary(
  kelas: string,
  targetPeriode?: string
): Promise<{
  kelas: string;
  waliKelas: string;
  periode: string;
  defaultKkm: number;
  students: ClassReportSummaryItem[];
}> {
  // 1. Ambil data kelas
  const [kelasRow] = await db
    .select()
    .from(classes)
    .where(eq(classes.namaKelas, kelas));

  // 2. Tentukan periode
  let activePeriode = targetPeriode;
  if (!activePeriode) {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    activePeriode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
  }

  // 3. Ambil seluruh siswa aktif di kelas
  const activeStudents = await db
    .select()
    .from(students)
    .where(and(eq(students.kelas, kelas), eq(students.status, "aktif")))
    .all();

  // 4. Ambil subjek unik untuk kelas ini
  const allSubjects = await db.select().from(subjects).all();
  const seenClassMapels = new Set<string>();
  allSubjects.forEach((s) => {
    const assigned = (s.kelasDiampu || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (assigned.includes(kelas) || assigned.length === 0) {
      seenClassMapels.add(s.namaMapel.trim().toLowerCase());
    }
  });
  const totalMapel = seenClassMapels.size;

  // 5. Ambil data notes, scores, attendance, dan target KKM untuk kelas ini
  const [allNotes, allScores, allAttendance, curriculumRows] = await Promise.all([
    db
      .select()
      .from(studentReportNotes)
      .where(eq(studentReportNotes.periode, activePeriode))
      .all(),
    db
      .select()
      .from(spkScores)
      .where(eq(spkScores.periode, activePeriode))
      .all(),
    db
      .select()
      .from(attendance)
      .where(eq(attendance.periode, activePeriode))
      .all(),
    db.select().from(curriculumTargets).all(),
  ]);

  const defaultKkmRow = curriculumRows.find(
    (c) => c.mapel === DEFAULT_KKM_KEY
  );
  const defaultKkm = defaultKkmRow ? defaultKkmRow.kkm : DEFAULT_KKM_FALLBACK;
  const kkmByMapel = new Map<string, number>();
  curriculumRows.forEach((c) => {
    if (c.mapel === DEFAULT_KKM_KEY) return;
    kkmByMapel.set(c.mapel.trim().toLowerCase(), c.kkm);
  });

  const noteByStudent = new Map<string, typeof allNotes[0]>();
  allNotes.forEach((n) => noteByStudent.set(n.studentId, n));

  const scoresByStudent = new Map<string, Array<typeof allScores[0]>>();
  allScores.forEach((sc) => {
    if (sc.mapel && sc.mapel !== "Umum") {
      let list = scoresByStudent.get(sc.studentId);
      if (!list) {
        list = [];
        scoresByStudent.set(sc.studentId, list);
      }
      list.push(sc);
    }
  });

  const attByStudent = new Map<string, Array<typeof allAttendance[0]>>();
  allAttendance.forEach((att) => {
    let list = attByStudent.get(att.studentId);
    if (!list) {
      list = [];
      attByStudent.set(att.studentId, list);
    }
    list.push(att);
  });

  const resultStudents: ClassReportSummaryItem[] = activeStudents.map((s) => {
    const studentScores = scoresByStudent.get(s.id) || [];
    const note = noteByStudent.get(s.id);
    const studentAtt = attByStudent.get(s.id) || [];

    // Kelompokkan nilai berdasarkan mapel unik untuk siswa ini (prioritas akademik)
    const mapelScoreMap = new Map<string, number>();

    studentScores.forEach((sc) => {
      if (!sc.mapel || sc.mapel === "Umum") return;
      const lowerMapel = sc.mapel.trim().toLowerCase();

      let finalVal: number | null = null;
      if (sc.details) {
        try {
          const det = JSON.parse(sc.details);
          const vals = Object.values(det).map(Number).filter(Number.isFinite);
          if (vals.length > 0) {
            finalVal = vals.reduce((a, b) => a + b, 0) / vals.length;
          }
        } catch {
          finalVal = sc.nilai;
        }
      } else if (Number.isFinite(sc.nilai)) {
        finalVal = sc.nilai;
      }

      if (finalVal !== null && Number.isFinite(finalVal)) {
        const roundedVal = Number(finalVal.toFixed(2));
        const isAcademic =
          sc.details &&
          (sc.details.includes("Tugas") ||
            sc.details.includes("UTS") ||
            sc.details.includes("UAS") ||
            sc.details.includes("Praktek"));
        if (!mapelScoreMap.has(lowerMapel) || isAcademic) {
          mapelScoreMap.set(lowerMapel, roundedVal);
        }
      }
    });

    let totalScoreSum = 0;
    let belowKkmCount = 0;
    mapelScoreMap.forEach((val, lowerMapel) => {
      totalScoreSum += val;
      const mapelKkm = kkmByMapel.get(lowerMapel) ?? defaultKkm;
      if (val < mapelKkm) {
        belowKkmCount++;
      }
    });

    const scoredSubjectCount = mapelScoreMap.size;
    const rataRata =
      scoredSubjectCount > 0
        ? Number((totalScoreSum / scoredSubjectCount).toFixed(2))
        : null;

    let statusKetuntasan: "Semua Tuntas" | "Perlu Perbaikan" | "Belum Lengkap" =
      "Semua Tuntas";
    if (scoredSubjectCount === 0) {
      statusKetuntasan = "Belum Lengkap";
    } else if (belowKkmCount > 0) {
      statusKetuntasan = "Perlu Perbaikan";
    }

    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let hadir = 0;
    studentAtt.forEach((a) => {
      if (a.status === "Sakit") sakit++;
      else if (a.status === "Izin") izin++;
      else if (a.status === "Alfa") alfa++;
      else if (a.status === "Hadir") hadir++;
    });

    return {
      studentId: s.id,
      nis: s.nis,
      namaLengkap: s.namaLengkap,
      jenisKelamin: s.jenisKelamin,
      rataRata,
      totalNilai: Number(totalScoreSum.toFixed(2)),
      jumlahMapelTerisi: scoredSubjectCount,
      totalMapel,
      statusKetuntasan,
      statusRapor: (note?.statusRapor as "Draf" | "Disahkan" | "Diterbitkan") || "Draf",
      hasCatatan: Boolean(note?.catatanWaliKelas && note.catatanWaliKelas.trim().length > 0),
      presensi: { sakit, izin, alfa, hadir },
    };
  });

  return {
    kelas,
    waliKelas: kelasRow?.waliKelas || "Wali Kelas",
    periode: activePeriode,
    defaultKkm,
    students: resultStudents,
  };
}

/**
 * Mengambil data rapor lengkap untuk cetak massal (satu kelas, multi kelas, atau seluruh kelas)
 * secara batch (tanpa N+1 query) agar cepat dan aman untuk ratusan siswa sekaligus.
 */
export async function getBulkStudentReportCards(params: {
  kelasList: string[];
  statusRapor?: string;
  ketuntasan?: string;
  sortBy?: string;
  periode?: string;
}): Promise<{
  periode: string;
  defaultKkm: number;
  reports: StudentReportCardData[];
}> {
  const {
    kelasList,
    statusRapor = "all",
    ketuntasan = "all",
    sortBy = "nama_asc",
    periode,
  } = params;

  let activePeriode = periode;
  if (!activePeriode) {
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true));
    activePeriode = activeYear
      ? `${activeYear.tahunAjaran}-${activeYear.semester}`
      : DEFAULT_PERIODE;
  }
  const periodeDisplay = activePeriode.replace("-", " Semester ");

  const curriculumRows = await db.select().from(curriculumTargets).all();
  const defaultKkm =
    curriculumRows.find((c) => c.mapel === DEFAULT_KKM_KEY)?.kkm ??
    DEFAULT_KKM_FALLBACK;

  if (kelasList.length === 0) {
    return { periode: activePeriode, defaultKkm, reports: [] };
  }

  const activeStudents = await db
    .select()
    .from(students)
    .where(and(inArray(students.kelas, kelasList), eq(students.status, "aktif")))
    .all();

  if (activeStudents.length === 0) {
    return { periode: activePeriode, defaultKkm, reports: [] };
  }

  const studentIds = activeStudents.map((s) => s.id);

  // Batch fetch seluruh data pendukung dalam 1 ronde paralel (bukan N+1 per siswa)
  const [
    allClasses,
    allTeachers,
    allSubjects,
    allScores,
    allAttendance,
    allReportNotes,
  ] = await Promise.all([
    db.select().from(classes).where(inArray(classes.namaKelas, kelasList)).all(),
    db.select().from(teachers).all(),
    db.select().from(subjects).all(),
    db
      .select()
      .from(spkScores)
      .where(
        and(
          inArray(spkScores.studentId, studentIds),
          eq(spkScores.periode, activePeriode)
        )
      )
      .all(),
    db
      .select()
      .from(attendance)
      .where(
        and(
          inArray(attendance.studentId, studentIds),
          eq(attendance.periode, activePeriode)
        )
      )
      .all(),
    db
      .select()
      .from(studentReportNotes)
      .where(
        and(
          inArray(studentReportNotes.studentId, studentIds),
          eq(studentReportNotes.periode, activePeriode)
        )
      )
      .all(),
  ]);

  const classByName = new Map(allClasses.map((c) => [c.namaKelas, c]));
  const teacherById = new Map(allTeachers.map((t) => [t.id, t.namaLengkap]));
  const teacherNipByLowerName = new Map(
    allTeachers.map((t) => [t.namaLengkap.toLowerCase(), t.nip || "-"])
  );

  const kkmByMapel = new Map<string, number>();
  const capaianByMapel = new Map<string, string>();
  curriculumRows.forEach((c) => {
    if (c.mapel === DEFAULT_KKM_KEY) return;
    const key = c.mapel.trim().toLowerCase();
    kkmByMapel.set(key, c.kkm);
    if (c.capaianKompetensi) {
      capaianByMapel.set(key, c.capaianKompetensi);
    }
  });

  const scoresByStudent = new Map<string, Array<(typeof allScores)[0]>>();
  allScores.forEach((sc) => {
    let list = scoresByStudent.get(sc.studentId);
    if (!list) {
      list = [];
      scoresByStudent.set(sc.studentId, list);
    }
    list.push(sc);
  });

  const attByStudent = new Map<string, Array<(typeof allAttendance)[0]>>();
  allAttendance.forEach((att) => {
    let list = attByStudent.get(att.studentId);
    if (!list) {
      list = [];
      attByStudent.set(att.studentId, list);
    }
    list.push(att);
  });

  const noteByStudent = new Map(allReportNotes.map((n) => [n.studentId, n]));

  const kepalaSekolahNama = "Drs. H. Hendra Dirgantara, M.Pd.";
  const kepalaSekolahNip = "19720315 199802 1 003";

  let reports: StudentReportCardData[] = activeStudents.map((student) => {
    const kelasRow = classByName.get(student.kelas);
    const waliKelasNama = kelasRow?.waliKelas || "Wali Kelas";
    const waliKelasNip =
      teacherNipByLowerName.get(waliKelasNama.toLowerCase()) || "-";

    const scoresRows = scoresByStudent.get(student.id) || [];
    const attendanceRows = attByStudent.get(student.id) || [];
    const noteRow = noteByStudent.get(student.id);

    const scoreByMapel = new Map<string, (typeof scoresRows)[0]>();
    scoresRows.forEach((sc) => {
      if (sc.mapel && sc.mapel !== "Umum") {
        const key = sc.mapel.trim().toLowerCase();
        const existing = scoreByMapel.get(key);
        const isAcademic =
          sc.details &&
          (sc.details.includes("Tugas") ||
            sc.details.includes("UTS") ||
            sc.details.includes("UAS") ||
            sc.details.includes("Praktek"));
        if (!existing || isAcademic) {
          scoreByMapel.set(key, sc);
        }
      }
    });

    const subjectItems: SubjectReportItem[] = [];
    const seenMapelNames = new Set<string>();

    for (const subj of allSubjects) {
      const assignedClasses = (subj.kelasDiampu || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);

      if (assignedClasses.includes(student.kelas) || assignedClasses.length === 0) {
        const lowerName = subj.namaMapel.trim().toLowerCase();
        if (!seenMapelNames.has(lowerName)) {
          seenMapelNames.add(lowerName);

          const scoreRow = scoreByMapel.get(lowerName);
          const kkm = kkmByMapel.get(lowerName) ?? defaultKkm;
          const materiTemplate = capaianByMapel.get(lowerName);

          let finalScore: number | null = null;
          let komponenParsed: Record<string, number> = {};

          if (scoreRow) {
            if (scoreRow.details) {
              try {
                const det = JSON.parse(scoreRow.details);
                if (det && typeof det === "object") {
                  const vals = Object.values(det)
                    .map(Number)
                    .filter(Number.isFinite);
                  if (vals.length > 0) {
                    const sum = vals.reduce((a, b) => a + b, 0);
                    finalScore = Number((sum / vals.length).toFixed(2));
                    komponenParsed = det as Record<string, number>;
                  }
                }
              } catch {
                finalScore = scoreRow.nilai;
              }
            } else if (Number.isFinite(scoreRow.nilai)) {
              finalScore = scoreRow.nilai;
            }
          }

          const evaluation = getPredikatAndDeskripsi(
            finalScore,
            subj.namaMapel,
            kkm,
            materiTemplate
          );

          subjectItems.push({
            mapel: subj.namaMapel,
            guruPengampu:
              (subj.teacherId && teacherById.get(subj.teacherId)) ||
              "Guru Mata Pelajaran",
            kkm,
            nilaiAkhir: finalScore,
            predikat: evaluation.predikat,
            statusKetuntasan: evaluation.statusKetuntasan,
            deskripsi: evaluation.deskripsi,
            komponen: komponenParsed,
          });
        }
      }
    }

    for (const sc of scoresRows) {
      if (!sc.mapel || sc.mapel === "Umum") continue;
      const lowerName = sc.mapel.trim().toLowerCase();
      if (!seenMapelNames.has(lowerName)) {
        seenMapelNames.add(lowerName);
        const kkm = kkmByMapel.get(lowerName) ?? defaultKkm;
        const materiTemplate = capaianByMapel.get(lowerName);
        let finalScore: number | null = sc.nilai;
        let komponenParsed: Record<string, number> = {};

        if (sc.details) {
          try {
            const det = JSON.parse(sc.details);
            if (det && typeof det === "object") {
              const vals = Object.values(det)
                .map(Number)
                .filter(Number.isFinite);
              if (vals.length > 0) {
                const sum = vals.reduce((a, b) => a + b, 0);
                finalScore = Number((sum / vals.length).toFixed(2));
                komponenParsed = det as Record<string, number>;
              }
            }
          } catch {
            // ignore parse error
          }
        }

        const evaluation = getPredikatAndDeskripsi(
          finalScore,
          sc.mapel,
          kkm,
          materiTemplate
        );

        subjectItems.push({
          mapel: sc.mapel,
          guruPengampu: "Guru Mata Pelajaran",
          kkm,
          nilaiAkhir: finalScore,
          predikat: evaluation.predikat,
          statusKetuntasan: evaluation.statusKetuntasan,
          deskripsi: evaluation.deskripsi,
          komponen: komponenParsed,
        });
      }
    }

    const scoredSubjects = subjectItems.filter((s) => s.nilaiAkhir !== null);
    const totalNilai = scoredSubjects.reduce(
      (acc, curr) => acc + (curr.nilaiAkhir || 0),
      0
    );
    const rataRata =
      scoredSubjects.length > 0
        ? Number((totalNilai / scoredSubjects.length).toFixed(2))
        : 0;
    const jumlahTuntas = subjectItems.filter(
      (s) => s.statusKetuntasan === "Tuntas"
    ).length;
    const jumlahBelumTuntas = subjectItems.filter(
      (s) => s.statusKetuntasan === "Belum Tuntas"
    ).length;

    let predikatUmum = "-";
    if (scoredSubjects.length > 0) {
      if (rataRata < defaultKkm) predikatUmum = "D (Perlu Bimbingan)";
      else if (rataRata >= 90) predikatUmum = "A (Sangat Baik)";
      else if (rataRata >= 80) predikatUmum = "B (Baik)";
      else predikatUmum = "C (Cukup)";
    }

    let sakit = 0;
    let izin = 0;
    let alfa = 0;
    let hadir = 0;
    attendanceRows.forEach((att) => {
      if (att.status === "Sakit") sakit++;
      else if (att.status === "Izin") izin++;
      else if (att.status === "Alfa") alfa++;
      else if (att.status === "Hadir") hadir++;
    });

    const totalAbsen = sakit + izin + alfa + hadir;
    const persentaseKehadiran =
      totalAbsen > 0 ? Number(((hadir / totalAbsen) * 100).toFixed(1)) : 100;

    return {
      student: {
        id: student.id,
        nis: student.nis,
        namaLengkap: student.namaLengkap,
        kelas: student.kelas,
        angkatan: student.angkatan,
        jenisKelamin: student.jenisKelamin,
      },
      periode: activePeriode,
      periodeDisplay,
      defaultKkm,
      waliKelas: { nama: waliKelasNama, nip: waliKelasNip },
      kepalaSekolah: { nama: kepalaSekolahNama, nip: kepalaSekolahNip },
      sekolah: {
        nama: "SMK Penerbangan Dirgantara",
        npsn: "20235678",
        alamat: "Jl. Marsekal Suryadarma No. 12, Kompleks Bandara",
        telepon: "(021) 5567-8901",
        email: "info@smkpenerbangan.sch.id",
      },
      subjects: subjectItems,
      rekapNilai: {
        totalNilai: Number(totalNilai.toFixed(2)),
        rataRata,
        jumlahMapel: subjectItems.length,
        jumlahTuntas,
        jumlahBelumTuntas,
        predikatUmum,
      },
      presensi: {
        sakit,
        izin,
        alfa,
        hadir,
        total: totalAbsen,
        persentase: persentaseKehadiran,
      },
      ekskul: {
        nama: noteRow?.ekskulNama?.trim() || "",
        nilai: noteRow?.ekskulNilai?.trim() || "",
        keterangan: noteRow?.ekskulKeterangan?.trim() || "",
      },
      catatanWaliKelas: noteRow?.catatanWaliKelas?.trim() || "",
      statusRapor:
        (noteRow?.statusRapor as "Draf" | "Disahkan" | "Diterbitkan") || "Draf",
      updatedAt: noteRow?.updatedAt || new Date().toISOString(),
    };
  });

  // Filter status rapor
  if (statusRapor && statusRapor !== "all") {
    if (statusRapor === "disahkan_diterbitkan") {
      reports = reports.filter(
        (r) => r.statusRapor === "Disahkan" || r.statusRapor === "Diterbitkan"
      );
    } else {
      reports = reports.filter((r) => r.statusRapor === statusRapor);
    }
  }

  // Filter ketuntasan nilai
  if (ketuntasan && ketuntasan !== "all") {
    if (ketuntasan === "Semua Tuntas") {
      reports = reports.filter(
        (r) =>
          r.rekapNilai.jumlahBelumTuntas === 0 &&
          r.subjects.some((s) => s.nilaiAkhir !== null)
      );
    } else if (ketuntasan === "Perlu Perbaikan") {
      reports = reports.filter((r) => r.rekapNilai.jumlahBelumTuntas > 0);
    }
  }

  // Pengurutan lembar rapor
  reports.sort((a, b) => {
    if (kelasList.length > 1 && a.student.kelas !== b.student.kelas) {
      return a.student.kelas.localeCompare(b.student.kelas);
    }
    if (sortBy === "nis_asc") {
      return a.student.nis.localeCompare(b.student.nis);
    }
    if (sortBy === "rata_desc") {
      return (b.rekapNilai.rataRata || 0) - (a.rekapNilai.rataRata || 0);
    }
    return a.student.namaLengkap.localeCompare(b.student.namaLengkap);
  });

  return { periode: activePeriode, defaultKkm, reports };
}

