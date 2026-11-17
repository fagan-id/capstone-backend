/**
 * Rute API Manajemen Tab Penilaian Tes Skrining untuk Super Admin.
 * Menangani pembacaan konfigurasi aturan penilaian Level 1 (ambang batas domain)
 * dan Level 2 (rentang skor & kategori hasil), penambahan, pembaruan, dan penghapusan rentang.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import {
  getPenilaian,
  tambahRentangLevel2,
  updateBatchRentangLevel2,
  updatePenilaian,
  hapusRentangLevel2
} from "../../controllers/superAdmin/superAdminPenilaianSkrining.js";

// mergeParams: true agar parameter :id dari router induk tes-skrining dapat dibaca
const router = Router({ mergeParams: true });

// Wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// 1. Ambil konfigurasi penilaian tes skrining (Level 1 atau Level 2)
router.get("/", getPenilaian);

// 2. Tambah satu rentang penilaian baru (khusus Level 2)
router.post("/", tambahRentangLevel2);

// 3. Perbarui seluruh rentang penilaian secara batch (khusus Level 2)
router.patch("/", updateBatchRentangLevel2);

// 4. Perbarui satu aturan penilaian:
//    - Level 1: Ubah ambang batas / kondisi pemicu domain (:aturanId = domainId)
//    - Level 2: Ubah satu rentang penilaian (:aturanId = rentangId)
router.patch("/:aturanId", updatePenilaian);
router.put("/:aturanId", updatePenilaian);

// 5. Hapus rentang penilaian (khusus Level 2, :aturanId = rentangId)
router.delete("/:aturanId", hapusRentangLevel2);

export default router;
