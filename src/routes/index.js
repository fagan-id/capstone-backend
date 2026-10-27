/**
 * Router Utama API.
 * Dipasang pada prefix /api oleh app.js.
 */

import { Router } from "express";
import ApiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

/**
 * Membuat router API.
 * @param {{ config: { env: string }, cekDatabase: () => Promise<void> }} deps
 * @returns {import("express").Router}
 */
export function createRouter({ config, cekDatabase }) {
  const router = Router();

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
