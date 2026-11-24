/**
 * Rute Sekolah - Sesi Skrining. Dipasang pada /api/sekolah/sesi.
 * Autentikasi dan cek sekolah aktif dipasang di routes/sekolah/index.js.
 */

import { Router } from "express";
import {
  getDaftarSesi,
  getDetailSesi,
  tambahSesi,
  updateSesi,
  akhiriSesi,
  hapusSesi
} from "../../controllers/sekolah/sekolahSesi.js";

const router = Router();

router.get("/", getDaftarSesi);
router.get("/:id", getDetailSesi);
router.post("/", tambahSesi);
router.patch("/:id", updateSesi);
router.post("/:id/akhiri", akhiriSesi);
router.delete("/:id", hapusSesi);

export default router;
