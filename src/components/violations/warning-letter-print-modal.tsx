"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, ShieldAlert, Calendar, User, FileText } from "lucide-react";
import { toRomanNumeral } from "@/lib/violations";

export interface WarningLetterData {
  id?: string;
  nomorSurat: string;
  tingkatSp: number; // 1, 2, 3
  tanggalTerbit: string;
  totalPoinSaatSp: number;
  diterbitkanOleh: string;
  statusPanggilan?: string;
  catatanMediasi?: string;
  student: {
    id: string;
    namaLengkap: string;
    nis: string;
    kelas: string;
    angkatan?: string;
  };
  violationsList?: Array<{
    tanggal: string;
    namaPelanggaran: string;
    poin: number;
    keterangan?: string | null;
  }>;
}

interface WarningLetterPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterData: WarningLetterData | null;
}

export function WarningLetterPrintModal({
  open,
  onOpenChange,
  letterData,
}: WarningLetterPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!letterData) return null;

  const handlePrint = () => {
    window.print();
  };

  const tingkatRomawi = toRomanNumeral(letterData.tingkatSp);

  const getSanksiText = (level: number) => {
    switch (level) {
      case 1:
        return "Peringatan tertulis pertama (SP I) serta pemanggilan Orang Tua / Wali Siswa ke sekolah untuk pembinaan terpadu.";
      case 2:
        return "Peringatan tertulis kedua (SP II), skorsing akademik selama 3 (tiga) hari kerja, serta penandatanganan pakta integritas kedisiplinan bermaterai bersama Orang Tua / Wali.";
      case 3:
      default:
        return "Peringatan tertulis ketiga (SP III / Terakhir), pelaksanaan Konferensi Kasus Dewan Guru, serta evaluasi pengembalian siswa kepada Orang Tua / Wali.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between space-y-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Pratinjau Surat Peringatan {letterData.tingkatSp} (SP {tingkatRomawi})
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dokumen kedinasan resmi siap cetak format A4 SMK Penerbangan Dirgantara
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-[#1F4E78] hover:bg-[#163a5c] text-white flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Container with Sheet Paper */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto flex justify-center bg-slate-200/60 dark:bg-slate-950">
          <div
            ref={printRef}
            className="w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 bg-white text-slate-900 shadow-xl rounded-sm print:p-0 print:m-0 print:w-full print:shadow-none print:border-none font-serif text-[13px] leading-relaxed"
          >
            {/* KOP SURAT RESMI */}
            <div className="border-b-4 border-double border-slate-900 pb-3 mb-6 text-center relative">
              <div className="flex items-center justify-center gap-4">
                <div className="w-16 h-16 relative shrink-0">
                  <Image
                    src="/logo.png"
                    alt="Logo Sekolah"
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold tracking-wider text-slate-700 uppercase">
                    Yayasan Pendidikan Kedirgantaraan Nusantara
                  </p>
                  <h1 className="text-lg sm:text-xl font-black tracking-wide text-slate-950 uppercase">
                    SMK Penerbangan Dirgantara
                  </h1>
                  <p className="text-[11px] text-slate-600 font-sans mt-0.5">
                    Jl. Protokol Bandara No. 45, Kompleks Edukasi Dirgantara • Telp. (021) 876-5432
                  </p>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Email: info@smkpenerbangan.sch.id • NPSN: 20109988 • Terakreditasi A
                  </p>
                </div>
              </div>
            </div>

            {/* JUDUL SURAT */}
            <div className="text-center mb-6">
              <h2 className="text-base font-bold underline tracking-wider uppercase">
                SURAT PERINGATAN {tingkatRomawi} (SP {tingkatRomawi})
              </h2>
              <p className="text-xs font-sans text-slate-600 mt-1">
                Nomor: {letterData.nomorSurat}
              </p>
            </div>

            {/* PENGANTAR */}
            <p className="mb-4 text-justify">
              Surat Peringatan ini diterbitkan oleh pihak sekolah sehubungan dengan hasil evaluasi akumulasi
              catatan pelanggaran tata tertib dan disiplin sekolah yang telah dicapai oleh siswa di bawah ini:
            </p>

            {/* DATA SISWA */}
            <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-5 font-sans text-xs">
              <div className="grid grid-cols-3 gap-y-1.5">
                <span className="font-semibold text-slate-600">Nama Lengkap</span>
                <span className="col-span-2 font-bold text-slate-900">: {letterData.student.namaLengkap}</span>

                <span className="font-semibold text-slate-600">Nomor Induk Siswa (NIS)</span>
                <span className="col-span-2 text-slate-900">: {letterData.student.nis}</span>

                <span className="font-semibold text-slate-600">Kelas / Tingkat</span>
                <span className="col-span-2 text-slate-900">: {letterData.student.kelas}</span>

                <span className="font-semibold text-slate-600">Total Akumulasi Poin</span>
                <span className="col-span-2 font-bold text-red-600">: {letterData.totalPoinSaatSp} Poin</span>
              </div>
            </div>

            {/* RINCIAN PELANGGARAN TERAKHIR */}
            {letterData.violationsList && letterData.violationsList.length > 0 && (
              <div className="mb-5">
                <p className="font-semibold mb-2 text-xs">
                  Ringkasan Pelanggaran Tata Tertib yang Telah Dilakukan:
                </p>
                <table className="w-full border-collapse border border-slate-300 font-sans text-[11px]">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-300 p-1.5 text-center w-8">No</th>
                      <th className="border border-slate-300 p-1.5 text-left">Pelanggaran Disiplin</th>
                      <th className="border border-slate-300 p-1.5 text-center w-24">Tanggal</th>
                      <th className="border border-slate-300 p-1.5 text-center w-16">Poin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {letterData.violationsList.map((v, i) => (
                      <tr key={i}>
                        <td className="border border-slate-300 p-1.5 text-center">{i + 1}</td>
                        <td className="border border-slate-300 p-1.5">
                          {v.namaPelanggaran}
                          {v.keterangan ? ` (${v.keterangan})` : ""}
                        </td>
                        <td className="border border-slate-300 p-1.5 text-center">{v.tanggal}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-semibold text-red-600">
                          +{v.poin}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* KONSEKUENSI & SANKSI */}
            <div className="mb-5 text-justify">
              <p className="mb-2 font-semibold text-xs">Ketentuan dan Tindak Lanjut:</p>
              <p className="mb-2">{getSanksiText(letterData.tingkatSp)}</p>
              {letterData.catatanMediasi && (
                <p className="italic bg-amber-50 border-l-2 border-amber-400 p-2 text-xs font-sans text-slate-700">
                  Catatan Tambahan: {letterData.catatanMediasi}
                </p>
              )}
            </div>

            <p className="mb-6 text-justify">
              Demikian Surat Peringatan ini dibuat agar menjadi perhatian sungguh-sungguh bagi siswa
              yang bersangkutan serta pihak Orang Tua / Wali untuk bersama-sama melakukan pembinaan kedisiplinan.
            </p>

            {/* TANDA TANGAN */}
            <div className="mt-8 font-sans text-xs">
              <div className="text-right mb-4">
                Jakarta, {letterData.tanggalTerbit || new Date().toLocaleDateString("id-ID")}
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-slate-600 mb-16">Wali Kelas,</p>
                  <p className="font-bold underline text-slate-900">Budi Santoso, S.Pd.</p>
                  <p className="text-[10px] text-slate-500">NIP. 197601012005</p>
                </div>

                <div>
                  <p className="text-slate-600 mb-16">Guru Bimbingan Konseling,</p>
                  <p className="font-bold underline text-slate-900">{letterData.diterbitkanOleh || "Dra. Endang Lestari, S.Psi."}</p>
                  <p className="text-[10px] text-slate-500">NIP. 198507102010</p>
                </div>

                <div>
                  <p className="text-slate-600 mb-16">Mengetahui,<br />Kepala Sekolah,</p>
                  <p className="font-bold underline text-slate-900">Drs. H. Mulyadi, M.M.</p>
                  <p className="text-[10px] text-slate-500">NIP. 196805121994031002</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

