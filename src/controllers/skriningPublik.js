/**
 * Controller Alur Skrining Publik (Orang Tua / Wali).
 * Tanpa login: setiap masukan diperiksa validator lebih dulu, dan percobaan dialamatkan lewat token.
 */

import ApiResponse from "../utils/apiResponse.js";
import { prisma } from "../lib/prisma.js";
import * as layanan from "../services/skriningPublik.js";
import {
  validasiKode,
  validasiKataKunci,
  validasiToken,
  validasiIdAngka,
  validasiMulai,
  validasiJawaban
} from "../validators/skriningPublik.js";

/** POST /api/public/skrining/sesi/validasi */
export async function validasiSesi(req, res, next) {
  try {
    const data = await layanan.validasiSesi(prisma, validasiKode(req.body));
    return ApiResponse.success(res, { message: "Sesi skrining berhasil diverifikasi.", data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/public/skrining/sesi/:kode/siswa?search=... */
export async function cariSiswa(req, res, next) {
  try {
    const kode = validasiKode({ kode: req.params.kode });
    const kataKunci = validasiKataKunci(req.query.search);

    const data = await layanan.cariSiswa(prisma, kode, kataKunci);
    return ApiResponse.success(res, { message: "Pencarian data anak selesai.", data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/public/skrining/sesi/:kode/siswa/:siswa_id */
export async function konfirmasiSiswa(req, res, next) {
  try {
    const kode = validasiKode({ kode: req.params.kode });
    const siswa_id = validasiIdAngka(req.params.siswa_id, "siswa_id");

    const data = await layanan.konfirmasiSiswa(prisma, kode, siswa_id);
    return ApiResponse.success(res, { message: "Data anak berhasil dikonfirmasi.", data });
  } catch (err) {
    next(err);
  }
}

/** POST /api/public/skrining/mulai */
export async function mulaiSkrining(req, res, next) {
  try {
    const data = await layanan.mulaiSkrining(prisma, validasiMulai(req.body));
    return ApiResponse.success(res, {
      statusCode: 201,
      message: "Persetujuan tercatat. Pengisian skrining siap dimulai.",
      data
    });
  } catch (err) {
    next(err);
  }
}

/** GET /api/public/skrining/:token/pertanyaan */
export async function getPertanyaanLevel1(req, res, next) {
  try {
    const data = await layanan.getPertanyaanLevel1(prisma, validasiToken(req.params.token));
    return ApiResponse.success(res, { message: "Pertanyaan skrining awal berhasil dimuat.", data });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/public/skrining/:token/jawaban */
export async function simpanJawaban(req, res, next) {
  try {
    const token = validasiToken(req.params.token);
    const data = await layanan.simpanJawaban(prisma, token, validasiJawaban(req.body));

    return ApiResponse.success(res, { message: "Jawaban tersimpan.", data });
  } catch (err) {
    next(err);
  }
}

/** POST /api/public/skrining/:token/submit-level-1 */
export async function submitLevel1(req, res, next) {
  try {
    const data = await layanan.submitLevel1(prisma, validasiToken(req.params.token));
    return ApiResponse.success(res, { message: data.pesan, data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/public/skrining/:token/tindak-lanjut */
export async function getDashboardTindakLanjut(req, res, next) {
  try {
    const data = await layanan.getDashboardTindakLanjut(prisma, validasiToken(req.params.token));
    return ApiResponse.success(res, { message: "Status bagian lanjutan berhasil dimuat.", data });
  } catch (err) {
    next(err);
  }
}

/** GET /api/public/skrining/:token/tindak-lanjut/:tes_skrining_id/pertanyaan */
export async function getPertanyaanLanjutan(req, res, next) {
  try {
    const token = validasiToken(req.params.token);
    const tes_skrining_id = validasiIdAngka(req.params.tes_skrining_id, "tes_skrining_id");

    const data = await layanan.getPertanyaanLanjutan(prisma, token, tes_skrining_id);
    return ApiResponse.success(res, { message: `Pertanyaan ${data.label} berhasil dimuat.`, data });
  } catch (err) {
    next(err);
  }
}

/** POST /api/public/skrining/:token/tindak-lanjut/:tes_skrining_id/submit */
export async function submitLanjutan(req, res, next) {
  try {
    const token = validasiToken(req.params.token);
    const tes_skrining_id = validasiIdAngka(req.params.tes_skrining_id, "tes_skrining_id");

    const data = await layanan.submitLanjutan(prisma, token, tes_skrining_id);
    return ApiResponse.success(res, { message: data.pesan, data });
  } catch (err) {
    next(err);
  }
}
