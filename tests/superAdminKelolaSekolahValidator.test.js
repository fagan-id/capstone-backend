import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdSekolah,
  validasiQueryDaftarSekolah,
  validasiTambahSekolah,
  validasiUpdateSekolah
} from "../src/validators/superAdmin/superAdminKelolaSekolah.js";

test("validasiIdSekolah menerima angka positif dan menolak selainnya", () => {
  assert.equal(validasiIdSekolah("1"), 1);
  assert.equal(validasiIdSekolah(42), 42);

  assert.throws(() => validasiIdSekolah("0"), /ID sekolah tidak valid/);
  assert.throws(() => validasiIdSekolah("-5"), /ID sekolah tidak valid/);
  assert.throws(() => validasiIdSekolah("abc"), /ID sekolah tidak valid/);
  assert.throws(() => validasiIdSekolah(null), /ID sekolah tidak valid/);
});

test("validasiQueryDaftarSekolah mengatur nilai default dan batas dengan benar", () => {
  const def = validasiQueryDaftarSekolah({});
  assert.equal(def.page, 1);
  assert.equal(def.limit, 10);
  assert.equal(def.search, undefined);
  assert.equal(def.status, undefined);
  assert.equal(def.sortBy, "created_at");
  assert.equal(def.sortOrder, "desc");

  // Batas limit maksimal 100
  const maks = validasiQueryDaftarSekolah({ limit: "500", page: "2" });
  assert.equal(maks.limit, 100);
  assert.equal(maks.page, 2);

  // Status parsing
  assert.equal(validasiQueryDaftarSekolah({ status: "aktif" }).status, true);
  assert.equal(validasiQueryDaftarSekolah({ status: "true" }).status, true);
  assert.equal(validasiQueryDaftarSekolah({ status: "nonaktif" }).status, false);
  assert.equal(validasiQueryDaftarSekolah({ status: "false" }).status, false);
  assert.equal(validasiQueryDaftarSekolah({ status: "all" }).status, undefined);

  // Sorting
  assert.equal(validasiQueryDaftarSekolah({ sortBy: "nama" }).sortBy, "nama");
  assert.equal(validasiQueryDaftarSekolah({ sortBy: "nama" }).sortOrder, "asc");
  assert.equal(validasiQueryDaftarSekolah({ sortBy: "total_sesi", sortOrder: "desc" }).sortBy, "total_sesi");
  assert.equal(validasiQueryDaftarSekolah({ sortBy: "total_sesi", sortOrder: "desc" }).sortOrder, "desc");
});

test("validasiTambahSekolah memvalidasi input wajib", () => {
  // Sukses dengan field minimal (sesuai UI Modal Tambah Sekolah)
  const valid = validasiTambahSekolah({
    nama: "  SDN Sukamaju 01  ",
    email: " Admin@Sukamaju.sch.id ",
    password: "Password123!",
    aktif: true
  });

  assert.equal(valid.nama, "SDN Sukamaju 01");
  assert.equal(valid.email, "admin@sukamaju.sch.id");
  assert.equal(valid.password, "Password123!");
  assert.equal(valid.aktif, true);

  // Gagal jika nama kosong atau terlalu pendek
  assert.throws(() => validasiTambahSekolah({}), /Nama sekolah wajib diisi/);
  assert.throws(() => validasiTambahSekolah({ nama: "SD" }), /Nama sekolah minimal 3 karakter/);

  // Gagal jika email kosong atau format tidak valid
  assert.throws(
    () => validasiTambahSekolah({ nama: "SD Test", email: "bukan-email" }),
    /Format email admin sekolah tidak valid/
  );

  // Gagal jika password kosong atau terlalu pendek
  assert.throws(
    () => validasiTambahSekolah({ nama: "SD Test", email: "admin@test.com", password: "123" }),
    /Password minimal 6 karakter/
  );

  // Gagal jika NPSN disediakan tapi bukan 8 digit angka
  const dasar = { nama: "SD Test", email: "admin@test.com", password: "password123" };
  assert.throws(() => validasiTambahSekolah({ ...dasar, npsn: "123" }), /NPSN harus terdiri dari 8 digit angka/);
  assert.throws(() => validasiTambahSekolah({ ...dasar, npsn: "ABCD-123" }), /NPSN harus terdiri dari 8 digit angka/);
  assert.equal(validasiTambahSekolah({ ...dasar, npsn: " 20104567 " }).npsn, "20104567");

  // Status aktif: default true, string true/false/1/0 diterima, nilai lain ditolak
  assert.equal(validasiTambahSekolah(dasar).aktif, true);
  assert.equal(validasiTambahSekolah({ ...dasar, aktif: "false" }).aktif, false);
  assert.equal(validasiTambahSekolah({ ...dasar, aktif: "1" }).aktif, true);
  assert.throws(() => validasiTambahSekolah({ ...dasar, aktif: "aktif" }), /harus bernilai true atau false/);
  assert.throws(() => validasiTambahSekolah({ ...dasar, aktif: 1 }), /harus bernilai true atau false/);

  // Gagal jika username mengandung @
  assert.throws(
    () =>
      validasiTambahSekolah({
        nama: "SD Test",
        email: "admin@test.com",
        password: "password123",
        username: "user@invalid"
      }),
    /Username tidak boleh mengandung karakter '@'/
  );
});

