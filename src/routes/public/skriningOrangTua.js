/**
 * Rute Publik Alur Skrining (tanpa login).
 * Dipasang pada /api/public/skrining oleh routes/index.js.
 *
 * Percobaan pengisian dialamatkan lewat `token` (UUID), bukan id berurut, karena rute ini terbuka.
 */

import { Router } from "express";
import * as controller from "../../controllers/public/skriningOrangTua.js";

const router = Router();

// Layar 1-2: memasukkan kode sesi dari sekolah.
router.post("/sesi/validasi", controller.validasiSesi);

// Layar 3-4: mencari lalu mengonfirmasi data anak.
router.get("/sesi/:kode/siswa", controller.cariSiswa);
router.get("/sesi/:kode/siswa/:siswa_id", controller.konfirmasiSiswa);

// Layar 5-6: persetujuan dan data responden, menghasilkan token pengerjaan.
router.post("/mulai", controller.mulaiSkrining);

// Layar 7-9: skrining awal.
router.get("/:token/pertanyaan", controller.getPertanyaanLevel1);
router.put("/:token/jawaban", controller.simpanJawaban);
router.post("/:token/submit-level-1", controller.submitLevel1);

// Layar 10-18: bagian lanjutan, dibuka satu per satu.
router.get("/:token/tindak-lanjut", controller.getDashboardTindakLanjut);
router.get("/:token/tindak-lanjut/:tes_skrining_id/pertanyaan", controller.getPertanyaanLanjutan);
router.post("/:token/tindak-lanjut/:tes_skrining_id/submit", controller.submitLanjutan);

export default router;
