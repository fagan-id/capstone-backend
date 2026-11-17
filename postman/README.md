# Panduan Penggunaan Postman Collection — Capstone Backend ABK

Dokumen ini menjelaskan cara menggunakan **Postman Collection** dan **Environment** untuk melakukan pengujian manual terhadap seluruh endpoint REST API Capstone Backend (Sistem Skrining Awal Anak Berkebutuhan Khusus).

---

## 1. File yang Tersedia

1. **`capstone-backend.postman_collection.json`**: Berisi seluruh endpoint API yang dikelompokkan secara terstruktur:
   - `00. Health Check`
   - `01. Autentikasi (Auth)`
   - `02. Super Admin - Dashboard`
   - `03. Super Admin - Kelola Sekolah`
   - `04. Super Admin - Tes Skrining (Overview)`
   - `05. Super Admin - Tab Pertanyaan`
   - `06. Super Admin - Tab Pemetaan`
   - `07. Super Admin - Tab Penilaian`
   - `08. Super Admin - Tab Interpretasi`
   - `09. Alur Publik Skrining ABK (Orang Tua)`
2. **`capstone-backend.postman_environment.json`**: Variabel environment siap pakai (misal `baseUrl`, `superAdminToken`, `sekolahToken`, dll).

---

## 2. Cara Import ke Postman

1. Buka aplikasi **Postman**.
2. Klik tombol **Import** di sudut kiri atas.
3. Seret (*drag & drop*) atau pilih kedua file berikut:
   - `postman/capstone-backend.postman_collection.json`
   - `postman/capstone-backend.postman_environment.json`
4. Di pojok kanan atas Postman, pastikan environment aktif dipilih: **`Capstone Backend - Local Environment`**.

---

## 3. Fitur Otomatis (*Auto-Set Token*)

Koleksi ini telah dilengkapi dengan script otomatis pada tab **Tests**:
- Saat Anda menjalankan request **`01. Autentikasi / Login Super Admin`**, token JWT yang diterima akan **otomatis disimpan** ke variabel `{{superAdminToken}}`. Seluruh request di folder Super Admin akan langsung menggunakan token ini tanpa perlu copy-paste manual.
- Saat Anda menjalankan request **`01. Autentikasi / Login Sekolah`**, token JWT akan otomatis disimpan ke variabel `{{sekolahToken}}`.
- Saat Anda menjalankan **`09. Alur Publik / 4. Mulai Skrining`**, token pengerjaan akan otomatis disimpan ke variabel `{{tokenSkrining}}`.

---

## 4. Akun & Data Uji Bawaan (Seed Demo)

Pastikan database sudah di-seed (`npm run db:seed`) dan server lokal sedang berjalan (`npm run dev` atau `npm start`).

- **Super Admin**:
  - Identifier: `superadmin@demo.test`
  - Password: `parhan123`
- **Sekolah**:
  - Identifier: `sekolah@demo.test` (atau `sd_demo`)
  - Password: `parhan123`
- **Kode Sesi Skrining Orang Tua**:
  - Kode Sesi: `ABC123`

---

## 5. Urutan Rekomendasi Pengujian Manual

1. Jalankan `00. Health Check` untuk memastikan server dan MySQL terhubung.
2. Jalankan `01. Autentikasi / Login Super Admin` (token otomatis tersimpan).
3. Uji `02. Super Admin - Dashboard` (lihat KPI cards & aktivitas).
4. Uji `03. Super Admin - Kelola Sekolah` (daftar, tambah sekolah baru, update, dan penolakan delete 405).
5. Uji `04 s.d. 08. Manajemen Tes Skrining` (Overview, Tab Pertanyaan, Tab Pemetaan, Tab Penilaian, Tab Interpretasi).
6. Uji `09. Alur Publik Skrining ABK` (simulasi orang tua: validasi kode sesi `ABC123`, cari siswa, mulai skrining, isi jawaban butir soal, dan submit).
