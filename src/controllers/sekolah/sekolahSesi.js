/**
 * Controller Rute Sekolah - Sesi Skrining dan pilihan Tes.
 * sekolah_id selalu diambil dari token (req.user.id), tidak pernah dari body atau URL.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import * as sesiService from "../../services/sekolah/sekolahSesi.js";
import {
  validasiIdSesi,
  validasiQueryDaftarSesi,
  validasiTambahSesi,
  validasiUpdateSesi
} from "../../validators/sekolah/sekolahSesi.js";

/** GET /api/sekolah/tes */
export async function getDaftarTes(req, res, next) {
  try {
    const data = await sesiService.getDaftarTes(prisma);
    return ApiResponse.success(res, { message: "Data tes skrining berhasil dimuat.", data });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/sekolah/sesi */
export async function getDaftarSesi(req, res, next) {
  try {
    const params = validasiQueryDaftarSesi(req.query);
    const hasil = await sesiService.getDaftarSesi(prisma, req.user.id, params);
    return ApiResponse.success(res, {
      message: "Data sesi skrining berhasil dimuat.",
      data: hasil.items,
      meta: { pagination: hasil.pagination }
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/sekolah/sesi/:id */
export async function getDetailSesi(req, res, next) {
  try {
    const id = validasiIdSesi(req.params.id);
    const data = await sesiService.getDetailSesi(prisma, req.user.id, id);
    return ApiResponse.success(res, { message: "Detail sesi skrining berhasil dimuat.", data });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/sekolah/sesi */
export async function tambahSesi(req, res, next) {
  try {
    const masukan = validasiTambahSesi(req.body);
    const data = await sesiService.tambahSesi(prisma, req.user.id, masukan);
    return ApiResponse.success(res, { statusCode: 201, message: "Sesi skrining berhasil dibuat.", data });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/sekolah/sesi/:id */
export async function updateSesi(req, res, next) {
  try {
    const id = validasiIdSesi(req.params.id);
    const masukan = validasiUpdateSesi(req.body);
    const data = await sesiService.updateSesi(prisma, req.user.id, id, masukan);
    return ApiResponse.success(res, { message: "Sesi skrining berhasil diperbarui.", data });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/sekolah/sesi/:id/akhiri */
export async function akhiriSesi(req, res, next) {
  try {
    const id = validasiIdSesi(req.params.id);
    const data = await sesiService.akhiriSesi(prisma, req.user.id, id);
    return ApiResponse.success(res, { message: "Sesi skrining berhasil diakhiri.", data });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/sekolah/sesi/:id */
export async function hapusSesi(req, res, next) {
  try {
    const id = validasiIdSesi(req.params.id);
    await sesiService.hapusSesi(prisma, req.user.id, id);
    return ApiResponse.success(res, { message: "Sesi skrining berhasil dihapus." });
  } catch (err) {
    return next(err);
  }
}
