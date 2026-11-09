import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { buatDataSeed } from "../prisma/seedData.js";

test("buatDataSeed menolak NODE_ENV production", async () => {
  await assert.rejects(buatDataSeed({ NODE_ENV: "production", SEED_PASSWORD: "rahasia123" }), /NODE_ENV=production/);
});

test("buatDataSeed menolak SEED_PASSWORD kosong", async () => {
  await assert.rejects(buatDataSeed({}), /SEED_PASSWORD/);
  await assert.rejects(buatDataSeed({ SEED_PASSWORD: "   " }), /SEED_PASSWORD/);
});

test("buatDataSeed menolak password contoh dari .env.example", async () => {
  await assert.rejects(buatDataSeed({ SEED_PASSWORD: "ganti_password_seed_ini" }), /masih memakai contoh/);
});

test("buatDataSeed menolak SEED_PASSWORD pendek", async () => {
  await assert.rejects(buatDataSeed({ SEED_PASSWORD: "1234567" }), /minimal 8 karakter/);
});

test("buatDataSeed meng-hash password dengan bcrypt", async () => {
  const data = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });
  for (const hash of [data.superAdmin.password_hash, data.sekolah.password_hash]) {
    assert.notEqual(hash, "rahasia123");
    assert.ok(hash.startsWith("$2"));
    assert.equal(await bcrypt.compare("rahasia123", hash), true);
  }
});

test("buatDataSeed mempertahankan nol di depan", async () => {
  const data = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });
  assert.equal(data.sekolah.npsn, "00000001");
  assert.deepEqual(
    data.siswa.map((s) => s.nisn),
    ["0000000001", "0000000002"]
  );
});

test("buatDataSeed menyiapkan domain dengan ambang batas DSM-5", async () => {
  const { kategori } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  assert.ok(kategori.length >= 3);
  for (const k of kategori) {
    assert.ok(k.ambang_batas === 1 || k.ambang_batas === 2, `ambang ${k.nama} harus 1 atau 2`);
  }
  assert.ok(
    kategori.some((k) => k.ambang_batas === 1),
    "setidaknya satu domain berambang 1 (inatensi/psikosis)"
  );
});

test("buatDataSeed memberi urutan domain yang unik dan berurutan", async () => {
  const { kategori } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  assert.deepEqual(
    kategori.map((k) => k.urutan),
    kategori.map((_, i) => i + 1)
  );
});

test("buatDataSeed menyiapkan satu instrumen level 1", async () => {
  const { tes } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  assert.equal(tes.filter((t) => t.level === 1).length, 1);
  assert.ok(tes.some((t) => t.level === 2));
});

test("setiap pertanyaan level 1 punya domain dan opsi berskor", async () => {
  const { tes } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });
  const level1 = tes.find((t) => t.level === 1);

  assert.ok(level1.pertanyaan.length >= 3);
  for (const p of level1.pertanyaan) {
    assert.ok(p.kategori_nama, "pertanyaan harus menunjuk domain");
    assert.ok(["skala", "ya_tidak"].includes(p.tipe_jawaban));
    assert.ok(p.opsi.length >= 2);
    for (const o of p.opsi) {
      assert.equal(typeof o.skor, "number");
    }
    // Skor opsi tidak boleh bergantung pada label yang tampil di layar.
    assert.ok(p.opsi.some((o) => o.skor > 0));
  }
});

test("nomor urut pertanyaan unik di dalam satu instrumen", async () => {
  const { tes } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  for (const t of tes) {
    const nomor = t.pertanyaan.map((p) => p.nomor_urut);
    assert.equal(new Set(nomor).size, nomor.length, `nomor urut ${t.nama} harus unik`);
  }
});

test("pertanyaan ya_tidak memakai opsi ya/tidak/tidak tahu", async () => {
  const { tes } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });
  const yaTidak = tes.flatMap((t) => t.pertanyaan).filter((p) => p.tipe_jawaban === "ya_tidak");

  assert.ok(yaTidak.length >= 1, "seed harus memuat contoh pertanyaan ya/tidak");
  for (const p of yaTidak) {
    const skorPerTeks = Object.fromEntries(p.opsi.map((o) => [o.teks.toLowerCase(), o.skor]));
    assert.equal(skorPerTeks["tidak"], 0);
    // "Tidak tahu" diperlakukan sama dengan "Ya" (lihat design, call no. 3).
    assert.equal(skorPerTeks["ya"], skorPerTeks["tidak tahu"]);
    assert.ok(skorPerTeks["ya"] > 0);
  }
});

test("setiap instrumen level 2 dipakai oleh satu domain", async () => {
  const { tes, kategori } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });
  const level2 = tes.filter((t) => t.level === 2).map((t) => t.nama);
  const dirujuk = kategori.map((k) => k.tes_nama).filter(Boolean);

  for (const nama of level2) {
    assert.ok(dirujuk.includes(nama), `instrumen ${nama} harus dirujuk sebuah domain`);
  }
});

test("buatDataSeed menyiapkan sesi skrining aktif", async () => {
  const { sesi } = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  assert.equal(sesi.status, "aktif");
  assert.ok(sesi.kode.length > 0);
});
