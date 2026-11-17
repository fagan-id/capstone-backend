import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdNumerik,
  validasiQueryDaftarPemetaan,
  validasiQueryOpsiTesLevel2,
  validasiUpdatePemetaan
} from "../src/validators/superAdmin/superAdminPemetaanSkrining.js";

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
// 2. Validasi Query Daftar Pemetaan
// ==========================================
test("validasiQueryDaftarPemetaan menggunakan nilai default", () => {
  const hasil = validasiQueryDaftarPemetaan({});
  assert.equal(hasil.search, undefined);
  assert.equal(hasil.status, undefined);
});

test("validasiQueryDaftarPemetaan memproses search dan filter status terpetakan/belum_terpetakan", () => {
  const hasil1 = validasiQueryDaftarPemetaan({ search: "  Depresi  ", status: "terpetakan" });
  assert.equal(hasil1.search, "Depresi");
  assert.equal(hasil1.status, "terpetakan");

  const hasil2 = validasiQueryDaftarPemetaan({ status: "belum_terpetakan" });
  assert.equal(hasil2.status, "belum_terpetakan");
});

// ==========================================
// 3. Validasi Query Opsi Tes Level 2
// ==========================================
test("validasiQueryOpsiTesLevel2 memproses parameter query dan batas pagination", () => {
  const hasil = validasiQueryOpsiTesLevel2({
    search: "  Inattention  ",
    status: "aktif",
    kategori_id: "3",
    page: "2",
    limit: "500" // Batas maks 100
  });

  assert.equal(hasil.search, "Inattention");
  assert.equal(hasil.status, true);
  assert.equal(hasil.kategori_id, 3);
  assert.equal(hasil.page, 2);
  assert.equal(hasil.limit, 100);
});

test("validasiQueryOpsiTesLevel2 menolak kategori_id tidak valid", () => {
  assert.throws(
    () => validasiQueryOpsiTesLevel2({ kategori_id: "invalid" }),
    /ID domain\/kategori konteks edit tidak valid/
  );
});

// ==========================================
// 4. Validasi Update Pemetaan
// ==========================================
test("validasiUpdatePemetaan menerima payload array batch yang valid", () => {
  const hasil = validasiUpdatePemetaan([
    { kategori_id: 1, tes_skrining_id: 10, ambang_batas: 2 },
    { kategori_id: 2, tes_skrining_id: null }
  ]);

  assert.equal(hasil.length, 2);
  assert.equal(hasil[0].kategori_id, 1);
  assert.equal(hasil[0].tes_skrining_id, 10);
  assert.equal(hasil[0].ambang_batas, 2);
  assert.equal(hasil[1].kategori_id, 2);
  assert.equal(hasil[1].tes_skrining_id, null);
});

test("validasiUpdatePemetaan menerima objek tunggal", () => {
  const hasil = validasiUpdatePemetaan({
    kategori_id: 5,
    tes_skrining_id: 20
  });

  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].kategori_id, 5);
  assert.equal(hasil[0].tes_skrining_id, 20);
});

test("validasiUpdatePemetaan menerima wrapper { pemetaan: [...] }", () => {
  const hasil = validasiUpdatePemetaan({
    pemetaan: [{ kategori_id: 3, tes_skrining_id: 15 }]
  });

  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].kategori_id, 3);
  assert.equal(hasil[0].tes_skrining_id, 15);
});

test("validasiUpdatePemetaan menolak payload kosong", () => {
  assert.throws(() => validasiUpdatePemetaan([]), /tidak boleh kosong/);
  assert.throws(() => validasiUpdatePemetaan({}), /tidak boleh kosong/);
  assert.throws(() => validasiUpdatePemetaan(null), /tidak boleh kosong/);
});

test("validasiUpdatePemetaan menolak duplikasi kategori_id dalam satu batch", () => {
  assert.throws(
    () => validasiUpdatePemetaan([
      { kategori_id: 2, tes_skrining_id: 10 },
      { kategori_id: 2, tes_skrining_id: 11 }
    ]),
    /ID domain\/kategori 2 duplikat/
  );
});

test("validasiUpdatePemetaan menolak duplikasi target tes Level 2 dalam satu batch", () => {
  assert.throws(
    () => validasiUpdatePemetaan([
      { kategori_id: 1, tes_skrining_id: 10 },
      { kategori_id: 2, tes_skrining_id: 10 }
    ]),
    /tidak boleh dipetakan ke lebih dari satu domain dalam batch/
  );
});

test("validasiUpdatePemetaan menolak ambang batas negatif atau di luar rentang", () => {
  assert.throws(
    () => validasiUpdatePemetaan([{ kategori_id: 1, ambang_batas: -1 }]),
    /harus berupa bilangan bulat antara 0 dan 255/
  );

  assert.throws(
    () => validasiUpdatePemetaan([{ kategori_id: 1, ambang_batas: 300 }]),
    /harus berupa bilangan bulat antara 0 dan 255/
  );
});

test("validasiUpdatePemetaan menolak jika tidak ada field yang dapat diperbarui", () => {
  assert.throws(
    () => validasiUpdatePemetaan([{ kategori_id: 1 }]),
    /tidak memuat field yang dapat diperbarui/
  );
});
