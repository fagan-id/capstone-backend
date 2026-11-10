/**
 * Validator Masukan Alur Skrining Publik.
 * Rute ini tanpa login, jadi seluruh masukan dari peserta diperiksa di sini sebelum masuk layanan.
 */

import AppError from "../../utils/appError.js";

const HUBUNGAN = ["orang_tua", "wali", "lainnya"];
const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Mengambil teks wajib yang sudah dirapikan.
 * @param {*} nilai
 * @param {string} pesan
 * @returns {string}
 */
function teksWajib(nilai, pesan) {
  if (typeof nilai !== "string" || nilai.trim() === "") throw AppError.badRequest(pesan);
  return nilai.trim();
}

/**
 * Kode sesi dari body atau params.
 * @param {object} body
 * @returns {string}
 */
export function validasiKode(body) {
  return teksWajib(body?.kode, "Kode sesi wajib diisi.").toUpperCase();
}

/**
 * Kata kunci pencarian nama siswa.
 * @param {*} kataKunci
 * @returns {string}
 */
export function validasiKataKunci(kataKunci) {
  const bersih = teksWajib(kataKunci, "Kata kunci pencarian nama anak minimal 3 karakter.");
  if (bersih.length < 3) throw AppError.badRequest("Kata kunci pencarian nama anak minimal 3 karakter.");
  return bersih;
}

/**
 * Token percobaan. Harus UUID agar tidak bisa ditebak dengan menghitung.
 * @param {*} token
 * @returns {string}
 */
export function validasiToken(token) {
  const bersih = teksWajib(token, "Tautan pengerjaan tidak valid.");
  if (!POLA_UUID.test(bersih)) throw AppError.badRequest("Tautan pengerjaan tidak valid.");
  return bersih;
}

/**
 * Id numerik positif.
 * @param {*} nilai
 * @param {string} nama
 * @returns {number}
 */
export function validasiIdAngka(nilai, nama) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) throw AppError.badRequest(`Nilai ${nama} tidak valid.`);
  return angka;
}

/**
 * Masukan layar persetujuan dan data responden.
 * @param {object} body
 */
export function validasiMulai(body) {
  const data = body ?? {};

  const hubungan = teksWajib(data.hubungan_responden, "Hubungan dengan anak wajib dipilih.").toLowerCase();
  if (!HUBUNGAN.includes(hubungan)) {
    throw AppError.badRequest(`Hubungan dengan anak harus salah satu dari: ${HUBUNGAN.join(", ")}.`);
  }

  if (data.persetujuan !== true && data.persetujuan !== "true") {
    throw AppError.badRequest("Anda harus membaca dan menyetujui lembar informasi skrining terlebih dahulu.");
  }

  const nomor = teksWajib(data.nomor_hp_responden, "Nomor HP/WhatsApp wajib diisi.");
  // Hanya angka, spasi, tanda hubung, dan awalan + agar nomor tetap bisa dihubungi sekolah.
  if (!/^\+?[0-9][0-9\s-]{6,}$/.test(nomor)) {
    throw AppError.badRequest("Nomor HP/WhatsApp hanya boleh berisi angka.");
  }

  return {
    kode: validasiKode(data),
    siswa_id: validasiIdAngka(data.siswa_id, "siswa_id"),
    nama_responden: teksWajib(data.nama_responden, "Nama lengkap orang tua/wali wajib diisi."),
    nomor_hp_responden: nomor,
    hubungan_responden: hubungan,
    persetujuan: true
  };
}

/**
 * Masukan autosave satu jawaban.
 * @param {object} body
 */
export function validasiJawaban(body) {
  const data = body ?? {};

  return {
    pertanyaan_id: validasiIdAngka(data.pertanyaan_id, "pertanyaan_id"),
    opsi_jawaban_id: validasiIdAngka(data.opsi_jawaban_id, "opsi_jawaban_id")
  };
}
