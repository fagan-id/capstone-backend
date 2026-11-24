/**
 * Rute Sekolah. Dipasang pada /api/sekolah.
 * Semua rute di bawahnya hanya untuk akun SEKOLAH yang masih aktif.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles, cekSekolahAktif } from "../../middlewares/auth.middleware.js";
import kelasRoutes from "./sekolahKelas.js";
import siswaRoutes from "./sekolahSiswa.js";
import sesiRoutes from "./sekolahSesi.js";
import { getDaftarTes } from "../../controllers/sekolah/sekolahSesi.js";

const router = Router();

router.use(verifyToken, authorizeRoles("SEKOLAH"), cekSekolahAktif);

router.use("/kelas", kelasRoutes);
router.use("/siswa", siswaRoutes);
router.get("/tes", getDaftarTes);
router.use("/sesi", sesiRoutes);

export default router;
