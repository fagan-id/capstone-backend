/**
 * Validator Query Dashboard Super Admin.
 * Memvalidasi parameter pagination dan filter aktivitas.
 */

import AppError from "../../utils/appError.js";

/**
 * Validasi parameter query untuk endpoint Dashboard Super Admin.
 *
 * @param {Record<string, any>} query
 * @returns {{
 *   page: number,
 *   limit: number,
 *   kategori?: string
 * }}
 */
export function validasiQueryDashboard(query = {}) {
  let page = 1;
  let limit = 5; // Default 5 data per halaman sesuai tampilan referensi (Menampilkan 1-5 dari X data)

  if (query.page !== undefined && query.page !== null && String(query.page).trim() !== "") {
    const p = Number(query.page);
    if (!Number.isInteger(p) || p <= 0) {
      throw AppError.badRequest("Parameter 'page' harus berupa bilangan bulat positif.");
    }
    page = p;
  }

  if (query.limit !== undefined && query.limit !== null && String(query.limit).trim() !== "") {
    const l = Number(query.limit);
    if (!Number.isInteger(l) || l <= 0) {
      throw AppError.badRequest("Parameter 'limit' harus berupa bilangan bulat positif.");
    }
    limit = Math.min(l, 50); // Batas maksimal 50 data per halaman
  }

  let kategori;
  if (query.kategori !== undefined && query.kategori !== null && String(query.kategori).trim() !== "") {
    const k = String(query.kategori).trim().toLowerCase();
    const allowed = ["semua", "sekolah", "tes", "sesi"];
    if (!allowed.includes(k)) {
      throw AppError.badRequest(`Kategori filter '${query.kategori}' tidak valid. Pilihan: semua, sekolah, tes, sesi.`);
    }
    if (k !== "semua") {
      kategori = k;
    }
  }

  return { page, limit, kategori };
}
