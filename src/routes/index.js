/**
 * Router Utama API.
 * Dipasang pada prefix /api oleh app.js.
 */

import { Router } from "express";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";
import authRoutes from "./auth/auth.routes.js";
import skriningOrangTuaRoutes from "./public/skriningOrangTua.js";
import superAdminKelolaSekolahRoutes from "./superAdmin/superAdminKelolaSekolah.js";

/**
 * Membuat router API.
 * @param {{ config: { env: string }, cekDatabase: () => Promise<void> }} deps
 * @returns {import("express").Router}
 */
export function createRouter({ config, cekDatabase }) {
  const router = Router();

  // Rute Autentikasi Pengguna (Super Admin & Sekolah)
  router.use("/auth", authRoutes);

  // Rute Publik Skrining ABK (Orang Tua / Siswa)
  router.use("/public/skrining", skriningOrangTuaRoutes);

  // Rute Super Admin - Kelola Sekolah (CRU tanpa Delete)
  router.use("/super-admin/sekolah", superAdminKelolaSekolahRoutes);
  router.use("/admin/sekolah", superAdminKelolaSekolahRoutes);

  router.get("/health", async (req, res) => {
    const timestamp = new Date().toISOString();

    try {
      await cekDatabase();
    } catch (err) {
      logger.warn(`Health check: database tidak dapat dijangkau (${err.message})`);
      return ApiResponse.error(res, {
        statusCode: 503,
        message: "Server berjalan, tetapi database tidak dapat dijangkau.",
        details: { status: "DEGRADED", database: "tidak_terhubung", environment: config.env, timestamp }
      });
    }

    return ApiResponse.success(res, {
      message: "Server berjalan normal.",
      data: { status: "OK", database: "terhubung", environment: config.env, timestamp }
    });
  });

  return router;
}
