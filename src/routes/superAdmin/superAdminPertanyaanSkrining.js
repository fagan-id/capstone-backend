/**
 * Rute API Manajemen Tab Pertanyaan Tes Skrining untuk Super Admin.
 * Endpoint CRUD pertanyaan, opsi jawaban, kondisi pemicu, dan pengurutan nomor.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import {
  getDaftarPertanyaan,
  getOpsiKandidatPemicu,
  getDetailPertanyaan,
  tambahPertanyaan,
  updatePertanyaan,
  updateBatchUrutan,
  hapusPertanyaan
} from "../../controllers/superAdmin/superAdminPertanyaanSkrining.js";

// mergeParams: true agar :id dari router induk (tes-skrining/:id) dapat diakses
const router = Router({ mergeParams: true });

// Wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// PENTING: Rute statis wajib dideklarasikan sebelum parameter dinamis :pertanyaanId
router.get("/opsi-pemicu", getOpsiKandidatPemicu);
router.patch("/urutan", updateBatchUrutan);

// Rute koleksi pertanyaan
router.get("/", getDaftarPertanyaan);
router.post("/", tambahPertanyaan);

// Rute butir pertanyaan spesifik
router.get("/:pertanyaanId", getDetailPertanyaan);
router.put("/:pertanyaanId", updatePertanyaan);
router.patch("/:pertanyaanId", updatePertanyaan);
router.delete("/:pertanyaanId", hapusPertanyaan);

export default router;
