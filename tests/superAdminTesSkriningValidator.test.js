import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdTesSkrining,
  validasiQueryDaftarTesSkrining,
  validasiTambahTesSkrining,
  validasiUpdateTesSkrining
} from "../src/validators/superAdmin/superAdminTesSkrining.js";

// ==========================================
// 1. Validasi ID Tes Skrining
// ==========================================
test("validasiIdTesSkrining menerima angka bulat positif", () => {
  assert.equal(validasiIdTesSkrining(1), 1);
  assert.equal(validasiIdTesSkrining("42"), 42);
});

test("validasiIdTesSkrining menolak ID tidak valid (bukan angka, <= 0, float)", () => {
  assert.throws(() => validasiIdTesSkrining("abc"), /ID tes skrining tidak valid/);
  assert.throws(() => validasiIdTesSkrining(0), /ID tes skrining tidak valid/);
  assert.throws(() => validasiIdTesSkrining(-5), /ID tes skrining tidak valid/);
  assert.throws(() => validasiIdTesSkrining(1.5), /ID tes skrining tidak valid/);
  assert.throws(() => validasiIdTesSkrining(null), /ID tes skrining tidak valid/);
});

// ==========================================
// 2. Validasi Query Daftar Tes Skrining
// ==========================================
test("validasiQueryDaftarTesSkrining mengatur nilai default dengan benar", () => {
  const hasil = validasiQueryDaftarTesSkrining({});
  assert.equal(hasil.page, 1);
  assert.equal(hasil.limit, 10);
  assert.equal(hasil.search, undefined);
  assert.equal(hasil.level, undefined);
  assert.equal(hasil.status, undefined);
  assert.equal(hasil.sortBy, "created_at");
  assert.equal(hasil.sortOrder, "desc");
});

test("validasiQueryDaftarTesSkrining memproses search, filter level & status, serta batas limit", () => {
  const hasil = validasiQueryDaftarTesSkrining({
    page: "2",
    limit: "500", // Melebihi batas maksimal 100
    search: "  Somatic  ",
    level: "1",
    status: "aktif",
    sortBy: "nama",
    sortOrder: "asc"
  });

  assert.equal(hasil.page, 2);
  assert.equal(hasil.limit, 100);
  assert.equal(hasil.search, "Somatic");
  assert.equal(hasil.level, 1);
  assert.equal(hasil.status, true);
  assert.equal(hasil.sortBy, "nama");
  assert.equal(hasil.sortOrder, "asc");
});

test("validasiQueryDaftarTesSkrining menolak filter level selain 1 dan 2", () => {
  assert.throws(
    () => validasiQueryDaftarTesSkrining({ level: "3" }),
    /Filter level hanya boleh bernilai 1 atau 2/
  );
  assert.throws(
    () => validasiQueryDaftarTesSkrining({ level: "invalid" }),
    /Filter level hanya boleh bernilai 1 atau 2/
  );
});

test("validasiQueryDaftarTesSkrining memproses filter status boolean dan string", () => {
  assert.equal(validasiQueryDaftarTesSkrining({ status: "nonaktif" }).status, false);
  assert.equal(validasiQueryDaftarTesSkrining({ status: "false" }).status, false);
  assert.equal(validasiQueryDaftarTesSkrining({ status: "0" }).status, false);
  assert.equal(validasiQueryDaftarTesSkrining({ status: true }).status, true);
  assert.equal(validasiQueryDaftarTesSkrining({ status: false }).status, false);
});

// ==========================================
// 3. Validasi Tambah Tes Skrining (POST)
// ==========================================
test("validasiTambahTesSkrining menerima payload Level 1 yang valid", () => {
  const hasil = validasiTambahTesSkrining({
    level: 1,
    nama: "DSM-5-TR Level 1 Cross-Cutting",
    deskripsi: "Skrining awal untuk seluruh siswa",
    jenjang: "SD",
    aktif: true
  });

  assert.equal(hasil.level, 1);
  assert.equal(hasil.nama, "DSM-5-TR Level 1 Cross-Cutting");
  assert.equal(hasil.deskripsi, "Skrining awal untuk seluruh siswa");
  assert.equal(hasil.jenjang, "SD");
  assert.equal(hasil.aktif, true);
  assert.equal(hasil.kategori_asesmen_id, undefined);
});

