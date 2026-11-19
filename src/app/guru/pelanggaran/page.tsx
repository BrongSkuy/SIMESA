import { ViolationManagementView } from "@/components/violations/violation-management-view";

export const metadata = {
  title: "Buku Poin & Kedisiplinan Siswa | Portal Guru",
};

export default function GuruPelanggaranPage() {
  return <ViolationManagementView portal="guru" />;
}

