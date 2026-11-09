# Alur & Desain Antarmuka: End-to-End Skrining ABK (Orang Tua / Wali)

Dokumen ini mendokumentasikan seluruh rancangan antarmuka (18 layar), alur interaksi pengguna, kebutuhan API backend, dan implikasi arsitektur data untuk modul pengisian skrining oleh Orang Tua / Wali siswa dari tahap onboarding hingga penyelesaian akhir seluruh instrumen.

---

## 1. Diagram Alur Lengkap (Complete End-to-End Journey)

```mermaid
flowchart TD
    subgraph Fase 1: Onboarding & Verifikasi Identitas
        L1["Langkah 1: Input Kode Sesi<br/>(Ikuti Skrining)"] --> L2["Langkah 2: Konfirmasi Sesi<br/>(Sekolah, NPSN, Sesi)"]
        L2 -->|Kembali| L1
        L2 -->|Data Benar| L3["Langkah 3: Pilih Data Anak<br/>(Autocomplete Nama Siswa)"]
        L3 -->|Kembali| L2
        L3 -->|Lanjutkan| L4["Langkah 4: Konfirmasi Data Anak<br/>(NISN, Kelas, JK)"]
        L4 -->|Kembali| L3
        L4 -->|Data Benar| L5["Langkah 5: Data Orang Tua/Wali<br/>(Nama, No WA, Hubungan)"]
        L5 -->|Kembali| L4
    end

    subgraph Fase 2: Persetujuan & Pengerjaan Skrining Awal (Level 1)
        L5 -->|Lanjutkan| L6["Langkah 6: Informasi & Persetujuan<br/>(Informed Consent)"]
        L6 -->|Kembali| L5
        L6 -->|Setuju & Mulai| L7["Langkah 7: Pengerjaan Soal Skrining Awal<br/>(Skala Likert 5-Poin, Navigator Soal, Autosave)"]
        L7 -->|Selesai Menjawab| L8["Langkah 8: Modal Kirim Jawaban Level 1<br/>(Verifikasi 25/25 atau 30/30)"]
        L8 -->|Periksa Kembali| L7
    end

    subgraph Fase 3: Pengerjaan Multi-Instrumen Tindak Lanjut (Level 2)
        L8 -->|Kirim Jawaban| L9["Langkah 9: Notifikasi Tindak Lanjut<br/>(Tindak Lanjut Tersedia)"]
        L9 -->|Lihat Tindak Lanjut| L10["Langkah 10: Dashboard Tindak Lanjut<br/>(Daftar Instrumen A, B, C & Progres 0/3)"]
        
        L10 -->|Mulai Instrumen A| L11["Langkah 11: Pengerjaan Instrumen A<br/>(Domain Atensi, 8 Butir)"]
        L11 -->|Submit Butir| L12["Langkah 12: Modal Kirim Instrumen A<br/>(Cek 8/8 Soal)"]
        L12 -->|Kirim Jawaban| L13["Langkah 13: Sukses Kirim Instrumen A<br/>(Badge Selesai)"]
        L13 -->|Kembali ke Dashboard| L14["Langkah 14: Update Dashboard Tindak Lanjut<br/>(Progres 2/3 Selesai)"]
        
        L14 -->|Mulai Instrumen C| L15["Langkah 15: Pengerjaan Instrumen C<br/>(Domain Emosi, 11 Butir)"]
        L15 -->|Submit Butir| L16["Langkah 16: Modal Kirim Instrumen C<br/>(Cek 11/11 Soal)"]
        L16 -->|Kirim Jawaban| L17["Langkah 17: Sukses Kirim Instrumen C<br/>(Badge Selesai)"]
        L17 -->|Kembali ke Dashboard| L18["Langkah 18: Dashboard Akhir (100% Selesai)<br/>(3/3 Selesai, Penutup, Tutup Halaman)"]
    end
```

---

## 2. Rincian 18 Tahapan Layar

### Fase 1: Onboarding & Verifikasi Identitas (Layar 1–5)

#### Langkah 1: Input Kode Sesi (Ikuti Skrining)
- **Aset Visual**: `docs/designs/screening-flow/01-input-kode-sesi.png`
- **Header**: Logo `Skrining ABK`
- **Komponen Form**:
  - Judul: *Ikuti Skrining*
  - Deskripsi: *"Masukkan kode sesi yang diberikan oleh pihak sekolah untuk mengisi skrining bagi anak Anda"*
  - Input: `Kode Sesi` (contoh: `ABC123`, case-insensitive)
  - Tombol: `Gabung Sesi`

#### Langkah 2: Konfirmasi Sesi
- **Aset Visual**: `docs/designs/screening-flow/02-konfirmasi-sesi.png`
- **Header**: `Skrining ABK — Sesi ABC123`
- **Field Read-Only**:
  - `Nama Sekolah`: *"SD Negeri Sleman 1"*
  - `NPSN`: *"20400851"*
  - `Nama Sesi`: *"Skrining Kelas 5 TA 2026/2027"*
