"use client";

import React from "react";
import Image from "next/image";
import { Printer, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentReportCardData } from "@/lib/erapor";

interface ReportCardPrintViewProps {
  data: StudentReportCardData;
  onBack?: () => void;
}

export function ReportCardPrintView({ data, onBack }: ReportCardPrintViewProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      {/* Tombol Aksi di Luar Print Area */}
      <div className="print:hidden flex items-center justify-between gap-4 p-4 mb-6 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 text-xs">
              <ArrowLeft className="w-4 h-4" />
              Kembali
            </Button>
          )}
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">
              Pratinjau E-Rapor Internal
            </h3>
            <p className="text-xs text-slate-500">
              Dokumen hasil belajar siswa siap cetak format A4 standar resmi sekolah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="w-4 h-4" />
            Cetak Dokumen (A4)
          </Button>
        </div>
      </div>

      {/* Lembar Dokumen Rapor (A4 Print-Ready) */}
      <div className="bg-white text-zinc-900 border border-zinc-200 shadow-lg print:shadow-none print:border-none p-8 md:p-12 rounded-lg font-sans text-sm leading-normal">
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
                Akreditasi &quot;A&quot; (Unggul) • NPSN: {data.sekolah.npsn}
              </p>
              <p className="text-[11px] text-zinc-500 mt-1">
                {data.sekolah.alamat} • Telp: {data.sekolah.telepon} • Email: {data.sekolah.email}
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
                : {data.student.jenisKelamin === "L" ? "Laki-laki (Taruna)" : "Perempuan (Taruni)"}
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
                    Total Nilai / Rata-rata Rapor:
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
                  <td className="border border-zinc-400 px-3 py-1.5">Tanpa Keterangan / Alfa (A)</td>
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
            {/* Orang Tua / Wali */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium text-zinc-700">Mengetahui,</p>
                <p className="font-semibold text-zinc-900">Orang Tua / Wali Murid</p>
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
          <span>SIMESA — Laporan Evaluasi Hasil Belajar Internal Sekolah</span>
          <span>Status Rapor: <strong className="text-zinc-600">{data.statusRapor}</strong></span>
          <span>Dicetak otomatis pada: {new Date().toLocaleDateString("id-ID")}</span>
        </div>
      </div>
    </div>
  );
}

