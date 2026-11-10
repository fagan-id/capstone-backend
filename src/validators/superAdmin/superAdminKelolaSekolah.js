/**
 * Validator Masukan Rute Super Admin - Kelola Sekolah.
 * Memastikan semua data yang dikirimkan klien valid sebelum diproses oleh service.
 */

import AppError from "../../utils/appError.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,50}$/;

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
 * Validasi ID numerik positif untuk parameter URL (sekolah_id).
 * @param {*} nilai
 * @returns {number}
 */
export function validasiIdSekolah(nilai) {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest("ID sekolah tidak valid.");
  }
  return angka;
}

/**
 * Validasi query string untuk daftar sekolah (paginasi, pencarian, filter, dan sorting).
 * @param {object} query
 * @returns {{
 *   page: number,
 *   limit: number,
 *   search?: string,
 *   status?: boolean,
 *   sortBy: "nama" | "created_at" | "total_sesi",
 *   sortOrder: "asc" | "desc"
 * }}
 */
export function validasiQueryDaftarSekolah(query = {}) {
  let page = Number(query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  let search = undefined;
  if (typeof query.search === "string" && query.search.trim() !== "") {
    search = query.search.trim();
  }

  let status = undefined;
  if (typeof query.status === "string") {
    const s = query.status.trim().toLowerCase();
    if (s === "aktif" || s === "true") status = true;
    else if (s === "nonaktif" || s === "false") status = false;
  } else if (typeof query.status === "boolean") {
    status = query.status;
  }

  const validSortBy = ["nama", "created_at", "total_sesi"];
  const sortBy = validSortBy.includes(query.sortBy) ? query.sortBy : "created_at";

  let sortOrder = "desc";
  if (typeof query.sortOrder === "string") {
    const o = query.sortOrder.trim().toLowerCase();
    if (o === "asc" || o === "desc") sortOrder = o;
  } else if (sortBy === "nama") {
    sortOrder = "asc";
  }

  return { page, limit, search, status, sortBy, sortOrder };
}

/**
 * Validasi masukan untuk membuat sekolah baru (POST).
 * Sesuai form modal 'Tambah Sekolah Baru':
 * - Nama Sekolah * (wajib)
 * - Email Admin Sekolah * (wajib, format email)
 * - Password * (wajib, minimal 6 karakter)
 * - Status Sekolah (opsional, boolean, default: true)
 * Serta kolom skema opsional jika dikirim klien: npsn, username, alamat, kontak_telepon.
 *
 * @param {object} body
 */
export function validasiTambahSekolah(body = {}) {
  const data = body ?? {};

  const nama = teksWajib(data.nama, "Nama sekolah wajib diisi.");
  if (nama.length < 3) {
    throw AppError.badRequest("Nama sekolah minimal 3 karakter.");
  }
  if (nama.length > 150) {
    throw AppError.badRequest("Nama sekolah maksimal 150 karakter.");
  }

  const emailRaw = teksWajib(data.email, "Email admin sekolah wajib diisi.");
  const email = emailRaw.toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    throw AppError.badRequest("Format email admin sekolah tidak valid.");
  }
  if (email.length > 191) {
    throw AppError.badRequest("Email maksimal 191 karakter.");
  }

  const password = teksWajib(data.password, "Password admin sekolah wajib diisi.");
  if (password.length < 6) {
    throw AppError.badRequest("Password minimal 6 karakter.");
  }

  let aktif = true;
  if (data.aktif !== undefined) {
    if (typeof data.aktif === "boolean") {
      aktif = data.aktif;
    } else if (typeof data.aktif === "string") {
      const a = data.aktif.trim().toLowerCase();
      aktif = a === "true" || a === "1";
    }
  }

  let npsn = undefined;
  if (data.npsn !== undefined && data.npsn !== null && String(data.npsn).trim() !== "") {
    npsn = String(data.npsn).trim();
    if (npsn.length !== 8) {
      throw AppError.badRequest("NPSN harus terdiri dari 8 karakter.");
    }
  }

  let username = undefined;
  if (data.username !== undefined && data.username !== null && String(data.username).trim() !== "") {
    username = String(data.username).trim();
    if (username.includes("@")) {
      throw AppError.badRequest("Username tidak boleh mengandung karakter '@'.");
    }
    if (!USERNAME_REGEX.test(username)) {
      throw AppError.badRequest("Username harus 3-50 karakter alfanumerik (boleh huruf, angka, underscore, tanda hubung).");
    }
  }

  let alamat = undefined;
  if (data.alamat !== undefined && data.alamat !== null) {
    alamat = String(data.alamat).trim();
    if (alamat.length > 255) {
      throw AppError.badRequest("Alamat maksimal 255 karakter.");
    }
    if (alamat === "") alamat = null;
  }

  let kontak_telepon = undefined;
  if (data.kontak_telepon !== undefined && data.kontak_telepon !== null) {
    kontak_telepon = String(data.kontak_telepon).trim();
    if (kontak_telepon.length > 20) {
      throw AppError.badRequest("Kontak telepon maksimal 20 karakter.");
    }
    if (kontak_telepon === "") kontak_telepon = null;
  }

  return {
    nama,
    email,
    password,
    aktif,
    npsn,
    username,
    alamat,
    kontak_telepon
  };
}