test("validasiTambahTesSkrining menerima payload Level 2 yang valid beserta domain", () => {
  const hasil = validasiTambahTesSkrining({
    level: 2,
    nama: "LEVEL 2 - Depression - Parent Item Bank",
    deskripsi: "Instrumen lanjutan untuk domain depresi",
    kategori_asesmen_id: 3,
    aktif: false
  });

  assert.equal(hasil.level, 2);
  assert.equal(hasil.nama, "LEVEL 2 - Depression - Parent Item Bank");
  assert.equal(hasil.deskripsi, "Instrumen lanjutan untuk domain depresi");
  assert.equal(hasil.kategori_asesmen_id, 3);
  assert.equal(hasil.jenjang, "SD"); // Default jenjang
  assert.equal(hasil.aktif, false);
});

test("validasiTambahTesSkrining menolak jika level hilang atau tidak valid", () => {
  assert.throws(
    () => validasiTambahTesSkrining({ nama: "Tes Baru", deskripsi: "Deskripsi" }),
    /Level tes skrining wajib diisi/
  );
  assert.throws(
    () => validasiTambahTesSkrining({ level: 3, nama: "Tes", deskripsi: "Deskripsi" }),
    /Level tes skrining hanya boleh bernilai 1 atau 2/
  );
});

test("validasiTambahTesSkrining menolak jika nama kosong atau panjang di luar batas", () => {
  assert.throws(
    () => validasiTambahTesSkrining({ level: 1, nama: "", deskripsi: "Deskripsi" }),
    /Nama tes skrining wajib diisi/
  );
  assert.throws(
    () => validasiTambahTesSkrining({ level: 1, nama: "AB", deskripsi: "Deskripsi" }),
    /Nama tes skrining minimal 3 karakter/
  );
  assert.throws(
    () => validasiTambahTesSkrining({ level: 1, nama: "A".repeat(151), deskripsi: "Deskripsi" }),
    /Nama tes skrining maksimal 150 karakter/
  );
});

test("validasiTambahTesSkrining menolak jika deskripsi kosong", () => {
  assert.throws(
    () => validasiTambahTesSkrining({ level: 1, nama: "Tes Skrining", deskripsi: "" }),
    /Deskripsi tes skrining wajib diisi/
  );
  assert.throws(
    () => validasiTambahTesSkrining({ level: 1, nama: "Tes Skrining" }),
    /Deskripsi tes skrining wajib diisi/
  );
});

test("validasiTambahTesSkrining mewajibkan kategori_asesmen_id untuk Level 2", () => {
  assert.throws(
    () =>
      validasiTambahTesSkrining({
        level: 2,
        nama: "Tes Level 2",
        deskripsi: "Deskripsi instrumen lanjutan"
      }),
    /Nama domain \(kategori asesmen\) wajib dipilih untuk tes Level 2/
  );
  assert.throws(
    () =>
      validasiTambahTesSkrining({
        level: 2,
        nama: "Tes Level 2",
        deskripsi: "Deskripsi instrumen lanjutan",
        kategori_asesmen_id: 0
      }),
    /ID domain \(kategori asesmen\) tidak valid/
  );
});

// ==========================================
// 4. Validasi Update Overview Tes Skrining (PUT/PATCH)
// ==========================================
test("validasiUpdateTesSkrining memproses pembaruan parsial", () => {
  const hasil = validasiUpdateTesSkrining({
    nama: "Nama Diperbarui",
    aktif: false
  });

  assert.equal(hasil.nama, "Nama Diperbarui");
  assert.equal(hasil.aktif, false);
  assert.equal(hasil.deskripsi, undefined);
  assert.equal(hasil.level, undefined);
});

test("validasiUpdateTesSkrining menolak field string kosong jika dikirimkan", () => {
  assert.throws(
    () => validasiUpdateTesSkrining({ nama: "  " }),
    /Nama tes skrining tidak boleh kosong/
  );
  assert.throws(
    () => validasiUpdateTesSkrining({ deskripsi: "  " }),
    /Deskripsi tes skrining tidak boleh kosong/
  );
  assert.throws(
    () => validasiUpdateTesSkrining({ jenjang: "  " }),
    /Jenjang tidak boleh kosong/
  );
  assert.throws(
    () => validasiUpdateTesSkrining({ level: 5 }),
    /Level tes skrining hanya boleh bernilai 1 atau 2/
  );
});

test("validasiUpdateTesSkrining mengabaikan field tak dikenal (allowlist)", () => {
  const hasil = validasiUpdateTesSkrining({
    nama: "Tes Sah",
    pertanyaan: [{ teks: "Injeksi pertanyaan dilarang" }],
    total_skor: 999,
    super_admin_id: 99
  });

  assert.equal(hasil.nama, "Tes Sah");
  assert.equal(hasil.pertanyaan, undefined);
  assert.equal(hasil.total_skor, undefined);
  assert.equal(hasil.super_admin_id, undefined);
});
