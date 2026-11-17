/**
 * Controller Rute Super Admin - Tab Pertanyaan Tes Skrining.
 * Mengorkestrasi validasi masukan, pemanggilan layanan, dan respon API
 * untuk pengelolaan butir pertanyaan, opsi jawaban, kondisi pemicu, dan pengurutan.
 */

import ApiResponse from "../../utils/apiResponse.js";
import AppError from "../../utils/appError.js";
import { prisma } from "../../lib/prisma.js";
import * as pertanyaanService from "../../services/superAdmin/superAdminPertanyaanSkrining.js";
import { validasiIdTesSkrining } from "../../validators/superAdmin/superAdminTesSkrining.js";
import {
  validasiIdPertanyaan,
  validasiQueryDaftarPertanyaan,
  validasiTambahPertanyaan,
  validasiUpdatePertanyaan,
  validasiBatchUrutanPertanyaan
} from "../../validators/superAdmin/superAdminPertanyaanSkrining.js";

/**
 * GET /api/super-admin/tes-skrining/:id/pertanyaan
 * Mengambil daftar pertanyaan pada satu tes skrining.
 */
export async function getDaftarPertanyaan(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const params = validasiQueryDaftarPertanyaan(req.query);
    const hasil = await pertanyaanService.getDaftarPertanyaan(prisma, tesId, params);

    return ApiResponse.success(res, {
      message: "Daftar pertanyaan berhasil dimuat.",
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
 * GET /api/super-admin/tes-skrining/:id/pertanyaan/opsi-pemicu
 * Mengambil kandidat pertanyaan yang valid untuk dijadikan pemicu (beserta opsinya)
 * tanpa menimbulkan siklus percabangan (circular dependency).
 */
export async function getOpsiKandidatPemicu(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const pertanyaanId = req.query.pertanyaan_id
      ? validasiIdPertanyaan(req.query.pertanyaan_id)
      : null;

    const data = await pertanyaanService.getOpsiKandidatPemicu(prisma, tesId, pertanyaanId);

    return ApiResponse.success(res, {
      message: "Daftar opsi pertanyaan pemicu berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId
 * Mengambil detail satu pertanyaan skrining.
 */
export async function getDetailPertanyaan(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const pertanyaanId = validasiIdPertanyaan(req.params.pertanyaanId);
    const data = await pertanyaanService.getDetailPertanyaan(prisma, tesId, pertanyaanId);

    return ApiResponse.success(res, {
      message: "Detail pertanyaan berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/super-admin/tes-skrining/:id/pertanyaan
 * Menambahkan pertanyaan baru beserta opsi jawaban dan kondisi pemicu.
 */
export async function tambahPertanyaan(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const tes = await prisma.tes_skrining.findUnique({
      where: { id: tesId },
      select: { id: true, level: true }
    });

    if (!tes) {
      throw AppError.notFound("Tes skrining tidak ditemukan.");
    }

    const dataInput = validasiTambahPertanyaan(req.body, tes.level);
    const data = await pertanyaanService.tambahPertanyaan(prisma, tesId, dataInput);

    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Pertanyaan berhasil ditambahkan.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT/PATCH /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId
 * Memperbarui satu pertanyaan skrining.
 */
export async function updatePertanyaan(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const pertanyaanId = validasiIdPertanyaan(req.params.pertanyaanId);
    const dataInput = validasiUpdatePertanyaan(req.body);

    const data = await pertanyaanService.updatePertanyaan(prisma, tesId, pertanyaanId, dataInput);

    return ApiResponse.success(res, {
      message: "Pertanyaan berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/super-admin/tes-skrining/:id/pertanyaan/urutan
 * Memperbarui urutan nomor batch pertanyaan (reordering).
 */
export async function updateBatchUrutan(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const items = validasiBatchUrutanPertanyaan(req.body);

    const data = await pertanyaanService.updateBatchUrutan(prisma, tesId, items);

    return ApiResponse.success(res, {
      message: "Urutan pertanyaan berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId
 * Menghapus satu pertanyaan skrining dengan proteksi relasi keamanan.
 */
export async function hapusPertanyaan(req, res, next) {
  try {
    const tesId = validasiIdTesSkrining(req.params.id);
    const pertanyaanId = validasiIdPertanyaan(req.params.pertanyaanId);

    const hasil = await pertanyaanService.hapusPertanyaan(prisma, tesId, pertanyaanId);

    return ApiResponse.success(res, {
      message: hasil.message,
      data: { id: hasil.id }
    });
  } catch (err) {
    next(err);
  }
}