/**
 * Validasi masukan untuk memperbarui sekolah (PUT/PATCH).
 * Sesuai form modal 'Edit Sekolah':
 * - Nama Sekolah * (wajib)
 * - Email Admin Sekolah * (wajib, format email)
 * - Password Baru (opsional: jika kosong, password lama dipertahankan)
 * - Status Sekolah (boolean)
 *
 * @param {object} body
 */
export function validasiUpdateSekolah(body = {}) {
  const data = body ?? {};
  const hasil = {};

  if (data.nama !== undefined) {
    const nama = teksWajib(data.nama, "Nama sekolah tidak boleh kosong.");
    if (nama.length < 3) {
      throw AppError.badRequest("Nama sekolah minimal 3 karakter.");
    }
    if (nama.length > 150) {
      throw AppError.badRequest("Nama sekolah maksimal 150 karakter.");
    }
    hasil.nama = nama;
  }

  if (data.email !== undefined) {
    const emailRaw = teksWajib(data.email, "Email admin sekolah tidak boleh kosong.");
    const email = emailRaw.toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      throw AppError.badRequest("Format email admin sekolah tidak valid.");
    }
    if (email.length > 191) {
      throw AppError.badRequest("Email maksimal 191 karakter.");
    }
    hasil.email = email;
  }

  if (data.password !== undefined && data.password !== null && String(data.password).trim() !== "") {
    const password = String(data.password).trim();
    if (password.length < 6) {
      throw AppError.badRequest("Password baru minimal 6 karakter.");
    }
    hasil.password = password;
  }

  if (data.aktif !== undefined) {
    if (typeof data.aktif === "boolean") {
      hasil.aktif = data.aktif;
    } else if (typeof data.aktif === "string") {
      const a = data.aktif.trim().toLowerCase();
      hasil.aktif = a === "true" || a === "1";
    }
  }

  if (data.npsn !== undefined && data.npsn !== null && String(data.npsn).trim() !== "") {
    const npsn = String(data.npsn).trim();
    if (npsn.length !== 8) {
      throw AppError.badRequest("NPSN harus terdiri dari 8 karakter.");
    }
    hasil.npsn = npsn;
  }

  if (data.username !== undefined && data.username !== null && String(data.username).trim() !== "") {
    const username = String(data.username).trim();
    if (username.includes("@")) {
      throw AppError.badRequest("Username tidak boleh mengandung karakter '@'.");
    }
    if (!USERNAME_REGEX.test(username)) {
      throw AppError.badRequest("Username harus 3-50 karakter alfanumerik (boleh huruf, angka, underscore, tanda hubung).");
    }
    hasil.username = username;
  }

  if (data.alamat !== undefined) {
    if (data.alamat === null || String(data.alamat).trim() === "") {
      hasil.alamat = null;
    } else {
      const alamat = String(data.alamat).trim();
      if (alamat.length > 255) {
        throw AppError.badRequest("Alamat maksimal 255 karakter.");
      }
      hasil.alamat = alamat;
    }
  }

  if (data.kontak_telepon !== undefined) {
    if (data.kontak_telepon === null || String(data.kontak_telepon).trim() === "") {
      hasil.kontak_telepon = null;
    } else {
      const kontak = String(data.kontak_telepon).trim();
      if (kontak.length > 20) {
        throw AppError.badRequest("Kontak telepon maksimal 20 karakter.");
      }
      hasil.kontak_telepon = kontak;
    }
  }

  return hasil;
}
