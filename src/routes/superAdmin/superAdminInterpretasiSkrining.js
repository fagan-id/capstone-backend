/**
 * Rute API Manajemen Tab Interpretasi Tes Skrining untuk Super Admin.
 * Menangani pembacaan dan pembaruan konfigurasi narasi interpretasi serta rekomendasi
 * untuk Level 1 dan Level 2.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import {
  getInterpretasi,
  getDetailInterpretasi,
  updateInterpretasi,
  resetInterpretasi
} from "../../controllers/superAdmin/superAdminInterpretasiSkrining.js";

// mergeParams: true agar parameter :id dari router induk tes-skrining dapat dibaca
const router = Router({ mergeParams: true });

// Wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// 1. Ambil daftar konfigurasi interpretasi (Level 1 atau Level 2)
router.get("/", getInterpretasi);

// 2. Ambil detail konfigurasi satu interpretasi
router.get("/:interpretasiId", getDetailInterpretasi);

// 3. Perbarui narasi interpretasi dan rekomendasi
router.patch("/:interpretasiId", updateInterpretasi);
router.put("/:interpretasiId", updateInterpretasi);

// 4. Kosongkan narasi interpretasi dan rekomendasi
router.delete("/:interpretasiId", resetInterpretasi);

export default router;