- **Navigasi**: `Kembali` | `Ya, Data Sudah Benar`

#### Langkah 3: Pilih Data Anak
- **Aset Visual**: `docs/designs/screening-flow/03-pilih-data-anak.png`
- **Header**: `Skrining ABK — Sesi ABC123`
- **Komponen Form**:
  - Judul: *Pilih Data Anak*
  - Deskripsi: *"Ketik dan pilih data anak yang akan mengikuti skrining pada sesi ini"*
  - Autocomplete: `Nama Lengkap` (contoh: `"Ahmad Fau..."`)
  - Dropdown Hasil: `[Nama Lengkap] — [Kelas]` (contoh: *"Ahmad Fauzan — Kelas 5A"*, *"Ahmad Fauzan — Kelas 5B"*)
- **Navigasi**: `Kembali` | `Lanjutkan`

#### Langkah 4: Konfirmasi Data Anak
- **Aset Visual**: `docs/designs/screening-flow/04-konfirmasi-data-anak.png`
- **Header**: `Skrining ABK — Sesi ABC123`
- **Field Read-Only**:
  - `Nama Lengkap`: *"Ahmad Fauzan"*
  - `NISN`: *"0012345678"*
  - `Kelas`: *"5A"*
  - `Jenis Kelamin`: *"Laki-laki"*
- **Navigasi**: `Kembali` | `Ya, Data Sudah Benar`

#### Langkah 5: Data Orang Tua / Wali
- **Aset Visual**: `docs/designs/screening-flow/05-data-orang-tua-wali.png`
- **Header**: `Skrining ABK — Sesi ABC123`
- **Komponen Form**:
  - `Nama Lengkap`: *"Budi Santoso"*
  - `Nomor HP/Whatsapp`: *"081312345678"*
  - `Hubungan dengan anak`: Radio Button (`Orang Tua`, `Wali`, `Lainnya`)
- **Navigasi**: `Kembali` | `Lanjutkan`

---

### Fase 2: Persetujuan & Pengerjaan Skrining Awal (Level 1) (Layar 6–8)

#### Langkah 6: Informasi dan Persetujuan Skrining (Informed Consent)
- **Aset Visual**: `docs/designs/screening-flow/06-persetujuan-skrining.png`
- **Header**: Logo `Skrining ABK` | Badge `Sesi Aktif: ABC123`
- **Konten Edukasi & Hukum**:
  1. **Tujuan Skrining**: Mengidentifikasi area perkembangan, perilaku, atau fungsi yang membutuhkan perhatian lebih lanjut.
  2. **Batasan Hasil Skrining**: Penjaringan awal dan **bukan pemeriksaan untuk menetapkan diagnosis**.
  3. **Penggunaan Data**: Pengelolaan proses skrining dan tindak lanjut pihak sekolah.
- **Interaksi**: Checkbox `[x] Saya telah membaca dan memahami informasi serta persetujuan skrining di atas.`
- **Navigasi**: `Kembali` | `Setuju dan Mulai Tes`

#### Langkah 7: Pengerjaan Soal Skrining Awal (Level 1)
- **Aset Visual**: `docs/designs/screening-flow/07-pengerjaan-soal.png`
- **Header**: Logo `Skrining ABK` | Badge `Sesi Aktif: ABC123`
- **Progres Pengerjaan**: Label `Skrining Awal` | `5 dari 25 pertanyaan`
- **Karakteristik Soal**: DSM-5 Level 1 Cross-Cutting Symptom Measure
  - Recall Time: *"Selama DUA (2) MINGGU terakhir, seberapa sering anak Anda mengalami hal berikut?"*
  - Butir Pertanyaan: *"Mengeluhkan sakit perut, sakit kepala, atau nyeri lainnya?"*
  - Skala Likert 5 Poin: `Tidak sama sekali` (0), `Sangat ringan` (1), `Ringan` (2), `Sedang` (3), `Berat` (4).
- **Navigator Soal**: Grid 1–25 dengan indikator status aktif, terjawab, dan belum terjawab.
- **Fitur Autosave**: Tersimpan ke server secara realtime per pilihan opsi.

#### Langkah 8: Dialog Konfirmasi Kirim Jawaban (Level 1)
- **Aset Visual**: `docs/designs/screening-flow/08-konfirmasi-kirim-jawaban.png`
- **Modal Dialog**: Verifikasi seluruh butir terjawab (`30 dari 30 Soal` / `25 dari 25 Soal`).
- **Navigasi**: `Periksa Kembali` | `Kirim Jawaban`

---

### Fase 3: Tindak Lanjut Multi-Instrumen (Level 2) (Layar 9–18)

