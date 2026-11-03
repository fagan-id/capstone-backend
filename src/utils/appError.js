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
   * Membuat instance AppError dengan kode 409 (Conflict).
   * @param {string} message
   * @returns {AppError}
   */
  static conflict(message) {
    return new AppError(message, 409);
  }
}
