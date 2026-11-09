import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { buatDataSeed, jalankanSeed } from "../../prisma/seedData.js";
import { dalamTransaksiBatal } from "./helpers.js";

after(() => prisma.$disconnect());

test("jalankanSeed dua kali tidak menggandakan data", async () => {
  const data = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  await dalamTransaksiBatal(async (tx) => {
    await jalankanSeed(tx, data);
    await jalankanSeed(tx, data);

    assert.equal(await tx.super_admin.count({ where: { email: "superadmin@demo.test" } }), 1);
    assert.equal(await tx.sekolah.count({ where: { npsn: "00000001" } }), 1);

    const sekolah = await tx.sekolah.findUnique({ where: { npsn: "00000001" } });
    const kelas = await tx.kelas.findMany({ where: { sekolah_id: sekolah.id, nama: "4A", tahun_ajaran: "2026/2027" } });
    assert.equal(kelas.length, 1);

    const siswa = await tx.siswa.findMany({ where: { nisn: { in: ["0000000001", "0000000002"] } } });
    assert.equal(siswa.length, 2);
    for (const s of siswa) {
      assert.equal(s.sekolah_id, sekolah.id);
      assert.equal(s.kelas_id, kelas[0].id);
    }
  });
});

test("jalankanSeed dua kali tidak menggandakan instrumen skrining", async () => {
  const data = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  await dalamTransaksiBatal(async (tx) => {
    await jalankanSeed(tx, data);
    await jalankanSeed(tx, data);

    assert.equal(await tx.tes_skrining.count(), data.tes.length);
    assert.equal(await tx.kategori_asesmen.count(), data.kategori.length);
    assert.equal(await tx.sesi_skrining.count({ where: { kode: data.sesi.kode } }), 1);

    const jumlahButir = data.tes.reduce((n, t) => n + t.pertanyaan.length, 0);
    assert.equal(await tx.pertanyaan.count(), jumlahButir);

    const jumlahOpsi = data.tes.reduce((n, t) => n + t.pertanyaan.reduce((m, p) => m + p.opsi.length, 0), 0);
    assert.equal(await tx.opsi_jawaban.count(), jumlahOpsi);
  });
});

test("seed menghubungkan domain ke instrumen lanjutannya", async () => {
  const data = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  await dalamTransaksiBatal(async (tx) => {
    await jalankanSeed(tx, data);

    const inatensi = await tx.kategori_asesmen.findFirst({
      where: { nama: "Inatensi" },
      include: { tes_skrining: true }
    });
    assert.equal(inatensi.ambang_batas, 1);
    assert.equal(inatensi.tes_skrining.level, 2);

    const somatik = await tx.kategori_asesmen.findFirst({ where: { nama: "Somatik" } });
    assert.equal(somatik.tes_skrining_id, null);
  });
});

test("seed menyimpan skor opsi terpisah dari labelnya", async () => {
  const data = await buatDataSeed({ SEED_PASSWORD: "rahasia123" });

  await dalamTransaksiBatal(async (tx) => {
    await jalankanSeed(tx, data);

    const yaTidak = await tx.pertanyaan.findFirst({
      where: { tipe_jawaban: "ya_tidak" },
      include: { opsi_jawaban: true }
    });

    const skorPerTeks = Object.fromEntries(yaTidak.opsi_jawaban.map((o) => [o.teks, o.skor]));
    assert.equal(skorPerTeks["Tidak"], 0);
    assert.equal(skorPerTeks["Ya"], 2);
    assert.equal(skorPerTeks["Tidak tahu"], 2);
  });
});
