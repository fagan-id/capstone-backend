/**
 * Controller Rute Sekolah - Kelas.
 * sekolah_id selalu diambil dari token (req.user.id), tidak pernah dari body atau URL.
 */

import ApiResponse from "../../utils/apiResponse.js";
import { prisma } from "../../lib/prisma.js";
import * as kelasService from "../../services/sekolah/sekolahKelas.js";
import {
  validasiIdKelas,
  validasiQueryDaftarKelas,
  validasiTambahKelas,
  validasiUpdateKelas
} from "../../validators/sekolah/sekolahKelas.js";

/** GET /api/sekolah/kelas */
export async function getDaftarKelas(req, res, next) {
  try {
    const filter = validasiQueryDaftarKelas(req.query);
    const data = await kelasService.getDaftarKelas(prisma, req.user.id, filter);
    return ApiResponse.success(res, { message: "Data kelas berhasil dimuat.", data });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/sekolah/kelas */
export async function tambahKelas(req, res, next) {
  try {
    const masukan = validasiTambahKelas(req.body);
    const data = await kelasService.tambahKelas(prisma, req.user.id, masukan);
    return ApiResponse.success(res, { statusCode: 201, message: "Kelas berhasil ditambahkan.", data });
  } catch (err) {
    return next(err);
  }
}

/** PATCH /api/sekolah/kelas/:id */
export async function updateKelas(req, res, next) {
  try {
    const id = validasiIdKelas(req.params.id);
    const masukan = validasiUpdateKelas(req.body);
    const data = await kelasService.updateKelas(prisma, req.user.id, id, masukan);
    return ApiResponse.success(res, { message: "Data kelas berhasil diperbarui.", data });
  } catch (err) {
    return next(err);
  }
}

/** DELETE /api/sekolah/kelas/:id */
export async function hapusKelas(req, res, next) {
  try {
    const id = validasiIdKelas(req.params.id);
    await kelasService.hapusKelas(prisma, req.user.id, id);
    return ApiResponse.success(res, { message: "Kelas berhasil dihapus." });
  } catch (err) {
    return next(err);
  }
}
