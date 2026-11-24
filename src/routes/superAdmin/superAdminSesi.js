/**
 * Rute Super Admin - Sesi Skrining. Dipasang pada /api/super-admin/sesi.
 */

import { Router } from "express";
import { verifyToken, authorizeRoles } from "../../middlewares/auth.middleware.js";
import { akhiriSesi } from "../../controllers/superAdmin/superAdminSesi.js";

const router = Router();

router.use(verifyToken, authorizeRoles("SUPER_ADMIN"));

router.post("/:id/akhiri", akhiriSesi);

export default router;
