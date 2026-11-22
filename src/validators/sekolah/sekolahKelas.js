/**
 * Validator Masukan Rute Sekolah - Kelas.
 * Mengembalikan nilai yang sudah dirapikan untuk service.
 */

import AppError from "../../utils/appError.js";

const PESAN_TINGKAT = "Tingkat kelas harus bilangan bulat 1 sampai 6.";
const PESAN_TAHUN_AJARAN = "Tahun ajaran harus berformat YYYY/YYYY dengan tahun berurutan, contoh 2026/2027.";

/** @returns {string} */
function parseNama(nilai) {
  if (typeof nilai !== "string" || nilai.trim() === "") {
    throw AppError.badRequest("Nama kelas wajib diisi.");
  }
  const nama = nilai.trim();
  if (nama.length > 20) {
    throw AppError.badRequest("Nama kelas maksimal 20 karakter.");
  }
  return nama;
}

/** Tingkat SD saja (D2). @returns {number} */
function parseTingkat(nilai) {
  const angka = typeof nilai === "number" || (typeof nilai === "string" && nilai.trim() !== "") ? Number(nilai) : NaN;
  if (!Number.isInteger(angka) || angka < 1 || angka > 6) {
    throw AppError.badRequest(PESAN_TINGKAT);
  }
  return angka;
}

/** @returns {string} */
function parseTahunAjaran(nilai) {
  const cocok = typeof nilai === "string" ? /^(\d{4})\/(\d{4})$/.exec(nilai.trim()) : null;
  if (!cocok || Number(cocok[2]) !== Number(cocok[1]) + 1) {
    throw AppError.badRequest(PESAN_TAHUN_AJARAN);
  }
  return cocok[0];
}

const kosong = (nilai) => nilai === undefined || nilai === null || String(nilai).trim() === "";

/**
 * Validasi parameter URL :id kelas.
 * @returns {number}
 */
export function validasiIdKelas(nilai) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest("ID kelas tidak valid.");
  }
  return angka;
}

/**
 * Validasi query daftar kelas. Filter kosong diabaikan, filter salah ditolak.
 * @returns {{ tahun_ajaran?: string, tingkat?: number }}
 */
export function validasiQueryDaftarKelas(query = {}) {
  return {
    tahun_ajaran: kosong(query.tahun_ajaran) ? undefined : parseTahunAjaran(query.tahun_ajaran),
    tingkat: kosong(query.tingkat) ? undefined : parseTingkat(query.tingkat)
  };
}

/**
 * Validasi body tambah kelas. Semua field wajib.
 * @returns {{ nama: string, tingkat: number, tahun_ajaran: string }}
 */
export function validasiTambahKelas(body) {
  const data = body ?? {};
  return {
    nama: parseNama(data.nama),
    tingkat: parseTingkat(data.tingkat),
    tahun_ajaran: parseTahunAjaran(data.tahun_ajaran)
  };
}

/**
 * Validasi body ubah kelas. Hanya field yang dikirim yang divalidasi dan dikembalikan.
 * @returns {{ nama?: string, tingkat?: number, tahun_ajaran?: string }}
 */
export function validasiUpdateKelas(body) {
  const data = body ?? {};
  const hasil = {};
  if (data.nama !== undefined) hasil.nama = parseNama(data.nama);
  if (data.tingkat !== undefined) hasil.tingkat = parseTingkat(data.tingkat);
  if (data.tahun_ajaran !== undefined) hasil.tahun_ajaran = parseTahunAjaran(data.tahun_ajaran);
  return hasil;
}
