/**
 * Validator Masukan Rute Super Admin - Tab Penilaian Tes Skrining.
 * Memastikan parameter dan payload aturan Level 1 dan rentang skor Level 2 valid.
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
 * Validasi payload pembaruan aturan penilaian Level 1.
 * @param {object} body
 * @returns {{
 *   ambang_batas?: number,
 *   operator?: string,
 *   kondisi_pemicu?: string,
 *   nilai_pemicu?: Array<string>
 * }}
 */
export function validasiUpdatePenilaianLevel1(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw AppError.badRequest("Data pembaruan aturan penilaian wajib berupa objek.");
  }
  const data = body;
  const hasil = {};

  // 1. Operator
  if (data.operator !== undefined && data.operator !== null) {
    const op = String(data.operator).trim();
    const validOps = [">=", ">", "=", "==", "in", "gte", "eq"];
    if (!validOps.includes(op)) {
      throw AppError.badRequest("Operator penilaian tidak valid. Operator saat ini hanya mendukung '>=' atau '='.");
    }
    hasil.operator = op === "gte" ? ">=" : op === "eq" ? "=" : op;
  }

  // 2. Ambang Batas Langsung
  if (data.ambang_batas !== undefined && data.ambang_batas !== null && String(data.ambang_batas).trim() !== "") {
    const ab = Number(data.ambang_batas);
    if (isNaN(ab)) {
      throw AppError.badRequest("Ambang batas harus berupa angka.");
    }
    if (!Number.isInteger(ab) || ab < 0 || ab > 255) {
      throw AppError.badRequest("Ambang batas harus berupa bilangan bulat non-negatif antara 0 dan 255.");
    }
    hasil.ambang_batas = ab;
  }

  // 3. Kondisi Pemicu Teks (misal: ">= 2", ">= 1", "Ya, Tidak Tahu")
  if (data.kondisi_pemicu !== undefined && data.kondisi_pemicu !== null) {
    const kp = String(data.kondisi_pemicu).trim();
    hasil.kondisi_pemicu = kp;

    // Jika ambang batas belum disetel dan kondisi pemicu berbentuk ">= X"
    if (hasil.ambang_batas === undefined) {
      const match = kp.match(/>=\s*(\d+)/);
      if (match) {
        hasil.ambang_batas = Number(match[1]);
      }
    }
  }

  // 4. Nilai Pemicu Kategorikal (array teks pilihan yang memicu tindak lanjut, misal: ["Ya", "Tidak Tahu"])
  const rawPemicu = data.nilai_pemicu ?? data.opsi_pemicu;
  if (rawPemicu !== undefined && rawPemicu !== null) {
    if (!Array.isArray(rawPemicu) || rawPemicu.length === 0) {
      throw AppError.badRequest("Nilai pemicu kategorikal harus berupa array teks dan tidak boleh kosong.");
    }
    hasil.nilai_pemicu = rawPemicu.map((item, idx) => {
      if (typeof item !== "string" || item.trim() === "") {
        throw AppError.badRequest(`Nilai pemicu ke-${idx + 1} tidak valid.`);
      }
      return item.trim();
    });

    const validChoices = ["ya", "tidak", "tidak tahu", "tidak_tahu"];
    for (const val of hasil.nilai_pemicu) {
      if (!validChoices.includes(val.toLowerCase())) {
        throw AppError.badRequest(`Nilai pemicu '${val}' tidak valid. Pilihan yang didukung: Ya, Tidak, Tidak Tahu.`);
      }
    }

    if (hasil.ambang_batas === undefined) {
      const hasYaAtauTidakTahu = hasil.nilai_pemicu.some((v) => ["ya", "tidak tahu", "tidak_tahu"].includes(v.toLowerCase()));
      hasil.ambang_batas = hasYaAtauTidakTahu ? 2 : 0;
    }
  }

  if (hasil.ambang_batas === undefined && !hasil.nilai_pemicu && !hasil.kondisi_pemicu) {
    throw AppError.badRequest("Permintaan pembaruan aturan penilaian harus memuat ambang_batas, kondisi_pemicu, atau nilai_pemicu.");
  }

  return hasil;
}

