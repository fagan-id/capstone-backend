import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdPertanyaan,
  validasiQueryDaftarPertanyaan,
  validasiTambahPertanyaan,
  validasiUpdatePertanyaan,
  validasiBatchUrutanPertanyaan
} from "../src/validators/superAdmin/superAdminPertanyaanSkrining.js";

// ==========================================
// 1. Validasi ID Pertanyaan
// ==========================================
test("validasiIdPertanyaan menerima integer positif", () => {
  assert.equal(validasiIdPertanyaan(1), 1);
  assert.equal(validasiIdPertanyaan("15"), 15);
});

test("validasiIdPertanyaan menolak ID tidak valid", () => {
  assert.throws(() => validasiIdPertanyaan("abc"), /ID pertanyaan tidak valid/);
  assert.throws(() => validasiIdPertanyaan(0), /ID pertanyaan tidak valid/);
  assert.throws(() => validasiIdPertanyaan(-3), /ID pertanyaan tidak valid/);
  assert.throws(() => validasiIdPertanyaan(2.5), /ID pertanyaan tidak valid/);
  assert.throws(() => validasiIdPertanyaan(null), /ID pertanyaan tidak valid/);
});

// ==========================================
// 2. Validasi Query Daftar Pertanyaan
// ==========================================
test("validasiQueryDaftarPertanyaan menggunakan nilai default", () => {
  const hasil = validasiQueryDaftarPertanyaan({});
  assert.equal(hasil.page, 1);
  assert.equal(hasil.limit, 10);
  assert.equal(hasil.search, undefined);
  assert.equal(hasil.kategori_id, undefined);
  assert.equal(hasil.status, undefined);
});

test("validasiQueryDaftarPertanyaan memproses parameter query lengkap dan batas limit", () => {
  const hasil = validasiQueryDaftarPertanyaan({
    page: "3",
    limit: "250",
    search: "  sering cemas  ",
    kategori_id: "2",
    status: "aktif"
  });

  assert.equal(hasil.page, 3);
  assert.equal(hasil.limit, 100);
  assert.equal(hasil.search, "sering cemas");
  assert.equal(hasil.kategori_id, 2);
  assert.equal(hasil.status, true);
});

test("validasiQueryDaftarPertanyaan memproses status nonaktif", () => {
  const hasil = validasiQueryDaftarPertanyaan({ status: "nonaktif" });
  assert.equal(hasil.status, false);
});

test("validasiQueryDaftarPertanyaan menolak kategori_id tidak valid", () => {
  assert.throws(
    () => validasiQueryDaftarPertanyaan({ kategori_id: "invalid" }),
    /Filter kategori tidak valid/
  );
});

// ==========================================
// 3. Validasi Tambah Pertanyaan (POST)
// ==========================================
const opsiValid = [
  { label: "0", teks: "Tidak Pernah", skor: 0, urutan: 1 },
  { label: "1", teks: "Kadang-kadang", skor: 1, urutan: 2 },
  { label: "2", teks: "Sering", skor: 2, urutan: 3 }
];

test("validasiTambahPertanyaan sukses untuk payload valid Level 1", () => {
  const hasil = validasiTambahPertanyaan({
    teks: "Apakah anak sering tampak cemas tanpa sebab?",
    kalimat_pengantar: "Perhatikan perilaku 6 bulan terakhir",
    kategori_asesmen_id: 2,
    tipe_jawaban: "skala",
    nomor_urut: 5,
    aktif: true,
    opsi_jawaban: opsiValid,
    kondisi_pemicu: {
      pemicu_pertanyaan_id: 1,
      pemicu_opsi_id: 3,
      operator: "eq"
    }
  }, 1);

  assert.equal(hasil.teks, "Apakah anak sering tampak cemas tanpa sebab?");
  assert.equal(hasil.kalimat_pengantar, "Perhatikan perilaku 6 bulan terakhir");
  assert.equal(hasil.kategori_asesmen_id, 2);
  assert.equal(hasil.tipe_jawaban, "skala");
  assert.equal(hasil.nomor_urut, 5);
  assert.equal(hasil.aktif, true);
  assert.equal(hasil.opsi_jawaban.length, 3);
  assert.equal(hasil.kondisi_pemicu.pemicu_pertanyaan_id, 1);
  assert.equal(hasil.kondisi_pemicu.pemicu_opsi_id, 3);
  assert.equal(hasil.kondisi_pemicu.operator, "eq");
});

test("validasiTambahPertanyaan mewajibkan kategori_asesmen_id pada Level 1", () => {
  assert.throws(
    () => validasiTambahPertanyaan({ teks: "Pertanyaan uji", opsi_jawaban: opsiValid }, 1),
    /Domain\/kategori asesmen wajib dipilih untuk pertanyaan Level 1/
  );
});

test("validasiTambahPertanyaan mengizinkan tanpa kategori_asesmen_id pada Level 2 (diisi dari tes)", () => {
  const hasil = validasiTambahPertanyaan({
    teks: "Pertanyaan uji level 2",
    tipe_jawaban: "ya_tidak",
    opsi_jawaban: [
      { label: "Ya", teks: "Ya", skor: 1, urutan: 1 },
      { label: "Tidak", teks: "Tidak", skor: 0, urutan: 2 }
    ]
  }, 2);

  assert.equal(hasil.teks, "Pertanyaan uji level 2");
  assert.equal(hasil.kategori_asesmen_id, undefined);
  assert.equal(hasil.tipe_jawaban, "ya_tidak");
});

