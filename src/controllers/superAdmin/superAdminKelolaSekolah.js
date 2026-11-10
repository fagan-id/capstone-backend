/**
 * Controller Rute Super Admin - Kelola Sekolah.
 * Mengorkestrasi validasi masukan, pemanggilan layanan, dan respon API untuk fitur CRU Sekolah.
 */

import ApiResponse from "../../utils/apiResponse.js";
import AppError from "../../utils/appError.js";
import { prisma } from "../../lib/prisma.js";
import * as sekolahService from "../../services/superAdmin/superAdminKelolaSekolah.js";
import {
  validasiIdSekolah,
  validasiQueryDaftarSekolah,
  validasiTambahSekolah,
  validasiUpdateSekolah
} from "../../validators/superAdmin/superAdminKelolaSekolah.js";

/**
 * GET /api/super-admin/sekolah
 * Mengambil daftar sekolah dengan filter, pencarian, pengurutan, dan paginasi.
 */
export async function getDaftarSekolah(req, res, next) {
  try {
    const params = validasiQueryDaftarSekolah(req.query);
    const hasil = await sekolahService.getDaftarSekolah(prisma, params);

    return ApiResponse.success(res, {
      message: "Data sekolah berhasil dimuat.",
      data: hasil.items,
      meta: {
        pagination: hasil.pagination
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/super-admin/sekolah/:id
 * Mengambil detail satu data sekolah berdasarkan ID.
 */
export async function getDetailSekolah(req, res, next) {
  try {
    const id = validasiIdSekolah(req.params.id);
    const data = await sekolahService.getDetailSekolah(prisma, id);

    return ApiResponse.success(res, {
      message: "Detail sekolah berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/super-admin/sekolah
 * Menambahkan sekolah baru beserta akun administrator sekolah.
 */
export async function tambahSekolah(req, res, next) {
  try {
    const masukan = validasiTambahSekolah(req.body);
    const data = await sekolahService.tambahSekolah(prisma, masukan);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Sekolah berhasil ditambahkan.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT/PATCH /api/super-admin/sekolah/:id
 * Memperbarui data sekolah yang sudah ada.
 */
export async function updateSekolah(req, res, next) {
  try {
    const id = validasiIdSekolah(req.params.id);
    const masukan = validasiUpdateSekolah(req.body);
    const data = await sekolahService.updateSekolah(prisma, id, masukan);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Data sekolah berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Handler penolakan operasi DELETE.
 * Memastikan fitur kelola sekolah tidak mengizinkan penghapusan (CRU tanpa Delete).
 */
export function hapusSekolahDilarang(req, res, next) {
  return next(new AppError("Operasi hapus sekolah tidak diizinkan.", 405));
}
