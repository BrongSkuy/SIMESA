# 🔑 Akun Default SIMESA (Login & Pengujian)

Setelah menjalankan perintah database seed (`npx tsx src/db/seed.ts`), Anda dapat masuk ke dalam sistem menggunakan akun-akun berikut sesuai peran:

---

### 1. Manajemen & Administrasi Sistem
| Peran | Username | Password Default | Nama Pengguna | Akses Portal |
| :--- | :--- | :--- | :--- | :--- |
| **Superadmin** | `superadmin` | `admin123` | Super Administrator SIMESA | `/admin` (Akses Penuh) |
| **Admin** | `admin001` | `admin123` | Administrator Sekolah | `/admin` (Administrasi Master Data) |
| **Kepala Sekolah** | `kepsek01` | `kepsek123` | Drs. H. Mulyadi, M.M. | `/admin` (Monitoring Eksekutif & SPK) |

---

### 2. Dewan Guru (Pendidik & Multi-Role)
| Peran / Jabatan | Username (NIP) | Password Default | Nama Guru | Rincian Peran Tambahan |
| :--- | :--- | :--- | :--- | :--- |
| **Guru (Wali Kelas)** | `197601012005` | `197601012005` | Budi Santoso, S.Pd. | Guru Mapel + Wali Kelas X-A |
| **Guru (+ Guru BK)** | `198203152008` | `198203152008` | Siti Rahayu, M.Pd. | Guru Mapel + Wali Kelas X-B + **Guru BK** |
| **Guru (+ Ekskul/Piket)** | `199005202012` | `199005202012` | Ahmad Fauzi, S.Pd. | Guru Mapel + Wali Kelas XI-A + **Pembina Ekskul Pramuka** + **Guru Piket** |
| **Guru BK Murni** | `198507102010` | `198507102010` | Dra. Endang Lestari, S.Psi. | Layanan Konseling & Buku Poin Pelanggaran |

*(Catatan Guru: Password default guru sama dengan NIP masing-masing).*

---

### 3. Layanan & Staf Pendukung
| Peran | Username | Password Default | Nama Staf | Akses Portal |
| :--- | :--- | :--- | :--- | :--- |
| **Staf Perpustakaan** | `perpus01` | `perpus123` | Nurul Hidayah, A.Md. | `/admin` (Katalog Buku & Barcode) |
| **Staf Sarpras** | `sarpras01` | `sarpras123` | Bambang Irawan, S.T. | `/admin` (Inventaris & Fasilitas) |

---

### 4. Siswa & Orang Tua
| Peran | Username (NIS) | Password Default | Nama Siswa | Kelas |
| :--- | :--- | :--- | :--- | :--- |
| **Siswa & Ortu** | `2024001` | `2024001` | Andi Prasetyo | X-A |
| **Siswa & Ortu** | `2024002` | `2024002` | Dewi Lestari | X-A |
| **Siswa & Ortu** | `2024003` | `2024003` | Rizki Ramadhan | X-A |
| **Siswa & Ortu** | `2024006` | `2024006` | Putri Ayu Wulandari | X-B |
| **Siswa & Ortu** | `2024011` | `2024011` | Dimas Arya Pratama | XI-A |
| ... dan siswa lainnya | `2024001` s/d `2024015` | *(Sama dengan NIS)* | Sesuai Data Siswa | Sesuai Kelas |

*(Catatan Siswa: Password default siswa adalah Nomor Induk Siswa / NIS masing-masing).*

---

### 5. Kebijakan Keamanan & Masa Aktif Sesi Akun
| Kategori Akun | Batas Masa Aktif Sesi | Batas Percobaan Gagal | Keterangan & Karakteristik |
| :--- | :---: | :---: | :--- |
| **Siswa & Orang Tua** (`SISWA`) | **7 Hari** (168 Jam) | 5 Kali (Kunci 5 Menit) | Multi-device aktif (dapat diakses bersama oleh siswa dan orang tua dari HP keluarga tanpa saling mengeluarkan). |
| **Staf & Dewan Guru** (`ADMIN`, `GURU`, `KEPALA_SEKOLAH`, dll.) | **24 Jam** (1 Hari Kerja) | 5 Kali (Kunci 5 Menit) | Mencegah akun tertinggal di komputer Lab atau TU sekolah. Sesi otomatis kedaluwarsa setelah 24 jam. |

