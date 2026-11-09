/**
 * Custom Error Class untuk Penanganan Kesalahan Operasional Aplikasi.
 * Membawa kode status HTTP dan flag operational untuk middleware error handler.
 */

export default class AppError extends Error {
  /**
   * @param {string} message Pesan kesalahan
   * @param {number} [statusCode=500] Kode status HTTP
   * @param {*} [details=null] Detail data kesalahan tambahan
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Membuat instance AppError dengan kode 400 (Bad Request).
   * @param {string} message
   * @param {*} [details=null]
   * @returns {AppError}
   */
  static badRequest(message, details = null) {
    return new AppError(message, 400, details);
  }

  /**
  /**
   * Membuat instance AppError dengan kode 401 (Unauthorized).
   * @param {string} [message="Tidak terautentikasi."]
   * @param {*} [details=null]
   * @returns {AppError}
   */
  static unauthorized(message = "Tidak terautentikasi.", details = null) {
    return new AppError(message, 401, details);
  }

  /**
   * Membuat instance AppError dengan kode 403 (Forbidden).
   * @param {string} [message="Akses ditolak."]
   * @param {*} [details=null]
   * @returns {AppError}
   */
  static forbidden(message = "Akses ditolak.", details = null) {
    return new AppError(message, 403, details);
  }

  /**
   * Membuat instance AppError dengan kode 404 (Not Found).
   * @param {string} message
   * @param {*} [details=null]
   * @returns {AppError}
   */
  static notFound(message, details = null) {
    return new AppError(message, 404, details);
  }

  /**
   * Membuat instance AppError dengan kode 409 (Conflict).
   * @param {string} message
   * @returns {AppError}
   */
  static conflict(message) {
    return new AppError(message, 409);
  }
}
