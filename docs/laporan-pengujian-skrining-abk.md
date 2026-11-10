> capstone-backend@0.1.0 test:screening:verbose
> tsx scripts/test-screening.js

🌱 Menyiapkan data instrumen, domain, dan sesi skrining demo...

===========================================================================
📋 SKENARIO 1: Siswa Memenuhi Standar Normal (Selesai di Awal)
===========================================================================
Kasus: Seluruh gejala dinilai 0 ('Tidak sama sekali').

▶ [Langkah 1] Orang tua mengisi formulir persetujuan & memulai skrining
   Token Sesi    : bfb0a6fe-3547-4622-be4e-6197be48ae67
   Nama Siswa    : Siswa Demo Satu
   Status Awal   : Selesai = false

▶ [Langkah 2] Menjawab 5 butir soal Skrining Awal dengan skor 0 (Aman)
   - Butir 1 [Somatik]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 2 [Somatik]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 3 [Inatensi]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 4 [Depresi]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 5 [Ide Menyakiti Diri]: Dijawab 'Tidak' (skor: 0)

▶ [Langkah 3] Submit Jawaban Skrining Awal (Level 1)
   Respon Backend:
   • selesai                  : true ✅
   • status                   : "selesai"
   • tindak_lanjut_tersedia   : false (TIDAK ADA TINDAK LANJUT)
   • total_domain_terindikasi : 0
   • jumlah_instrumen_lanjutan: 0
   • pesan                    : "Pengisian skrining telah selesai. Anda boleh menutup halaman ini."

▶ [Langkah 4] Pengecekan Dashboard Tindak Lanjut
   • seluruh_selesai          : true ✅ (Langsung 100%)
   • total_instrumen          : 0
   • status_skrining          : "selesai"

   🎉 KESIMPULAN SKENARIO 1: Siswa normal langsung selesai di skrining awal.

===========================================================================
📋 SKENARIO 2: Siswa Belum Memenuhi Standar Normal (Masuk Tindak Lanjut)
===========================================================================
Kasus: Domain Inatensi bernilai 2 (ambang batas Inatensi = 1, terindikasi).

▶ [Langkah 1] Orang tua memulai skrining untuk Siswa 2
   Token Sesi    : 91ef1bda-b522-45b4-a1ae-7c589e032be6
   Nama Siswa    : Siswa Demo Dua

▶ [Langkah 2] Menjawab butir soal: Butir 3 (Inatensi) diisi skor 2 (Melewati ambang 1)
   - Butir 1 [Somatik]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 2 [Somatik]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 3 [Inatensi]: Dijawab 'Ringan' (skor: 2)
   - Butir 4 [Depresi]: Dijawab 'Tidak sama sekali' (skor: 0)
   - Butir 5 [Ide Menyakiti Diri]: Dijawab 'Tidak' (skor: 0)

▶ [Langkah 3] Submit Jawaban Skrining Awal (Level 1)
   Respon Backend:
   • selesai                  : false ⚠️ (Belum selesai penuh)
   • status                   : "tindak_lanjut"
   • tindak_lanjut_tersedia   : true (MEMASUKI TINDAK LANJUT)
   • total_domain_terindikasi : 1
   • jumlah_instrumen_lanjutan: 1
   • pesan                    : "Terima kasih. Masih ada bagian lanjutan yang perlu Anda isi."

▶ [Langkah 4] Membuka Dashboard Tindak Lanjut Level 2
   • total_instrumen          : 1
   • instrumen_selesai        : 0 dari 1
   • persentase               : 0%
   • seluruh_selesai          : false
   • Daftar Instrumen:
     - [ID 2] Bagian lanjutan 1 -> Status: [AKTIF]

▶ [Langkah 5] Pengerjaan & Submit Instrumen Lanjutan Level 2
   Memuat pertanyaan Bagian lanjutan 1 (2 butir)...
   Submit Bagian lanjutan 1 berhasil: "Seluruh bagian telah selesai diisi. Anda boleh menutup halaman ini."

▶ [Langkah 6] Cek Status Akhir Setelah Menyelesaikan Tindak Lanjut
   • instrumen_selesai        : 1 dari 1
   • persentase               : 100% (100% Selesai)
   • seluruh_selesai          : true ✅
   • status_skrining          : "selesai"

   🎉 KESIMPULAN SKENARIO 2: Siswa terindikasi berhasil menyelesaikan tindak lanjut.

===========================================================================
✅ SELURUH SIMULASI PENGUJIAN OTOMATIS BERHASIL LULUS (100% SUCCESS)
===========================================================================