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
