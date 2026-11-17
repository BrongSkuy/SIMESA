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
import { Printer, FileText, CheckCircle2, X } from "lucide-react";
import {
  DispensationLetterItem,
  formatTanggalIndonesia,
  formatRentangWaktu,
} from "@/lib/counseling";

interface DispensationPrintModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: DispensationLetterItem | null;
}

export function DispensationPrintModal({
  open,
  onOpenChange,
  data,
}: DispensationPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  /**
   * Cetak menggunakan iframe terisolasi agar 100% identik dengan pratinjau,
   * berada tepat di bagian atas kertas A4, tidak terpotong dialog modal,
   * dan tidak mencetak tombol atau pembungkus antarmuka web.
   */
  const handlePrint = () => {
    // Siapkan dokumen HTML mandiri untuk iframe pencetakan
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
          <title>Surat Dispensasi - ${data.nomorSurat}</title>
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
              font-size: 11pt;
              line-height: 1.45;
              background: #fff;
            }
            .kop-container {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 16px;
              border-bottom: 3px double #000;
              padding-bottom: 10px;
              margin-bottom: 16px;
              text-align: center;
            }
            .kop-logo {
              width: 70px;
              height: 70px;
              object-fit: contain;
            }
            .kop-text h3 {
              font-size: 11pt;
              font-weight: 600;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .kop-text h2 {
              font-size: 15pt;
              font-weight: bold;
              margin: 2px 0 0 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .kop-text p {
              font-size: 9pt;
              font-family: Arial, sans-serif;
              margin: 2px 0 0 0;
              color: #333;
            }
            .judul-surat {
              text-align: center;
              margin: 16px 0;
            }
            .judul-surat h4 {
              font-size: 13pt;
              font-weight: bold;
              text-decoration: underline;
              text-transform: uppercase;
              margin: 0;
              letter-spacing: 0.5px;
            }
            .judul-surat p {
              font-size: 10.5pt;
              font-weight: 600;
              margin: 4px 0 0 0;
            }
            .paragraf {
              text-align: justify;
              margin-bottom: 12px;
              line-height: 1.5;
            }
            table.biodata {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0 16px 0;
              font-size: 11.5pt;
            }
            table.biodata td {
              padding: 4px 2px;
              vertical-align: top;
            }
            .label-col {
              width: 220px;
              font-weight: 600;
            }
            .separator-col {
              width: 15px;
              text-align: center;
            }
            .ketentuan-box {
              background-color: #f9f9f9;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 10px 14px;
              margin: 14px 0;
              font-size: 10pt;
            }
            .ketentuan-box strong {
              display: block;
              margin-bottom: 4px;
            }
            .ketentuan-box ul {
              margin: 0;
              padding-left: 18px;
            }
            .ketentuan-box li {
              margin-bottom: 3px;
              color: #333;
            }
            .tanda-tangan-wrapper {
              display: flex;
              justify-content: flex-end;
              margin-top: 24px;
            }
            .tanda-tangan-box {
              text-align: center;
              width: 240px;
              font-size: 11pt;
            }
            .stempel-space {
              height: 55px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .nama-pejabat {
              font-weight: bold;
              text-decoration: underline;
              text-transform: uppercase;
              margin: 0;
            }
            .instansi-pejabat {
              font-size: 9.5pt;
              color: #444;
              margin-top: 2px;
            }
          </style>
        </head>
        <body>
          <!-- KOP SURAT RESMI -->
          <div class="kop-container">
            <img src="/logo.png" alt="Logo Sekolah" class="kop-logo" />
            <div class="kop-text">
              <h3>Yayasan Pendidikan Kedirgantaraan Nusantara</h3>
              <h2>SMK Penerbangan Dirgantara</h2>
              <p>Jl. Protokol Bandara No. 45, Kompleks Edukasi Dirgantara • Telp. (021) 876-5432</p>
              <p>Email: info@smkpenerbangan.sch.id • NPSN: 20109988 • Terakreditasi A</p>
            </div>
          </div>

          <!-- JUDUL SURAT -->
          <div class="judul-surat">
            <h4>Surat Dispensasi Izin Meninggalkan Kelas</h4>
            <p>Nomor: ${data.nomorSurat}</p>
          </div>

          <!-- PENGANTAR -->
          <p class="paragraf">
            Yang bertanda tangan di bawah ini, Petugas Bimbingan Konseling dan Kesiswaan SMK Penerbangan Dirgantara menerangkan bahwa:
          </p>

          <!-- BIODATA SISWA -->
          <table class="biodata">
            <tbody>
              <tr>
                <td class="label-col">Nama Lengkap Siswa</td>
                <td class="separator-col">:</td>
                <td><strong>${data.studentName || "-"}</strong></td>
              </tr>
              <tr>
                <td class="label-col">Nomor Induk Siswa (NIS)</td>
                <td class="separator-col">:</td>
                <td>${data.studentNis || "-"}</td>
              </tr>
              <tr>
                <td class="label-col">Kelas dan Jurusan</td>
                <td class="separator-col">:</td>
                <td>${data.studentKelas || "-"}</td>
              </tr>
              <tr>
                <td class="label-col">Hari dan Tanggal</td>
                <td class="separator-col">:</td>
                <td>${formatTanggalIndonesia(data.tanggal)}</td>
              </tr>
              <tr>
                <td class="label-col">Waktu Pelaksanaan Izin</td>
                <td class="separator-col">:</td>
                <td><strong>${formatRentangWaktu(data.jamMulai, data.jamSelesai)}</strong></td>
              </tr>
              <tr>
                <td class="label-col">Keperluan Izin</td>
                <td class="separator-col">:</td>
                <td><strong>${data.keperluan}</strong></td>
              </tr>
              ${
                data.keterangan
                  ? `<tr>
                      <td class="label-col">Rincian Keterangan</td>
                      <td class="separator-col">:</td>
                      <td style="font-style: italic;">${data.keterangan}</td>
                    </tr>`
                  : ""
              }
            </tbody>
          </table>

          <!-- KETENTUAN DAN CATATAN PENGAJAR -->
          <div class="ketentuan-box">
            <strong>Ketentuan dan Catatan Pengajar:</strong>
            <ul>
              <li>Surat dispensasi ini merupakan bukti izin sah meninggalkan ruang kelas.</li>
              <li>Siswa tidak diperkenankan berada di luar area lingkungan sekolah tanpa izin tertulis khusus.</li>
              <li>Siswa berkewajiban menanyakan dan menuntaskan tugas pelajaran yang tertinggal kepada guru mata pelajaran terkait.</li>
            </ul>
          </div>

          <!-- PENUTUP -->
          <p class="paragraf">
            Demikian surat keterangan dispensasi ini diterbitkan untuk dipergunakan sebagaimana mestinya dan mohon maklum adanya kepada Bapak dan Ibu Guru yang sedang mengajar di kelas.
          </p>

          <!-- TANDA TANGAN -->
          <div class="tanda-tangan-wrapper">
            <div class="tanda-tangan-box">
              <p style="margin: 0;">Tangerang, ${formatTanggalIndonesia(data.tanggal)}</p>
              <p style="font-weight: 600; margin: 4px 0 0 0;">Petugas Penerbit Dispensasi,</p>
              <div class="stempel-space">
                <span style="font-size: 26pt; color: #059669; opacity: 0.65;">✓</span>
              </div>
              <p class="nama-pejabat">${data.issuerName || "Petugas BK dan Kesiswaan"}</p>
              <p class="instansi-pejabat">SMK Penerbangan Dirgantara</p>
            </div>
          </div>
        </body>
      </html>
    `;

    frameDoc.open();
    frameDoc.write(htmlContent);
    frameDoc.close();

    // Tunggu gambar logo selesai termuat sebelum trigger print
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();

      // Bersihkan iframe setelah dialog cetak ditutup
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 1000);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Header Modal - Hidden Saat Cetak Standar */}
        <DialogHeader className="p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Pratinjau Surat Dispensasi Izin Meninggalkan Kelas
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
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-sm font-semibold"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Dokumen Resmi</span>
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

        {/* Area Pratinjau Kertas A4 yang Rapi & Proporsional */}
        <div className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto flex justify-center bg-slate-200/70 dark:bg-slate-950">
          <div
            ref={printRef}
            className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-12 shadow-xl rounded-sm border border-slate-300 font-serif text-[13px] leading-relaxed"
          >
            {/* KOP SURAT RESMI DENGAN LOGO */}
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
                Surat Dispensasi Izin Meninggalkan Kelas
              </h2>
              <p className="text-xs font-sans text-slate-700 font-semibold mt-1">
                Nomor: {data.nomorSurat}
              </p>
            </div>

            {/* PENGANTAR */}
            <p className="mb-4 text-justify">
              Yang bertanda tangan di bawah ini, Petugas Bimbingan Konseling dan Kesiswaan SMK Penerbangan Dirgantara menerangkan bahwa:
            </p>

            {/* BIODATA SISWA */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4 mb-5 font-sans text-xs">
              <div className="grid grid-cols-3 gap-y-2">
                <span className="font-semibold text-slate-600">Nama Lengkap Siswa</span>
                <span className="col-span-2 font-bold text-slate-900">: {data.studentName || "-"}</span>

                <span className="font-semibold text-slate-600">Nomor Induk Siswa (NIS)</span>
                <span className="col-span-2 text-slate-900">: {data.studentNis || "-"}</span>

                <span className="font-semibold text-slate-600">Kelas dan Jurusan</span>
                <span className="col-span-2 text-slate-900">: {data.studentKelas || "-"}</span>

                <span className="font-semibold text-slate-600">Hari dan Tanggal</span>
                <span className="col-span-2 text-slate-900">: {formatTanggalIndonesia(data.tanggal)}</span>

                <span className="font-semibold text-slate-600">Waktu Pelaksanaan Izin</span>
                <span className="col-span-2 font-bold text-slate-900">
                  : {formatRentangWaktu(data.jamMulai, data.jamSelesai)}
                </span>

                <span className="font-semibold text-slate-600">Keperluan Izin</span>
                <span className="col-span-2 font-bold text-blue-900">
                  : {data.keperluan}
                </span>

                {data.keterangan && (
                  <>
                    <span className="font-semibold text-slate-600">Rincian Keterangan</span>
                    <span className="col-span-2 italic text-slate-800">
                      : {data.keterangan}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* KETENTUAN DAN CATATAN PENGAJAR */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded mb-5 text-xs font-sans">
              <span className="font-bold text-slate-900 block mb-1">Ketentuan dan Catatan Pengajar:</span>
              <ul className="list-disc ml-5 space-y-0.5 text-slate-700">
                <li>Surat dispensasi ini merupakan bukti izin sah meninggalkan ruang kelas.</li>
                <li>Siswa tidak diperkenankan berada di luar area lingkungan sekolah tanpa izin tertulis khusus.</li>
                <li>Siswa berkewajiban menanyakan dan menuntaskan tugas pelajaran yang tertinggal kepada guru mata pelajaran terkait.</li>
              </ul>
            </div>

            {/* PENUTUP */}
            <p className="mb-6 text-justify">
              Demikian surat keterangan dispensasi ini diterbitkan untuk dipergunakan sebagaimana mestinya dan mohon maklum adanya kepada Bapak dan Ibu Guru yang sedang mengajar di kelas.
            </p>

            {/* TANDA TANGAN */}
            <div className="flex justify-end mt-8 font-sans text-xs">
              <div className="text-center w-64">
                <p className="text-slate-700">Tangerang, {formatTanggalIndonesia(data.tanggal)}</p>
                <p className="font-semibold text-slate-900 mt-1">Petugas Penerbit Dispensasi,</p>
                <div className="h-16 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-60" />
                </div>
                <p className="font-bold underline uppercase text-slate-950">
                  {data.issuerName || data.diterbitkanOleh || "Petugas BK dan Kesiswaan"}
                </p>
                <p className="text-[11px] text-slate-600">SMK Penerbangan Dirgantara</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
