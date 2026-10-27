/**
 * Middleware Penanganan Rute Tidak Dikenal dan Error Global.
 * Mengubah setiap error menjadi respon JSON standar tanpa membocorkan detail internal.
 */

import ApiResponse from "../utils/apiResponse.js";
import logger from "../utils/logger.js";

/**
 * Mengembalikan 404 JSON untuk rute yang tidak terdaftar.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
export function notFoundHandler(req, res) {
  return ApiResponse.error(res, {
    statusCode: 404,
    message: `Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.`
  });
}

/**
 * Membuat error handler global Express.
 * @param {{ isDevelopment: boolean }} options
 * @returns {import("express").ErrorRequestHandler}
 */
export function createErrorHandler({ isDevelopment }) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    let statusCode = err.statusCode ?? err.status ?? 500;
    if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
      statusCode = 500;
    }

    let message;
    if (err.type === "entity.parse.failed") {
      message = "Format JSON pada body request tidak valid.";
    } else if (statusCode >= 500 && !err.isOperational) {
      message = "Terjadi kesalahan internal pada server.";
    } else {
      message = err.message;
    }

    const logLine = `[${req.method} ${req.originalUrl}] ${message}`;
    if (statusCode >= 500) {
      logger.error(logLine, err);
    } else {
      logger.warn(logLine);
    }

    const payload = { success: false, message };
    if (err.isOperational && err.details) {
      payload.details = err.details;
    }
    if (isDevelopment && statusCode >= 500) {
      payload.stack = err.stack;
    }

    return res.status(statusCode).json(payload);
  };
}
