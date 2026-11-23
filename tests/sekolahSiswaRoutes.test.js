import { test, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { config } from "../src/config/index.js";

after(() => prisma.$disconnect());

const testConfig = { env: "test", isDevelopment: false, corsOrigin: ["http://localhost:3000"], jwt: config.jwt };
const tokenSekolah = jwt.sign({ id: 10, role: "SEKOLAH", email: "sekolah@demo.test" }, config.jwt.secret, {
  expiresIn: "1h"
});

async function denganServer(fn) {
  const server = createApp({ config: testConfig, cekDatabase: async () => {} }).listen(0);
  await once(server, "listening");
  try {
    await fn(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.close();
  }
}

/** Mengganti method prisma sementara; mengembalikan fungsi pemulih. */
function mock(ganti) {
  const asli = [];
  for (const [model, methods] of Object.entries(ganti)) {
    for (const [nama, fn] of Object.entries(methods)) {
      asli.push([model, nama, prisma[model][nama]]);
      prisma[model][nama] = fn;
    }
  }
  return () => asli.forEach(([model, nama, fn]) => (prisma[model][nama] = fn));
}

const sekolahAktif = { sekolah: { findUnique: async () => ({ id: 10, aktif: true }) } };
const KELAS = { id: 1, nama: "4A", tahun_ajaran: "2026/2027" };
const SISWA = {
  id: 5,
  sekolah_id: 10,
  kelas_id: 1,
  nisn: "0123456789",
  nama: "Budi Santoso",
  tanggal_lahir: new Date("2017-05-12T00:00:00Z"),
  jenis_kelamin: "L",
  created_at: new Date(),
  updated_at: new Date(),
  kelas: KELAS
};

function req(base, method, path, body) {
  return fetch(`${base}/api/sekolah${path}`, {
    method,
    headers: { Authorization: `Bearer ${tokenSekolah}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test("GET /api/sekolah/siswa mengembalikan data dan pagination di samping data", async () => {
  let where;
  const pulihkan = mock({
    ...sekolahAktif,
    siswa: {
      count: async (a) => {
        where = a.where;
        return 1;
      },
      findMany: async () => [SISWA]
    }
  });

  try {
    await denganServer(async (base) => {
      const res = await req(base, "GET", "/siswa?kelas_id=1");
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.message, "Data siswa berhasil dimuat.");
      assert.equal(body.data[0].tanggal_lahir, "2017-05-12");
      assert.deepEqual(body.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
      assert.deepEqual(where, { sekolah_id: 10, kelas_id: 1 });

      const salah = await req(base, "GET", "/siswa?kelas_id=abc");
      assert.equal(salah.status, 400);
    });
  } finally {
    pulihkan();
  }
});

test("GET /api/sekolah/siswa/:id: 200 untuk siswa sendiri, 404 untuk sekolah lain", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    siswa: { findFirst: async ({ where }) => (where.id === 5 && where.sekolah_id === 10 ? SISWA : null) }
  });

  try {
    await denganServer(async (base) => {
      const ok = await req(base, "GET", "/siswa/5");
      assert.equal(ok.status, 200);
      assert.equal((await ok.json()).message, "Detail siswa berhasil dimuat.");

      const asing = await req(base, "GET", "/siswa/6");
      assert.equal(asing.status, 404);
      assert.equal((await asing.json()).message, "Siswa tidak ditemukan.");
    });
  } finally {
    pulihkan();
  }
});

test("POST /api/sekolah/siswa: 400 NISN salah, 201 input valid", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    kelas: { findFirst: async () => KELAS },
    siswa: { findUnique: async () => null, create: async ({ data }) => ({ ...SISWA, ...data, id: 9 }) }
  });
  const body = { nisn: "0123456789", nama: "Budi Santoso", tanggal_lahir: "2017-05-12", jenis_kelamin: "L", kelas_id: 1 };

  try {
    await denganServer(async (base) => {
      const salah = await req(base, "POST", "/siswa", { ...body, nisn: "12345" });
      assert.equal(salah.status, 400);

      const res = await req(base, "POST", "/siswa", body);
      assert.equal(res.status, 201);
      const isi = await res.json();
      assert.equal(isi.message, "Siswa berhasil ditambahkan.");
      assert.equal(isi.data.id, 9);
    });
  } finally {
    pulihkan();
  }
});

test("PATCH dan DELETE /api/sekolah/siswa/:id", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    siswa: {
      findFirst: async () => SISWA,
      update: async ({ data }) => ({ ...SISWA, ...data }),
      delete: async () => SISWA
    },
    hasil_skrining: { count: async () => 0 }
  });

  try {
    await denganServer(async (base) => {
      const patch = await req(base, "PATCH", "/siswa/5", { nama: "Budi Santoso Putra" });
      assert.equal(patch.status, 200);
      const isi = await patch.json();
      assert.equal(isi.message, "Data siswa berhasil diperbarui.");
      assert.equal(isi.data.nama, "Budi Santoso Putra");

      const del = await req(base, "DELETE", "/siswa/5");
      assert.equal(del.status, 200);
      assert.equal((await del.json()).message, "Siswa berhasil dihapus.");
    });
  } finally {
    pulihkan();
  }
});
