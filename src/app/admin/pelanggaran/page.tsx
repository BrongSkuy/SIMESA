import { ViolationManagementView } from "@/components/violations/violation-management-view";

export const metadata = {
  title: "Buku Poin & Kedisiplinan Siswa | Portal Admin",
};

export default function AdminPelanggaranPage() {
  return <ViolationManagementView portal="admin" />;
}

