/**
 * Validator Rute Super Admin - Tab Interpretasi Tes Skrining.
 * Memvalidasi identitas domain/rentang, kondisi pemicu narasi, serta integritas payload interpretasi dan rekomendasi.
 */

import AppError from "../../utils/appError.js";

/**
 * Validasi integer positif untuk parameter ID.
 * @param {any} id
 * @param {string} pesanError
 * @returns {number}
 */
export function validasiIdNumerik(id, pesanError = "ID tidak valid.") {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw AppError.badRequest(pesanError);
  }
  return parsed;
}

/**
 * Normalisasi dan validasi kondisi interpretasi Level 1.
 * Kondisi yang didukung:
 * - 'belum_memenuhi' (Belum Memenuhi Ambang Batas / terindikasi: false)
 * - 'memenuhi' (Memenuhi Ambang Skrining Lanjutan / terindikasi: true)
 *
 * @param {string} kondisi
 * @returns {"belum_memenuhi"|"memenuhi"}
 */
export function validasiKondisiLevel1(kondisi) {
  if (typeof kondisi !== "string") {
    throw AppError.badRequest(
      "Kondisi interpretasi Level 1 tidak valid. Gunakan 'belum_memenuhi' atau 'memenuhi'."
    );
  }

  const raw = kondisi.trim().toLowerCase();
  if (["belum_memenuhi", "tidak_terindikasi", "normal", "aman", "0"].includes(raw)) {
    return "belum_memenuhi";
  }
  if (["memenuhi", "terindikasi", "lanjutan", "1"].includes(raw)) {
    return "memenuhi";
  }

  throw AppError.badRequest(
    `Kondisi interpretasi '${kondisi}' tidak valid. Pilihan yang didukung: 'belum_memenuhi' atau 'memenuhi'.`
  );
}

/**
 * Mem-parsing parameter ID interpretasi Level 1 yang dapat berbentuk:
 * - Angka murni: '1'
 * - Compound ID: '1-belum_memenuhi' atau '1-memenuhi'
 *
 * @param {string|number} paramId
 * @param {string} [queryKondisi]
 * @param {string} [bodyKondisi]
 * @returns {{ domainId: number, kondisi?: "belum_memenuhi"|"memenuhi" }}
 */
export function parseInterpretasiIdLevel1(paramId, queryKondisi, bodyKondisi) {
  const str = String(paramId).trim();
  const compoundMatch = str.match(/^(\d+)-(belum_memenuhi|memenuhi|tidak_terindikasi|terindikasi)$/i);

  if (compoundMatch) {
    const domainId = validasiIdNumerik(compoundMatch[1], "ID domain interpretasi tidak valid.");
    const kondisi = validasiKondisiLevel1(compoundMatch[2]);
    return { domainId, kondisi };
  }

  const domainId = validasiIdNumerik(str, "ID domain interpretasi tidak valid.");
  const candidateKondisi = queryKondisi || bodyKondisi;
  const kondisi = candidateKondisi ? validasiKondisiLevel1(candidateKondisi) : undefined;

  return { domainId, kondisi };
}

/**
 * Sanitasi dan normalisasi teks biasa (plain text).
 * Menolak objek/array atau konten berbahaya.
 *
 * @param {any} val
 * @param {string} fieldName
 * @param {number} maxLen
 * @returns {string|null}
 */
function sanitasiTeksBiasa(val, fieldName, maxLen = 5000) {
  if (val === null || val === undefined) {
    return null;
  }
  if (typeof val !== "string") {
    throw AppError.badRequest(`Field '${fieldName}' harus berupa teks (string).`);
  }

  const trimmed = val.trim();
  if (trimmed === "") {
    return null;
  }

  if (trimmed.length > maxLen) {
    throw AppError.badRequest(`Panjang teks '${fieldName}' tidak boleh melebihi ${maxLen} karakter.`);
  }

  return trimmed;
}

