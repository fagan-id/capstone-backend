/**
 * Rute API Manajemen Tes Skrining untuk Super Admin.
 * Endpoint CRUD tes skrining (Level 1 & Level 2), Tab Overview, dan validasi relasi, dilindungi autentikasi Super Admin.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import {
  getDaftarTesSkrining,
  getDaftarKategori,
  getDetailTesSkrining,
  tambahTesSkrining,
  updateOverviewTesSkrining,
  hapusTesSkrining
} from "../../controllers/superAdmin/superAdminTesSkrining.js";
import superAdminPertanyaanRoutes from "./superAdminPertanyaanSkrining.js";
import superAdminPemetaanRoutes from "./superAdminPemetaanSkrining.js";
import superAdminPenilaianRoutes from "./superAdminPenilaianSkrining.js";
import superAdminInterpretasiRoutes from "./superAdminInterpretasiSkrining.js";

const router = Router();

// Seluruh rute manajemen tes skrining wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// Sub-rute Tab Pertanyaan untuk tes skrining (:id/pertanyaan)
router.use("/:id/pertanyaan", superAdminPertanyaanRoutes);

// Sub-rute Tab Pemetaan untuk tes skrining Level 1 (:id/pemetaan)
router.use("/:id/pemetaan", superAdminPemetaanRoutes);

// Sub-rute Tab Penilaian untuk tes skrining Level 1 & Level 2 (:id/penilaian)
router.use("/:id/penilaian", superAdminPenilaianRoutes);

// Sub-rute Tab Interpretasi untuk tes skrining Level 1 & Level 2 (:id/interpretasi)
router.use("/:id/interpretasi", superAdminInterpretasiRoutes);

// 1. Ambil daftar domain/kategori asesmen untuk pilihan dropdown Level 2
router.get("/kategori", getDaftarKategori);

// 2. Ambil daftar tes skrining (dengan search, filter level & status, sort, paginasi, dan statistik)
router.get("/", getDaftarTesSkrining);

// 3. Tambah tes skrining baru (Level 1 atau Level 2)
router.post("/", tambahTesSkrining);

// 4. Ambil detail satu tes skrining untuk Tab Overview
router.get("/:id", getDetailTesSkrining);

// 5. Perbarui informasi Tab Overview dan status aktif/nonaktif tes skrining
router.put("/:id", updateOverviewTesSkrining);
router.patch("/:id", updateOverviewTesSkrining);

// 6. Hapus tes skrining dengan validasi keamanan relasi riwayat
router.delete("/:id", hapusTesSkrining);

export default router;
