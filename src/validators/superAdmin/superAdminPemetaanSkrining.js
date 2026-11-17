/**
 * Validator Masukan Rute Super Admin - Tab Pemetaan Tes Skrining.
 * Memastikan parameter query, ID domain, ID tes Level 2, dan payload batch pemetaan valid.
 */

import AppError from "../../utils/appError.js";

/**
 * Validasi ID numerik positif.
 * @param {*} nilai
 * @param {string} [pesan="ID tidak valid."]
 * @returns {number}
 */
export function validasiIdNumerik(nilai, pesan = "ID tidak valid.") {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest(pesan);
  }
  return angka;
}

/**
 * Validasi query string untuk daftar pemetaan domain.
 * @param {object} query
 * @returns {{
 *   search?: string,
 *   status?: "terpetakan" | "belum_terpetakan"
 * }}
 */
export function validasiQueryDaftarPemetaan(query = {}) {
  let search = undefined;
  if (typeof query.search === "string" && query.search.trim() !== "") {
    search = query.search.trim();
  }

  let status = undefined;
  if (typeof query.status === "string") {
    const s = query.status.trim().toLowerCase();
    if (s === "terpetakan" || s === "mapped") {
      status = "terpetakan";
    } else if (s === "belum_terpetakan" || s === "unmapped" || s === "belum") {
      status = "belum_terpetakan";
    }
  }

  return { search, status };
}

/**
 * Validasi query string untuk opsi kandidat tes Level 2.
 * @param {object} query
 * @returns {{
 *   search?: string,
 *   status?: boolean,
 *   kategori_id?: number,
 *   page: number,
 *   limit: number
 * }}
 */
export function validasiQueryOpsiTesLevel2(query = {}) {
  let search = undefined;
  if (typeof query.search === "string" && query.search.trim() !== "") {
    search = query.search.trim();
  }

  let status = undefined;
  if (typeof query.status === "string") {
    const s = query.status.trim().toLowerCase();
    if (s === "aktif" || s === "true" || s === "1") status = true;
    else if (s === "nonaktif" || s === "false" || s === "0") status = false;
  } else if (typeof query.status === "boolean") {
    status = query.status;
  }

  let kategori_id = undefined;
  const rawKat = query.kategori_id ?? query.kategori_asesmen_id ?? query.domain_id;
  if (rawKat !== undefined && rawKat !== null && String(rawKat).trim() !== "") {
    kategori_id = validasiIdNumerik(rawKat, "ID domain/kategori konteks edit tidak valid.");
  }

  let page = Number(query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  return { search, status, kategori_id, page, limit };
}

/**
 * Validasi payload saat memperbarui pemetaan domain (PATCH/PUT).
 * Mendukung format batch maupun item tunggal dalam satu kontrak konsisten.
 *
 * @param {object|Array} body
 * @returns {Array<{
 *   kategori_id: number,
 *   tes_skrining_id: number | null,
 *   ambang_batas?: number
 * }>}
 */
export function validasiUpdatePemetaan(body = {}) {
  let rawList = null;

  if (Array.isArray(body)) {
    rawList = body;
  } else if (body && typeof body === "object") {
    if (Array.isArray(body.pemetaan)) {
      rawList = body.pemetaan;
    } else if (Array.isArray(body.items)) {
      rawList = body.items;
    } else if (body.kategori_id !== undefined || body.kategori_asesmen_id !== undefined || body.domain_id !== undefined) {
      // Objek tunggal dijadikan batch 1 item
      rawList = [body];
    }
  }

  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    throw AppError.badRequest("Data pemetaan harus berupa array atau objek pemetaan dan tidak boleh kosong.");
  }

  const kategoriSet = new Set();
  const targetSet = new Set();

  const hasil = rawList.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw AppError.badRequest(`Item pemetaan ke-${idx + 1} tidak valid.`);
    }

    // 1. Validasi ID Domain / Kategori
    const rawKatId = item.kategori_id ?? item.kategori_asesmen_id ?? item.domain_id;
    if (rawKatId === undefined || rawKatId === null || String(rawKatId).trim() === "") {
      throw AppError.badRequest(`ID domain/kategori pada item ke-${idx + 1} wajib diisi.`);
    }
    const kategori_id = validasiIdNumerik(rawKatId, `ID domain/kategori pada item ke-${idx + 1} tidak valid.`);

    if (kategoriSet.has(kategori_id)) {
      throw AppError.badRequest(`ID domain/kategori ${kategori_id} duplikat dalam permintaan pembaruan.`);
    }
    kategoriSet.add(kategori_id);

    // 2. Validasi Target Tes Skrining Level 2 (bisa integer positif atau null untuk unmap)
    let tes_skrining_id = undefined;
    let rawTarget = undefined;
    if ("tes_skrining_id" in item) {
      rawTarget = item.tes_skrining_id;
    } else if ("target_tes_id" in item) {
      rawTarget = item.target_tes_id;
    } else if ("tes_id" in item) {
      rawTarget = item.tes_id;
    }

    if (rawTarget === null) {
      tes_skrining_id = null;
    } else if (rawTarget !== undefined) {
      tes_skrining_id = validasiIdNumerik(rawTarget, `ID tes Level 2 pada domain ${kategori_id} tidak valid.`);
      if (targetSet.has(tes_skrining_id)) {
        throw AppError.badRequest(`Tes Level 2 dengan ID ${tes_skrining_id} tidak boleh dipetakan ke lebih dari satu domain dalam batch pembaruan.`);
      }
      targetSet.add(tes_skrining_id);
    }

    // 3. Validasi Ambang Batas Opsional (0 - 255)
    let ambang_batas = undefined;
    if (item.ambang_batas !== undefined) {
      if (item.ambang_batas === null || item.ambang_batas === "") {
        throw AppError.badRequest(`Nilai ambang batas pada domain ${kategori_id} tidak boleh kosong.`);
      }
      const ab = Number(item.ambang_batas);
      if (!Number.isInteger(ab) || ab < 0 || ab > 255) {
        throw AppError.badRequest(`Nilai ambang batas pada domain ${kategori_id} harus berupa bilangan bulat antara 0 dan 255.`);
      }
      ambang_batas = ab;
    }

    // Minimal harus ada satu perubahan yang dikirimkan (tes_skrining_id atau ambang_batas)
    if (tes_skrining_id === undefined && ambang_batas === undefined) {
      throw AppError.badRequest(`Item pemetaan untuk domain ${kategori_id} tidak memuat field yang dapat diperbarui.`);
    }

    return {
      kategori_id,
      tes_skrining_id,
      ambang_batas
    };
  });

  return hasil;
}