#### Langkah 9: Notifikasi Tindak Lanjut Tersedia
- **Aset Visual**: `docs/designs/screening-flow/09-tindak-lanjut-tersedia.png`
- **Deskripsi**: Pihak sekolah telah menetapkan instrumen skrining lanjutan (Level 2) yang ditugaskan untuk anak.
- **Navigasi**: Tombol `Lihat Tindak Lanjut Skrining ->`

#### Langkah 10: Dashboard Instrumen Lanjutan (Initial State)
- **Aset Visual**: `docs/designs/screening-flow/10-daftar-instrumen-lanjutan.png`
- **Komponen**:
  - Progress Pengisian: *"0 dari 3 instrumen dikerjakan"* (0% bar)
  - Daftar Item: `Instrumen A` (Aktif: *Mulai Mengerjakan*), `Instrumen B` (Disabled), `Instrumen C` (Disabled).

#### Langkah 11: Pengerjaan Instrumen A (Level 2 - Gejala Spesifik / Atensi)
- **Aset Visual**: `docs/designs/screening-flow/11-pengerjaan-instrumen-a.png`
- **Progress**: `Instrumen A` | `2 dari 8 pertanyaan`
- **Karakteristik Soal**: Skala SNAP-IV / ADHD Inattention
  - Recall Time: *"Untuk setiap pernyataan, pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir"*
  - Butir: *"Sering kurang memperhatikan detail atau melakukan kesalahan karena kurang teliti..."*
  - Skala 4 Poin: `Tidak sama sekali`, `Sedikit`, `Cukup sering`, `Sangat sering`.
- **Navigator Soal**: Grid butir 1–8.
- **Navigasi**: `Sebelumnya` | `Selanjutnya`

#### Langkah 12: Dialog Konfirmasi Kirim Instrumen A
- **Aset Visual**: `docs/designs/screening-flow/12-konfirmasi-kirim-instrumen-a.png`
- **Modal Dialog**: Memastikan kelengkapan pengerjaan (`8 dari 8 Soal`).
- **Navigasi**: `Periksa Kembali` | `Kirim Jawaban`

#### Langkah 13: Sukses Pengiriman Instrumen A
- **Aset Visual**: `docs/designs/screening-flow/13-sukses-kirim-instrumen-a.png`
- **Status Box**: `Instrumen A` | Badge `Selesai` (Hijau)
- **Navigasi**: Tombol `Kembali ke Tindak Lanjut Skrining`

#### Langkah 14: Update Dashboard Progres Tindak Lanjut
- **Aset Visual**: `docs/designs/screening-flow/14-dashboard-progres-instrumen.png`
- **Status Pengisian**: *"2 dari 3 instrumen dikerjakan"* (~66% bar)
  - `Instrumen A`: `Selesai`
  - `Instrumen B`: `Selesai`
  - `Instrumen C`: Tombol Aktif `Mulai Mengerjakan`

#### Langkah 15: Pengerjaan Instrumen C (Level 2 - Gejala Mood / Emosi)
- **Aset Visual**: `docs/designs/screening-flow/15-pengerjaan-instrumen-c.png`
- **Progress**: `Instrumen C` | `2 dari 11 pertanyaan`
- **Karakteristik Soal**: Skala PROMIS Pediatric Mood / Depression
  - Recall Time: *"Dalam Tujuh (7) hari terakhir, anak saya mengatakan bahwa..."*
  - Butir: *"Tidak bisa berhenti merasa sedih"*
  - Skala 5 Poin: `Tidak pernah`, `Hampir tidak pernah`, `Kadang - kadang`, `Sering`, `Hampir selalu`.
- **Navigator Soal**: Grid butir 1–11.
- **Navigasi**: `Sebelumnya` | `Selanjutnya`

#### Langkah 16: Dialog Konfirmasi Kirim Instrumen C
- **Aset Visual**: `docs/designs/screening-flow/16-konfirmasi-kirim-instrumen-c.png`
- **Modal Dialog**: Memastikan kelengkapan pengerjaan (`11 dari 11 Soal`).
- **Navigasi**: `Periksa Kembali` | `Kirim Jawaban`

#### Langkah 17: Sukses Pengiriman Instrumen C
- **Aset Visual**: `docs/designs/screening-flow/17-sukses-kirim-instrumen-c.png`
- **Status Box**: `Instrumen C` | Badge `Selesai` (Hijau)
- **Navigasi**: Tombol `Kembali ke Tindak Lanjut Skrining`

#### Langkah 18: Dashboard Akhir Penyelesaian Skrining (100% Selesai)
- **Aset Visual**: `docs/designs/screening-flow/18-seluruh-instrumen-selesai.png`
- **Status Pengisian**: *"3 dari 3 instrumen dikerjakan"* (Progress bar 100% penuh)
- **Daftar Instrumen**:
  - `Instrumen A`: Badge `Selesai`
  - `Instrumen B`: Badge `Selesai`
  - `Instrumen C`: Badge `Selesai`