/**
 * Memeriksa apakah dua rentang skor [minA, maxA] dan [minB, maxB] saling tumpang tindih (overlap).
 * Menerima baik 4 angka (minA, maxA, minB, maxB) atau 2 objek ({ skor_min, skor_max }, { skor_min, skor_max }).
 * @param {number|object} arg1 minA atau objek rentangA
 * @param {number|null|object} arg2 maxA atau objek rentangB
 * @param {number} [arg3] minB jika format 4 argumen
 * @param {number|null} [arg4] maxB jika format 4 argumen
 * @returns {boolean}
 */
export function apakahRentangOverlap(arg1, arg2, arg3, arg4) {
  let minA, maxA, minB, maxB;

  if (typeof arg1 === "object" && arg1 !== null && typeof arg2 === "object" && arg2 !== null) {
    minA = Number(arg1.skor_min);
    maxA = arg1.skor_max !== null && arg1.skor_max !== undefined ? Number(arg1.skor_max) : null;
    minB = Number(arg2.skor_min);
    maxB = arg2.skor_max !== null && arg2.skor_max !== undefined ? Number(arg2.skor_max) : null;
  } else {
    minA = Number(arg1);
    maxA = arg2 !== null && arg2 !== undefined ? Number(arg2) : null;
    minB = Number(arg3);
    maxB = arg4 !== null && arg4 !== undefined ? Number(arg4) : null;
  }

  // Jika A tanpa batas atas: [minA, ∞)
  if (maxA === null || maxA === undefined) {
    // Overlap jika B mencapai atau melebihi minA
    if (maxB === null || maxB === undefined) return true;
    return maxB >= minA;
  }

  // Jika B tanpa batas atas: [minB, ∞)
  if (maxB === null || maxB === undefined) {
    return maxA >= minB;
  }

  // Keduanya memiliki batas tertutup: [minA, maxA] dan [minB, maxB]
  return Math.max(minA, minB) <= Math.min(maxA, maxB);
}

/**
 * Validasi payload penambahan rentang skor Level 2.
 * @param {object} body
 * @returns {{
 *   kategori: string,
 *   skor_min: number,
 *   skor_max: number | null,
 *   urutan?: number
 * }}
 */
export function validasiTambahRentangLevel2(body = {}) {
  const data = body ?? {};

  // 1. Kategori Hasil
  if (typeof data.kategori !== "string" || data.kategori.trim() === "") {
    throw AppError.badRequest("Kategori hasil penilaian wajib diisi.");
  }
  const kategori = data.kategori.trim();
  if (kategori.length > 100) {
    throw AppError.badRequest("Kategori hasil penilaian maksimal 100 karakter.");
  }

  // 2. Skor Min
  if (data.skor_min === undefined || data.skor_min === null || String(data.skor_min).trim() === "") {
    throw AppError.badRequest("Nilai minimum skor wajib diisi.");
  }
  const skor_min = Number(data.skor_min);
  if (Number.isNaN(skor_min) || skor_min < 0) {
    throw AppError.badRequest("Nilai minimum skor harus berupa angka non-negatif.");
  }

  // 3. Skor Max
  let skor_max = null;
  if (data.skor_max !== undefined && data.skor_max !== null && String(data.skor_max).trim() !== "") {
    const maxVal = Number(data.skor_max);
    if (Number.isNaN(maxVal) || maxVal < 0) {
      throw AppError.badRequest("Nilai maksimum skor harus berupa angka non-negatif.");
    }
    if (skor_min > maxVal) {
      throw AppError.badRequest("Nilai minimum tidak boleh lebih besar dari nilai maksimum.");
    }
    skor_max = maxVal;
  }

  // 4. Urutan
  let urutan = undefined;
  if (data.urutan !== undefined && data.urutan !== null && String(data.urutan).trim() !== "") {
    const u = Number(data.urutan);
    if (!Number.isInteger(u) || u < 1 || u > 255) {
      throw AppError.badRequest("Urutan rentang harus berupa bilangan bulat positif.");
    }
    urutan = u;
  }

  return {
    kategori,
    skor_min,
    skor_max,
    urutan
  };
}

