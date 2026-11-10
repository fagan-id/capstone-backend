/**
 * Rute API Autentikasi Pengguna.
 * Menangani login multi-tabel, logout, dan verifikasi profil pengguna aktif (/me).
 */

import { Router } from "express";
import { AuthController } from "../../controllers/auth/auth.controller.js";
import { verifyToken } from "../../middlewares/auth.middleware.js";

const router = Router();

// 1. Endpoint Login (Publik)
router.post("/login", AuthController.login);

// 2. Endpoint Logout (Menghapus sesi / cookie)
router.post("/logout", AuthController.logout);

// 3. Endpoint Profil User Aktif (Terproteksi JWT)
router.get("/me", verifyToken, AuthController.me);

export default router;
