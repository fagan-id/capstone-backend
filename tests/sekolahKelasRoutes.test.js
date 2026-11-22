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

function req(base, method, path, body) {
  return fetch(`${base}/api/sekolah${path}`, {
    method,
    headers: { Authorization: `Bearer ${tokenSekolah}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test("GET /api/sekolah/kelas memuat kelas milik sekolah pada token", async () => {
  let where;
  const pulihkan = mock({
    ...sekolahAktif,
    kelas: {
      findMany: async (a) => {
        where = a.where;
        return [
          {
            id: 1,
            nama: "4A",
            tingkat: 4,
            tahun_ajaran: "2026/2027",
            created_at: new Date(),
            updated_at: new Date(),
            _count: { siswa: 2 }
          }
        ];
      }
    }
  });

  try {
    await denganServer(async (base) => {
      const res = await req(base, "GET", "/kelas?tingkat=4");
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.message, "Data kelas berhasil dimuat.");
      assert.equal(body.data[0].jumlah_siswa, 2);
      assert.deepEqual(where, { sekolah_id: 10, tingkat: 4 });
    });
  } finally {
    pulihkan();
  }
});

test("POST /api/sekolah/kelas: 400 untuk tahun ajaran salah, 201 untuk input valid", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    kelas: {
      findFirst: async () => null,
      create: async ({ data }) => ({ id: 3, ...data, created_at: new Date(), updated_at: new Date() })
    }
  });

  try {
    await denganServer(async (base) => {
      const salah = await req(base, "POST", "/kelas", { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2028" });
      assert.equal(salah.status, 400);

      const res = await req(base, "POST", "/kelas", { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.message, "Kelas berhasil ditambahkan.");
      assert.equal(body.data.id, 3);
    });
  } finally {
    pulihkan();
  }
});

test("PATCH dan DELETE /api/sekolah/kelas/:id milik sekolah lain mengembalikan 404", async () => {
  const pulihkan = mock({ ...sekolahAktif, kelas: { findFirst: async () => null } });

  try {
    await denganServer(async (base) => {
      const patch = await req(base, "PATCH", "/kelas/99", { nama: "4B" });
      assert.equal(patch.status, 404);
      assert.equal((await patch.json()).message, "Kelas tidak ditemukan.");

      const del = await req(base, "DELETE", "/kelas/99");
      assert.equal(del.status, 404);
    });
  } finally {
    pulihkan();
  }
});

test("DELETE /api/sekolah/kelas/:id berhasil bila kelas kosong", async () => {
  const pulihkan = mock({
    ...sekolahAktif,
    kelas: { findFirst: async () => ({ id: 1, sekolah_id: 10 }), delete: async () => ({ id: 1 }) },
    siswa: { count: async () => 0 }
  });

  try {
    await denganServer(async (base) => {
      const res = await req(base, "DELETE", "/kelas/1");
      assert.equal(res.status, 200);
      assert.equal((await res.json()).message, "Kelas berhasil dihapus.");
    });
  } finally {
    pulihkan();
  }
});
