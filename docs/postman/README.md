# Panduan Pengujian API Skrining ABK menggunakan Postman / EchoAPI

Dokumen ini menjelaskan langkah-langkah pengujian end-to-end API Skrining Publik (Orang Tua / Siswa) sesuai dengan alur logis sistem:
1. **Pengambilan soal menggunakan `idTest`** (bukan `idHasil`).
2. **Pencatatan ke tabel `hasil_skrining` HANYA dilakukan saat submit**, di mana skor dan kesimpulan indikasi dihitung dari jawaban nyata responden.

---

## 1. Persiapan Awal

### A. Menjalankan Database & Seeding
Pastikan MySQL aktif, lalu jalankan:
```bash
npm run db:seed
```

### B. Menjalankan Server Backend
```bash
npm run dev
```
Server berjalan di `http://localhost:5000`.

---

## 2. Mengimpor Koleksi ke Postman / EchoAPI

1. Buka aplikasi **Postman** atau **EchoAPI**.
2. Klik tombol **Import**.
3. Pilih file:
   `docs/postman/Skrining_ABK_Public_API.postman_collection.json`

---

## 3. Variabel Koleksi Default

- `baseUrl`: `http://localhost:5000/api`
- `kodeSesi`: `ABC123`
- `studentId`: `3` (Siswa: Siti Rahma) atau `1` (Ahmad Fauzan)
- `idTest`: `1` (Skrining Awal Level 1)

---

## 4. Alur Pengujian Langkah Demi Langkah

### Fase 1: Onboarding & Verifikasi Identitas
1. **1. Validasi Kode Sesi (Layar 1 & 2)**
   - `POST {{baseUrl}}/public/skrining/sesi/validasi`
   - Body: `{"kodeSesi": "ABC123"}`
   - *Hasil:* Menampilkan nama sekolah "SD Negeri Sleman 1", NPSN "20400851", dan nama sesi.

2. **2. Cari Siswa Autocomplete (Layar 3)**
   - `GET {{baseUrl}}/public/skrining/sesi/ABC123/siswa?search=Ahmad`
   - *Hasil:* Menampilkan daftar nama siswa terdaftar di sekolah.

3. **3. Konfirmasi Data Siswa (Layar 4)**
   - `GET {{baseUrl}}/public/skrining/sesi/ABC123/siswa/3`
   - *Hasil:* Menampilkan profil lengkap anak (Nama, NISN, Kelas, Jenis Kelamin).

4. **4. Registrasi Kontak Orang Tua & Consent (Layar 5 & 6)**
   - `POST {{baseUrl}}/public/skrining/mulai`
   - Body:
     ```json
     {
       "kodeSesi": "ABC123",
       "studentId": 3,
       "namaOrangTua": "Susilo",
       "nomorHp": "08964732819",
       "hubungan": "orang_tua",
       "persetujuan": true
     }
     ```
   - *Hasil:* Memvalidasi kontak orang tua dan mengembalikan `idTest: 1` (**Tabel `hasil_skrining` belum diisi baris prematur!**).

---

### Fase 2: Pengerjaan Skrining Awal (Level 1)
5. **5. Ambil Pertanyaan by `idTest` (Layar 7)**
   - `GET {{baseUrl}}/public/skrining/tes/1/pertanyaan`
   - *Hasil:* Memuat 25 butir soal DSM-5 Level 1 beserta 5 pilihan jawaban (skala Likert).

6. **6. Submit Skrining Awal Lengkap (Layar 8 & 9)**
   - `POST {{baseUrl}}/public/skrining/submit`
   - Body: Kirim `kodeSesi`, `studentId`, `testId: 1`, dan array `jawaban`.
   - *Hasil:*
     - Backend menghitung `totalSkor` (misal 25).
     - Menentukan `kesimpulanIndikasi` dari konfigurasi penilaian (misal: *"Perlu Tindak Lanjut Instrumen Tambahan"*).
     - **Mencatat data final ke tabel `hasil_skrining` dan `detail_jawaban_siswa`**.
     - Mengembalikan `tindakLanjutTersedia: true` untuk memicu Layar 9.

---

### Fase 3: Multi-Instrumen Tindak Lanjut (Level 2)
7. **7. Dashboard Tindak Lanjut (Layar 10)**
   - `GET {{baseUrl}}/public/skrining/tindak-lanjut?kodeSesi=ABC123&studentId=3`
   - *Hasil:* Menampilkan daftar instrumen lanjutan: Instrumen A (`idTest: 2`), Instrumen B (`idTest: 3`), Instrumen C (`idTest: 4`).

8. **8. Ambil Soal Instrumen A by `idTest: 2` (Layar 11)**
   - `GET {{baseUrl}}/public/skrining/tes/2/pertanyaan`
   - *Hasil:* Memuat 8 butir soal Instrumen A (skala 4-poin).

9. **9. Submit Instrumen A (Layar 12 & 13)**
   - `POST {{baseUrl}}/public/skrining/submit` dengan `testId: 2`.
   - *Hasil:* Status Instrumen A menjadi `selesai`.

10. **10. Ambil Soal Instrumen C by `idTest: 4` (Layar 15)**
    - `GET {{baseUrl}}/public/skrining/tes/4/pertanyaan`
    - *Hasil:* Memuat 11 butir soal Instrumen C (skala 5-poin emosi).

11. **11. Submit Instrumen C (Layar 16 & 17)**
    - `POST {{baseUrl}}/public/skrining/submit` dengan `testId: 4`.
    - *Hasil:* Status Instrumen C menjadi `selesai`.

12. **12. Cek Status Akhir 100% Selesai (Layar 18)**
    - `GET {{baseUrl}}/public/skrining/tindak-lanjut?kodeSesi=ABC123&studentId=3`
    - *Hasil:* Menampilkan progres selesai penuh (100%) dan pesan penutup aman menutup browser.
