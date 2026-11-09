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
    const { kodeSesi, namaOrangTua, nomorHp, hubungan, persetujuan } = body || {};
    const rawStudentId = body?.studentId ?? body?.idStudent;

    if (!kodeSesi || typeof kodeSesi !== "string" || !kodeSesi.trim()) {
      throw AppError.badRequest("Kode sesi wajib diisi.");
    }

    const parsedStudentId = parseInt(rawStudentId, 10);
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
    const rawPertanyaanId = body?.idPertanyaan ?? body?.pertanyaanId;
    const rawOpsiId = body?.idOpsi ?? body?.opsiId;

    const parsedPertanyaanId = parseInt(rawPertanyaanId, 10);
    const parsedOpsiId = parseInt(rawOpsiId, 10);

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

  /**
   * Validasi parameter idTest.
   * @param {*} testId
   */
  static validateTestId(testId) {
    const parsed = parseInt(testId, 10);
    if (!parsed || isNaN(parsed)) {
      throw AppError.badRequest("Parameter idTest tidak valid.");
    }
    return parsed;
  }

  /**
   * Validasi pengiriman jawaban lengkap tes skrining (Level 1 atau Level 2).
   * @param {object} body
   */
  static validateSubmitSkrining(body) {
    const kodeSesi = body?.kodeSesi;
    const rawStudentId = body?.studentId ?? body?.idStudent;
    const rawTestId = body?.testId ?? body?.idTest;
    const jawaban = body?.jawaban;

    if (!kodeSesi || typeof kodeSesi !== "string" || !kodeSesi.trim()) {
      throw AppError.badRequest("Kode sesi wajib diisi.");
    }

    const parsedStudentId = parseInt(rawStudentId, 10);
    if (!parsedStudentId || isNaN(parsedStudentId)) {
      throw AppError.badRequest("ID siswa tidak valid.");
    }

    const parsedTestId = parseInt(rawTestId, 10);
    if (!parsedTestId || isNaN(parsedTestId)) {
      throw AppError.badRequest("ID tes (idTest) tidak valid.");
    }

    if (!Array.isArray(jawaban) || jawaban.length === 0) {
      throw AppError.badRequest("Daftar jawaban harus berupa array dan tidak boleh kosong.");
    }

    const formattedJawaban = jawaban.map((item, index) => {
      const idPertanyaan = parseInt(item?.idPertanyaan ?? item?.pertanyaanId, 10);
      const idOpsi = parseInt(item?.idOpsi ?? item?.opsiId, 10);
      if (!idPertanyaan || isNaN(idPertanyaan) || !idOpsi || isNaN(idOpsi)) {
        throw AppError.badRequest(`Jawaban pada indeks ${index} memiliki format tidak valid.`);
      }
      return { idPertanyaan, idOpsi };
    });

    return {
      kodeSesi: kodeSesi.trim().toUpperCase(),
      studentId: parsedStudentId,
      testId: parsedTestId,
      responden: body?.responden || null,
      jawaban: formattedJawaban
    };
  }
}