/**
 * Validasi payload pembaruan rentang skor Level 2.
 * @param {object} body
 * @returns {{
 *   kategori?: string,
 *   skor_min?: number,
 *   skor_max?: number | null,
 *   urutan?: number
 * }}
 */
export function validasiUpdateRentangLevel2(body = {}) {
  const data = body ?? {};
  const hasil = {};

  if (data.kategori !== undefined) {
    if (typeof data.kategori !== "string" || data.kategori.trim() === "") {
      throw AppError.badRequest("Kategori hasil penilaian tidak boleh kosong.");
    }
    const k = data.kategori.trim();
    if (k.length > 100) {
      throw AppError.badRequest("Kategori hasil penilaian maksimal 100 karakter.");
    }
    hasil.kategori = k;
  }

  if (data.skor_min !== undefined) {
    const minVal = Number(data.skor_min);
    if (Number.isNaN(minVal) || minVal < 0) {
      throw AppError.badRequest("Nilai minimum skor harus berupa angka non-negatif.");
    }
    hasil.skor_min = minVal;
  }

  if (data.skor_max !== undefined) {
    if (data.skor_max === null || String(data.skor_max).trim() === "") {
      hasil.skor_max = null;
    } else {
      const maxVal = Number(data.skor_max);
      if (Number.isNaN(maxVal) || maxVal < 0) {
        throw AppError.badRequest("Nilai maksimum skor harus berupa angka non-negatif.");
      }
      hasil.skor_max = maxVal;
    }
  }

  if (hasil.skor_min !== undefined && hasil.skor_max !== undefined && hasil.skor_max !== null) {
    if (hasil.skor_min > hasil.skor_max) {
      throw AppError.badRequest("Nilai minimum tidak boleh lebih besar dari nilai maksimum.");
    }
  }

  if (data.urutan !== undefined) {
    const u = Number(data.urutan);
    if (!Number.isInteger(u) || u < 1 || u > 255) {
      throw AppError.badRequest("Urutan rentang harus berupa bilangan bulat positif.");
    }
    hasil.urutan = u;
  }

  if (Object.keys(hasil).length === 0) {
    throw AppError.badRequest("Permintaan pembaruan rentang tidak memuat data yang valid.");
  }

  return hasil;
}

/**
 * Validasi payload pembaruan batch rentang skor Level 2.
 * @param {object|Array} body
 * @returns {Array<{
 *   kategori: string,
 *   skor_min: number,
 *   skor_max: number | null,
 *   urutan?: number
 * }>}
 */
export function validasiBatchRentangLevel2(body = {}) {
  let list = null;
  if (Array.isArray(body)) {
    list = body;
  } else if (body && typeof body === "object") {
    if (Array.isArray(body.rentang)) list = body.rentang;
    else if (Array.isArray(body.items)) list = body.items;
  }

  if (!list || !Array.isArray(list) || list.length === 0) {
    throw AppError.badRequest("Daftar rentang penilaian harus berupa array dan tidak boleh kosong.");
  }

  const hasil = list.map((item, idx) => {
    try {
      return validasiTambahRentangLevel2(item);
    } catch (err) {
      throw AppError.badRequest(`Item rentang ke-${idx + 1}: ${err.message}`);
    }
  });

  // Validasi tumpang tindih internal dalam batch
  for (let i = 0; i < hasil.length; i++) {
    for (let j = i + 1; j < hasil.length; j++) {
      const a = hasil[i];
      const b = hasil[j];
      if (apakahRentangOverlap(a.skor_min, a.skor_max, b.skor_min, b.skor_max)) {
        throw AppError.badRequest(
          `Rentang skor '${a.kategori}' (${a.skor_min} - ${a.skor_max ?? "∞"}) dan '${b.kategori}' (${b.skor_min} - ${b.skor_max ?? "∞"}) tumpang tindih (overlap).`
        );
      }
    }
  }

  return hasil;
}
