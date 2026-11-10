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

      // 1. Cari terlebih dahulu di tabel super_admin (email ATAU nama/username)
      const adminModel = prisma.super_admin || prisma.superAdmin;
      let superAdmin = null;
      if (adminModel && typeof adminModel.findFirst === "function") {
        superAdmin = await adminModel.findFirst({
          where: {
            OR: [
              { email: trimmedIdentifier },
              { username: trimmedIdentifier }
            ],
            deletedAt: null
          }
        }).catch(async () => {
          return await adminModel.findFirst({
            where: {
              OR: [
                { email: trimmedIdentifier },
                { nama: trimmedIdentifier }
              ],
              aktif: true
            }
          }).catch(() => null);
        });
      }

      if (superAdmin) {
        const passwordHash = superAdmin.password_hash || superAdmin.password;
        const isPasswordValid = await bcrypt.compare(password, passwordHash);
        if (!isPasswordValid) {
          throw AppError.unauthorized("Kredensial tidak valid.");
        }

        const isAktif = superAdmin.aktif !== undefined
          ? superAdmin.aktif
          : (superAdmin.deletedAt === null || superAdmin.deletedAt === undefined);

        if (!isAktif) {
          throw AppError.forbidden("Akun Super Admin dinonaktifkan.");
        }

        const adminId = superAdmin.id ?? superAdmin.idAdmin;
        const adminEmail = superAdmin.email;
        const adminName = superAdmin.nama || superAdmin.username || "Super Admin";
        const adminUsername = superAdmin.username || superAdmin.nama || "superadmin";

        const tokenPayload = {
          id: adminId,
          role: "SUPER_ADMIN",
          email: adminEmail
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
              id: adminId,
              nama: adminName,
              username: adminUsername,
              email: adminEmail
            }
          }
        });
      }

      // 2. Jika tidak ditemukan di super_admin, cari di tabel sekolah (email ATAU username)
      const sekolahModel = prisma.sekolah;
      let sekolah = null;
      if (sekolahModel && typeof sekolahModel.findFirst === "function") {
        sekolah = await sekolahModel.findFirst({
          where: {
            email: trimmedIdentifier,
            deletedAt: null
          }
        }).catch(async () => {
          return await sekolahModel.findFirst({
            where: {
              OR: [
                { email: trimmedIdentifier },
                { username: trimmedIdentifier }
              ],
              aktif: true
            }
          }).catch(() => null);
        });
      }

      if (sekolah) {
        const passwordHash = sekolah.password_hash || sekolah.password;
        const isPasswordValid = await bcrypt.compare(password, passwordHash);
        if (!isPasswordValid) {
          throw AppError.unauthorized("Kredensial tidak valid.");
        }

        // Verifikasi status keaktifan akun sekolah
        const isAktif = sekolah.aktif !== undefined
          ? sekolah.aktif
          : (sekolah.statusAktif !== undefined ? sekolah.statusAktif : (sekolah.deletedAt === null));

        if (!isAktif) {
          throw new AppError("Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.", 403);
        }

        const schoolId = sekolah.id ?? sekolah.idSchool;
        const schoolName = sekolah.nama || sekolah.schoolName;
        const schoolEmail = sekolah.email;
        const schoolPhone = sekolah.kontak_telepon || sekolah.kontakTelepon;

        const tokenPayload = {
          id: schoolId,
          role: "SEKOLAH",
          email: schoolEmail
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
              id: schoolId,
              schoolName: schoolName,
              nama: schoolName,
              email: schoolEmail,
              alamat: sekolah.alamat,
              kontakTelepon: schoolPhone,
              kontak_telepon: schoolPhone
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
        const adminModel = prisma.super_admin || prisma.superAdmin;
        let admin = null;
        if (adminModel && typeof adminModel.findFirst === "function") {
          admin = await adminModel.findFirst({
            where: {
              OR: [
                { idAdmin: id },
                { id: id }
              ],
              deletedAt: null
            }
          }).catch(async () => {
            return await adminModel.findFirst({
              where: {
                id: id,
                aktif: true
              }
            }).catch(() => null);
          });
        }

        if (!admin) {
          throw AppError.notFound("Pengguna Super Admin tidak ditemukan atau telah dinonaktifkan.");
        }

        const adminId = admin.id ?? admin.idAdmin;
        const adminName = admin.nama || admin.username || "Super Admin";
        const adminUsername = admin.username || admin.nama || "superadmin";

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Data profil berhasil diambil.",
          data: {
            role: "SUPER_ADMIN",
            user: {
              id: adminId,
              nama: adminName,
              username: adminUsername,
              email: admin.email,
              createdAt: admin.created_at || admin.createdAt,
              updatedAt: admin.updated_at || admin.updatedAt
            }
          }
        });
      }

      if (role === "SEKOLAH") {
        const sekolahModel = prisma.sekolah;
        let sekolah = null;
        if (sekolahModel && typeof sekolahModel.findFirst === "function") {
          sekolah = await sekolahModel.findFirst({
            where: {
              OR: [
                { idSchool: id },
                { id: id }
              ],
              deletedAt: null
            }
          }).catch(async () => {
            return await sekolahModel.findFirst({
              where: {
                id: id,
                aktif: true
              }
            }).catch(() => null);
          });
        }

        if (!sekolah) {
          throw AppError.notFound("Akun sekolah tidak ditemukan atau telah dihapus.");
        }

        const isAktif = sekolah.aktif !== undefined
          ? sekolah.aktif
          : (sekolah.statusAktif !== undefined ? sekolah.statusAktif : (sekolah.deletedAt === null));

        if (!isAktif) {
          throw new AppError("Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.", 403);
        }

        const schoolId = sekolah.id ?? sekolah.idSchool;
        const schoolName = sekolah.nama || sekolah.schoolName;
        const schoolPhone = sekolah.kontak_telepon || sekolah.kontakTelepon;

        return ApiResponse.success(res, {
          statusCode: 200,
          message: "Data profil berhasil diambil.",
          data: {
            role: "SEKOLAH",
            user: {
              id: schoolId,
              adminId: sekolah.adminId || null,
              schoolName: schoolName,
              nama: schoolName,
              email: sekolah.email,
              alamat: sekolah.alamat,
              kontakTelepon: schoolPhone,
              kontak_telepon: schoolPhone,
              statusAktif: isAktif,
              aktif: isAktif,
              createdAt: sekolah.created_at || sekolah.createdAt,
              updatedAt: sekolah.updated_at || sekolah.updatedAt
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
