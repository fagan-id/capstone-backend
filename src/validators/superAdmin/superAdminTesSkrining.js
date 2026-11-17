/**
 * Validator Masukan Rute Super Admin - Manajemen Tes Skrining.
 * Memastikan semua data yang dikirimkan klien valid sebelum diproses oleh service.
 */

import AppError from "../../utils/appError.js";

/**
 * Mengambil teks wajib yang sudah dirapikan.
 * @param {*} nilai
 * @param {string} pesan
 * @returns {string}
 */
function teksWajib(nilai, pesan) {
  if (typeof nilai !== "string" || nilai.trim() === "") {
    throw AppError.badRequest(pesan);
  }
  return nilai.trim();
}

/**
 * Validasi ID numerik positif untuk parameter URL (id tes skrining).
 * @param {*} nilai
 * @returns {number}
 */
export function validasiIdTesSkrining(nilai) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest("ID tes skrining tidak valid.");
  }
  return angka;
}

/**
 * Validasi query string untuk daftar tes skrining (paginasi, pencarian, filter, dan sorting).
 * @param {object} query
 * @returns {{
 *   page: number,
 *   limit: number,
 *   search?: string,
 *   level?: number,
 *   status?: boolean,
 *   sortBy: "nama" | "level" | "created_at" | "jumlah_pertanyaan",
 *   sortOrder: "asc" | "desc"
 * }}
 */
