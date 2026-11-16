/**
 * Rute API Dashboard Super Admin.
 * Endpoint dilindungi autentikasi JWT dan otorisasi SUPER_ADMIN.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { getDashboard, logoutSuperAdmin } from "../../controllers/superAdmin/superAdminDashboard.js";

const router = Router();

// Seluruh rute dashboard wajib autentikasi JWT dan role SUPER_ADMIN
router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

// 1. Ambil ringkasan statistik KPI dan feed aktivitas terbaru
router.get("/", getDashboard);

// 2. Sub-rute logout jika dipanggil melalui /api/super-admin/dashboard/logout
router.post("/logout", logoutSuperAdmin);

export default router;
