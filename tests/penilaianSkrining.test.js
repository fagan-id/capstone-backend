import { test } from "node:test";
import assert from "node:assert/strict";
import { nilaiKategori } from "../src/services/penilaianSkrining.js";

// Domain DSM-5 contoh: ambang 2 untuk umumnya, 1 untuk inatensi.
const kategori = [
  { id: 1, ambang_batas: 2 }, // somatik
  { id: 2, ambang_batas: 1 }, // inatensi
  { id: 3, ambang_batas: 2 } // perilaku repetitif
];

const pertanyaan = [
  { id: 10, kategori_asesmen_id: 1 },
  { id: 11, kategori_asesmen_id: 1 },
  { id: 20, kategori_asesmen_id: 2 },
  { id: 30, kategori_asesmen_id: 3 },
  { id: 31, kategori_asesmen_id: 3 },
  { id: 32, kategori_asesmen_id: 3 }
];

test("satu jawaban berat menandai hanya domainnya sendiri", () => {
  const hasil = nilaiKategori({
    kategori,
    pertanyaan,
    jawaban: [{ pertanyaan_id: 10, skor: 4 }]
  });

  assert.deepEqual(hasil, [
    { kategori_asesmen_id: 1, skor_tertinggi: 4, ambang_batas: 2, terindikasi: true },
    { kategori_asesmen_id: 2, skor_tertinggi: 0, ambang_batas: 1, terindikasi: false },
    { kategori_asesmen_id: 3, skor_tertinggi: 0, ambang_batas: 2, terindikasi: false }
  ]);
});

test("beberapa jawaban ringan tidak menandai domain walau totalnya melewati ambang", () => {
  // Aturan DSM-5 memakai skor tertinggi per domain, bukan jumlah: 1+1+1 = 3 tetapi tertinggi tetap 1.
  const hasil = nilaiKategori({
    kategori,
    pertanyaan,
    jawaban: [
      { pertanyaan_id: 30, skor: 1 },
      { pertanyaan_id: 31, skor: 1 },
      { pertanyaan_id: 32, skor: 1 }
    ]
  });

  const perilaku = hasil.find((h) => h.kategori_asesmen_id === 3);
  assert.equal(perilaku.skor_tertinggi, 1);
  assert.equal(perilaku.terindikasi, false);
});

test("domain berambang 1 ditandai oleh jawaban yang tidak menandai domain berambang 2", () => {
  const hasil = nilaiKategori({
    kategori,
    pertanyaan,
    jawaban: [
      { pertanyaan_id: 20, skor: 1 }, // inatensi, ambang 1
      { pertanyaan_id: 10, skor: 1 } // somatik, ambang 2
    ]
  });

  assert.equal(hasil.find((h) => h.kategori_asesmen_id === 2).terindikasi, true);
  assert.equal(hasil.find((h) => h.kategori_asesmen_id === 1).terindikasi, false);
});

test("domain tanpa jawaban tidak pernah ditandai", () => {
  const hasil = nilaiKategori({
    kategori: [{ id: 9, ambang_batas: 0 }],
    pertanyaan: [{ id: 90, kategori_asesmen_id: 9 }],
    jawaban: []
  });

  assert.deepEqual(hasil, [
    { kategori_asesmen_id: 9, skor_tertinggi: 0, ambang_batas: 0, terindikasi: false }
  ]);
});

test("jawaban ya/tidak menandai domainnya lewat skor opsinya", () => {
  const hasil = nilaiKategori({
    kategori: [{ id: 12, ambang_batas: 2 }],
    pertanyaan: [{ id: 120, kategori_asesmen_id: 12 }],
    jawaban: [{ pertanyaan_id: 120, skor: 2 }] // opsi "Ya"
  });

  assert.equal(hasil[0].terindikasi, true);
});

test("jawaban atas pertanyaan tes lain diabaikan", () => {
  const hasil = nilaiKategori({
    kategori,
    pertanyaan,
    jawaban: [
      { pertanyaan_id: 999, skor: 4 },
      { pertanyaan_id: 10, skor: 2 }
    ]
  });

  assert.equal(hasil.find((h) => h.kategori_asesmen_id === 1).skor_tertinggi, 2);
});

test("urutan hasil mengikuti urutan kategori yang diberikan", () => {
  const hasil = nilaiKategori({ kategori, pertanyaan, jawaban: [] });

  assert.deepEqual(
    hasil.map((h) => h.kategori_asesmen_id),
    [1, 2, 3]
  );
});
