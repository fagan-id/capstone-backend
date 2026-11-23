/**
 * Validator Masukan Rute Sekolah - Siswa.
 * Mengembalikan nilai yang sudah dirapikan untuk service.
 */

import AppError from "../../utils/appError.js";
import { validasiIdKelas } from "./sekolahKelas.js";

const PESAN_TANGGAL = "Tanggal lahir harus berformat YYYY-MM-DD dan merupakan tanggal yang valid.";
const WIB_MS = 7 * 60 * 60 * 1000;

/** NISN dikirim sebagai string agar nol di depan tidak hilang. @returns {string} */
function parseNisn(nilai) {
  const nisn = typeof nilai === "string" ? nilai.trim() : "";
  if (!/^\d{10}$/.test(nisn)) {
    throw AppError.badRequest("NISN harus terdiri dari 10 digit angka.");
  }
  return nisn;
}

/** @returns {string} */
function parseNama(nilai) {
  if (typeof nilai !== "string" || nilai.trim() === "") {
    throw AppError.badRequest("Nama siswa wajib diisi.");
  }
  const nama = nilai.trim();
  if (nama.length < 3) throw AppError.badRequest("Nama siswa minimal 3 karakter.");
  if (nama.length > 150) throw AppError.badRequest("Nama siswa maksimal 150 karakter.");
  return nama;
}

/**
 * Tanggal kalender tanpa jam, disimpan sebagai tengah malam UTC (kolom @db.Date).
 * "Masa depan" dihitung terhadap tanggal hari ini menurut WIB.
 * @returns {Date}
 */
function parseTanggalLahir(nilai, sekarang) {
  const cocok = typeof nilai === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(nilai.trim()) : null;
  if (!cocok) throw AppError.badRequest(PESAN_TANGGAL);

  const tanggal = new Date(Date.UTC(Number(cocok[1]), Number(cocok[2]) - 1, Number(cocok[3])));
  // Menolak tanggal yang digeser Date, misalnya 2017-02-30 menjadi 2 Maret.
  if (tanggal.toISOString().slice(0, 10) !== cocok[0]) throw AppError.badRequest(PESAN_TANGGAL);

  const hariIniWib = new Date(sekarang.getTime() + WIB_MS).toISOString().slice(0, 10);
  if (cocok[0] > hariIniWib) throw AppError.badRequest("Tanggal lahir tidak boleh di masa depan.");
  return tanggal;
}

/** @returns {"L" | "P"} */
function parseJenisKelamin(nilai) {
  const jk = typeof nilai === "string" ? nilai.trim().toUpperCase() : "";
  if (jk !== "L" && jk !== "P") throw AppError.badRequest("Jenis kelamin harus L atau P.");
  return jk;
}

/**
 * Validasi parameter URL :id siswa.
 * @returns {number}
 */
export function validasiIdSiswa(nilai) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest("ID siswa tidak valid.");
  }
  return angka;
}

/**
 * Validasi query daftar siswa. Paginasi yang salah kembali ke default (sama dengan daftar sekolah),
 * kelas_id yang salah ditolak.
 * @returns {{ page: number, limit: number, search?: string, kelas_id?: number }}
 */
export function validasiQueryDaftarSiswa(query = {}) {
  let page = Number(query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  const search = typeof query.search === "string" && query.search.trim() !== "" ? query.search.trim() : undefined;

  const kosong = query.kelas_id === undefined || String(query.kelas_id).trim() === "";
  const kelas_id = kosong ? undefined : validasiIdKelas(query.kelas_id);

  return { page, limit, search, kelas_id };
}

/**
 * Validasi body tambah siswa. Semua field wajib.
 * @param {object} body
 * @param {Date} [sekarang] Disuntikkan oleh test.
 */
export function validasiTambahSiswa(body, sekarang = new Date()) {
  const data = body ?? {};
  return {
    nisn: parseNisn(data.nisn),
    nama: parseNama(data.nama),
    tanggal_lahir: parseTanggalLahir(data.tanggal_lahir, sekarang),
    jenis_kelamin: parseJenisKelamin(data.jenis_kelamin),
    kelas_id: validasiIdKelas(data.kelas_id)
  };
}

/**
 * Validasi body ubah siswa. Hanya field yang dikirim yang divalidasi dan dikembalikan.
 * @param {object} body
 * @param {Date} [sekarang] Disuntikkan oleh test.
 */
export function validasiUpdateSiswa(body, sekarang = new Date()) {
  const data = body ?? {};
  const hasil = {};
  if (data.nisn !== undefined) hasil.nisn = parseNisn(data.nisn);
  if (data.nama !== undefined) hasil.nama = parseNama(data.nama);
  if (data.tanggal_lahir !== undefined) hasil.tanggal_lahir = parseTanggalLahir(data.tanggal_lahir, sekarang);
  if (data.jenis_kelamin !== undefined) hasil.jenis_kelamin = parseJenisKelamin(data.jenis_kelamin);
  if (data.kelas_id !== undefined) hasil.kelas_id = validasiIdKelas(data.kelas_id);
  return hasil;
}
