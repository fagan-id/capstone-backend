import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdNumerik,
  validasiUpdatePenilaianLevel1,
  apakahRentangOverlap,
  validasiTambahRentangLevel2,
  validasiUpdateRentangLevel2,
  validasiBatchRentangLevel2
} from "../src/validators/superAdmin/superAdminPenilaianSkrining.js";

// ==========================================
// 1. Validasi ID Numerik
// ==========================================
test("validasiIdNumerik menerima integer positif", () => {
  assert.equal(validasiIdNumerik(1), 1);
  assert.equal(validasiIdNumerik("42"), 42);
});

test("validasiIdNumerik menolak ID tidak valid", () => {
  assert.throws(() => validasiIdNumerik("abc"), /ID tidak valid/);
  assert.throws(() => validasiIdNumerik(0), /ID tidak valid/);
  assert.throws(() => validasiIdNumerik(-5), /ID tidak valid/);
  assert.throws(() => validasiIdNumerik(1.5), /ID tidak valid/);
  assert.throws(() => validasiIdNumerik(null), /ID tidak valid/);
});

// ==========================================
// 2. Validasi Update Penilaian Level 1
// ==========================================
test("validasiUpdatePenilaianLevel1 menerima pembaruan ambang batas numerik", () => {
  const hasil = validasiUpdatePenilaianLevel1({
    ambang_batas: 2,
    operator: ">="
  });

  assert.equal(hasil.ambang_batas, 2);
  assert.equal(hasil.operator, ">=");
});

test("validasiUpdatePenilaianLevel1 menerima aturan kategorikal dan memetakan ke ambang batas", () => {
  const hasil1 = validasiUpdatePenilaianLevel1({
    kondisi_pemicu: "nilai_ekstrem",
    nilai_pemicu: ["ya", "tidak_tahu"]
  });
  assert.equal(hasil1.ambang_batas, 2);
  assert.deepEqual(hasil1.nilai_pemicu, ["ya", "tidak_tahu"]);

  const hasil2 = validasiUpdatePenilaianLevel1({
    nilai_pemicu: ["tidak"]
  });
  assert.equal(hasil2.ambang_batas, 0);
});

test("validasiUpdatePenilaianLevel1 menolak payload non-objek atau kosong", () => {
  assert.throws(() => validasiUpdatePenilaianLevel1(null), /Data pembaruan aturan penilaian wajib berupa objek/);
  assert.throws(() => validasiUpdatePenilaianLevel1("string"), /Data pembaruan aturan penilaian wajib berupa objek/);
  assert.throws(() => validasiUpdatePenilaianLevel1({}), /Permintaan pembaruan aturan penilaian harus memuat/);
});

test("validasiUpdatePenilaianLevel1 menolak ambang batas dan operator tidak valid", () => {
  assert.throws(() => validasiUpdatePenilaianLevel1({ ambang_batas: -1 }), /Ambang batas harus berupa bilangan bulat non-negatif/);
  assert.throws(() => validasiUpdatePenilaianLevel1({ ambang_batas: "abc" }), /Ambang batas harus berupa angka/);
  assert.throws(() => validasiUpdatePenilaianLevel1({ ambang_batas: 2, operator: "<" }), /Operator saat ini hanya mendukung/);
});

test("validasiUpdatePenilaianLevel1 menolak nilai pemicu kategorikal di luar daftar valid", () => {
  assert.throws(
    () => validasiUpdatePenilaianLevel1({ nilai_pemicu: ["mungkin"] }),
    /Nilai pemicu 'mungkin' tidak valid/
  );
  assert.throws(
    () => validasiUpdatePenilaianLevel1({ nilai_pemicu: [] }),
    /Nilai pemicu kategorikal harus berupa array teks dan tidak boleh kosong/
  );
});

// ==========================================
// 3. Evaluasi Overlap Rentang Nilai
// ==========================================
test("apakahRentangOverlap mendeteksi tumpang tindih rentang tertutup", () => {
  // Overlap pada perbatasan
  assert.equal(apakahRentangOverlap({ skor_min: 0, skor_max: 50 }, { skor_min: 50, skor_max: 70 }), true);
  // Overlap parsial
  assert.equal(apakahRentangOverlap({ skor_min: 40, skor_max: 60 }, { skor_min: 50, skor_max: 70 }), true);
  // Satu rentang di dalam rentang lain
  assert.equal(apakahRentangOverlap({ skor_min: 0, skor_max: 100 }, { skor_min: 20, skor_max: 30 }), true);
  // Tidak overlap
  assert.equal(apakahRentangOverlap({ skor_min: 0, skor_max: 50 }, { skor_min: 51, skor_max: 70 }), false);
});

