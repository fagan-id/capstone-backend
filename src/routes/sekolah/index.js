/**
 * Rute Sekolah. Dipasang pada /api/sekolah.
 * Semua rute di bawahnya hanya untuk akun SEKOLAH yang masih aktif.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles, cekSekolahAktif } from "../../middlewares/auth.middleware.js";
import kelasRoutes from "./sekolahKelas.js";

const router = Router();

router.use(verifyToken, authorizeRoles("SEKOLAH"), cekSekolahAktif);

router.use("/kelas", kelasRoutes);

export default router;
