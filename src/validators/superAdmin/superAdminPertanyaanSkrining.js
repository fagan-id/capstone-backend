/**
 * Validator Masukan Rute Super Admin - Tab Pertanyaan Tes Skrining.
 * Memastikan data masukan pertanyaan, format jawaban, opsi nilai, urutan, dan kondisi pemicu valid.
 */

import AppError from "../../utils/appError.js";

/**
 * Validasi teks wajib yang sudah dirapikan.
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
 * Validasi ID numerik positif untuk parameter URL.
 * @param {*} nilai
 * @param {string} [pesan="ID pertanyaan tidak valid."]
 * @returns {number}
 */
export function validasiIdPertanyaan(nilai, pesan = "ID pertanyaan tidak valid.") {
  const angka = Number(nilai);
  if (!Number.isInteger(angka) || angka < 1) {
    throw AppError.badRequest(pesan);
  }
  return angka;
}

/**
 * Validasi query string untuk daftar pertanyaan.
 * @param {object} query
 * @returns {{
 *   page: number,
 *   limit: number,
 *   search?: string,
 *   kategori_id?: number,
 *   status?: boolean
 * }}
 */
export function validasiQueryDaftarPertanyaan(query = {}) {
  let page = Number(query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;

  let limit = Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1) limit = 10;
  if (limit > 100) limit = 100;

  let search = undefined;
  if (typeof query.search === "string" && query.search.trim() !== "") {
    search = query.search.trim();
  }

  let kategori_id = undefined;
  const rawKat = query.kategori_id ?? query.kategori_asesmen_id;
  if (rawKat !== undefined && rawKat !== null && String(rawKat).trim() !== "") {
    const k = Number(rawKat);
    if (!Number.isInteger(k) || k < 1) {
      throw AppError.badRequest("Filter kategori tidak valid.");
    }
    kategori_id = k;
  }

  let status = undefined;
  if (typeof query.status === "string") {
    const s = query.status.trim().toLowerCase();
    if (s === "aktif" || s === "true" || s === "1") status = true;
    else if (s === "nonaktif" || s === "false" || s === "0") status = false;
  } else if (typeof query.status === "boolean") {
    status = query.status;
  }

  return { page, limit, search, kategori_id, status };
}

/**
 * Memvalidasi struktur satu opsi jawaban.
 * @param {object} o
 * @param {number} indeks
 */
function validasiOpsiItem(o, indeks) {
  if (!o || typeof o !== "object") {
    throw AppError.badRequest(`Pilihan jawaban ke-${indeks + 1} tidak valid.`);
  }

  const label = teksWajib(o.label, `Label pada pilihan jawaban ke-${indeks + 1} wajib diisi.`);
  if (label.length > 10) {
    throw AppError.badRequest(`Label pada pilihan jawaban ke-${indeks + 1} maksimal 10 karakter.`);
  }

  const teks = teksWajib(o.teks, `Teks pada pilihan jawaban ke-${indeks + 1} wajib diisi.`);
  if (teks.length > 255) {
    throw AppError.badRequest(`Teks pada pilihan jawaban ke-${indeks + 1} maksimal 255 karakter.`);
  }

  let penjelasan = null;
  if (o.penjelasan !== undefined && o.penjelasan !== null && String(o.penjelasan).trim() !== "") {
    penjelasan = String(o.penjelasan).trim();
    if (penjelasan.length > 255) {
      throw AppError.badRequest(`Penjelasan pada pilihan jawaban ke-${indeks + 1} maksimal 255 karakter.`);
    }
  }

  const skor = Number(o.skor);
  if (!Number.isInteger(skor) || skor < 0 || skor > 255) {
    throw AppError.badRequest(`Nilai/skor pada pilihan jawaban ke-${indeks + 1} harus berupa bilangan bulat non-negatif.`);
  }

  const urutan = Number(o.urutan ?? indeks + 1);
  if (!Number.isInteger(urutan) || urutan < 1 || urutan > 255) {
    throw AppError.badRequest(`Urutan pada pilihan jawaban ke-${indeks + 1} harus berupa bilangan positif.`);
  }

  let url_gambar = null;
  if (o.url_gambar !== undefined && o.url_gambar !== null && String(o.url_gambar).trim() !== "") {
    url_gambar = String(o.url_gambar).trim();
  }

  return {
    id: o.id ? validasiIdPertanyaan(o.id, `ID pilihan jawaban ke-${indeks + 1} tidak valid.`) : undefined,
    label,
    teks,
    penjelasan,
    skor,
    urutan,
    url_gambar
  };
}

