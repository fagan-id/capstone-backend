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
   * Menyimpan kontak orang tua & consent, mengembalikan idTest tanpa membuat baris prematur di hasil_skrining.
   */
  static async mulaiSkrining(req, res, next) {
    try {
      const validatedPayload = PublicScreeningValidator.validateMulaiSkrining(req.body);
      const hasil = await PublicScreeningService.mulaiSkrining(validatedPayload);

      return ApiResponse.success(res, {
        statusCode: 200,
        message: hasil.message || "Persetujuan diterima. Sesi pengerjaan skrining siap dimulai.",
        data: hasil
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/tes/:idTest/pertanyaan (Layar 7, 11, 15)
   * Memuat pertanyaan dan opsi jawaban berdasarkan idTest.
   */
  static async getPertanyaanByTestId(req, res, next) {
    try {
      const idTest = PublicScreeningValidator.validateTestId(req.params.idTest);
      const dataSoal = await PublicScreeningService.getPertanyaanByTestId(idTest);

      return ApiResponse.success(res, {
        message: `Daftar pertanyaan untuk ${dataSoal.namaTes} berhasil dimuat.`,
        data: dataSoal
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/public/skrining/submit (Layar 8, 12, 16)
   * Mengirim jawaban lengkap, menghitung skor, menentukan kesimpulan indikasi,
   * dan mencatat ke tabel hasil_skrining.
   */
  static async submitSkrining(req, res, next) {
    try {
      const payload = PublicScreeningValidator.validateSubmitSkrining(req.body);
      const hasil = await PublicScreeningService.submitSkrining(payload);

      return ApiResponse.success(res, {
        statusCode: 201,
        message: hasil.pesan,
        data: hasil
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/tindak-lanjut (Layar 10, 14, 18)
   * Menampilkan status progress instrumen lanjutan.
   */
  static async getDashboardTindakLanjut(req, res, next) {
    try {
      const { kodeSesi, studentId, idHasil } = {
        kodeSesi: req.query.kodeSesi || req.params.kodeSesi,
        studentId: parseInt(req.query.studentId || req.params.studentId, 10),
        idHasil: parseInt(req.params.idHasil, 10)
      };

      const dashboard = await PublicScreeningService.getDashboardTindakLanjut({ kodeSesi, studentId, idHasil });

      return ApiResponse.success(res, {
        message: "Status dashboard instrumen lanjutan berhasil dimuat.",
        data: dashboard
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/public/skrining/:idHasil/pertanyaan (Fallback / Legacy)
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
   * PUT /api/public/skrining/:idHasil/jawaban (Autosave jika attempt terdaftar)
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
   * POST /api/public/skrining/:idHasil/submit-level-1 (Fallback / Legacy)
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
   * GET /api/public/skrining/:idHasil/tindak-lanjut/:testId/pertanyaan (Fallback)
   */
  static async getPertanyaanInstrumenLanjutan(req, res, next) {
    try {
      const testId = parseInt(req.params.testId, 10);
      const dataSoal = await PublicScreeningService.getPertanyaanByTestId(testId);

      return ApiResponse.success(res, {
        message: `Daftar pertanyaan untuk ${dataSoal.namaTes} berhasil dimuat.`,
        data: dataSoal
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/public/skrining/:idHasil/tindak-lanjut/:testId/submit (Fallback)
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
