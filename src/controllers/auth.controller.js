/**
 * Controller Autentikasi Pengguna (Login, Logout, Cek User Me).
 * Mendukung autentikasi multi-tabel (super_admin dan sekolah).
 */

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { config } from "../config/index.js";
import ApiResponse from "../utils/apiResponse.js";
import AppError from "../utils/appError.js";

export class AuthController {
  /**
   * POST /api/auth/login
   * Melakukan autentikasi akun berdasarkan identifier (email/username) dan password.
   */
  static async login(req, res, next) {
    try {
      const { identifier, password } = req.body || {};

      if (
        !identifier ||
        !password ||
        typeof identifier !== "string" ||
        typeof password !== "string" ||
        !identifier.trim() ||
        !password.trim()
      ) {
        throw AppError.badRequest("Identifier dan password wajib diisi.");
      }

      const trimmedIdentifier = identifier.trim();

      // 1. Cari terlebih dahulu di tabel super_admin (email ATAU username, deleted_at: null)
      const superAdmin = await prisma.superAdmin.findFirst({
        where: {
          OR: [
            { email: trimmedIdentifier },
            { username: trimmedIdentifier }
          ],
          deletedAt: null
        }
      });

      if (superAdmin) {
        const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
        if (!isPasswordValid) {
          throw AppError.unauthorized("Kredensial tidak valid.");
        }

        const tokenPayload = {
          id: superAdmin.idAdmin,
          role: "SUPER_ADMIN",
          email: superAdmin.email
        };

        const token = jwt.sign(tokenPayload, config.jwt.secret, {
          expiresIn: config.jwt.expiresIn
        });

        // Set HTTP-only cookie untuk keamanan ekstra
        res.cookie("token", token, {
          httpOnly: true,
          secure: !config.isDevelopment,
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000 // 1 hari
        });

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Login berhasil.",
          data: {
            token,
            role: "SUPER_ADMIN",
            redirectTo: "/admin/dashboard",
            user: {
              id: superAdmin.idAdmin,
              username: superAdmin.username,
              email: superAdmin.email
            }
          }
        });
      }

      // 2. Jika tidak ditemukan di super_admin, cari di tabel sekolah (email, deleted_at: null)
      const sekolah = await prisma.sekolah.findFirst({
        where: {
          email: trimmedIdentifier,
          deletedAt: null
        }
      });

      if (sekolah) {
        const isPasswordValid = await bcrypt.compare(password, sekolah.password);
        if (!isPasswordValid) {
          throw AppError.unauthorized("Kredensial tidak valid.");
        }

        // Verifikasi status keaktifan akun sekolah
        if (!sekolah.statusAktif) {
          throw new AppError("Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.", 403);
        }

        const tokenPayload = {
          id: sekolah.idSchool,
          role: "SEKOLAH",
          email: sekolah.email
        };

        const token = jwt.sign(tokenPayload, config.jwt.secret, {
          expiresIn: config.jwt.expiresIn
        });

        res.cookie("token", token, {
          httpOnly: true,
          secure: !config.isDevelopment,
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000
        });

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Login berhasil.",
          data: {
            token,
            role: "SEKOLAH",
            redirectTo: "/sekolah/dashboard",
            user: {
              id: sekolah.idSchool,
              schoolName: sekolah.schoolName,
              email: sekolah.email,
              alamat: sekolah.alamat,
              kontakTelepon: sekolah.kontakTelepon
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
        const admin = await prisma.superAdmin.findFirst({
          where: { idAdmin: id, deletedAt: null },
          select: {
            idAdmin: true,
            username: true,
            email: true,
            createdAt: true,
            updatedAt: true
          }
        });

        if (!admin) {
          throw AppError.notFound("Pengguna Super Admin tidak ditemukan atau telah dinonaktifkan.");
        }

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Data profil berhasil diambil.",
          data: {
            role: "SUPER_ADMIN",
            user: {
              id: admin.idAdmin,
              username: admin.username,
              email: admin.email,
              createdAt: admin.createdAt,
              updatedAt: admin.updatedAt
            }
          }
        });
      }

      if (role === "SEKOLAH") {
        const sekolah = await prisma.sekolah.findFirst({
          where: { idSchool: id, deletedAt: null },
          select: {
            idSchool: true,
            adminId: true,
            schoolName: true,
            email: true,
            alamat: true,
            kontakTelepon: true,
            statusAktif: true,
            createdAt: true,
            updatedAt: true
          }
        });

        if (!sekolah) {
          throw AppError.notFound("Akun sekolah tidak ditemukan atau telah dihapus.");
        }

        if (!sekolah.statusAktif) {
          throw new AppError("Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.", 403);
        }

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Data profil berhasil diambil.",
          data: {
            role: "SEKOLAH",
            user: {
              id: sekolah.idSchool,
              adminId: sekolah.adminId,
              schoolName: sekolah.schoolName,
              email: sekolah.email,
              alamat: sekolah.alamat,
              kontakTelepon: sekolah.kontakTelepon,
              statusAktif: sekolah.statusAktif,
              createdAt: sekolah.createdAt,
              updatedAt: sekolah.updatedAt
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
