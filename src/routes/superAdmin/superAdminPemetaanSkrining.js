/**
 * Rute API Manajemen Tab Pemetaan Tes Skrining untuk Super Admin.
 * Endpoint pembacaan pemetaan domain Level 1, kandidat instrumen Level 2, dan pembaruan batch.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import {
  getDaftarPemetaan,
  getOpsiTesLevel2,
  updatePemetaan
} from "../../controllers/superAdmin/superAdminPemetaanSkrining.js";

// mergeParams: true agar parameter :id dari router induk tes-skrining dapat dibaca
const router = Router({ mergeParams: true });

// Wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// PENTING: Rute statis /opsi-tes-level-2 dideklarasikan sebelum rute akar
router.get("/opsi-tes-level-2", getOpsiTesLevel2);

// Rute daftar pemetaan domain
router.get("/", getDaftarPemetaan);

// Pembaruan pemetaan batch/parsial (PATCH didukung, PUT sebagai alias kompatibilitas)
router.patch("/", updatePemetaan);
router.put("/", updatePemetaan);

export default router;
