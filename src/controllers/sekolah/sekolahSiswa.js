/**
 * Controller Rute Sekolah - Siswa.
 * sekolah_id selalu diambil dari token (req.user.id), tidak pernah dari body atau URL.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import * as siswaService from "../../services/sekolah/sekolahSiswa.js";
import {
  validasiIdSiswa,
  validasiQueryDaftarSiswa,
  validasiTambahSiswa,
  validasiUpdateSiswa
} from "../../validators/sekolah/sekolahSiswa.js";

/** GET /api/sekolah/siswa */
export async function getDaftarSiswa(req, res, next) {
  try {
    const params = validasiQueryDaftarSiswa(req.query);
    const hasil = await siswaService.getDaftarSiswa(prisma, req.user.id, params);
    return ApiResponse.success(res, {
      message: "Data siswa berhasil dimuat.",
      data: hasil.items,
      meta: { pagination: hasil.pagination }
    });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/sekolah/siswa/:id */
export async function getDetailSiswa(req, res, next) {
  try {
    const id = validasiIdSiswa(req.params.id);
    const data = await siswaService.getDetailSiswa(prisma, req.user.id, id);
    return ApiResponse.success(res, { message: "Detail siswa berhasil dimuat.", data });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/sekolah/siswa */
export async function tambahSiswa(req, res, next) {
  try {
    const masukan = validasiTambahSiswa(req.body);
    const data = await siswaService.tambahSiswa(prisma, req.user.id, masukan);
    return ApiResponse.success(res, { statusCode: 201, message: "Siswa berhasil ditambahkan.", data });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/sekolah/siswa/:id */
export async function updateSiswa(req, res, next) {
  try {
    const id = validasiIdSiswa(req.params.id);
    const masukan = validasiUpdateSiswa(req.body);
    const data = await siswaService.updateSiswa(prisma, req.user.id, id, masukan);
    return ApiResponse.success(res, { message: "Data siswa berhasil diperbarui.", data });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/sekolah/siswa/:id */
export async function hapusSiswa(req, res, next) {
  try {
    const id = validasiIdSiswa(req.params.id);
    await siswaService.hapusSiswa(prisma, req.user.id, id);
    return ApiResponse.success(res, { message: "Siswa berhasil dihapus." });
  } catch (err) {
    return next(err);
  }
}
