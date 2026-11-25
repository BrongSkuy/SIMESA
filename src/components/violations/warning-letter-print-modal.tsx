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
    // Siapkan dokumen HTML mandiri dalam iframe terisolasi agar 100% presisi A4 tanpa header/footer browser
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
          <title>Surat Peringatan ${letterData.tingkatSp} - ${letterData.nomorSurat}</title>
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
              font-family: 'Times New Roman', Times, serif;
              color: #000;
              margin: 0;
              padding: 12mm 18mm 12mm 18mm;
              font-size: 10.5pt;
              line-height: 1.4;
              background: #fff;
            }
            .kop-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              border-bottom: 3px double #000;
              padding-bottom: 8px;
              margin-bottom: 14px;
              text-align: center;
            }
            .kop-logo {
              width: 65px;
              height: 65px;
              object-fit: contain;
            }
            .kop-text h3 {
              font-size: 10.5pt;
              font-weight: 600;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop-text h2 {
              font-size: 14.5pt;
              font-weight: 900;
              margin: 2px 0 3px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .kop-text p {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 8.5pt;
              margin: 1px 0;
              color: #333;
            }
            .judul-surat {
              text-align: center;
              margin: 12px 0 14px 0;
            }
            .judul-surat h4 {
              font-size: 12pt;
              font-weight: bold;
              text-transform: uppercase;
              text-decoration: underline;
              margin: 0;
            }
            .judul-surat p {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9.5pt;
              color: #444;
              margin: 3px 0 0 0;
            }
            p.paragraf {
              text-align: justify;
              margin: 8px 0;
              text-indent: 28px;
            }
            table.biodata {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0 12px 0;
              font-size: 10.5pt;
            }
            table.biodata td {
              padding: 3px 2px;
              vertical-align: top;
            }
            .label-col {
              width: 210px;
              font-weight: 600;
            }
            .separator-col {
              width: 15px;
              text-align: center;
            }
            table.violations-table {
              width: 100%;
              border-collapse: collapse;
              margin: 10px 0;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9pt;
            }
            table.violations-table th, table.violations-table td {
              border: 1px solid #333;
              padding: 4px 6px;
            }
            table.violations-table th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: center;
            }
            .sanksi-box {
              background-color: #f9f9f9;
              border-left: 3px solid #b91c1c;
              padding: 8px 12px;
              margin: 10px 0;
              font-size: 9.5pt;
            }
            .tanda-tangan-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              text-align: center;
              margin-top: 14px;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 9pt;
            }
            .ttd-box {
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              min-height: 95px;
            }
            .nama-pejabat {
              font-weight: bold;
              text-decoration: underline;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="kop-container">
            <img src="/logo.png" alt="Logo Sekolah" class="kop-logo" />
            <div class="kop-text">
              <h3>Yayasan Pendidikan Kedirgantaraan Nusantara</h3>
              <h2>SMK Penerbangan Dirgantara</h2>
              <p>Jl. Protokol Bandara No. 45, Kompleks Edukasi Dirgantara, Tangerang • Telp. (021) 876-5432</p>
              <p>Email: info@smkpenerbangan.sch.id • NPSN: 20109988 • Terakreditasi A</p>
            </div>
          </div>

          <div class="judul-surat">
            <h4>SURAT PERINGATAN ${tingkatRomawi} (SP ${tingkatRomawi})</h4>
            <p>Nomor: ${letterData.nomorSurat}</p>
          </div>

          <p class="paragraf">
            Sehubungan dengan rekapitulasi data pelanggaran tata tertib dan buku kedisiplinan siswa SMK Penerbangan Dirgantara, dengan ini pihak sekolah menerbitkan Surat Peringatan ${tingkatRomawi} kepada siswa:
          </p>

          <table class="biodata">
            <tbody>
              <tr>
                <td class="label-col">Nama Lengkap Siswa</td>
                <td class="separator-col">:</td>
                <td><strong>${letterData.student.namaLengkap}</strong></td>
              </tr>
              <tr>
                <td class="label-col">Nomor Induk Siswa (NIS)</td>
                <td class="separator-col">:</td>
                <td>${letterData.student.nis}</td>
              </tr>
              <tr>
                <td class="label-col">Kelas dan Jurusan</td>
                <td class="separator-col">:</td>
                <td>${letterData.student.kelas}</td>
              </tr>
              <tr>
                <td class="label-col">Total Akumulasi Poin</td>
                <td class="separator-col">:</td>
                <td><strong style="color: #b91c1c;">${letterData.totalPoinSaatSp} Poin Pelanggaran</strong></td>
              </tr>
            </tbody>
          </table>

          ${
            letterData.violationsList && letterData.violationsList.length > 0
              ? `
              <p style="font-weight: bold; margin: 8px 0 4px 0; font-size: 10pt;">
                Ringkasan Pelanggaran Tata Tertib Terakhir:
              </p>
              <table class="violations-table">
                <thead>
                  <tr>
                    <th style="width: 25px;">No</th>
                    <th style="text-align: left;">Pelanggaran Disiplin</th>
                    <th style="width: 80px;">Tanggal</th>
                    <th style="width: 50px;">Poin</th>
                  </tr>
                </thead>
                <tbody>
                  ${letterData.violationsList
                    .map(
                      (v, i) => `
                    <tr>
                      <td style="text-align: center;">${i + 1}</td>
                      <td>${v.namaPelanggaran}${v.keterangan ? ` <em>(${v.keterangan})</em>` : ""}</td>
                      <td style="text-align: center;">${v.tanggal}</td>
                      <td style="text-align: center; font-weight: bold; color: #b91c1c;">+${v.poin}</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            `
              : ""
          }

          <div class="sanksi-box">
            <strong>Ketentuan dan Tindak Lanjut Sanksi:</strong><br />
            ${getSanksiText(letterData.tingkatSp)}
            ${
              letterData.catatanMediasi
                ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #d1d5db; font-style: italic; color: #374151;">Catatan Tambahan: ${letterData.catatanMediasi}</div>`
                : ""
            }
          </div>

          <p class="paragraf">
            Demikian Surat Peringatan ini dibuat agar menjadi perhatian sungguh-sungguh bagi siswa yang bersangkutan serta pihak Orang Tua atau Wali untuk bersama-sama melakukan pembinaan kedisiplinan.
          </p>

          <div style="text-align: right; margin: 12px 0 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt;">
            Tangerang, ${letterData.tanggalTerbit || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
          </div>

          <div class="tanda-tangan-grid">
            <div class="ttd-box">
              <p style="margin: 0; color: #555;">Wali Kelas,</p>
              <div style="height: 50px;"></div>
              <div>
                <p class="nama-pejabat">Budi Santoso, S.Pd.</p>
                <p style="margin: 2px 0 0 0; font-size: 8pt; color: #666;">NIP. 197601012005</p>
              </div>
            </div>

            <div class="ttd-box">
              <p style="margin: 0; color: #555;">Guru Bimbingan Konseling,</p>
              <div style="height: 50px;"></div>
              <div>
                <p class="nama-pejabat">${letterData.diterbitkanOleh || "Dra. Endang Lestari, S.Psi."}</p>
                <p style="margin: 2px 0 0 0; font-size: 8pt; color: #666;">NIP. 198507102010</p>
              </div>
            </div>

            <div class="ttd-box">
              <p style="margin: 0; color: #555;">Mengetahui,<br />Kepala Sekolah,</p>
              <div style="height: 40px;"></div>
              <div>
                <p class="nama-pejabat">Drs. H. Mulyadi, M.M.</p>
                <p style="margin: 2px 0 0 0; font-size: 8pt; color: #666;">NIP. 196805121994031002</p>
              </div>
            </div>
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

  const tingkatRomawi = toRomanNumeral(letterData.tingkatSp);

  const getSanksiText = (level: number) => {
    switch (level) {
      case 1:
        return "Peringatan tertulis pertama (SP I) serta pemanggilan Orang Tua atau Wali Siswa ke sekolah untuk pembinaan terpadu.";
      case 2:
        return "Peringatan tertulis kedua (SP II), skorsing akademik selama 3 (tiga) hari kerja, serta penandatanganan pakta integritas kedisiplinan bermaterai bersama Orang Tua atau Wali.";
      case 3:
      default:
        return "Peringatan tertulis ketiga (SP III atau Terakhir), pelaksanaan Konferensi Kasus Dewan Guru, serta evaluasi pengembalian siswa kepada Orang Tua atau Wali.";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-100 border border-slate-200">
        <DialogHeader className="p-4 bg-white border-b border-slate-200 flex flex-row items-center justify-between space-y-0 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 ">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 ">
                Pratinjau Surat Peringatan {letterData.tingkatSp} (SP {tingkatRomawi})
              </DialogTitle>
              <p className="text-xs text-slate-500 ">
                Dokumen kedinasan resmi siap cetak format A4 SMK Penerbangan Dirgantara
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-[#1F4E78] hover:bg-[#163a5c] text-white flex items-center gap-1.5 shadow-sm font-semibold cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen Resmi</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Tutup</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Scrollable Container with Sheet Paper */}
        <div className="p-4 sm:p-6 max-h-[80vh] overflow-y-auto flex justify-center bg-slate-200/60 ">
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

                <span className="font-semibold text-slate-600">Kelas dan Tingkat</span>
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
              yang bersangkutan serta pihak Orang Tua atau Wali untuk bersama-sama melakukan pembinaan kedisiplinan.
            </p>

            {/* TANDA TANGAN */}
            <div className="mt-8 font-sans text-xs">
              <div className="text-right mb-4">
                Tangerang, {letterData.tanggalTerbit || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
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

