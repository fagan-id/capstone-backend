/**
 * Validator Masukan Rute Sekolah - Sesi Skrining.
 * Mengembalikan nilai yang sudah dirapikan untuk service.
 */

import AppError from "../../utils/appError.js";

/** @returns {string} */
function parseNama(nilai) {
  if (typeof nilai !== "string" || nilai.trim() === "") {
    throw AppError.badRequest("Nama sesi skrining wajib diisi.");
  }
  const nama = nilai.trim();
  if (nama.length < 3) throw AppError.badRequest("Nama sesi skrining minimal 3 karakter.");
  if (nama.length > 150) throw AppError.badRequest("Nama sesi skrining maksimal 150 karakter.");
  return nama;
}

/**
 * Validasi parameter URL :id sesi.
 * @returns {number}
 */
export function validasiIdSesi(nilai) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest("ID sesi skrining tidak valid.");
  }
  return angka;
}

/**
 * Validasi query daftar sesi. Paginasi yang salah kembali ke default, status yang salah ditolak.
 * @returns {{ page: number, limit: number, status?: "aktif" | "selesai" }}
 */
export function validasiQueryDaftarSesi(query = {}) {
  let page = Number(query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  const kosong = query.status === undefined || String(query.status).trim() === "";
  const status = kosong ? undefined : String(query.status).trim();
  if (status !== undefined && status !== "aktif" && status !== "selesai") {
    throw AppError.badRequest("Status sesi harus aktif atau selesai.");
  }

  return { page, limit, status };
}

/**
 * Validasi body buat sesi.
 * @returns {{ nama: string, tes_skrining_id: number }}
 */
export function validasiTambahSesi(body) {
  const data = body ?? {};
  const tes_skrining_id = Number(data.tes_skrining_id);
  if (!Number.isInteger(tes_skrining_id) || tes_skrining_id < 1) {
    throw AppError.badRequest("Tes skrining wajib dipilih.");
  }
  return { nama: parseNama(data.nama), tes_skrining_id };
}

/**
 * Validasi body ubah sesi. Hanya nama yang boleh berubah; tes dan status ditolak, bukan diabaikan.
 * @returns {{ nama: string }}
 */
export function validasiUpdateSesi(body) {
  const data = body ?? {};
  const lain = Object.keys(data).filter((k) => k !== "nama");
  if (lain.length > 0) {
    throw AppError.badRequest(`Field ${lain.join(", ")} tidak dapat diubah. Hanya nama sesi yang dapat diubah.`);
  }
  return { nama: parseNama(data.nama) };
}
