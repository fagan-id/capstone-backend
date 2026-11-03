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
router.post("/mulai", PublicScreeningController.mulaiSkrining);

// 5. Pertanyaan Skrining Awal Level 1 (Layar 7)
router.get("/:idHasil/pertanyaan", PublicScreeningController.getPertanyaanLevel1);

// 6. Autosave Jawaban Butir Soal (Layar 7, 11, 15)
router.put("/:idHasil/jawaban", PublicScreeningController.simpanJawaban);

// 7. Submit Skrining Awal Level 1 (Layar 8 & 9)
router.post("/:idHasil/submit-level-1", PublicScreeningController.submitLevel1);

// 8. Dashboard Instrumen Lanjutan Level 2 (Layar 10, 14, 18)
router.get("/:idHasil/tindak-lanjut", PublicScreeningController.getDashboardTindakLanjut);

// 9. Pertanyaan Instrumen Lanjutan Spesifik (Layar 11 & 15)
router.get("/:idHasil/tindak-lanjut/:testId/pertanyaan", PublicScreeningController.getPertanyaanInstrumenLanjutan);

// 10. Submit Instrumen Lanjutan (Layar 12, 13, 16, 17)
router.post("/:idHasil/tindak-lanjut/:testId/submit", PublicScreeningController.submitInstrumenLanjutan);

export default router;
