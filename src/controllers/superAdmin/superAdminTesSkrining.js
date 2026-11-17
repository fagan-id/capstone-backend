/**
 * Controller Rute Super Admin - Manajemen Tes Skrining.
 * Mengorkestrasi validasi masukan, pemanggilan layanan, dan respon API untuk modul Tes Skrining.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import * as tesSkriningService from "../../services/superAdmin/superAdminTesSkrining.js";
import {
  validasiIdTesSkrining,
  validasiQueryDaftarTesSkrining,
  validasiTambahTesSkrining,
  validasiUpdateTesSkrining
} from "../../validators/superAdmin/superAdminTesSkrining.js";

/**
 * GET /api/super-admin/tes-skrining
 * Mengambil daftar tes skrining dengan filter level, status, pencarian, pengurutan, paginasi, dan statistik.
 */
export async function getDaftarTesSkrining(req, res, next) {
  try {
    const params = validasiQueryDaftarTesSkrining(req.query);
    const hasil = await tesSkriningService.getDaftarTesSkrining(prisma, params);

    return ApiResponse.success(res, {
      message: "Daftar tes skrining berhasil dimuat.",
      data: hasil.items,
      meta: {
        pagination: hasil.pagination,
        statistik: hasil.statistik
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/super-admin/tes-skrining/kategori
 * Mengambil daftar kategori asesmen / domain DSM-5 untuk pengisian form Level 2.
 */
export async function getDaftarKategori(req, res, next) {
  try {
    const data = await tesSkriningService.getDaftarKategori(prisma);

    return ApiResponse.success(res, {
      message: "Daftar domain asesmen berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/super-admin/tes-skrining/:id
 * Mengambil detail satu data tes skrining untuk Tab Overview.
 */
export async function getDetailTesSkrining(req, res, next) {
  try {
    const id = validasiIdTesSkrining(req.params.id);
    const data = await tesSkriningService.getDetailTesSkrining(prisma, id);

    return ApiResponse.success(res, {
      message: "Detail overview tes skrining berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/super-admin/tes-skrining
 * Menambahkan instrumen tes skrining baru (Level 1 atau Level 2).
 */
export async function tambahTesSkrining(req, res, next) {
  try {
    const masukan = validasiTambahTesSkrining(req.body);
    const superAdminId = req.user?.id || 1;
    const data = await tesSkriningService.tambahTesSkrining(prisma, masukan, superAdminId);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Tes skrining berhasil ditambahkan.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT/PATCH /api/super-admin/tes-skrining/:id
 * Memperbarui data Tab Overview dan status aktif/nonaktif tes skrining.
 */
export async function updateOverviewTesSkrining(req, res, next) {
  try {
    const id = validasiIdTesSkrining(req.params.id);
    const masukan = validasiUpdateTesSkrining(req.body);
    const data = await tesSkriningService.updateOverviewTesSkrining(prisma, id, masukan);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Data overview tes skrining berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/super-admin/tes-skrining/:id
 * Menghapus instrumen tes skrining dengan validasi ketat keamanan relasi.
 */
export async function hapusTesSkrining(req, res, next) {
  try {
    const id = validasiIdTesSkrining(req.params.id);
    const data = await tesSkriningService.hapusTesSkrining(prisma, id);

    return ApiResponse.success(res, {
      statusCode: 200,
      message: "Tes skrining berhasil dihapus.",
      data
    });
  } catch (err) {
    next(err);
  }
}
