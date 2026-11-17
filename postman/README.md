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

# Pengujian API

Koleksi: `capstone-backend.postman_collection.json` (format Postman v2.1, 50 request).

## Impor

**Postman:** *Import* -> pilih file koleksi.

**Hoppscotch:** *Collections* -> *Import* -> *Postman*. Script penyimpan variabel tidak terbawa, jadi isi `auth_token`, `token`, `siswa_id`, `tes_skrining_id`, dan id pada folder Super Admin secara manual dari respons sebelumnya.

## Persiapan

1. `npm run dev` (server di `http://localhost:5000`).
2. `npm run db:seed` bila akun demo belum ada.
3. Isi variabel koleksi `password` dengan nilai `SEED_PASSWORD` dari `.env` Anda.

Variabel `password` sengaja dikosongkan di file ini supaya sandi tidak ikut ter-commit.

## Isi koleksi

| Folder | Endpoint |
|---|---|
| Sistem | health check |
| Autentikasi | login, profil saya, logout |
| Skrining Publik | 10 langkah, dari validasi kode sesi sampai pengiriman bagian lanjutan |
| Super Admin | dashboard, kelola sekolah, tes skrining, pertanyaan, pemetaan domain, penilaian, interpretasi (36 request) |

## Folder Super Admin

1. Login dengan akun Super Admin (`identifier` = `superadmin@demo.test`).
2. Jalankan *Daftar Domain* dan *Daftar Tes Skrining* lebih dulu. Keduanya mengisi `kategori_id`, `tes_l1_id`, dan `tes_l2_id` yang dipakai request lain.
3. Request tulis (tambah, ubah, hapus) benar-benar mengubah database. Jalankan di database pengembangan.

Setiap endpoint juga tersedia dengan prefix `/api/admin/...`. Koleksi hanya mencantumkan `/api/super-admin/...`.

## Menjalankan alur skrining

Jalankan folder *Skrining Publik* berurutan dari atas. Tiap request menyimpan nilai yang dibutuhkan request berikutnya, jadi tidak perlu salin-tempel token.

Pada langkah 5-6, ulangi *Daftar Pertanyaan* lalu *Simpan Jawaban* bergantian sampai `total_dijawab` sama dengan `total_soal`, baru kirim Skrining Awal. Variabel `kode_sesi` default `ABC123` mengikuti data seed; ganti bila memakai sesi lain.
