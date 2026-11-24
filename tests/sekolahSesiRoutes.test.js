import { test, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { config } from "../src/config/index.js";

after(() => prisma.$disconnect());

const testConfig = { env: "test", isDevelopment: false, corsOrigin: ["http://localhost:3000"], jwt: config.jwt };
const tanda = (payload) => jwt.sign(payload, config.jwt.secret, { expiresIn: "1h" });
const tokenSekolah = tanda({ id: 10, role: "SEKOLAH", email: "sekolah@demo.test" });
const tokenAdmin = tanda({ id: 1, role: "SUPER_ADMIN", email: "admin@demo.test" });

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
const SESI = {
  id: 7,
  sekolah_id: 10,
  nama: "Skrining Kelas 4",
  kode: "ABC234",
  tanggal_pelaksanaan: new Date("2026-11-24T00:00:00Z"),
  status: "aktif",
  tes_skrining_id: 24,
  created_at: new Date(),
  updated_at: new Date(),
  tes_skrining: { id: 24, nama: "Skrining Awal" }
};

function req(base, method, path, { body, token = tokenSekolah } = {}) {
  return fetch(`${base}/api${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test("rute sesi sekolah menolak Super Admin dengan 403", async () => {
  await denganServer(async (base) => {
    const res = await req(base, "GET", "/sekolah/sesi", { token: tokenAdmin });
    assert.equal(res.status, 403);
  });
});

test("GET /api/sekolah/tes mengembalikan tes Level 1 aktif", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    tes_skrining: { findMany: async () => [{ id: 24, nama: "Skrining Awal", jenjang: "SD", deskripsi: "x" }] }
  });

  try {
    await denganServer(async (base) => {
      const res = await req(base, "GET", "/sekolah/tes");
      assert.equal(res.status, 200);
      const isi = await res.json();
      assert.equal(isi.message, "Data tes skrining berhasil dimuat.");
      assert.equal(isi.data[0].id, 24);
    });
  } finally {
    pulihkan();
  }
});

test("GET /api/sekolah/sesi mengembalikan data dan pagination", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    sesi_skrining: {
      count: async () => 1,
      findMany: async () => [{ ...SESI, _count: { hasil_skrining: 0 } }]
    },
    hasil_skrining: { groupBy: async () => [] }
  });

  try {
    await denganServer(async (base) => {
      const res = await req(base, "GET", "/sekolah/sesi");
      assert.equal(res.status, 200);
      const isi = await res.json();
      assert.equal(isi.message, "Data sesi skrining berhasil dimuat.");
      assert.equal(isi.data[0].kode, "ABC234");
      assert.deepEqual(isi.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });

      const salah = await req(base, "GET", "/sekolah/sesi?status=menunggu");
      assert.equal(salah.status, 400);
    });
  } finally {
    pulihkan();
  }
});

test("POST /api/sekolah/sesi: 400 tanpa tes, 201 input valid", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    tes_skrining: { findUnique: async () => ({ id: 24, level: 1, aktif: true }) },
    sesi_skrining: { create: async ({ data }) => ({ ...SESI, ...data, id: 8 }) }
  });

  try {
    await denganServer(async (base) => {
      const salah = await req(base, "POST", "/sekolah/sesi", { body: { nama: "Skrining Kelas 4" } });
      assert.equal(salah.status, 400);

      const res = await req(base, "POST", "/sekolah/sesi", { body: { nama: "Skrining Kelas 4", tes_skrining_id: 24 } });
      assert.equal(res.status, 201);
      const isi = await res.json();
      assert.equal(isi.message, "Sesi skrining berhasil dibuat.");
      assert.equal(isi.data.status, "aktif");
    });
  } finally {
    pulihkan();
  }
});

test("GET, PATCH, akhiri dan DELETE /api/sekolah/sesi/:id", async () => {
  let baris = { ...SESI };
  const pulihkan = mock({
    ...sekolahAktif,
    sesi_skrining: {
      findFirst: async ({ where }) => (where.id === 7 && (where.sekolah_id ?? 10) === 10 ? baris : null),
      update: async ({ data }) => (baris = { ...baris, ...data }),
      updateMany: async ({ where, data }) => {
        if (where.id !== 7 || baris.status !== where.status) return { count: 0 };
        baris = { ...baris, ...data };
        return { count: 1 };
      },
      delete: async () => baris
    },
    hasil_skrining: { count: async () => 0 }
  });

  try {
    await denganServer(async (base) => {
      const detail = await req(base, "GET", "/sekolah/sesi/7");
      assert.equal(detail.status, 200);
      assert.equal((await detail.json()).data.jumlah_belum_selesai, 0);

      const asing = await req(base, "GET", "/sekolah/sesi/8");
      assert.equal(asing.status, 404);

      const patch = await req(base, "PATCH", "/sekolah/sesi/7", { body: { nama: "Nama Baru" } });
      assert.equal(patch.status, 200);
      assert.equal((await patch.json()).data.nama, "Nama Baru");

      const akhiri = await req(base, "POST", "/sekolah/sesi/7/akhiri");
      assert.equal(akhiri.status, 200);
      const isi = await akhiri.json();
      assert.equal(isi.message, "Sesi skrining berhasil diakhiri.");
      assert.equal(isi.data.status, "selesai");

      const lagi = await req(base, "POST", "/sekolah/sesi/7/akhiri");
      assert.equal(lagi.status, 409);

      const del = await req(base, "DELETE", "/sekolah/sesi/7");
      assert.equal(del.status, 200);
      assert.equal((await del.json()).message, "Sesi skrining berhasil dihapus.");
    });
  } finally {
    pulihkan();
  }
});

test("POST /api/super-admin/sesi/:id/akhiri: Super Admin 200, Sekolah 403", async () => {
  let baris = { ...SESI, sekolah_id: 55 };
  const pulihkan = mock({
    sesi_skrining: {
      updateMany: async ({ where, data }) => {
        if (where.sekolah_id !== undefined || baris.status !== where.status) return { count: 0 };
        baris = { ...baris, ...data };
        return { count: 1 };
      },
      findFirst: async ({ where }) => (where.id === 7 ? baris : null)
    }
  });

  try {
    await denganServer(async (base) => {
      const sekolah = await req(base, "POST", "/super-admin/sesi/7/akhiri");
      assert.equal(sekolah.status, 403);

      const res = await req(base, "POST", "/super-admin/sesi/7/akhiri", { token: tokenAdmin });
      assert.equal(res.status, 200);
      assert.equal((await res.json()).data.status, "selesai");

      const tidakAda = await req(base, "POST", "/super-admin/sesi/9/akhiri", { token: tokenAdmin });
      assert.equal(tidakAda.status, 404);
    });
  } finally {
    pulihkan();
  }
});