/**
 * Memvalidasi daftar opsi jawaban dan memastikan urutan tidak duplikat.
 * @param {Array} opsiList
 */
function validasiDaftarOpsi(opsiList) {
  if (!Array.isArray(opsiList) || opsiList.length < 2) {
    throw AppError.badRequest("Pertanyaan harus memiliki minimal 2 pilihan jawaban.");
  }

  const hasil = opsiList.map(validasiOpsiItem);
  const urutanSet = new Set();
  for (const o of hasil) {
    if (urutanSet.has(o.urutan)) {
      throw AppError.badRequest(`Urutan pilihan jawaban ${o.urutan} tidak boleh duplikat.`);
    }
    urutanSet.add(o.urutan);
  }

  return hasil;
}

/**
 * Memvalidasi objek kondisi pemicu percabangan.
 * @param {object|null} kondisi
 */
function validasiKondisiPemicu(kondisi) {
  if (kondisi === null || kondisi === undefined) {
    return null;
  }
  if (typeof kondisi !== "object") {
    throw AppError.badRequest("Format kondisi pemicu tidak valid.");
  }

  const rawPemicuId = kondisi.pemicu_pertanyaan_id ?? kondisi.pertanyaan_id;
  if (rawPemicuId === undefined || rawPemicuId === null || String(rawPemicuId).trim() === "") {
    throw AppError.badRequest("ID pertanyaan pemicu wajib diisi saat menyetel kondisi pemicu.");
  }
  const pemicu_pertanyaan_id = validasiIdPertanyaan(rawPemicuId, "ID pertanyaan pemicu tidak valid.");

  let pemicu_opsi_id = null;
  const rawOpsiId = kondisi.pemicu_opsi_id ?? kondisi.opsi_id;
  if (rawOpsiId !== undefined && rawOpsiId !== null && String(rawOpsiId).trim() !== "") {
    pemicu_opsi_id = validasiIdPertanyaan(rawOpsiId, "ID opsi pemicu tidak valid.");
  }

  let operator = "eq";
  if (kondisi.operator !== undefined && kondisi.operator !== null) {
    const op = String(kondisi.operator).trim().toLowerCase();
    const validOps = ["eq", "gte", "=", ">=", "in"];
    if (!validOps.includes(op)) {
      throw AppError.badRequest("Operator kondisi pemicu tidak valid. Gunakan 'eq' atau 'gte'.");
    }
    operator = (op === "=" ? "eq" : op === ">=" ? "gte" : op);
  }

  let nilai = null;
  if (kondisi.nilai !== undefined && kondisi.nilai !== null && String(kondisi.nilai).trim() !== "") {
    const n = Number(kondisi.nilai);
    if (!Number.isInteger(n) || n < 0) {
      throw AppError.badRequest("Nilai pemicu harus berupa bilangan bulat non-negatif.");
    }
    nilai = n;
  }

  return {
    pemicu_pertanyaan_id,
    pemicu_opsi_id,
    operator,
    nilai
  };
}

/**
 * Validasi payload saat menambahkan pertanyaan baru (POST).
 * @param {object} body
 * @param {number} [levelTes=1]
 */
