/**
 * Rute API Kelola Sekolah untuk Super Admin.
 * Endpoint CRU (Create, Read, Update) tanpa Delete, dilindungi autentikasi Super Admin.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import {
  getDaftarSekolah,
  getDetailSekolah,
  tambahSekolah,
  updateSekolah,
  hapusSekolahDilarang
} from "../../controllers/superAdmin/superAdminKelolaSekolah.js";

const router = Router();

// Seluruh rute kelola sekolah wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// 1. Ambil daftar sekolah (dengan filter status, pencarian, sort, paginasi)
router.get("/", getDaftarSekolah);

// 2. Ambil detail satu sekolah
router.get("/:id", getDetailSekolah);

// 3. Tambah sekolah baru (Nama, Email, Password, Status)
router.post("/", tambahSekolah);

// 4. Perbarui data sekolah (Nama, Email, Password Baru opsional, Status)
router.put("/:id", updateSekolah);
router.patch("/:id", updateSekolah);

// 5. Penolakan eksplisit untuk operasi DELETE (CRU tanpa Delete)
router.delete("/", hapusSekolahDilarang);
router.delete("/:id", hapusSekolahDilarang);

export default router;