/**
 * Validasi payload pembaruan interpretasi Level 1.
 * Menerima baik format pembaruan satu kondisi:
 * { kondisi: 'belum_memenuhi', deskripsi: '...', rekomendasi: '...' }
 * maupun format terstruktur:
 * { belum_memenuhi: { deskripsi, rekomendasi }, memenuhi: { deskripsi, rekomendasi } }
 *
 * @param {any} body
 * @param {string} [kondisiFromParam]
 * @returns {{
 *   tipe: 'single' | 'batch',
 *   kondisi?: 'belum_memenuhi' | 'memenuhi',
 *   deskripsi?: string | null,
 *   rekomendasi?: string | null,
 *   belum_memenuhi?: { deskripsi: string | null, rekomendasi: string | null },
 *   memenuhi?: { deskripsi: string | null, rekomendasi: string | null }
 * }}
 */
export function validasiUpdateInterpretasiLevel1(body, kondisiFromParam) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw AppError.badRequest("Data pembaruan interpretasi harus berupa objek JSON.");
  }

  // Format terstruktur: { belum_memenuhi: {...}, memenuhi: {...} }
  if (body.belum_memenuhi || body.memenuhi) {
    const hasil = { tipe: "batch" };
    if (body.belum_memenuhi) {
      if (typeof body.belum_memenuhi !== "object") {
        throw AppError.badRequest("Kondisi 'belum_memenuhi' harus berupa objek.");
      }
      hasil.belum_memenuhi = {
        deskripsi: sanitasiTeksBiasa(body.belum_memenuhi.deskripsi, "deskripsi belum_memenuhi"),
        rekomendasi: sanitasiTeksBiasa(body.belum_memenuhi.rekomendasi, "rekomendasi belum_memenuhi")
      };
    }
    if (body.memenuhi) {
      if (typeof body.memenuhi !== "object") {
        throw AppError.badRequest("Kondisi 'memenuhi' harus berupa objek.");
      }
      hasil.memenuhi = {
        deskripsi: sanitasiTeksBiasa(body.memenuhi.deskripsi, "deskripsi memenuhi"),
        rekomendasi: sanitasiTeksBiasa(body.memenuhi.rekomendasi, "rekomendasi memenuhi")
      };
    }
    return hasil;
  }

  // Format single condition: { kondisi, deskripsi, rekomendasi }
  const rawKondisi = kondisiFromParam || body.kondisi;
  if (!rawKondisi) {
    throw AppError.badRequest(
      "Kondisi hasil interpretasi Level 1 wajib ditentukan ('belum_memenuhi' atau 'memenuhi')."
    );
  }

  const kondisi = validasiKondisiLevel1(rawKondisi);

  if (body.deskripsi === undefined && body.rekomendasi === undefined) {
    throw AppError.badRequest(
      "Permintaan pembaruan interpretasi harus memuat setidaknya 'deskripsi' atau 'rekomendasi'."
    );
  }

  const hasil = {
    tipe: "single",
    kondisi,
    deskripsi: body.deskripsi !== undefined ? sanitasiTeksBiasa(body.deskripsi, "deskripsi") : undefined,
    rekomendasi: body.rekomendasi !== undefined ? sanitasiTeksBiasa(body.rekomendasi, "rekomendasi") : undefined
  };

  return hasil;
}

/**
 * Validasi payload pembaruan interpretasi Level 2.
 * Allowlist ketat hanya untuk deskripsi dan rekomendasi.
 *
 * @param {any} body
 * @returns {{
 *   deskripsi?: string | null,
 *   rekomendasi?: string | null
 * }}
 */
export function validasiUpdateInterpretasiLevel2(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw AppError.badRequest("Data pembaruan interpretasi harus berupa objek JSON.");
  }

  if (body.deskripsi === undefined && body.rekomendasi === undefined) {
    throw AppError.badRequest(
      "Permintaan pembaruan interpretasi harus memuat setidaknya 'deskripsi' atau 'rekomendasi'."
    );
  }

  const hasil = {};
  if (body.deskripsi !== undefined) {
    hasil.deskripsi = sanitasiTeksBiasa(body.deskripsi, "deskripsi");
  }
  if (body.rekomendasi !== undefined) {
    hasil.rekomendasi = sanitasiTeksBiasa(body.rekomendasi, "rekomendasi");
  }

  return hasil;
}
