"use client";

import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, CheckCircle2 } from "lucide-react";
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <FileText className="w-5 h-5 text-blue-600" />
            Pratinjau Surat Dispensasi Izin Meninggalkan Kelas
          </DialogTitle>
        </DialogHeader>

        {/* Lembar Dokumen Resmi Siap Cetak */}
        <div
          ref={printRef}
          className="print-container bg-white text-black p-6 sm:p-8 rounded-md border border-zinc-300 shadow-xs text-sm leading-relaxed"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* KOP SURAT RESMI */}
          <div className="text-center border-b-2 border-black pb-3 mb-4">
            <h3 className="text-sm font-semibold tracking-wider uppercase">
              Yayasan Pendidikan Dirgantara Nusantara
            </h3>
            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide">
              SMK Penerbangan Dirgantara
            </h2>
            <p className="text-xs text-zinc-700 mt-1">
              Jalan Dirgantara Raya No. 45, Kompleks Bandara Perintis, Kota Bandung
            </p>
            <p className="text-xs text-zinc-700">
              Telepon: (022) 7894561 • Laman: www.smkpenerbangan-dirgantara.sch.id
            </p>
          </div>

          {/* JUDUL DOKUMEN */}
          <div className="text-center my-4">
            <h4 className="text-sm sm:text-base font-bold uppercase underline tracking-wide">
              Surat Dispensasi Izin Meninggalkan Kelas
            </h4>
            <p className="text-xs font-semibold mt-1">
              Nomor: {data.nomorSurat}
            </p>
          </div>

          {/* ISI SURAT */}
          <p className="mb-3 text-justify">
            Yang bertanda tangan di bawah ini, Petugas Bimbingan Konseling dan Kesiswaan SMK Penerbangan Dirgantara, menerangkan bahwa:
          </p>

          <table className="w-full mb-4 text-xs sm:text-sm">
            <tbody>
              <tr>
                <td className="w-40 py-1 font-semibold">Nama Lengkap Siswa</td>
                <td className="w-4 py-1">:</td>
                <td className="py-1 font-bold">{data.studentName || "-"}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Nomor Induk Siswa (NIS)</td>
                <td className="py-1">:</td>
                <td className="py-1">{data.studentNis || "-"}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Kelas dan Jurusan</td>
                <td className="py-1">:</td>
                <td className="py-1">{data.studentKelas || "-"}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Hari dan Tanggal</td>
                <td className="py-1">:</td>
                <td className="py-1">{formatTanggalIndonesia(data.tanggal)}</td>
              </tr>
              <tr>
                <td className="py-1 font-semibold">Waktu Pelaksanaan Izin</td>
                <td className="py-1">:</td>
                <td className="py-1 font-semibold">
                  {formatRentangWaktu(data.jamMulai, data.jamSelesai)}
                </td>
              </tr>
              <tr>
                <td className="py-1 font-semibold align-top">Keperluan Izin</td>
                <td className="py-1 align-top">:</td>
                <td className="py-1 font-semibold text-blue-900">{data.keperluan}</td>
              </tr>
              {data.keterangan && (
                <tr>
                  <td className="py-1 font-semibold align-top">Rincian Keterangan</td>
                  <td className="py-1 align-top">:</td>
                  <td className="py-1 italic text-zinc-800">{data.keterangan}</td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="bg-zinc-50 border border-zinc-200 p-3 rounded mb-4 text-xs">
            <span className="font-bold">Ketentuan dan Catatan Pengajar:</span>
            <ul className="list-disc ml-5 mt-1 space-y-0.5 text-zinc-700">
              <li>Surat dispensasi ini merupakan bukti izin sah meninggalkan ruang kelas.</li>
              <li>Siswa tidak diperkenankan berada di luar area lingkungan sekolah tanpa izin tertulis khusus.</li>
              <li>Siswa berkewajiban menanyakan dan menuntaskan tugas pelajaran yang tertinggal kepada guru mata pelajaran terkait.</li>
            </ul>
          </div>

          <p className="mb-6 text-justify">
            Demikian surat keterangan dispensasi ini diterbitkan untuk dipergunakan sebagaimana mestinya dan mohon maklum adanya kepada Bapak dan Ibu Guru yang sedang mengajar di kelas.
          </p>

          {/* TANDA TANGAN */}
          <div className="flex justify-end mt-8">
            <div className="text-center w-64 text-xs sm:text-sm">
              <p>Bandung, {formatTanggalIndonesia(data.tanggal)}</p>
              <p className="font-semibold mt-1">Petugas Penerbit Dispensasi,</p>
              <div className="h-16 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 opacity-60" />
              </div>
              <p className="font-bold underline uppercase">{data.issuerName || "Petugas BK dan Kesiswaan"}</p>
              <p className="text-xs text-zinc-600">SMK Penerbangan Dirgantara</p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex sm:justify-between items-center gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup Pratinjau
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-blue-900 hover:bg-blue-800 text-white gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Dokumen Resmi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
