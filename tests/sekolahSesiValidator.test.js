import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdSesi,
  validasiQueryDaftarSesi,
  validasiTambahSesi,
  validasiUpdateSesi
} from "../src/validators/sekolah/sekolahSesi.js";

const ditolak = (pola) => (err) => err.statusCode === 400 && pola.test(err.message);

test("validasiTambahSesi merapikan nama dan mewajibkan tes_skrining_id", () => {
  assert.deepEqual(validasiTambahSesi({ nama: "  Skrining Kelas 4  ", tes_skrining_id: "24" }), {
    nama: "Skrining Kelas 4",
    tes_skrining_id: 24
  });
  assert.throws(() => validasiTambahSesi({ nama: "Skrining" }), ditolak(/tes skrining/i));
  assert.throws(() => validasiTambahSesi({ nama: "Skrining", tes_skrining_id: 0 }), ditolak(/tes skrining/i));
  assert.throws(() => validasiTambahSesi({ nama: "ab", tes_skrining_id: 1 }), ditolak(/minimal 3/));
  assert.throws(() => validasiTambahSesi({ nama: "a".repeat(151), tes_skrining_id: 1 }), ditolak(/maksimal 150/));
  assert.throws(() => validasiTambahSesi({ tes_skrining_id: 1 }), ditolak(/wajib/));
});

test("validasiUpdateSesi hanya menerima nama", () => {
  assert.deepEqual(validasiUpdateSesi({ nama: " Sesi Baru " }), { nama: "Sesi Baru" });
  assert.throws(() => validasiUpdateSesi({ nama: "Sesi", tes_skrining_id: 2 }), ditolak(/tidak dapat diubah/));
  assert.throws(() => validasiUpdateSesi({ nama: "Sesi", status: "selesai" }), ditolak(/tidak dapat diubah/));
  assert.throws(() => validasiUpdateSesi({}), ditolak(/wajib/));
});

test("validasiQueryDaftarSesi: paginasi salah kembali ke default, status salah ditolak", () => {
  assert.deepEqual(validasiQueryDaftarSesi({ page: "x", limit: "-1" }), { page: 1, limit: 10, status: undefined });
  assert.deepEqual(validasiQueryDaftarSesi({ status: "aktif", limit: "500" }), { page: 1, limit: 100, status: "aktif" });
  assert.throws(() => validasiQueryDaftarSesi({ status: "menunggu" }), ditolak(/status/i));
});

test("validasiIdSesi menolak id bukan bilangan bulat positif", () => {
  assert.equal(validasiIdSesi("7"), 7);
  assert.throws(() => validasiIdSesi("abc"), ditolak(/ID sesi/));
});
