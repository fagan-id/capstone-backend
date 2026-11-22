import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdKelas,
  validasiQueryDaftarKelas,
  validasiTambahKelas,
  validasiUpdateKelas
} from "../src/validators/sekolah/sekolahKelas.js";

const TA = /Tahun ajaran harus berformat YYYY\/YYYY dengan tahun berurutan/;

test("validasiIdKelas menerima bilangan bulat positif saja", () => {
  assert.equal(validasiIdKelas("3"), 3);
  for (const salah of ["0", "-1", "abc", "1.5", undefined]) {
    assert.throws(() => validasiIdKelas(salah), /ID kelas tidak valid/);
  }
});

test("validasiTambahKelas merapikan input yang valid", () => {
  assert.deepEqual(validasiTambahKelas({ nama: " 4A ", tingkat: "4", tahun_ajaran: "2026/2027" }), {
    nama: "4A",
    tingkat: 4,
    tahun_ajaran: "2026/2027"
  });
});

test("validasiTambahKelas menolak nama, tingkat, dan tahun ajaran yang salah", () => {
  const dasar = { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" };
  assert.throws(() => validasiTambahKelas({ ...dasar, nama: "  " }), /Nama kelas wajib diisi/);
  assert.throws(() => validasiTambahKelas({ ...dasar, nama: "x".repeat(21) }), /Nama kelas maksimal 20 karakter/);

  for (const tingkat of [0, 7, 2.5, "", true, undefined]) {
    assert.throws(() => validasiTambahKelas({ ...dasar, tingkat }), /Tingkat kelas harus bilangan bulat 1 sampai 6/);
  }

  // Format salah, tahun tidak berurutan, atau tidak dikirim
  for (const tahun_ajaran of ["2026-2027", "2026/2028", "2027/2026", "26/27", undefined]) {
    assert.throws(() => validasiTambahKelas({ ...dasar, tahun_ajaran }), TA);
  }
});

test("validasiUpdateKelas hanya memproses field yang dikirim", () => {
  assert.deepEqual(validasiUpdateKelas({}), {});
  assert.deepEqual(validasiUpdateKelas({ tingkat: 5 }), { tingkat: 5 });
  assert.throws(() => validasiUpdateKelas({ tahun_ajaran: "2026/2026" }), TA);
  assert.throws(() => validasiUpdateKelas({ nama: "" }), /Nama kelas wajib diisi/);
});

test("validasiQueryDaftarKelas: filter opsional, nilai salah ditolak", () => {
  assert.deepEqual(validasiQueryDaftarKelas({}), { tahun_ajaran: undefined, tingkat: undefined });
  assert.deepEqual(validasiQueryDaftarKelas({ tahun_ajaran: "2026/2027", tingkat: "4" }), {
    tahun_ajaran: "2026/2027",
    tingkat: 4
  });
  assert.deepEqual(validasiQueryDaftarKelas({ tahun_ajaran: "", tingkat: "" }), {
    tahun_ajaran: undefined,
    tingkat: undefined
  });
  assert.throws(() => validasiQueryDaftarKelas({ tingkat: "9" }), /Tingkat kelas/);
  assert.throws(() => validasiQueryDaftarKelas({ tahun_ajaran: "2026" }), TA);
});
