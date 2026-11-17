import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validasiIdNumerik,
  validasiKondisiLevel1,
  parseInterpretasiIdLevel1,
  validasiUpdateInterpretasiLevel1,
  validasiUpdateInterpretasiLevel2
} from "../src/validators/superAdmin/superAdminInterpretasiSkrining.js";

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
// 2. Validasi Kondisi Level 1
// ==========================================
test("validasiKondisiLevel1 menerima dan menormalisasi kondisi valid", () => {
  assert.equal(validasiKondisiLevel1("belum_memenuhi"), "belum_memenuhi");
  assert.equal(validasiKondisiLevel1("tidak_terindikasi"), "belum_memenuhi");
  assert.equal(validasiKondisiLevel1("normal"), "belum_memenuhi");
  assert.equal(validasiKondisiLevel1("memenuhi"), "memenuhi");
  assert.equal(validasiKondisiLevel1("terindikasi"), "memenuhi");
  assert.equal(validasiKondisiLevel1("lanjutan"), "memenuhi");
});

test("validasiKondisiLevel1 menolak kondisi tidak valid", () => {
  assert.throws(() => validasiKondisiLevel1("invalid_kondisi"), /Kondisi interpretasi 'invalid_kondisi' tidak valid/);
  assert.throws(() => validasiKondisiLevel1(123), /Kondisi interpretasi Level 1 tidak valid/);
});

// ==========================================
// 3. Parser ID Interpretasi Level 1
// ==========================================
test("parseInterpretasiIdLevel1 mem-parsing compound ID", () => {
  const r1 = parseInterpretasiIdLevel1("1-belum_memenuhi");
  assert.equal(r1.domainId, 1);
  assert.equal(r1.kondisi, "belum_memenuhi");

  const r2 = parseInterpretasiIdLevel1("5-memenuhi");
  assert.equal(r2.domainId, 5);
  assert.equal(r2.kondisi, "memenuhi");
});

test("parseInterpretasiIdLevel1 mem-parsing ID murni numerik beserta kondisi query/body", () => {
  const r1 = parseInterpretasiIdLevel1("2", "belum_memenuhi");
  assert.equal(r1.domainId, 2);
  assert.equal(r1.kondisi, "belum_memenuhi");

  const r2 = parseInterpretasiIdLevel1(3, undefined, "memenuhi");
  assert.equal(r2.domainId, 3);
  assert.equal(r2.kondisi, "memenuhi");

  const r3 = parseInterpretasiIdLevel1("4");
  assert.equal(r3.domainId, 4);
  assert.equal(r3.kondisi, undefined);
});

// ==========================================
// 4. Validasi Update Interpretasi Level 1
// ==========================================
test("validasiUpdateInterpretasiLevel1 memproses update kondisi tunggal", () => {
  const hasil = validasiUpdateInterpretasiLevel1({
    kondisi: "belum_memenuhi",
    deskripsi: "  Perkembangan sesuai usia.  ",
    rekomendasi: "Pantau rutin."
  });

  assert.equal(hasil.tipe, "single");
  assert.equal(hasil.kondisi, "belum_memenuhi");
  assert.equal(hasil.deskripsi, "Perkembangan sesuai usia.");
  assert.equal(hasil.rekomendasi, "Pantau rutin.");
});

test("validasiUpdateInterpretasiLevel1 memanfaatkan kondisi dari parameter/path", () => {
  const hasil = validasiUpdateInterpretasiLevel1(
    { deskripsi: "Observasi lanjutan diperlukan." },
    "memenuhi"
  );

  assert.equal(hasil.tipe, "single");
  assert.equal(hasil.kondisi, "memenuhi");
  assert.equal(hasil.deskripsi, "Observasi lanjutan diperlukan.");
});

test("validasiUpdateInterpretasiLevel1 memproses format batch kedua kondisi", () => {
  const hasil = validasiUpdateInterpretasiLevel1({
    belum_memenuhi: {
      deskripsi: "Normal",
      rekomendasi: "Pemantauan berkala"
    },
    memenuhi: {
      deskripsi: "Perlu tindak lanjut",
      rekomendasi: "Konsultasi profesional"
    }
  });

  assert.equal(hasil.tipe, "batch");
  assert.equal(hasil.belum_memenuhi.deskripsi, "Normal");
  assert.equal(hasil.memenuhi.rekomendasi, "Konsultasi profesional");
});

test("validasiUpdateInterpretasiLevel1 menolak payload tanpa kondisi atau data", () => {
  assert.throws(
    () => validasiUpdateInterpretasiLevel1(null),
    /Data pembaruan interpretasi harus berupa objek JSON/
  );
  assert.throws(
    () => validasiUpdateInterpretasiLevel1({ deskripsi: "Teks" }),
    /Kondisi hasil interpretasi Level 1 wajib ditentukan/
  );
  assert.throws(
    () => validasiUpdateInterpretasiLevel1({ kondisi: "memenuhi" }),
    /Permintaan pembaruan interpretasi harus memuat setidaknya/
  );
});

// ==========================================
// 5. Validasi Update Interpretasi Level 2
// ==========================================
test("validasiUpdateInterpretasiLevel2 memproses update deskripsi dan rekomendasi", () => {
  const hasil = validasiUpdateInterpretasiLevel2({
    deskripsi: "Tingkat gejala sedang.",
    rekomendasi: "Pertimbangkan rujukan profesional."
  });

  assert.equal(hasil.deskripsi, "Tingkat gejala sedang.");
  assert.equal(hasil.rekomendasi, "Pertimbangkan rujukan profesional.");
});

test("validasiUpdateInterpretasiLevel2 mengosongkan teks jika dikirimkan string kosong", () => {
  const hasil = validasiUpdateInterpretasiLevel2({
    deskripsi: "   ",
    rekomendasi: null
  });

  assert.equal(hasil.deskripsi, null);
  assert.equal(hasil.rekomendasi, null);
});

test("validasiUpdateInterpretasiLevel2 menolak payload kosong atau salah tipe", () => {
  assert.throws(
    () => validasiUpdateInterpretasiLevel2({}),
    /Permintaan pembaruan interpretasi harus memuat setidaknya/
  );
  assert.throws(
    () => validasiUpdateInterpretasiLevel2({ deskripsi: 12345 }),
    /Field 'deskripsi' harus berupa teks/
  );
  assert.throws(
    () => validasiUpdateInterpretasiLevel2({ deskripsi: "x".repeat(5001) }),
    /tidak boleh melebihi 5000 karakter/
  );
});