export function validasiTambahPertanyaan(body = {}, levelTes = 1) {
  const data = body ?? {};

  // 1. Teks pertanyaan wajib
  const teks = teksWajib(data.teks ?? data.pertanyaan, "Isi pertanyaan wajib diisi.");
  if (teks.length < 3) {
    throw AppError.badRequest("Isi pertanyaan minimal 3 karakter.");
  }

  // 2. Kalimat pengantar opsional
  let kalimat_pengantar = null;
  if (data.kalimat_pengantar !== undefined && data.kalimat_pengantar !== null && String(data.kalimat_pengantar).trim() !== "") {
    kalimat_pengantar = String(data.kalimat_pengantar).trim();
  }

  // 3. Kategori Asesmen / Domain
  let kategori_asesmen_id = undefined;
  const rawKat = data.kategori_asesmen_id ?? data.kategori_id ?? data.domain_id;
  if (levelTes === 1) {
    if (rawKat === undefined || rawKat === null || String(rawKat).trim() === "") {
      throw AppError.badRequest("Domain/kategori asesmen wajib dipilih untuk pertanyaan Level 1.");
    }
    kategori_asesmen_id = validasiIdPertanyaan(rawKat, "ID domain/kategori asesmen tidak valid.");
  } else if (rawKat !== undefined && rawKat !== null && String(rawKat).trim() !== "") {
    kategori_asesmen_id = validasiIdPertanyaan(rawKat, "ID domain/kategori asesmen tidak valid.");
  }

  // 4. Format / Tipe Jawaban (skala atau ya_tidak)
  let tipe_jawaban = "skala";
  if (data.tipe_jawaban !== undefined && data.tipe_jawaban !== null) {
    const rawTipe = String(data.tipe_jawaban).trim().toLowerCase();
    if (rawTipe === "skala" || rawTipe === "skala 0-4" || rawTipe === "skala_likert") {
      tipe_jawaban = "skala";
    } else if (rawTipe === "ya_tidak" || rawTipe === "ya/tidak" || rawTipe === "ya/tidak/tidak tahu") {
      tipe_jawaban = "ya_tidak";
    } else {
      throw AppError.badRequest("Format jawaban tidak valid. Pilih 'skala' atau 'ya_tidak'.");
    }
  }

  // 5. Nomor Urut (opsional, jika tidak ada di-generate oleh service)
  let nomor_urut = undefined;
  if (data.nomor_urut !== undefined && data.nomor_urut !== null && String(data.nomor_urut).trim() !== "") {
    const no = Number(data.nomor_urut);
    if (!Number.isInteger(no) || no < 1) {
      throw AppError.badRequest("Nomor urut pertanyaan harus berupa bilangan bulat positif.");
    }
    nomor_urut = no;
  }

  // 6. Status Aktif (default true)
  let aktif = true;
  if (data.aktif !== undefined) {
    if (typeof data.aktif === "boolean") {
      aktif = data.aktif;
    } else if (typeof data.aktif === "string") {
      const a = data.aktif.trim().toLowerCase();
      aktif = a === "true" || a === "1" || a === "aktif";
    }
  }

  // 7. URL Gambar (opsional)
  let url_gambar = null;
  if (data.url_gambar !== undefined && data.url_gambar !== null && String(data.url_gambar).trim() !== "") {
    url_gambar = String(data.url_gambar).trim();
    if (url_gambar.length > 255) {
      throw AppError.badRequest("URL gambar maksimal 255 karakter.");
    }
  }

  // 8. Opsi Jawaban (wajib minimal 2)
  const opsi_jawaban = validasiDaftarOpsi(data.opsi_jawaban ?? data.pilihan_jawaban);

  // 9. Kondisi Pemicu (opsional)
  const kondisi_pemicu = validasiKondisiPemicu(data.kondisi_pemicu);

  return {
    teks,
    kalimat_pengantar,
    kategori_asesmen_id,
    tipe_jawaban,
    nomor_urut,
    aktif,
    url_gambar,
    opsi_jawaban,
    kondisi_pemicu
  };
}

/**
 * Validasi payload saat memperbarui pertanyaan (PUT/PATCH).
 * Mendukung pembaruan parsial dengan allowlist yang ketat.
 * @param {object} body
 */
