/**
 * Controller untuk Endpoint Skrining Publik (Orang Tua / Siswa).
 */

import ApiResponse from "../utils/apiResponse.js";
import { PublicScreeningValidator } from "../validators/publicScreeningValidator.js";
import { PublicScreeningService } from "../services/publicScreeningService.js";

export class PublicScreeningController {
  /**
   * POST /api/public/skrining/sesi/validasi (Layar 1 & 2)
   */
  static async validasiSesi(req, res, next) {
    try {
      const kodeSesi = PublicScreeningValidator.validateKodeSesi(req.body);
      const dataSesi = await PublicScreeningService.validasiSesi(kodeSesi);

      return ApiResponse.success(res, {
        message: "Informasi sesi skrining berhasil diverifikasi.",
        data: dataSesi
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/sesi/:kodeSesi/siswa?search=... (Layar 3)
   */
  static async cariSiswa(req, res, next) {
    try {
      const kodeSesi = PublicScreeningValidator.validateKodeSesi({ kodeSesi: req.params.kodeSesi });
      const query = PublicScreeningValidator.validateSearchQuery(req.query.search);

      const daftarSiswa = await PublicScreeningService.cariSiswa(kodeSesi, query);

      return ApiResponse.success(res, {
        message: "Data siswa berhasil ditemukan.",
        data: daftarSiswa
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/sesi/:kodeSesi/siswa/:idStudent (Layar 4)
   */
  static async konfirmasiSiswa(req, res, next) {
    try {
      const kodeSesi = PublicScreeningValidator.validateKodeSesi({ kodeSesi: req.params.kodeSesi });
      const idStudent = parseInt(req.params.idStudent, 10);

      const dataSiswa = await PublicScreeningService.konfirmasiSiswa(kodeSesi, idStudent);

      return ApiResponse.success(res, {
        message: "Konfirmasi data anak berhasil diperoleh.",
        data: dataSiswa
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/public/skrining/mulai (Layar 5 & 6)
   */
  static async mulaiSkrining(req, res, next) {
    try {
      const validatedPayload = PublicScreeningValidator.validateMulaiSkrining(req.body);
      const hasil = await PublicScreeningService.mulaiSkrining(validatedPayload);

      return ApiResponse.success(res, {
        statusCode: 201,
        message: hasil.message || "Persetujuan diterima. Sesi pengerjaan skrining siap dimulai.",
        data: hasil
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/:idHasil/pertanyaan (Layar 7)
   */
  static async getPertanyaanLevel1(req, res, next) {
    try {
      const idHasil = parseInt(req.params.idHasil, 10);
      const dataSoal = await PublicScreeningService.getPertanyaanLevel1(idHasil);

      return ApiResponse.success(res, {
        message: "Daftar pertanyaan skrining awal berhasil dimuat.",
        data: dataSoal
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/public/skrining/:idHasil/jawaban (Autosave Layar 7, 11, 15)
   */
  static async simpanJawaban(req, res, next) {
    try {
      const idHasil = parseInt(req.params.idHasil, 10);
      const { idPertanyaan, idOpsi } = PublicScreeningValidator.validateSimpanJawaban(req.body);

      const hasilSimpan = await PublicScreeningService.simpanJawaban(idHasil, idPertanyaan, idOpsi);

      return ApiResponse.success(res, {
        message: "Jawaban berhasil disimpan secara otomatis.",
        data: hasilSimpan
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/public/skrining/:idHasil/submit-level-1 (Layar 8 & 9)
   */
  static async submitLevel1(req, res, next) {
    try {
      const idHasil = parseInt(req.params.idHasil, 10);
      const hasilSubmit = await PublicScreeningService.submitLevel1(idHasil);

      return ApiResponse.success(res, {
        message: "Skrining awal berhasil dikirimkan.",
        data: hasilSubmit
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/:idHasil/tindak-lanjut (Layar 10, 14, 18)
   */
  static async getDashboardTindakLanjut(req, res, next) {
    try {
      const idHasil = parseInt(req.params.idHasil, 10);
      const dashboard = await PublicScreeningService.getDashboardTindakLanjut(idHasil);

      return ApiResponse.success(res, {
        message: "Status dashboard instrumen lanjutan berhasil dimuat.",
        data: dashboard
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/:idHasil/tindak-lanjut/:testId/pertanyaan (Layar 11, 15)
   */
  static async getPertanyaanInstrumenLanjutan(req, res, next) {
    try {
      const idHasil = parseInt(req.params.idHasil, 10);
      const testId = parseInt(req.params.testId, 10);

      const dataSoal = await PublicScreeningService.getPertanyaanInstrumenLanjutan(idHasil, testId);

      return ApiResponse.success(res, {
        message: `Daftar pertanyaan untuk ${dataSoal.namaTes} berhasil dimuat.`,
        data: dataSoal
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/public/skrining/:idHasil/tindak-lanjut/:testId/submit (Layar 12, 13, 16, 17)
   */
  static async submitInstrumenLanjutan(req, res, next) {
    try {
      const idHasil = parseInt(req.params.idHasil, 10);
      const testId = parseInt(req.params.testId, 10);

      const hasilSubmit = await PublicScreeningService.submitInstrumenLanjutan(idHasil, testId);

      return ApiResponse.success(res, {
        message: hasilSubmit.pesan,
        data: hasilSubmit
      });
    } catch (err) {
      next(err);
    }
  }
}