test("validasiUpdateSekolah memvalidasi pembaruan parsial", () => {
  // Hanya ubah status aktif
  const hanyaStatus = validasiUpdateSekolah({ aktif: false });
  assert.equal(hanyaStatus.aktif, false);
  assert.equal(hanyaStatus.nama, undefined);
  assert.equal(hanyaStatus.password, undefined);

  // Ubah nama dan email
  const ubahNamaEmail = validasiUpdateSekolah({
    nama: "SDN Sukamaju Baru",
    email: "NEW_ADMIN@sekolah.sch.id"
  });
  assert.equal(ubahNamaEmail.nama, "SDN Sukamaju Baru");
  assert.equal(ubahNamaEmail.email, "new_admin@sekolah.sch.id");

  // Password kosong diabaikan (kosongkan jika tidak ingin mengubah password)
  const passwordKosong = validasiUpdateSekolah({ password: "" });
  assert.equal(passwordKosong.password, undefined);

  // Password baru yang valid diproses
  const passwordBaru = validasiUpdateSekolah({ password: "NewPassword123!" });
  assert.equal(passwordBaru.password, "NewPassword123!");

  // Password disimpan apa adanya (login tidak men-trim), spasi saja tetap dianggap kosong
  assert.equal(validasiUpdateSekolah({ password: " Rahasia123 " }).password, " Rahasia123 ");
  assert.equal(validasiUpdateSekolah({ password: "   " }).password, undefined);
  assert.equal(
    validasiTambahSekolah({ nama: "SD Test", email: "a@test.com", password: " Rahasia123 " }).password,
    " Rahasia123 "
  );
  assert.throws(
    () => validasiTambahSekolah({ nama: "SD Test", email: "a@test.com", password: "   " }),
    /Password admin sekolah wajib diisi/
  );

  // Password terlalu pendek ditolak
  assert.throws(() => validasiUpdateSekolah({ password: "123" }), /Password baru minimal 6 karakter/);

  // Email tidak valid ditolak
  assert.throws(() => validasiUpdateSekolah({ email: "invalid-email" }), /Format email admin sekolah tidak valid/);

  // Typo status tidak boleh diam-diam menonaktifkan sekolah
  assert.throws(() => validasiUpdateSekolah({ aktif: "yes" }), /harus bernilai true atau false/);
  assert.equal(validasiUpdateSekolah({ aktif: "0" }).aktif, false);
  assert.equal(validasiUpdateSekolah({ aktif: null }).aktif, undefined);

  // NPSN harus angka
  assert.throws(() => validasiUpdateSekolah({ npsn: "1234567a" }), /NPSN harus terdiri dari 8 digit angka/);
  assert.equal(validasiUpdateSekolah({ npsn: "20104567" }).npsn, "20104567");
});
