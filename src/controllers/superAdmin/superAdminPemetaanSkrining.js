/**
 * Controller Rute Super Admin - Tab Pemetaan Tes Skrining.
 * Mengorkestrasi respon API untuk daftar pemetaan domain, opsi kandidat Level 2,
 * dan pembaruan batch konfigurasi pemetaan instrumen.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import * as pemetaanService from "../../services/superAdmin/superAdminPemetaanSkrining.js";
import {
  validasiIdNumerik,
  validasiQueryDaftarPemetaan,
  validasiQueryOpsiTesLevel2,
  validasiUpdatePemetaan
} from "../../validators/superAdmin/superAdminPemetaanSkrining.js";

/**
 * GET /api/super-admin/tes-skrining/:id/pemetaan
 * Mengambil daftar pemetaan domain asesmen pada tes Level 1.
 */
export async function getDaftarPemetaan(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const query = validasiQueryDaftarPemetaan(req.query);

    const hasil = await pemetaanService.getDaftarPemetaan(prisma, tesId, query);

    return ApiResponse.success(res, {
      message: "Daftar pemetaan domain berhasil dimuat.",
      data: hasil.items,
      meta: {
        statistik: hasil.statistik,
        sifat_konfigurasi: hasil.sifat_konfigurasi,
        tes: hasil.tes
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/super-admin/tes-skrining/:id/pemetaan/opsi-tes-level-2
 * Mengambil daftar kandidat instrumen Level 2 yang dapat dipilih untuk form pemetaan.
 */
export async function getOpsiTesLevel2(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const query = validasiQueryOpsiTesLevel2(req.query);

    const hasil = await pemetaanService.getOpsiTesLevel2(prisma, tesId, query);

    return ApiResponse.success(res, {
      message: "Daftar opsi tes Level 2 berhasil dimuat.",
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
 * PATCH /api/super-admin/tes-skrining/:id/pemetaan
 * PUT /api/super-admin/tes-skrining/:id/pemetaan
 * Memperbarui pemetaan satu atau beberapa domain ke instrumen Level 2 secara atomik.
 */
export async function updatePemetaan(req, res, next) {
  try {
    const tesId = validasiIdNumerik(req.params.id, "ID tes skrining tidak valid.");
    const items = validasiUpdatePemetaan(req.body);

    const data = await pemetaanService.updatePemetaan(prisma, tesId, items);

    return ApiResponse.success(res, {
      message: "Pemetaan domain berhasil diperbarui.",
      data
    });
  } catch (err) {
    next(err);
  }
}
