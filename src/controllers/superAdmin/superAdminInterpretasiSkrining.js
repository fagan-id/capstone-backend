/**
 * Controller Rute Super Admin - Tab Interpretasi Tes Skrining.
 * Mengorkestrasi respon API untuk konfigurasi narasi interpretasi dan rekomendasi
 * pada tes skrining Level 1 dan Level 2.
 */

import ApiResponse from "../../utils/apiResponse.js";
import AppError from "../../utils/appError.js";
import { prisma } from "../../lib/prisma.js";
import * as interpretasiService from "../../services/superAdmin/superAdminInterpretasiSkrining.js";
import {
  validasiIdNumerik,
  parseInterpretasiIdLevel1,
  validasiUpdateInterpretasiLevel1,
  validasiUpdateInterpretasiLevel2
} from "../../validators/superAdmin/superAdminInterpretasiSkrining.js";

/**
 * GET /api/super-admin/tes-skrining/:id/interpretasi
 * Mengambil daftar konfigurasi interpretasi tes skrining (Level 1 atau Level 2).
 */
export async function getInterpretasi(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");

    const data = await interpretasiService.getInterpretasi(prisma, tesId);

    return ApiResponse.success(res, {
      message: "Daftar konfigurasi interpretasi berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/super-admin/tes-skrining/:id/interpretasi/:interpretasiId
 * Mengambil detail konfigurasi satu interpretasi (domain & kondisi pada L1, atau rentang skor pada L2).
 */
export async function getDetailInterpretasi(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");

    const tes = await prisma.tes_skrining.findUnique({
      where: { id: tesId },
      select: { id: true, level: true }
    });

    if (!tes) {
      throw AppError.notFound("Tes skrining tidak ditemukan.");
    }

    let data;
    if (tes.level === 1) {
      const { domainId, kondisi } = parseInterpretasiIdLevel1(
        req.params.interpretasiId,
        req.query.kondisi
      );
      data = await interpretasiService.getDetailInterpretasiLevel1(prisma, tesId, domainId, kondisi);
    } else {
      const rentangId = validasiIdNumerik(
        req.params.interpretasiId,
        "ID rentang penilaian tidak valid."
      );
      data = await interpretasiService.getDetailInterpretasiLevel2(prisma, tesId, rentangId);
    }

    return ApiResponse.success(res, {
      message: "Detail interpretasi berhasil dimuat.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/super-admin/tes-skrining/:id/interpretasi/:interpretasiId
 * PUT /api/super-admin/tes-skrining/:id/interpretasi/:interpretasiId
 * Memperbarui narasi interpretasi dan rekomendasi.
 */
export async function updateInterpretasi(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");

    const tes = await prisma.tes_skrining.findUnique({
      where: { id: tesId },
      select: { id: true, level: true }
    });

    if (!tes) {
      throw AppError.notFound("Tes skrining tidak ditemukan.");
    }

    let data;
    if (tes.level === 1) {
      const { domainId, kondisi } = parseInterpretasiIdLevel1(
        req.params.interpretasiId,
        req.query.kondisi,
        req.body?.kondisi
      );
      const payload = validasiUpdateInterpretasiLevel1(req.body, kondisi);
      data = await interpretasiService.updateInterpretasiLevel1(prisma, tesId, domainId, payload);
    } else {
      const rentangId = validasiIdNumerik(
        req.params.interpretasiId,
        "ID rentang penilaian tidak valid."
      );
      const payload = validasiUpdateInterpretasiLevel2(req.body);
      data = await interpretasiService.updateInterpretasiLevel2(prisma, tesId, rentangId, payload);
    }

    return ApiResponse.success(res, {
      message: "Interpretasi berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/super-admin/tes-skrining/:id/interpretasi/:interpretasiId
 * Mengosongkan narasi interpretasi dan rekomendasi (tanpa menghapus entitas domain/rentang).
 */
export async function resetInterpretasi(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");

    const tes = await prisma.tes_skrining.findUnique({
      where: { id: tesId },
      select: { id: true, level: true }
    });

    if (!tes) {
      throw AppError.notFound("Tes skrining tidak ditemukan.");
    }

    let data;
    if (tes.level === 1) {
      const { domainId, kondisi } = parseInterpretasiIdLevel1(
        req.params.interpretasiId,
        req.query.kondisi
      );
      data = await interpretasiService.resetInterpretasiLevel1(prisma, tesId, domainId, kondisi);
    } else {
      const rentangId = validasiIdNumerik(
        req.params.interpretasiId,
        "ID rentang penilaian tidak valid."
      );
      data = await interpretasiService.resetInterpretasiLevel2(prisma, tesId, rentangId);
    }

    return ApiResponse.success(res, {
      message: "Narasi interpretasi berhasil dikosongkan.",
      data
    });
  } catch (err) {
    next(err);
  }
}
