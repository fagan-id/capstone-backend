import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdSiswa,
  validasiQueryDaftarSiswa,
  validasiTambahSiswa,
  validasiUpdateSiswa
} from "../src/validators/sekolah/sekolahSiswa.js";

// 22 Nov 2026 pukul 06.00 WIB
const SEKARANG = new Date("2026-11-21T23:00:00Z");

const dasar = {
  nisn: "0123456789",
  nama: "Budi Santoso",
  tanggal_lahir: "2017-05-12",
  jenis_kelamin: "L",
  kelas_id: 1
};

test("validasiIdSiswa menerima bilangan bulat positif saja", () => {
  assert.equal(validasiIdSiswa("4"), 4);
  for (const salah of ["0", "-2", "x", "1.5", undefined]) {
    assert.throws(() => validasiIdSiswa(salah), /ID siswa tidak valid/);
  }
});

test("validasiTambahSiswa merapikan input yang valid", () => {
  const hasil = validasiTambahSiswa(
    { nisn: " 0123456789 ", nama: "  Budi Santoso ", tanggal_lahir: "2017-05-12", jenis_kelamin: "p", kelas_id: "3" },
    SEKARANG
  );
  assert.deepEqual(hasil, {
    nisn: "0123456789",
    nama: "Budi Santoso",
    tanggal_lahir: new Date("2017-05-12T00:00:00Z"),
    jenis_kelamin: "P",
    kelas_id: 3
  });
});

test("validasiTambahSiswa: NISN tepat 10 digit dan tidak kehilangan nol di depan", () => {
  for (const nisn of ["123456789", "12345678901", "01234567ab", 123456789, undefined]) {
    assert.throws(() => validasiTambahSiswa({ ...dasar, nisn }, SEKARANG), /NISN harus terdiri dari 10 digit angka/);
  }
});

test("validasiTambahSiswa: nama 3-150 karakter", () => {
  assert.throws(() => validasiTambahSiswa({ ...dasar, nama: " " }, SEKARANG), /Nama siswa wajib diisi/);
  assert.throws(() => validasiTambahSiswa({ ...dasar, nama: "Al" }, SEKARANG), /Nama siswa minimal 3 karakter/);
  assert.throws(() => validasiTambahSiswa({ ...dasar, nama: "x".repeat(151) }, SEKARANG), /Nama siswa maksimal 150 karakter/);
});

test("validasiTambahSiswa: tanggal lahir harus tanggal nyata dan bukan di masa depan (WIB)", () => {
  for (const tanggal_lahir of ["12-05-2017", "2017-02-30", "2017-13-01", "2017-5-1", undefined]) {
    assert.throws(
      () => validasiTambahSiswa({ ...dasar, tanggal_lahir }, SEKARANG),
      /Tanggal lahir harus berformat YYYY-MM-DD/
    );
  }

  // Hari ini menurut WIB (22 Nov) masih boleh, walau di UTC masih 21 Nov
  assert.equal(validasiTambahSiswa({ ...dasar, tanggal_lahir: "2026-11-22" }, SEKARANG).tanggal_lahir.getTime(),
    Date.UTC(2026, 10, 22));
  assert.throws(
    () => validasiTambahSiswa({ ...dasar, tanggal_lahir: "2026-11-23" }, SEKARANG),
    /Tanggal lahir tidak boleh di masa depan/
  );
});

test("validasiTambahSiswa: jenis kelamin L/P dan kelas_id wajib", () => {
  assert.throws(() => validasiTambahSiswa({ ...dasar, jenis_kelamin: "X" }, SEKARANG), /Jenis kelamin harus L atau P/);
  assert.throws(() => validasiTambahSiswa({ ...dasar, jenis_kelamin: undefined }, SEKARANG), /Jenis kelamin harus L atau P/);
  assert.throws(() => validasiTambahSiswa({ ...dasar, kelas_id: undefined }, SEKARANG), /ID kelas tidak valid/);
  assert.throws(() => validasiTambahSiswa({ ...dasar, kelas_id: "0" }, SEKARANG), /ID kelas tidak valid/);
});

test("validasiUpdateSiswa hanya memproses field yang dikirim", () => {
  assert.deepEqual(validasiUpdateSiswa({}, SEKARANG), {});
  assert.deepEqual(validasiUpdateSiswa({ kelas_id: "2", jenis_kelamin: "l" }, SEKARANG), { kelas_id: 2, jenis_kelamin: "L" });
  assert.throws(() => validasiUpdateSiswa({ nisn: "123" }, SEKARANG), /NISN harus terdiri dari 10 digit angka/);
  assert.throws(() => validasiUpdateSiswa({ tanggal_lahir: "2030-01-01" }, SEKARANG), /masa depan/);
});

test("validasiQueryDaftarSiswa: paginasi default, kelas_id salah ditolak", () => {
  assert.deepEqual(validasiQueryDaftarSiswa({}), { page: 1, limit: 10, search: undefined, kelas_id: undefined });
  assert.deepEqual(validasiQueryDaftarSiswa({ page: "2", limit: "500", search: "  Budi ", kelas_id: "3" }), {
    page: 2,
    limit: 100,
    search: "Budi",
    kelas_id: 3
  });
  assert.deepEqual(validasiQueryDaftarSiswa({ page: "abc", limit: "-1", search: " ", kelas_id: "" }), {
    page: 1,
    limit: 10,
    search: undefined,
    kelas_id: undefined
  });
  assert.throws(() => validasiQueryDaftarSiswa({ kelas_id: "abc" }), /ID kelas tidak valid/);
});
