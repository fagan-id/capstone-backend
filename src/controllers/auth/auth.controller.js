/**
 * Controller Autentikasi Pengguna (Login, Logout, Cek User Me).
 * Mendukung autentikasi multi-tabel (super_admin dan sekolah).
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config/index.js";
import ApiResponse from "../../utils/apiResponse.js";
import AppError from "../../utils/appError.js";

const PESAN_SEKOLAH_NONAKTIF = "Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.";

/**
 * Menandatangani JWT lalu menyimpannya sebagai cookie HTTP-only.
 * @returns {string} token
 */
function terbitkanToken(res, payload) {
  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  res.cookie("token", token, {
    httpOnly: true,
    secure: !config.isDevelopment,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000 // 1 hari
  });
  return token;
}

export class AuthController {
  /**
   * POST /api/auth/login
   * Melakukan autentikasi akun berdasarkan identifier (email/username) dan password.
   */
  static async login(req, res, next) {
    try {
      const { identifier, password } = req.body || {};

      if (
        typeof identifier !== "string" ||
        typeof password !== "string" ||
        !identifier.trim() ||
        !password.trim()
      ) {
        throw AppError.badRequest("Identifier dan password wajib diisi.");
      }

      const id = identifier.trim();

      // 1. Cari terlebih dahulu di tabel super_admin (email ATAU nama).
      // Akun nonaktif tetap dicari agar ditolak dengan 403, bukan 401.
      const superAdmin = await prisma.super_admin.findFirst({
        where: { OR: [{ email: id }, { nama: id }] }
      });

      if (superAdmin) {
        if (!(await bcrypt.compare(password, superAdmin.password_hash))) {
          throw AppError.unauthorized("Kredensial tidak valid.");
        }
        if (!superAdmin.aktif) {
          throw AppError.forbidden("Akun Super Admin dinonaktifkan.");
        }

        const token = terbitkanToken(res, { id: superAdmin.id, role: "SUPER_ADMIN", email: superAdmin.email });

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Login berhasil.",
          data: {
            token,
            role: "SUPER_ADMIN",
            redirectTo: "/admin/dashboard",
            user: {
              id: superAdmin.id,
              nama: superAdmin.nama,
              username: superAdmin.nama,
              email: superAdmin.email
            }
          }
        });
      }

      // 2. Jika tidak ditemukan di super_admin, cari di tabel sekolah (email ATAU username)
      const sekolah = await prisma.sekolah.findFirst({
        where: { OR: [{ email: id }, { username: id }] }
      });

      if (sekolah) {
        if (!(await bcrypt.compare(password, sekolah.password_hash))) {
          throw AppError.unauthorized("Kredensial tidak valid.");
        }
        if (!sekolah.aktif) {
          throw AppError.forbidden(PESAN_SEKOLAH_NONAKTIF);
        }

        const token = terbitkanToken(res, { id: sekolah.id, role: "SEKOLAH", email: sekolah.email });

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Login berhasil.",
          data: {
            token,
            role: "SEKOLAH",
            redirectTo: "/sekolah/dashboard",
            user: {
              id: sekolah.id,
              schoolName: sekolah.nama,
              nama: sekolah.nama,
              email: sekolah.email,
              alamat: sekolah.alamat,
              kontakTelepon: sekolah.kontak_telepon,
              kontak_telepon: sekolah.kontak_telepon
            }
          }
        });
      }

      // 3. Jika akun tidak ditemukan di kedua tabel
      throw AppError.unauthorized("Kredensial tidak valid.");
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/auth/logout
   * Mengakhiri sesi pengguna dan menghapus cookie autentikasi.
   */
  static async logout(req, res, next) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: !config.isDevelopment,
        sameSite: "lax"
      });

      return ApiResponse.success(res, {
        statusCode: 200,
        message: "Logout berhasil. Sesi telah diakhiri."
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Membaca informasi data pengguna dari sesi token JWT yang sedang aktif.
   */
  static async me(req, res, next) {
    try {
      const { id, role } = req.user;

      if (role === "SUPER_ADMIN") {
        const admin = await prisma.super_admin.findFirst({ where: { id, aktif: true } });

        if (!admin) {
          throw AppError.notFound("Pengguna Super Admin tidak ditemukan atau telah dinonaktifkan.");
        }

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Data profil berhasil diambil.",
          data: {
            role: "SUPER_ADMIN",
            user: {
              id: admin.id,
              nama: admin.nama,
              username: admin.nama,
              email: admin.email,
              createdAt: admin.created_at,
              updatedAt: admin.updated_at
            }
          }
        });
      }

      if (role === "SEKOLAH") {
        const sekolah = await prisma.sekolah.findFirst({ where: { id } });

        if (!sekolah) {
          throw AppError.notFound("Akun sekolah tidak ditemukan atau telah dihapus.");
        }
        if (!sekolah.aktif) {
          throw AppError.forbidden(PESAN_SEKOLAH_NONAKTIF);
        }

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Data profil berhasil diambil.",
          data: {
            role: "SEKOLAH",
            user: {
              id: sekolah.id,
              schoolName: sekolah.nama,
              nama: sekolah.nama,
              email: sekolah.email,
              alamat: sekolah.alamat,
              kontakTelepon: sekolah.kontak_telepon,
              kontak_telepon: sekolah.kontak_telepon,
              statusAktif: sekolah.aktif,
              aktif: sekolah.aktif,
              createdAt: sekolah.created_at,
              updatedAt: sekolah.updated_at
            }
          }
        });
      }

      throw AppError.unauthorized("Role pengguna dalam token tidak valid.");
    } catch (err) {
      return next(err);
    }
  }
}
