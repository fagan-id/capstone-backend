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
