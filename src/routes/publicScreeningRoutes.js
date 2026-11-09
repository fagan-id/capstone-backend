/**
 * Rute API Skrining Publik (Orang Tua / Wali / Siswa).
 * Seluruh endpoint tidak memerlukan autentikasi login (akses via kode sesi).
 */

import { Router } from "express";
import { PublicScreeningController } from "../controllers/publicScreeningController.js";

const router = Router();

// 1. Validasi Kode Sesi (Layar 1 & 2)
router.post("/sesi/validasi", PublicScreeningController.validasiSesi);

// 2. Pencarian Autocomplete Siswa (Layar 3)
router.get("/sesi/:kodeSesi/siswa", PublicScreeningController.cariSiswa);

// 3. Konfirmasi Data Siswa (Layar 4)
router.get("/sesi/:kodeSesi/siswa/:idStudent", PublicScreeningController.konfirmasiSiswa);

// 4. Registrasi Kontak Orang Tua & Persetujuan Consent (Layar 5 & 6)
// Mengembalikan idTest dan info tes tanpa membuat baris prematur di hasil_skrining
router.post("/mulai", PublicScreeningController.mulaiSkrining);

// 5. Ambil Pertanyaan berdasarkan idTest (Layar 7, 11, 15)
// idTest = 1 (Skrining Awal), idTest = 2 (Instrumen A), dsb.
router.get("/tes/:idTest/pertanyaan", PublicScreeningController.getPertanyaanByTestId);

// 6. Submit Jawaban Tes Lengkap (Layar 8 & 9, 12 & 13, 16 & 17)
// Menghitung skor, menentukan kesimpulan indikasi, dan mencatat ke tabel hasil_skrining
router.post("/submit", PublicScreeningController.submitSkrining);

// 7. Dashboard Status Instrumen Tindak Lanjut Level 2 (Layar 10, 14, 18)
router.get("/tindak-lanjut", PublicScreeningController.getDashboardTindakLanjut);
router.get("/:idHasil/tindak-lanjut", PublicScreeningController.getDashboardTindakLanjut);

// --- Rute Tambahan & Fallback ---
router.get("/:idHasil/pertanyaan", PublicScreeningController.getPertanyaanLevel1);
router.put("/:idHasil/jawaban", PublicScreeningController.simpanJawaban);
router.post("/:idHasil/submit-level-1", PublicScreeningController.submitLevel1);
router.get("/:idHasil/tindak-lanjut/:testId/pertanyaan", PublicScreeningController.getPertanyaanInstrumenLanjutan);
router.post("/:idHasil/tindak-lanjut/:testId/submit", PublicScreeningController.submitInstrumenLanjutan);

export default router;
