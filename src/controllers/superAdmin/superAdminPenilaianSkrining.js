/**
 * Controller Rute Super Admin - Tab Penilaian Tes Skrining.
 * Mengorkestrasi respon API untuk konfigurasi penilaian Level 1 (ambang batas domain)
 * dan Level 2 (rentang skor & kategori hasil).
 */

import ApiResponse from "../../utils/apiResponse.js";
import AppError from "../../utils/appError.js";
import { prisma } from "../../lib/prisma.js";
import * as penilaianService from "../../services/superAdmin/superAdminPenilaianSkrining.js";
import {
  validasiIdNumerik,
  validasiUpdatePenilaianLevel1,
  validasiTambahRentangLevel2,
  validasiUpdateRentangLevel2,
  validasiBatchRentangLevel2
} from "../../validators/superAdmin/superAdminPenilaianSkrining.js";

/**
 * GET /api/super-admin/tes-skrining/:id/penilaian
 * Mengambil konfigurasi penilaian tes skrining (Level 1 atau Level 2).
 */
export async function getPenilaian(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");

    const data = await penilaianService.getPenilaian(prisma, tesId);

    return ApiResponse.success(res, {
      message: "Konfigurasi penilaian berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/super-admin/tes-skrining/:id/penilaian
 * Menambahkan aturan rentang penilaian baru untuk tes skrining Level 2.
 */
export async function tambahRentangLevel2(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const payload = validasiTambahRentangLevel2(req.body);

    const data = await penilaianService.tambahRentangLevel2(prisma, tesId, payload);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Rentang penilaian berhasil ditambahkan.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/super-admin/tes-skrining/:id/penilaian
 * Memperbarui rentang penilaian Level 2 secara batch/menyeluruh.
 */
export async function updateBatchRentangLevel2(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const items = validasiBatchRentangLevel2(req.body);

    const data = await penilaianService.updateBatchRentangLevel2(prisma, tesId, items);

    return ApiResponse.success(res, {
      message: "Rentang penilaian Level 2 berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/super-admin/tes-skrining/:id/penilaian/:aturanId
 * PUT /api/super-admin/tes-skrining/:id/penilaian/:aturanId
 * Memperbarui satu aturan penilaian:
 * - Level 1: Mengubah ambang batas / kondisi pemicu domain (aturanId = domainId)
 * - Level 2: Mengubah satu rentang penilaian (aturanId = rentangId)
 */
export async function updatePenilaian(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const aturanId = validasiIdNumerik(req.params.aturanId, "ID aturan / rentang penilaian tidak valid.");

    const tes = await prisma.tes_skrining.findUnique({
      where: { id: tesId },
      select: { id: true, level: true }
    });

    if (!tes) {
      throw AppError.notFound("Tes skrining tidak ditemukan.");
    }

    let data;
    if (tes.level === 1) {
      const payload = validasiUpdatePenilaianLevel1(req.body);
      data = await penilaianService.updatePenilaianLevel1(prisma, tesId, aturanId, payload);
    } else {
      const payload = validasiUpdateRentangLevel2(req.body);
      data = await penilaianService.updateRentangLevel2(prisma, tesId, aturanId, payload);
    }

    return ApiResponse.success(res, {
      message: "Aturan penilaian berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/super-admin/tes-skrining/:id/penilaian/:aturanId
 * Menghapus aturan rentang penilaian pada tes skrining Level 2.
 */
export async function hapusRentangLevel2(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const aturanId = validasiIdNumerik(req.params.aturanId, "ID aturan / rentang penilaian tidak valid.");

    const data = await penilaianService.hapusRentangLevel2(prisma, tesId, aturanId);

    return ApiResponse.success(res, {
      message: "Rentang penilaian berhasil dihapus.",
      data
    });
  } catch (err) {
    next(err);
  }
}
