"use client";

import React from "react";
import Image from "next/image";
import { Printer, FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentReportCardData } from "@/lib/erapor";

interface ReportCardPrintViewProps {
  data: StudentReportCardData;
  onBack?: () => void;
  inModal?: boolean;
}

export function ReportCardPrintView({
  data,
  onBack,
  inModal = false,
}: ReportCardPrintViewProps) {
  const handlePrint = () => {
    // Siapkan dokumen HTML mandiri dalam iframe terisolasi agar presisi A4 tanpa header dan footer browser
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "fixed";
    printFrame.style.right = "0";
    printFrame.style.bottom = "0";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "none";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document;
    if (!frameDoc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>E-Rapor - ${data.student.namaLengkap} (${data.student.nis})</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #111;
              margin: 0;
              padding: 10mm 14mm 10mm 14mm;
              font-size: 8.5pt;
              line-height: 1.35;
              background: #fff;
            }
            .kop-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 14px;
              border-bottom: 3px double #000;
              padding-bottom: 6px;
              margin-bottom: 8px;
              text-align: center;
            }
            .kop-logo {
              width: 58px;
              height: 58px;
              object-fit: contain;
            }
            .kop-text h4 {
              font-size: 8pt;
              font-weight: 600;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #444;
            }
            .kop-text h1 {
              font-size: 13pt;
              font-weight: 900;
              margin: 1px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop-text p {
              font-size: 7.5pt;
              margin: 1px 0;
              color: #444;
            }
            .judul-rapor {
              text-align: center;
              margin: 6px 0 8px 0;
            }
            .judul-rapor h2 {
              font-size: 10.5pt;
              font-weight: bold;
              text-transform: uppercase;
              text-decoration: underline;
              margin: 0;
            }
            .judul-rapor p {
              font-size: 8pt;
              color: #444;
              margin: 2px 0 0 0;
            }
            .identitas-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px 16px;
              font-size: 8.5pt;
              margin-bottom: 8px;
              padding: 5px 8px;
              background-color: #fafafa;
              border: 1px solid #ddd;
              border-radius: 3px;
            }
            .identitas-row {
              display: flex;
              margin-bottom: 1px;
            }
            .identitas-label {
              width: 140px;
              color: #555;
              font-weight: 500;
            }
            .identitas-val {
              flex: 1;
              font-weight: 600;
            }
            .section-title {
              font-size: 8.5pt;
              font-weight: bold;
              text-transform: uppercase;
              margin: 7px 0 3px 0;
              color: #000;
            }
            table.rapor-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 7px;
              font-size: 8pt;
            }
            table.rapor-table th, table.rapor-table td {
              border: 1px solid #444;
              padding: 3px 5px;
            }
            table.rapor-table th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
            }
            table.rapor-table tr {
              page-break-inside: avoid;
            }
            .two-cols {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 7px;
              page-break-inside: avoid;
            }
            .catatan-box {
              border: 1px solid #444;
              padding: 5px 8px;
              font-size: 8pt;
              min-height: 35px;
              font-style: italic;
              background-color: #fcfcfc;
              margin-bottom: 7px;
              page-break-inside: avoid;
            }
            .ttd-section {
              page-break-inside: avoid;
              margin-top: 8px;
            }
            .ttd-grid {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              text-align: center;
              gap: 12px;
              font-size: 8pt;
              margin-top: 4px;
            }
            .ttd-box {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 75px;
            }
            .ttd-nama {
              font-weight: bold;
              text-decoration: underline;
              margin: 0;
            }
            .footer-internal {
              margin-top: 6px;
              padding-top: 3px;
              border-top: 1px solid #ccc;
              display: flex;
              justify-content: space-between;
              font-size: 7pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="kop-container">
            <img src="/logo.png" alt="Logo Sekolah" class="kop-logo" />
            <div class="kop-text">
              <h4>Yayasan Kemajuan Dirgantara</h4>
              <h1>${data.sekolah.nama}</h1>
              <p>Akreditasi "A" (Unggul) | NPSN: ${data.sekolah.npsn}</p>
              <p>Jl. Marsekal Suryadarma No. 12, Kompleks Bandara, Tangerang | Telp: (021) 5567-8901 | Email: info@smkpenerbangan.sch.id</p>
            </div>
          </div>

          <div class="judul-rapor">
            <h2>Laporan Hasil Belajar Siswa (E-Rapor Internal)</h2>
            <p>Tahun Pelajaran: ${data.periodeDisplay}</p>
          </div>

          <div class="identitas-grid">
            <div>
              <div class="identitas-row">
                <span class="identitas-label">Nama Siswa</span>
                <span class="identitas-val">: ${data.student.namaLengkap}</span>
              </div>
              <div class="identitas-row">
                <span class="identitas-label">Nomor Induk Siswa (NIS)</span>
                <span class="identitas-val">: ${data.student.nis}</span>
              </div>
              <div class="identitas-row">
                <span class="identitas-label">Angkatan</span>
                <span class="identitas-val">: ${data.student.angkatan}</span>
              </div>
            </div>
            <div>
              <div class="identitas-row">
                <span class="identitas-label">Kelas</span>
                <span class="identitas-val">: ${data.student.kelas}</span>
              </div>
              <div class="identitas-row">
                <span class="identitas-label">Jenis Kelamin</span>
                <span class="identitas-val">: ${data.student.jenisKelamin === "L" ? "Laki-laki (Siswa)" : "Perempuan (Siswi)"}</span>
              </div>
              <div class="identitas-row">
                <span class="identitas-label">Program Keahlian</span>
                <span class="identitas-val">: Teknologi Penerbangan</span>
              </div>
            </div>
          </div>

          <div class="section-title">A. Capaian Kompetensi Akademik (Nilai Rata-rata Murni)</div>
          <table class="rapor-table">
            <thead>
              <tr>
                <th style="width: 25px;">No</th>
                <th style="text-align: left; width: 140px;">Mata Pelajaran</th>
                <th style="width: 40px;">KKM</th>
                <th style="width: 60px;">Nilai Akhir</th>
                <th style="width: 55px;">Predikat</th>
                <th style="text-align: left;">Deskripsi Capaian Pembelajaran</th>
              </tr>
            </thead>
            <tbody>
              ${(data.subjects || [])
                .map(
                  (sub, idx) => `
                <tr>
                  <td style="text-align: center;">${idx + 1}</td>
                  <td>
                    <strong>${sub.mapel}</strong><br />
                    <span style="font-size: 7pt; color: #555;">${sub.guruPengampu || "-"}</span>
                  </td>
                  <td style="text-align: center;">${sub.kkm}</td>
                  <td style="text-align: center; font-weight: bold;">${sub.nilaiAkhir !== null && sub.nilaiAkhir !== undefined ? sub.nilaiAkhir.toFixed(2) : "-"}</td>
                  <td style="text-align: center; font-weight: bold;">${sub.predikat || "-"}</td>
                  <td style="font-size: 7.5pt; color: #333;">${sub.deskripsi || "-"}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
            <tfoot>
              <tr style="background-color: #fafafa; font-weight: bold;">
                <td colspan="3" style="text-align: right;">Total Nilai dan Rata-rata Rapor:</td>
                <td style="text-align: center;">${data.rekapNilai?.rataRata ? data.rekapNilai.rataRata.toFixed(2) : "-"}</td>
                <td style="text-align: center;">
                  ${
                    (data.rekapNilai?.rataRata || 0) >= 90
                      ? "A"
                      : (data.rekapNilai?.rataRata || 0) >= 80
                      ? "B"
                      : (data.rekapNilai?.rataRata || 0) >= 75
                      ? "C"
                      : (data.rekapNilai?.rataRata || 0) > 0
                      ? "D"
                      : "-"
                  }
                </td>
                <td style="font-size: 7.5pt; font-weight: normal; color: #555;">
                  Total ${data.rekapNilai?.jumlahTuntas || 0} mapel tuntas KKM dari ${data.rekapNilai?.jumlahMapel || 0} mata pelajaran.
                </td>
              </tr>
            </tfoot>
          </table>

          <div class="two-cols">
            <div>
              <div class="section-title">B. Kegiatan Ekstrakurikuler</div>
              <table class="rapor-table">
                <thead>
                  <tr>
                    <th style="width: 25px;">No</th>
                    <th style="text-align: left;">Kegiatan</th>
                    <th style="width: 65px;">Nilai</th>
                    <th style="text-align: left;">Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="text-align: center;">1</td>
                    <td><strong>${data.ekskul?.nama || "-"}</strong></td>
                    <td style="text-align: center; font-weight: bold; color: #047857;">${data.ekskul?.nilai || "-"}</td>
                    <td style="font-size: 7.5pt;">${data.ekskul?.keterangan || "-"}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <div class="section-title">C. Ketidakhadiran (Semester)</div>
              <table class="rapor-table">
                <thead>
                  <tr>
                    <th style="text-align: left;">Keterangan</th>
                    <th style="width: 80px;">Jumlah Hari</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Sakit (S)</td>
                    <td style="text-align: center; font-weight: 500;">${data.presensi?.sakit ?? 0} hari</td>
                  </tr>
                  <tr>
                    <td>Izin (I)</td>
                    <td style="text-align: center; font-weight: 500;">${data.presensi?.izin ?? 0} hari</td>
                  </tr>
                  <tr>
                    <td>Tanpa Keterangan atau Alfa (A)</td>
                    <td style="text-align: center; font-weight: 500;">${data.presensi?.alfa ?? 0} hari</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="section-title">D. Catatan Perkembangan Karakter dan Kedisiplinan Wali Kelas</div>
          <div class="catatan-box">
            "${data.catatanWaliKelas || "Tetap pertahankan kedisiplinan dan semangat belajar."}"
          </div>

          <div class="ttd-section">
            <div style="text-align: right; font-size: 8pt; margin-bottom: 2px;">
              Diberikan di: Tangerang, ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </div>

            <div class="ttd-grid">
              <div class="ttd-box">
                <div>
                  <p style="margin: 0; color: #555;">Mengetahui,</p>
                  <p style="margin: 1px 0 0 0; font-weight: 600;">Orang Tua atau Wali Murid</p>
                </div>
                <div style="height: 45px;"></div>
                <div style="border-bottom: 1px solid #222; width: 130px; margin: 0 auto;"></div>
              </div>

              <div class="ttd-box">
                <div>
                  <p style="margin: 0; color: #555;">Wali Kelas,</p>
                  <p style="margin: 1px 0 0 0; font-weight: 600;">${data.student.kelas}</p>
                </div>
                <div style="height: 45px;"></div>
                <div>
                  <p class="ttd-nama">${data.waliKelas.nama}</p>
                  <p style="margin: 1px 0 0 0; font-size: 7pt; color: #666;">NIP. ${data.waliKelas.nip}</p>
                </div>
              </div>

              <div class="ttd-box">
                <div>
                  <p style="margin: 0; color: #555;">Mengetahui,</p>
                  <p style="margin: 1px 0 0 0; font-weight: 600;">Kepala Sekolah</p>
                </div>
                <div style="height: 45px;"></div>
                <div>
                  <p class="ttd-nama">${data.kepalaSekolah.nama}</p>
                  <p style="margin: 1px 0 0 0; font-size: 7pt; color: #666;">NIP. ${data.kepalaSekolah.nip}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-internal">
            <span>SIMESA - Laporan Evaluasi Hasil Belajar Internal Sekolah</span>
            <span>Status Rapor: <strong>${data.statusRapor}</strong></span>
            <span>Dicetak otomatis pada: ${new Date().toLocaleDateString("id-ID")}</span>
          </div>
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();

      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 300);
  };

  return (
    <div className={inModal ? "w-full" : "w-full max-w-4xl mx-auto my-6"}>
      {/* Toolbar Pratinjau Cetak Seragam */}
      <div
        className={
          inModal
            ? "print:hidden p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
            : "print:hidden flex items-center justify-between gap-4 p-4 mb-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs"
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
              Pratinjau E-Rapor Internal ({data.student.namaLengkap})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumen hasil belajar siswa siap cetak format A4 standar resmi sekolah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handlePrint}
            size="sm"
            className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen (A4)</span>
          </Button>
          {onBack && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onBack}
              aria-label="Tutup pratinjau"
              title="Tutup"
              className="rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Lembar Dokumen Rapor (A4 Print-Ready) */}
      <div
        className={
          inModal
            ? "p-4 sm:p-6 max-h-[82vh] overflow-y-auto flex justify-center bg-slate-200/70 dark:bg-slate-950"
            : ""
        }
      >
      <div
        className={
          inModal
            ? "w-full max-w-[210mm] bg-white text-zinc-900 border border-slate-300 shadow-xl print:shadow-none print:border-none p-8 md:p-12 rounded-sm font-sans text-sm leading-normal"
            : "bg-white text-zinc-900 border border-zinc-200 shadow-lg print:shadow-none print:border-none p-8 md:p-12 rounded-lg font-sans text-sm leading-normal"
        }
      >
        {/* KOP SURAT RESMI */}
        <div className="border-b-4 border-double border-zinc-900 pb-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <Image
                src="/logo.png"
                alt="Logo SMK Penerbangan Dirgantara"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-center flex-1">
              <h4 className="text-xs uppercase tracking-wider font-semibold text-zinc-700">
                Yayasan Kemajuan Dirgantara
              </h4>
              <h1 className="text-xl md:text-2xl font-black tracking-tight text-zinc-950 uppercase">
                {data.sekolah.nama}
              </h1>
              <p className="text-xs font-medium text-zinc-600 mt-0.5">
                Akreditasi &quot;A&quot; (Unggul) | NPSN: {data.sekolah.npsn}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {data.sekolah.alamat} | Telp: {data.sekolah.telepon} | Email: {data.sekolah.email}
              </p>
            </div>
            <div className="w-20 h-20 flex-shrink-0 opacity-0 print:hidden" />
          </div>
        </div>

        {/* JUDUL LAPORAN */}
        <div className="text-center mb-6">
          <h2 className="text-base font-bold tracking-wide uppercase text-zinc-900 underline decoration-2 underline-offset-4">
            Laporan Hasil Belajar Siswa (E-Rapor Internal)
          </h2>
          <p className="text-xs font-medium text-zinc-600 mt-1">
            Tahun Pelajaran: {data.periodeDisplay}
          </p>
        </div>

        {/* IDENTITAS SISWA (2 KOLOM) */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs mb-6 bg-zinc-50 print:bg-transparent p-3 rounded-md border border-zinc-200 print:border-none">
          <div className="space-y-1">
            <div className="flex">
              <span className="w-32 font-medium text-zinc-600">Nama Siswa</span>
              <span className="font-semibold text-zinc-950">: {data.student.namaLengkap}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-medium text-zinc-600">Nomor Induk Siswa (NIS)</span>
              <span className="text-zinc-800">: {data.student.nis}</span>
            </div>
            <div className="flex">
              <span className="w-32 font-medium text-zinc-600">Angkatan</span>
              <span className="text-zinc-800">: {data.student.angkatan}</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex">
              <span className="w-28 font-medium text-zinc-600">Kelas</span>
              <span className="font-semibold text-zinc-950">: {data.student.kelas}</span>
            </div>
            <div className="flex">
              <span className="w-28 font-medium text-zinc-600">Jenis Kelamin</span>
              <span className="text-zinc-800">
                : {data.student.jenisKelamin === "L" ? "Laki-laki (Siswa)" : "Perempuan (Siswi)"}
              </span>
            </div>
            <div className="flex">
              <span className="w-28 font-medium text-zinc-600">Program Keahlian</span>
              <span className="text-zinc-800">: Teknologi Penerbangan</span>
            </div>
          </div>
        </div>

        {/* TABEL NILAI AKADEMIK */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-zinc-900 tracking-wider mb-2">
            A. Capaian Kompetensi Akademik (Nilai Rata-rata Murni)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse border border-zinc-400">
              <thead>
                <tr className="bg-zinc-100 print:bg-zinc-100 text-zinc-900">
                  <th className="border border-zinc-400 px-2 py-2 text-center w-8">No</th>
                  <th className="border border-zinc-400 px-3 py-2 text-left">Mata Pelajaran</th>
                  <th className="border border-zinc-400 px-2 py-2 text-center w-12">KKM</th>
                  <th className="border border-zinc-400 px-2 py-2 text-center w-16">Nilai Akhir</th>
                  <th className="border border-zinc-400 px-2 py-2 text-center w-12">Predikat</th>
                  <th className="border border-zinc-400 px-3 py-2 text-left">Deskripsi Capaian Pembelajaran</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="border border-zinc-400 px-3 py-4 text-center text-zinc-500 italic">
                      Belum ada mata pelajaran terdaftar untuk semester ini.
                    </td>
                  </tr>
                ) : (
                  data.subjects.map((sub, idx) => (
                    <tr key={`${sub.mapel}-${idx}`} className="align-top hover:bg-zinc-50/50">
                      <td className="border border-zinc-400 px-2 py-2 text-center font-medium">
                        {idx + 1}
                      </td>
                      <td className="border border-zinc-400 px-3 py-2">
                        <div className="font-semibold text-zinc-950">{sub.mapel}</div>
                        <div className="text-[10px] text-zinc-500">{sub.guruPengampu}</div>
                      </td>
                      <td className="border border-zinc-400 px-2 py-2 text-center font-mono tabular-nums font-medium">
                        {sub.kkm}
                      </td>
                      <td className="border border-zinc-400 px-2 py-2 text-center font-mono tabular-nums font-bold text-zinc-900">
                        {sub.nilaiAkhir !== null ? sub.nilaiAkhir.toFixed(2) : "-"}
                      </td>
                      <td className="border border-zinc-400 px-2 py-2 text-center font-bold">
                        <span
                          className={
                            sub.predikat === "A"
                              ? "text-emerald-700"
                              : sub.predikat === "B"
                              ? "text-blue-700"
                              : sub.predikat === "C"
                              ? "text-amber-700"
                              : sub.predikat === "D"
                              ? "text-red-700"
                              : "text-zinc-500"
                          }
                        >
                          {sub.predikat}
                        </span>
                      </td>
                      <td className="border border-zinc-400 px-3 py-2 text-[11px] leading-relaxed text-zinc-700">
                        {sub.deskripsi}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-50 font-semibold text-zinc-900">
                  <td colSpan={3} className="border border-zinc-400 px-3 py-2 text-right">
                    Total Nilai dan Rata-rata Rapor:
                  </td>
                  <td className="border border-zinc-400 px-2 py-2 text-center font-mono tabular-nums font-bold text-zinc-950">
                    {data.rekapNilai.rataRata > 0 ? data.rekapNilai.rataRata.toFixed(2) : "-"}
                  </td>
                  <td className="border border-zinc-400 px-2 py-2 text-center font-bold">
                    {data.rekapNilai.rataRata >= 90
                      ? "A"
                      : data.rekapNilai.rataRata >= 80
                      ? "B"
                      : data.rekapNilai.rataRata >= 75
                      ? "C"
                      : data.rekapNilai.rataRata > 0
                      ? "D"
                      : "-"}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2 text-[11px] text-zinc-600">
                    Total {data.rekapNilai.jumlahTuntas} mapel tuntas KKM dari {data.rekapNilai.jumlahMapel} mata pelajaran.
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* TABEL EKSTRAKURIKULER & PRESENSI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 break-inside-avoid">
          {/* Ekstrakurikuler */}
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-900 tracking-wider mb-2">
              B. Kegiatan Ekstrakurikuler
            </h3>
            <table className="w-full text-xs border-collapse border border-zinc-400">
              <thead>
                <tr className="bg-zinc-100 text-zinc-900">
                  <th className="border border-zinc-400 px-2 py-1.5 text-center w-8">No</th>
                  <th className="border border-zinc-400 px-3 py-1.5 text-left">Kegiatan</th>
                  <th className="border border-zinc-400 px-2 py-1.5 text-center w-20">Nilai</th>
                  <th className="border border-zinc-400 px-3 py-1.5 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-400 px-2 py-2 text-center">1</td>
                  <td className="border border-zinc-400 px-3 py-2 font-medium">{data.ekskul.nama}</td>
                  <td className="border border-zinc-400 px-2 py-2 text-center font-semibold text-emerald-800">
                    {data.ekskul.nilai}
                  </td>
                  <td className="border border-zinc-400 px-3 py-2 text-[11px] text-zinc-600">
                    {data.ekskul.keterangan}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Presensi Semester */}
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-900 tracking-wider mb-2">
              C. Ketidakhadiran (Semester)
            </h3>
            <table className="w-full text-xs border-collapse border border-zinc-400">
              <thead>
                <tr className="bg-zinc-100 text-zinc-900">
                  <th className="border border-zinc-400 px-3 py-1.5 text-left">Keterangan</th>
                  <th className="border border-zinc-400 px-3 py-1.5 text-center w-24">Jumlah Hari</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-zinc-400 px-3 py-1.5">Sakit (S)</td>
                  <td className="border border-zinc-400 px-3 py-1.5 text-center font-medium">
                    {data.presensi.sakit} hari
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-400 px-3 py-1.5">Izin (I)</td>
                  <td className="border border-zinc-400 px-3 py-1.5 text-center font-medium">
                    {data.presensi.izin} hari
                  </td>
                </tr>
                <tr>
                  <td className="border border-zinc-400 px-3 py-1.5">Tanpa Keterangan atau Alfa (A)</td>
                  <td className="border border-zinc-400 px-3 py-1.5 text-center font-medium">
                    {data.presensi.alfa} hari
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* CATATAN WALI KELAS */}
        <div className="mb-8 break-inside-avoid">
          <h3 className="text-xs font-bold uppercase text-zinc-900 tracking-wider mb-2">
            D. Catatan Perkembangan Karakter & Kedisiplinan Wali Kelas
          </h3>
          <div className="border border-zinc-400 p-3 rounded text-xs bg-zinc-50 print:bg-transparent leading-relaxed italic text-zinc-800 min-h-[60px]">
            &quot;{data.catatanWaliKelas}&quot;
          </div>
        </div>

        {/* LEMBAR PENGESAHAN TANDA TANGAN (3 KOLOM) */}
        <div className="break-inside-avoid pt-4">
          <div className="text-right text-xs text-zinc-700 mb-4">
            Diberikan di: Tangerang, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            {/* Orang Tua atau Wali */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium text-zinc-700">Mengetahui,</p>
                <p className="font-semibold text-zinc-900">Orang Tua atau Wali Murid</p>
              </div>
              <div className="border-b border-zinc-900 w-36 mx-auto" />
            </div>

            {/* Wali Kelas */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium text-zinc-700">Wali Kelas,</p>
                <p className="font-semibold text-zinc-900">{data.student.kelas}</p>
              </div>
              <div>
                <p className="font-bold text-zinc-950 underline underline-offset-2">
                  {data.waliKelas.nama}
                </p>
                <p className="text-[10px] text-zinc-500">NIP. {data.waliKelas.nip}</p>
              </div>
            </div>

            {/* Kepala Sekolah */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium text-zinc-700">Mengetahui,</p>
                <p className="font-semibold text-zinc-900">Kepala Sekolah</p>
              </div>
              <div>
                <p className="font-bold text-zinc-950 underline underline-offset-2">
                  {data.kepalaSekolah.nama}
                </p>
                <p className="text-[10px] text-zinc-500">NIP. {data.kepalaSekolah.nip}</p>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER RESMI DOKUMEN INTERNAL */}
        <div className="mt-8 pt-3 border-t border-zinc-300 flex items-center justify-between text-[10px] text-zinc-400">
          <span>SIMESA - Laporan Evaluasi Hasil Belajar Internal Sekolah</span>
          <span>Status Rapor: <strong className="text-zinc-600">{data.statusRapor}</strong></span>
          <span>Dicetak otomatis pada: {new Date().toLocaleDateString("id-ID")}</span>
        </div>
      </div>
      </div>
    </div>
  );
}