export function validasiQueryDaftarTesSkrining(query = {}) {
  let page = Number(query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  let search = undefined;
  if (typeof query.search === "string" && query.search.trim() !== "") {
    search = query.search.trim();
  }

  let level = undefined;
  if (query.level !== undefined && query.level !== null && String(query.level).trim() !== "") {
    const lvl = Number(query.level);
    if (lvl === 1 || lvl === 2) {
      level = lvl;
    } else {
      throw AppError.badRequest("Filter level hanya boleh bernilai 1 atau 2.");
    }
  }

  let status = undefined;
  if (typeof query.status === "string") {
    const s = query.status.trim().toLowerCase();
    if (s === "aktif" || s === "true" || s === "1") status = true;
    else if (s === "nonaktif" || s === "false" || s === "0") status = false;
  } else if (typeof query.status === "boolean") {
    status = query.status;
  }

  const validSortBy = ["nama", "level", "created_at", "jumlah_pertanyaan"];
  const sortBy = validSortBy.includes(query.sortBy) ? query.sortBy : "created_at";

  let sortOrder = "desc";
  if (typeof query.sortOrder === "string") {
    const o = query.sortOrder.trim().toLowerCase();
    if (o === "asc" || o === "desc") sortOrder = o;
  } else if (sortBy === "nama" || sortBy === "level") {
    sortOrder = "asc";
  }

  return { page, limit, search, level, status, sortBy, sortOrder };
}

/**
 * Validasi masukan untuk membuat tes skrining baru (POST).
 * Sesuai modal dialog Tambah Tes Skrining (Level 1 & Level 2):
 * - Level * (wajib: 1 atau 2)
 * - Nama Tes * (wajib, 3-150 karakter)
 * - Deskripsi * (wajib)
 * - Status Tes (opsional, default: true)
 * - Jenjang (opsional, default: "SD")
 * - Nama Domain / kategori_asesmen_id (wajib jika Level 2)
 *
 * @param {object} body
 */
export function validasiTambahTesSkrining(body = {}) {
  const data = body ?? {};

  // 1. Validasi Level (wajib: 1 atau 2)
  if (data.level === undefined || data.level === null) {
    throw AppError.badRequest("Level tes skrining wajib diisi (1 atau 2).");
  }
  const level = Number(data.level);
  if (level !== 1 && level !== 2) {
    throw AppError.badRequest("Level tes skrining hanya boleh bernilai 1 atau 2.");
  }

  // 2. Validasi Nama Tes
  const nama = teksWajib(data.nama, "Nama tes skrining wajib diisi.");
  if (nama.length < 3) {
    throw AppError.badRequest("Nama tes skrining minimal 3 karakter.");
  }
  if (nama.length > 150) {
    throw AppError.badRequest("Nama tes skrining maksimal 150 karakter.");
  }

  // 3. Validasi Deskripsi
  const deskripsi = teksWajib(data.deskripsi, "Deskripsi tes skrining wajib diisi.");

  // 4. Validasi Jenjang (opsional, default "SD")
  let jenjang = "SD";
  if (data.jenjang !== undefined && data.jenjang !== null && String(data.jenjang).trim() !== "") {
    jenjang = String(data.jenjang).trim();
    if (jenjang.length > 50) {
      throw AppError.badRequest("Jenjang maksimal 50 karakter.");
    }
  }

  // 5. Validasi Status Aktif (opsional, default true)
  let aktif = true;
  if (data.aktif !== undefined) {
    if (typeof data.aktif === "boolean") {
      aktif = data.aktif;
    } else if (typeof data.aktif === "string") {
      const a = data.aktif.trim().toLowerCase();
      aktif = a === "true" || a === "1" || a === "aktif";
    }
  }

  // 6. Validasi Kategori Asesmen / Domain khusus Level 2
  let kategori_asesmen_id = undefined;
  if (level === 2) {
    const rawKatId = data.kategori_asesmen_id ?? data.kategori_id ?? data.domain_id;
    if (rawKatId === undefined || rawKatId === null || String(rawKatId).trim() === "") {
      throw AppError.badRequest("Nama domain (kategori asesmen) wajib dipilih untuk tes Level 2.");
    }
    const parsedKatId = Number(rawKatId);
    if (!Number.isInteger(parsedKatId) || parsedKatId < 1) {
      throw AppError.badRequest("ID domain (kategori asesmen) tidak valid.");
    }
    kategori_asesmen_id = parsedKatId;
  }

  return {
    level,
    nama,
    deskripsi,
    jenjang,
    aktif,
    kategori_asesmen_id
  };
}

/**
 * Validasi masukan untuk memperbarui overview tes skrining (PUT/PATCH).
 * Memperbarui field overview dan status aktif.
 *
 * @param {object} body
 */
export function validasiUpdateTesSkrining(body = {}) {
  const data = body ?? {};
  const hasil = {};

  if (data.nama !== undefined) {
    const nama = teksWajib(data.nama, "Nama tes skrining tidak boleh kosong.");
    if (nama.length < 3) {
      throw AppError.badRequest("Nama tes skrining minimal 3 karakter.");
    }
    if (nama.length > 150) {
      throw AppError.badRequest("Nama tes skrining maksimal 150 karakter.");
    }
    hasil.nama = nama;
  }

  if (data.deskripsi !== undefined) {
    const deskripsi = teksWajib(data.deskripsi, "Deskripsi tes skrining tidak boleh kosong.");
    hasil.deskripsi = deskripsi;
  }

  if (data.jenjang !== undefined) {
    const jenjang = teksWajib(data.jenjang, "Jenjang tidak boleh kosong.");
    if (jenjang.length > 50) {
      throw AppError.badRequest("Jenjang maksimal 50 karakter.");
    }
    hasil.jenjang = jenjang;
  }

  if (data.aktif !== undefined) {
    if (typeof data.aktif === "boolean") {
      hasil.aktif = data.aktif;
    } else if (typeof data.aktif === "string") {
      const a = data.aktif.trim().toLowerCase();
      hasil.aktif = a === "true" || a === "1" || a === "aktif";
    }
  }

  if (data.level !== undefined) {
    const level = Number(data.level);
    if (level !== 1 && level !== 2) {
      throw AppError.badRequest("Level tes skrining hanya boleh bernilai 1 atau 2.");
    }
    hasil.level = level;
  }

  const rawKatId = data.kategori_asesmen_id ?? data.kategori_id ?? data.domain_id;
  if (rawKatId !== undefined && rawKatId !== null && String(rawKatId).trim() !== "") {
    const parsedKatId = Number(rawKatId);
    if (!Number.isInteger(parsedKatId) || parsedKatId < 1) {
      throw AppError.badRequest("ID domain (kategori asesmen) tidak valid.");
    }
    hasil.kategori_asesmen_id = parsedKatId;
  }

  return hasil;
}
