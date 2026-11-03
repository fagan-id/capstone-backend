/**
 * Validator Input untuk Alur Skrining Publik (Orang Tua / Siswa).
 */

import AppError from "../utils/appError.js";

export class PublicScreeningValidator {
  /**
   * Validasi payload verifikasi kode sesi (Layar 1).
   * @param {object} body
   */
  static validateKodeSesi(body) {
    if (!body || typeof body.kodeSesi !== "string" || !body.kodeSesi.trim()) {
      throw AppError.badRequest("Kode sesi wajib diisi.");
    }
    return body.kodeSesi.trim().toUpperCase();
  }

  /**
   * Validasi query pencarian siswa (Layar 3).
   * @param {string} search
   */
  static validateSearchQuery(search) {
    if (!search || typeof search !== "string" || search.trim().length < 3) {
      throw AppError.badRequest("Kata kunci pencarian nama siswa minimal 3 karakter.");
    }
    return search.trim();
  }

  /**
   * Validasi pendaftaran orang tua / mulai skrining (Layar 5 & 6).
   * @param {object} body
   */
  static validateMulaiSkrining(body) {
    const { kodeSesi, studentId, namaOrangTua, nomorHp, hubungan, persetujuan } = body || {};

    if (!kodeSesi || typeof kodeSesi !== "string" || !kodeSesi.trim()) {
      throw AppError.badRequest("Kode sesi wajib diisi.");
    }

    const parsedStudentId = parseInt(studentId, 10);
    if (!parsedStudentId || isNaN(parsedStudentId)) {
      throw AppError.badRequest("ID siswa tidak valid.");
    }

    if (!namaOrangTua || typeof namaOrangTua !== "string" || !namaOrangTua.trim()) {
      throw AppError.badRequest("Nama lengkap orang tua/wali wajib diisi.");
    }

    if (!nomorHp || typeof nomorHp !== "string" || !nomorHp.trim()) {
      throw AppError.badRequest("Nomor HP/WhatsApp orang tua/wali wajib diisi.");
    }

    const hubunganValid = ["orang_tua", "wali", "lainnya"];
    const formattedHubungan = (hubungan || "").trim().toLowerCase();
    if (!hubunganValid.includes(formattedHubungan)) {
      throw AppError.badRequest("Hubungan dengan anak harus berupa salah satu dari: orang_tua, wali, lainnya.");
    }

    if (persetujuan !== true && persetujuan !== "true") {
      throw AppError.badRequest("Anda harus membaca dan menyetujui lembar informasi skrining terlebih dahulu.");
    }

    return {
      kodeSesi: kodeSesi.trim().toUpperCase(),
      studentId: parsedStudentId,
      namaOrangTua: namaOrangTua.trim(),
      nomorHp: nomorHp.trim(),
      hubungan: formattedHubungan,
      persetujuan: true
    };
  }

  /**
   * Validasi penyimpanan jawaban butir soal (Layar 7, 11, 15).
   * @param {object} body
   */
  static validateSimpanJawaban(body) {
    const { idPertanyaan, idOpsi } = body || {};

    const parsedPertanyaanId = parseInt(idPertanyaan, 10);
    const parsedOpsiId = parseInt(idOpsi, 10);

    if (!parsedPertanyaanId || isNaN(parsedPertanyaanId)) {
      throw AppError.badRequest("ID pertanyaan tidak valid.");
    }

    if (!parsedOpsiId || isNaN(parsedOpsiId)) {
      throw AppError.badRequest("ID opsi jawaban tidak valid.");
    }

    return {
      idPertanyaan: parsedPertanyaanId,
      idOpsi: parsedOpsiId
    };
  }
}
