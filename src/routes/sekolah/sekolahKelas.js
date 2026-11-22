/**
 * Rute Sekolah - Kelas. Dipasang pada /api/sekolah/kelas.
 * Autentikasi dan cek sekolah aktif dipasang di routes/sekolah/index.js.
 */

import { Router } from "express";
import { getDaftarKelas, tambahKelas, updateKelas, hapusKelas } from "../../controllers/sekolah/sekolahKelas.js";

const router = Router();

router.get("/", getDaftarKelas);
router.post("/", tambahKelas);
router.patch("/:id", updateKelas);
router.delete("/:id", hapusKelas);

export default router;
