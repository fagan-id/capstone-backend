/**
 * Middleware Autentikasi dan Otorisasi JWT.
 * Memverifikasi token dari Authorization header (Bearer) atau HTTP-only cookie.
 */

import jwt from "jsonwebtoken";
import { config } from "../config/index.js";
import AppError from "../utils/appError.js";

/**
 * Middleware untuk memverifikasi keabsahan JWT token.
 * Menyimpan payload { id, role, email } ke req.user.
 */
export function verifyToken(req, res, next) {
  let token = null;

  // 1. Ambil token dari Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    // 2. Fallback: ambil token dari HTTP-only cookie jika ada
    token = req.cookies.token;
  }

  if (!token) {
    return next(AppError.unauthorized("Akses ditolak. Token autentikasi tidak ditemukan."));
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(AppError.unauthorized("Sesi telah kedaluwarsa. Silakan login kembali."));
    }
    return next(AppError.unauthorized("Token autentikasi tidak valid."));
  }
}

/**
 * Middleware untuk membatasi akses endpoint berdasarkan role pengguna.
 * @param  {...string} roles - Daftar role yang diizinkan (misal: "SUPER_ADMIN", "SEKOLAH")
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(AppError.forbidden("Akses ditolak. Anda tidak memiliki hak akses untuk resource ini."));
    }
    return next();
  };
}