test("validasiTambahPertanyaan menolak jika isi teks kosong atau terlalu pendek", () => {
  assert.throws(
    () => validasiTambahPertanyaan({ teks: "", opsi_jawaban: opsiValid }, 1),
    /Isi pertanyaan wajib diisi/
  );
  assert.throws(
    () => validasiTambahPertanyaan({ teks: "ab", opsi_jawaban: opsiValid }, 1),
    /Isi pertanyaan minimal 3 karakter/
  );
});

test("validasiTambahPertanyaan menolak tipe_jawaban tidak didukung", () => {
  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      tipe_jawaban: "esai",
      opsi_jawaban: opsiValid
    }, 1),
    /Format jawaban tidak valid/
  );
});

test("validasiTambahPertanyaan menolak jika opsi jawaban kurang dari 2", () => {
  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      opsi_jawaban: [{ label: "A", teks: "Opsi", skor: 1, urutan: 1 }]
    }, 1),
    /Pertanyaan harus memiliki minimal 2 pilihan jawaban/
  );
});

test("validasiTambahPertanyaan menolak duplikasi urutan pada opsi jawaban", () => {
  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      opsi_jawaban: [
        { label: "A", teks: "Opsi 1", skor: 0, urutan: 1 },
        { label: "B", teks: "Opsi 2", skor: 1, urutan: 1 }
      ]
    }, 1),
    /Urutan pilihan jawaban 1 tidak boleh duplikat/
  );
});

test("validasiTambahPertanyaan menolak opsi jawaban dengan label > 10 karakter atau skor negatif", () => {
  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      opsi_jawaban: [
        { label: "LABEL TERLALU PANJANG SEKALI", teks: "Opsi 1", skor: 0, urutan: 1 },
        { label: "B", teks: "Opsi 2", skor: 1, urutan: 2 }
      ]
    }, 1),
    /Label pada pilihan jawaban ke-1 maksimal 10 karakter/
  );

  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      opsi_jawaban: [
        { label: "A", teks: "Opsi 1", skor: -1, urutan: 1 },
        { label: "B", teks: "Opsi 2", skor: 1, urutan: 2 }
      ]
    }, 1),
    /Nilai\/skor pada pilihan jawaban ke-1 harus berupa bilangan bulat non-negatif/
  );
});

test("validasiTambahPertanyaan menolak kondisi pemicu tanpa pemicu_pertanyaan_id atau operator salah", () => {
  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      opsi_jawaban: opsiValid,
      kondisi_pemicu: { pemicu_opsi_id: 2 }
    }, 1),
    /ID pertanyaan pemicu wajib diisi/
  );

  assert.throws(
    () => validasiTambahPertanyaan({
      teks: "Pertanyaan",
      kategori_asesmen_id: 1,
      opsi_jawaban: opsiValid,
      kondisi_pemicu: { pemicu_pertanyaan_id: 1, operator: "invalid_op" }
    }, 1),
    /Operator kondisi pemicu tidak valid/
  );
});

// ==========================================
// 4. Validasi Update Pertanyaan (PUT/PATCH)
// ==========================================
test("validasiUpdatePertanyaan menerima pembaruan parsial", () => {
  const hasil = validasiUpdatePertanyaan({
    teks: "Pertanyaan diperbarui",
    aktif: false,
    kondisi_pemicu: null
  });

  assert.equal(hasil.teks, "Pertanyaan diperbarui");
  assert.equal(hasil.aktif, false);
  assert.equal(hasil.kondisi_pemicu, null);
  assert.equal(hasil.tipe_jawaban, undefined);
});

test("validasiUpdatePertanyaan memvalidasi opsi jawaban jika dikirimkan", () => {
  const hasil = validasiUpdatePertanyaan({
    opsi_jawaban: opsiValid
  });

  assert.equal(hasil.opsi_jawaban.length, 3);
});

// ==========================================
// 5. Validasi Batch Urutan Pertanyaan (PATCH /urutan)
// ==========================================
test("validasiBatchUrutanPertanyaan menerima daftar urutan valid", () => {
  const hasil = validasiBatchUrutanPertanyaan({
    urutan: [
      { id: 10, nomor_urut: 1 },
      { id: 12, nomor_urut: 2 },
      { id: 15, nomor_urut: 3 }
    ]
  });

  assert.equal(hasil.length, 3);
  assert.equal(hasil[0].id, 10);
  assert.equal(hasil[0].nomor_urut, 1);
});

test("validasiBatchUrutanPertanyaan menolak duplikasi ID atau nomor_urut", () => {
  assert.throws(
    () => validasiBatchUrutanPertanyaan({
      urutan: [
        { id: 10, nomor_urut: 1 },
        { id: 10, nomor_urut: 2 }
      ]
    }),
    /ID pertanyaan 10 duplikat/
  );

  assert.throws(
    () => validasiBatchUrutanPertanyaan({
      urutan: [
        { id: 10, nomor_urut: 1 },
        { id: 12, nomor_urut: 1 }
      ]
    }),
    /Nomor urut 1 duplikat/
  );
});

test("validasiBatchUrutanPertanyaan menolak jika array kosong", () => {
  assert.throws(
    () => validasiBatchUrutanPertanyaan({ urutan: [] }),
    /Daftar urutan pertanyaan harus berupa array dan tidak boleh kosong/
  );
});