- **Pesan Penutup & Edukasi Keamanan**:
  *"Seluruh instrumen skrining lanjutan yang ditugaskan untuk anak Anda telah selesai diisi. Penyelesaian skrining bukan merupakan diagnosis. Anda diperbolehkan menutup halaman ini."*
- **Aksi Pengguna**: Tidak ada tombol lagi (proses selesai penuh). Pengguna dapat langsung menutup tab peramban.

---

## 3. Matriks Kebutuhan Teknis Backend & API

### 3.1 Ringkasan Endpoint API Lengkap

| No | Method | Endpoint | Fungsi | Terkait Layar |
|---|---|---|---|---|
| 1 | `POST` | `/api/v1/public/screening-sessions/validate` | Validasi kode sesi, cek `statusSesi == 'aktif'`, kembalikan info sekolah & NPSN | Layar 1, 2 |
| 2 | `GET` | `/api/v1/public/screening-sessions/:kodeSesi/students?search=...` | Autocomplete pencarian siswa (min 3 huruf, hanya kembalikan nama & kelas) | Layar 3 |
| 3 | `GET` | `/api/v1/public/screening-sessions/:kodeSesi/students/:idStudent` | Konfirmasi detail profil siswa (NISN, jenis kelamin) | Layar 4 |
| 4 | `POST` | `/api/v1/public/screening-attempts/start` | Simpan identitas orang tua/wali & consent, inisialisasi sesi pengerjaan Level 1 | Layar 5, 6 |
| 5 | `GET` | `/api/v1/public/screening-attempts/:attemptId/questions` | Ambil soal instrumen aktif (Level 1) beserta autosaved answers untuk resume | Layar 7 |
| 6 | `PUT` | `/api/v1/public/screening-attempts/:attemptId/answers` | Autosave jawaban per butir soal (`idPertanyaan`, `idOpsi`) | Layar 7, 11, 15 |
| 7 | `POST` | `/api/v1/public/screening-attempts/:attemptId/submit` | Submit final kuesioner Level 1, kalkulasi skor indikasi awal | Layar 8 |
| 8 | `GET` | `/api/v1/public/screening-attempts/:attemptId/follow-ups` | Ambil status daftar instrumen Level 2 (A, B, C) dan persentase progres | Layar 9, 10, 14, 18 |
| 9 | `POST` | `/api/v1/public/screening-attempts/:attemptId/follow-ups/:testId/start` | Mulai mengerjakan instrumen lanjutan tertentu | Layar 10, 14 |
| 10 | `GET` | `/api/v1/public/screening-attempts/:attemptId/follow-ups/:testId/questions` | Ambil soal instrumen lanjutan tertentu beserta autosaved answers | Layar 11, 15 |
| 11 | `POST` | `/api/v1/public/screening-attempts/:attemptId/follow-ups/:testId/submit` | Submit penyelesaian instrumen lanjutan | Layar 12, 16 |

---

## 4. Rekomendasi Penyesuaian Skema Database (`prisma/schema.prisma`)

1. **`Sekolah`**: Tambahkan field `npsn String @db.VarChar(20)` (karena ditampilkan pada konfirmasi sesi di Layar 2).
2. **`HasilSkrining`**:
   - `namaResponden String @map("nama_responden") @db.VarChar(255)`
   - `kontakResponden String @map("kontak_responden") @db.VarChar(50)`
   - `hubunganResponden EnumHubunganResponden @map("hubungan_responden")` (`orang_tua`, `wali`, `lainnya`)
   - `persetujuanWali Boolean @default(false) @map("persetujuan_wali")`
   - `waktuPersetujuan DateTime? @map("waktu_persetujuan")`
3. **Penugasan Multi-Instrumen Level 2**:
   - Buat model relasi penugasan instrumen lanjutan per pengerjaan siswa, misalnya:
     ```prisma
     enum StatusPengerjaanInstrumen {
       terkunci
       aktif
       selesai
     }

     model PenugasanInstrumenLanjutan {
       id              Int                       @id @default(autoincrement())
       idHasilSkrining Int                       @map("id_hasil_skrining")
       testId          Int                       @map("test_id")
       status          StatusPengerjaanInstrumen @default(terkunci)
       waktuMulai      DateTime?                 @map("waktu_mulai")
       waktuSelesai    DateTime?                 @map("waktu_selesai")

       hasilSkrining   HasilSkrining             @relation(fields: [idHasilSkrining], references: [idResult])
       tesSkrining     TesSkrining               @relation(fields: [testId], references: [idTest])

       @@map("penugasan_instrumen_lanjutan")
     }
     ```
