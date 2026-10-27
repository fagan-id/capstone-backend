/**
 * Helper Standar Format Respon REST API.
 * Menjamin keseragaman struktur JSON pada setiap respon HTTP.
 */

export default class ApiResponse {
  /**
   * Mengirim respon HTTP sukses terstandarisasi.
   *
   * @param {import("express").Response} res Objek Express response
   * @param {object} options
   * @param {*} [options.data=null] Payload data yang dikembalikan
   * @param {string} [options.message="Sukses"] Pesan status yang deskriptif
   * @param {number} [options.statusCode=200] Kode status HTTP (200, 201, dsb.)
   * @param {object} [options.meta={}] Metadata tambahan (misal info paginasi)
   * @returns {import("express").Response}
   */
  static success(res, { data = null, message = "Sukses", statusCode = 200, meta = {} } = {}) {
    const payload = {
      success: true,
      message,
      ...(meta || {})
    };

    if (data !== null && data !== undefined) {
      payload.data = data;
    }

    return res.status(statusCode).json(payload);
  }

  /**
   * Mengirim respon HTTP error terstandarisasi.
   *
   * @param {import("express").Response} res Objek Express response
   * @param {object} options
   * @param {string} [options.message="Terjadi kesalahan"] Pesan error ramah pengguna
   * @param {number} [options.statusCode=500] Kode status HTTP (400, 401, 403, 404, 500)
   * @param {*} [options.details=null] Detail error teknis / validasi
   * @returns {import("express").Response}
   */
  static error(res, { message = "Terjadi kesalahan", statusCode = 500, details = null } = {}) {
    const payload = {
      success: false,
      message
    };

    if (details) {
      payload.details = details;
    }

    return res.status(statusCode).json(payload);
  }
}
