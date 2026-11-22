import { test, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { config } from "../src/config/index.js";
import { cekSekolahAktif } from "../src/middlewares/auth.middleware.js";

after(() => prisma.$disconnect());

const testConfig = { env: "test", isDevelopment: false, corsOrigin: ["http://localhost:3000"], jwt: config.jwt };

function token(role, id = 10) {
  return jwt.sign({ id, role, email: "x@demo.test" }, config.jwt.secret, { expiresIn: "1h" });
}

async function denganServer(fn) {
  const server = createApp({ config: testConfig, cekDatabase: async () => {} }).listen(0);
  await once(server, "listening");
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

/** Menjalankan middleware dengan sekolah tiruan, mengembalikan error yang diteruskan ke next(). */
async function jalankanCek(sekolah) {
  const asli = prisma.sekolah.findUnique;
  prisma.sekolah.findUnique = async () => sekolah;
  try {
    let diteruskan = "belum dipanggil";
    await cekSekolahAktif({ user: { id: 10, role: "SEKOLAH" } }, {}, (err) => { diteruskan = err; });
    return diteruskan;
  } finally {
    prisma.sekolah.findUnique = asli;
  }
}

test("Rute /api/sekolah menolak request tanpa token (401)", async () => {
  await denganServer(async (base) => {
    const res = await fetch(`${base}/api/sekolah/kelas`);
    assert.equal(res.status, 401);
  });
});

test("Rute /api/sekolah menolak role SUPER_ADMIN (403)", async () => {
  await denganServer(async (base) => {
    const res = await fetch(`${base}/api/sekolah/kelas`, {
      headers: { Authorization: `Bearer ${token("SUPER_ADMIN", 1)}` }
    });
    assert.equal(res.status, 403);
    assert.match((await res.json()).message, /tidak memiliki hak akses/);
  });
});

test("cekSekolahAktif meneruskan sekolah aktif tanpa error", async () => {
  assert.equal(await jalankanCek({ id: 10, aktif: true }), undefined);
});

test("cekSekolahAktif menolak sekolah nonaktif (403)", async () => {
  const err = await jalankanCek({ id: 10, aktif: false });
  assert.equal(err.statusCode, 403);
  assert.equal(err.message, "Akun sekolah dinonaktifkan. Silakan hubungi Super Admin.");
});

test("cekSekolahAktif menolak sekolah yang sudah tidak ada (403)", async () => {
  const err = await jalankanCek(null);
  assert.equal(err.statusCode, 403);
});
