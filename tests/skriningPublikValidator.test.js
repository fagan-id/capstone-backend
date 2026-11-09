import { test } from "node:test";
import assert from "node:assert/strict";
import * as v from "../src/validators/skriningPublik.js";

const mulaiValid = {
  kode: "abc123",
  siswa_id: "7",
  nama_responden: "  Ibu Uji  ",
  nomor_hp_responden: " 08123456789 ",
  hubungan_responden: "Orang_Tua",
  persetujuan: true
};

test("validasiKode merapikan dan membesarkan huruf kode", () => {
  assert.equal(v.validasiKode({ kode: " abc123 " }), "ABC123");
});

test("validasiKode menolak kode kosong", () => {
  assert.throws(() => v.validasiKode({}), { statusCode: 400 });
  assert.throws(() => v.validasiKode({ kode: "   " }), { statusCode: 400 });
  assert.throws(() => v.validasiKode(null), { statusCode: 400 });
});

test("validasiKataKunci menolak kurang dari 3 karakter", () => {
  assert.throws(() => v.validasiKataKunci("ab"), { statusCode: 400 });
  assert.throws(() => v.validasiKataKunci(undefined), { statusCode: 400 });
  assert.equal(v.validasiKataKunci("  Budi  "), "Budi");
});

test("validasiToken menerima UUID dan menolak selainnya", () => {
  const token = "3f1a8c2e-1b7d-4e9a-8c5f-2d6b4a9e1c70";
  assert.equal(v.validasiToken(token), token);

  assert.throws(() => v.validasiToken("123"), { statusCode: 400 });
  assert.throws(() => v.validasiToken(undefined), { statusCode: 400 });
  // Angka berurut adalah pola id lama; harus ditolak agar tidak bisa ditebak.
  assert.throws(() => v.validasiToken("42"), { statusCode: 400 });
});

test("validasiIdAngka menolak nilai bukan angka positif", () => {
  assert.equal(v.validasiIdAngka("7", "siswa_id"), 7);

  assert.throws(() => v.validasiIdAngka("abc", "siswa_id"), { statusCode: 400 });
  assert.throws(() => v.validasiIdAngka("0", "siswa_id"), { statusCode: 400 });
  assert.throws(() => v.validasiIdAngka("-3", "siswa_id"), { statusCode: 400 });
  assert.throws(() => v.validasiIdAngka(undefined, "siswa_id"), { statusCode: 400 });
});

test("validasiMulai merapikan masukan yang sah", () => {
  const hasil = v.validasiMulai(mulaiValid);

  assert.deepEqual(hasil, {
    kode: "ABC123",
    siswa_id: 7,
    nama_responden: "Ibu Uji",
    nomor_hp_responden: "08123456789",
    hubungan_responden: "orang_tua",
    persetujuan: true
  });
});

test("validasiMulai menolak hubungan di luar daftar", () => {
  assert.throws(() => v.validasiMulai({ ...mulaiValid, hubungan_responden: "tetangga" }), {
    statusCode: 400
  });
});

test("validasiMulai mewajibkan persetujuan yang sebenarnya", () => {
  assert.throws(() => v.validasiMulai({ ...mulaiValid, persetujuan: false }), { statusCode: 400 });
  assert.throws(() => v.validasiMulai({ ...mulaiValid, persetujuan: "ya" }), { statusCode: 400 });
  // String "true" dari form tetap diterima.
  assert.equal(v.validasiMulai({ ...mulaiValid, persetujuan: "true" }).persetujuan, true);
});

test("validasiMulai mewajibkan nama dan nomor HP responden", () => {
  assert.throws(() => v.validasiMulai({ ...mulaiValid, nama_responden: "  " }), { statusCode: 400 });
  assert.throws(() => v.validasiMulai({ ...mulaiValid, nomor_hp_responden: "" }), { statusCode: 400 });
});

test("validasiMulai menolak nomor HP yang bukan angka", () => {
  assert.throws(() => v.validasiMulai({ ...mulaiValid, nomor_hp_responden: "08-bukan-nomor" }), {
    statusCode: 400
  });
});

test("validasiJawaban mengubah id menjadi angka", () => {
  assert.deepEqual(v.validasiJawaban({ pertanyaan_id: "3", opsi_jawaban_id: "9" }), {
    pertanyaan_id: 3,
    opsi_jawaban_id: 9
  });
});

test("validasiJawaban menolak id yang tidak sah", () => {
  assert.throws(() => v.validasiJawaban({ pertanyaan_id: "x", opsi_jawaban_id: "9" }), { statusCode: 400 });
  assert.throws(() => v.validasiJawaban({ pertanyaan_id: "3" }), { statusCode: 400 });
  assert.throws(() => v.validasiJawaban(null), { statusCode: 400 });
});
