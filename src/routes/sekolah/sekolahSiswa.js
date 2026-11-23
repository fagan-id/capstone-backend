/**
 * Rute Sekolah - Siswa. Dipasang pada /api/sekolah/siswa.
 * Autentikasi dan cek sekolah aktif dipasang di routes/sekolah/index.js.
 */

import { Router } from "express";
import {
  getDaftarSiswa,
  getDetailSiswa,
  tambahSiswa,
  updateSiswa,
  hapusSiswa
} from "../../controllers/sekolah/sekolahSiswa.js";

const router = Router();

router.get("/", getDaftarSiswa);
router.get("/:id", getDetailSiswa);
router.post("/", tambahSiswa);
router.patch("/:id", updateSiswa);
router.delete("/:id", hapusSiswa);

export default router;