export function validasiUpdatePertanyaan(body = {}) {
  const data = body ?? {};
  const hasil = {};

  if (data.teks !== undefined || data.pertanyaan !== undefined) {
    const raw = data.teks ?? data.pertanyaan;
    const teks = teksWajib(raw, "Isi pertanyaan tidak boleh kosong.");
    if (teks.length < 3) {
      throw AppError.badRequest("Isi pertanyaan minimal 3 karakter.");
    }
    hasil.teks = teks;
  }

  if (data.kalimat_pengantar !== undefined) {
    if (data.kalimat_pengantar === null || String(data.kalimat_pengantar).trim() === "") {
      hasil.kalimat_pengantar = null;
    } else {
      hasil.kalimat_pengantar = String(data.kalimat_pengantar).trim();
    }
  }

  const rawKat = data.kategori_asesmen_id ?? data.kategori_id ?? data.domain_id;
  if (rawKat !== undefined) {
    if (rawKat === null) {
      throw AppError.badRequest("Kategori asesmen tidak boleh kosong.");
    }
    hasil.kategori_asesmen_id = validasiIdPertanyaan(rawKat, "ID domain/kategori asesmen tidak valid.");
  }

  if (data.tipe_jawaban !== undefined) {
    const rawTipe = String(data.tipe_jawaban).trim().toLowerCase();
    if (rawTipe === "skala" || rawTipe === "skala 0-4") {
      hasil.tipe_jawaban = "skala";
    } else if (rawTipe === "ya_tidak" || rawTipe === "ya/tidak") {
      hasil.tipe_jawaban = "ya_tidak";
    } else {
      throw AppError.badRequest("Format jawaban tidak valid. Pilih 'skala' atau 'ya_tidak'.");
    }
  }

  if (data.nomor_urut !== undefined) {
    const no = Number(data.nomor_urut);
    if (!Number.isInteger(no) || no < 1) {
      throw AppError.badRequest("Nomor urut pertanyaan harus berupa bilangan bulat positif.");
    }
    hasil.nomor_urut = no;
  }

  if (data.aktif !== undefined) {
    if (typeof data.aktif === "boolean") {
      hasil.aktif = data.aktif;
    } else if (typeof data.aktif === "string") {
      const a = data.aktif.trim().toLowerCase();
      hasil.aktif = a === "true" || a === "1" || a === "aktif";
    }
  }

  if (data.url_gambar !== undefined) {
    if (data.url_gambar === null || String(data.url_gambar).trim() === "") {
      hasil.url_gambar = null;
    } else {
      const u = String(data.url_gambar).trim();
      if (u.length > 255) {
        throw AppError.badRequest("URL gambar maksimal 255 karakter.");
      }
      hasil.url_gambar = u;
    }
  }

  const rawOpsi = data.opsi_jawaban ?? data.pilihan_jawaban;
  if (rawOpsi !== undefined) {
    hasil.opsi_jawaban = validasiDaftarOpsi(rawOpsi);
  }

  if (data.kondisi_pemicu !== undefined) {
    hasil.kondisi_pemicu = validasiKondisiPemicu(data.kondisi_pemicu);
  }

  return hasil;
}

/**
 * Validasi payload untuk pengurutan batch pertanyaan (PATCH /urutan).
 * @param {object} body
 * @returns {Array<{ id: number, nomor_urut: number }>}
 */
export function validasiBatchUrutanPertanyaan(body = {}) {
  const data = body?.urutan ?? body?.items ?? body;
  if (!Array.isArray(data) || data.length === 0) {
    throw AppError.badRequest("Daftar urutan pertanyaan harus berupa array dan tidak boleh kosong.");
  }

  const idSet = new Set();
  const nomorSet = new Set();

  const hasil = data.map((item, idx) => {
    if (!item || typeof item !== "object") {
      throw AppError.badRequest(`Item urutan ke-${idx + 1} tidak valid.`);
    }

    const id = validasiIdPertanyaan(item.id, `ID pertanyaan pada item ke-${idx + 1} tidak valid.`);
    if (idSet.has(id)) {
      throw AppError.badRequest(`ID pertanyaan ${id} duplikat pada permintaan pengurutan.`);
    }
    idSet.add(id);

    const nomor = Number(item.nomor_urut ?? item.urutan);
    if (!Number.isInteger(nomor) || nomor < 1) {
      throw AppError.badRequest(`Nomor urut untuk pertanyaan ID ${id} harus berupa bilangan positif.`);
    }
    if (nomorSet.has(nomor)) {
      throw AppError.badRequest(`Nomor urut ${nomor} duplikat pada permintaan pengurutan.`);
    }
    nomorSet.add(nomor);

    return { id, nomor_urut: nomor };
  });

  return hasil;
}