test("apakahRentangOverlap mendeteksi tumpang tindih dengan batas atas terbuka (null)", () => {
  // Rentang tak terbatas vs rentang tertutup yang bersinggungan
  assert.equal(apakahRentangOverlap({ skor_min: 70, skor_max: null }, { skor_min: 60, skor_max: 75 }), true);
  // Rentang tak terbatas vs rentang tertutup terpisah
  assert.equal(apakahRentangOverlap({ skor_min: 70, skor_max: null }, { skor_min: 0, skor_max: 69 }), false);
  // Dua rentang terbuka sama-sama tak terbatas
  assert.equal(apakahRentangOverlap({ skor_min: 70, skor_max: null }, { skor_min: 80, skor_max: null }), true);
});

// ==========================================
// 4. Validasi Tambah Rentang Level 2
// ==========================================
test("validasiTambahRentangLevel2 menerima rentang baru valid", () => {
  const hasil = validasiTambahRentangLevel2({
    kategori: "  Klinis Signifikan  ",
    skor_min: 70,
    skor_max: null,
    urutan: 3
  });

  assert.equal(hasil.kategori, "Klinis Signifikan");
  assert.equal(hasil.skor_min, 70);
  assert.equal(hasil.skor_max, null);
  assert.equal(hasil.urutan, 3);
});

test("validasiTambahRentangLevel2 menolak input yang tidak lengkap atau salah", () => {
  assert.throws(() => validasiTambahRentangLevel2({}), /Kategori hasil penilaian wajib diisi/);
  assert.throws(() => validasiTambahRentangLevel2({ kategori: "Sedang" }), /Nilai minimum skor wajib diisi/);
  assert.throws(
    () => validasiTambahRentangLevel2({ kategori: "Sedang", skor_min: "abc" }),
    /Nilai minimum skor harus berupa angka/
  );
  assert.throws(
    () => validasiTambahRentangLevel2({ kategori: "Sedang", skor_min: -2 }),
    /Nilai minimum skor harus berupa angka non-negatif/
  );
  assert.throws(
    () => validasiTambahRentangLevel2({ kategori: "Sedang", skor_min: 60, skor_max: 50 }),
    /Nilai minimum.*tidak boleh lebih besar dari nilai maksimum/
  );
});

// ==========================================
// 5. Validasi Update Rentang Level 2
// ==========================================
test("validasiUpdateRentangLevel2 menerima update parsial", () => {
  const hasil1 = validasiUpdateRentangLevel2({ kategori: "Batas Normal" });
  assert.equal(hasil1.kategori, "Batas Normal");

  const hasil2 = validasiUpdateRentangLevel2({ skor_min: 55, skor_max: 65 });
  assert.equal(hasil2.skor_min, 55);
  assert.equal(hasil2.skor_max, 65);
});

test("validasiUpdateRentangLevel2 menolak payload kosong atau salah", () => {
  assert.throws(() => validasiUpdateRentangLevel2({}), /Permintaan pembaruan rentang tidak memuat data yang valid/);
  assert.throws(
    () => validasiUpdateRentangLevel2({ skor_min: 70, skor_max: 60 }),
    /Nilai minimum.*tidak boleh lebih besar dari nilai maksimum/
  );
});

// ==========================================
// 6. Validasi Batch Rentang Level 2
// ==========================================
test("validasiBatchRentangLevel2 menerima array rentang dan memeriksa overlap internal", () => {
  const items = [
    { kategori: "Normal", skor_min: 0, skor_max: 59, urutan: 1 },
    { kategori: "Ringan", skor_min: 60, skor_max: 69, urutan: 2 },
    { kategori: "Klinis", skor_min: 70, skor_max: null, urutan: 3 }
  ];

  const hasil = validasiBatchRentangLevel2(items);
  assert.equal(hasil.length, 3);
  assert.equal(hasil[0].kategori, "Normal");
  assert.equal(hasil[2].skor_max, null);
});

test("validasiBatchRentangLevel2 menolak rentang yang saling tumpang tindih (overlap)", () => {
  const itemsOverlap = [
    { kategori: "Normal", skor_min: 0, skor_max: 60 },
    { kategori: "Klinis", skor_min: 55, skor_max: 100 }
  ];

  assert.throws(
    () => validasiBatchRentangLevel2(itemsOverlap),
    /tumpang tindih \(overlap\)/
  );
});

test("validasiBatchRentangLevel2 menolak lebih dari satu rentang tanpa batas atas yang saling tumpang tindih", () => {
  const itemsDuaTerbuka = [
    { kategori: "Tinggi", skor_min: 60, skor_max: null },
    { kategori: "Sangat Tinggi", skor_min: 80, skor_max: null }
  ];

  assert.throws(
    () => validasiBatchRentangLevel2(itemsDuaTerbuka),
    /tumpang tindih \(overlap\)/
  );
});
