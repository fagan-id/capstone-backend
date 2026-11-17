import { test, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import jwt from "jsonwebtoken";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { config } from "../src/config/index.js";

after(() => prisma.$disconnect());

const testConfig = {
  env: "test",
  isDevelopment: false,
  corsOrigin: ["http://localhost:3000"],
  jwt: config.jwt
};

const dbOk = async () => {};

/**
 * Menghasilkan token JWT untuk pengujian rute.
 * @param {"SUPER_ADMIN" | "SEKOLAH"} role
 * @param {number} id
 * @param {string} email
 */
function buatTestToken(role, id = 1, email = "admin@skriningabk.id") {
  return jwt.sign({ id, role, email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

/**
 * Helper bootstrap server testing.
 * @param {(baseUrl: string) => Promise<void>} fn
 */
async function denganServer(fn) {
  const server = createApp({ config: testConfig, cekDatabase: dbOk }).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

// 1. Request tanpa autentikasi ditolak (401)
test("1. Rute Tab Pemetaan menolak request tanpa token (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

// 2. Role selain SUPER_ADMIN ditolak (403)
test("2. Rute Tab Pemetaan menolak role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@demo.test");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

// 3. Tab Pemetaan menolak jika tes adalah Level 2 (400)
test("3. GET /api/super-admin/tes-skrining/:id/pemetaan menolak tes Level 2 (400)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => ({ id: 5, level: 2 });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/5/pemetaan`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Tab Pemetaan hanya berlaku untuk tes skrining Level 1/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
  }
});

// 4. GET /api/super-admin/tes-skrining/:id/pemetaan berhasil memuat daftar pemetaan (200)
test("4. GET /api/super-admin/tes-skrining/:id/pemetaan berhasil memuat pemetaan domain", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;
  const origKategoriFindMany = prisma.kategori_asesmen.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1", jenjang: "SD" });
  prisma.pertanyaan.findMany = async () => [{ kategori_asesmen_id: 1, tipe_jawaban: "skala" }];
  prisma.kategori_asesmen.findMany = async () => [
    {
      id: 1,
      nama: "Somatik",
      urutan: 1,
      ambang_batas: 2,
      tes_skrining_id: 10,
      tes_skrining: {
        id: 10,
        nama: "LEVEL 2 Somatik",
        jenjang: "SD",
        aktif: true,
        _count: { pertanyaan: 3 },
        pertanyaan: [{ id: 1, aktif: true }]
      }
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].nama, "Somatik");
      assert.equal(body.data[0].terpetakan, true);
      assert.ok(body.statistik);
      assert.equal(body.sifat_konfigurasi, "global");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
    prisma.kategori_asesmen.findMany = origKategoriFindMany;
  }
});

// 5. GET /api/super-admin/tes-skrining/:id/pemetaan/opsi-tes-level-2 berhasil memuat opsi (200)
test("5. GET /api/super-admin/tes-skrining/:id/pemetaan/opsi-tes-level-2 berhasil memuat opsi kandidat", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origTesCount = prisma.tes_skrining.count;
  const origTesFindMany = prisma.tes_skrining.findMany;
  const origKategoriFindUnique = prisma.kategori_asesmen.findUnique;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, jenjang: "SD" });
  prisma.kategori_asesmen.findUnique = async () => ({ id: 1, nama: "Somatik" });
  prisma.tes_skrining.count = async () => 1;
  prisma.tes_skrining.findMany = async () => [
    {
      id: 10,
      nama: "LEVEL 2 Somatik",
      jenjang: "SD",
      aktif: true,
      _count: { pertanyaan: 3 },
      pertanyaan: [{ id: 1, aktif: true, kategori_asesmen_id: 1 }],
      kategori_asesmen: [{ id: 1, nama: "Somatik", urutan: 1 }]
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan/opsi-tes-level-2?kategori_id=1`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].id, 10);
      assert.equal(body.data[0].dapat_dipilih, true);
      assert.ok(body.pagination);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.tes_skrining.count = origTesCount;
    prisma.tes_skrining.findMany = origTesFindMany;
    prisma.kategori_asesmen.findUnique = origKategoriFindUnique;
  }
});

// 6. PATCH /api/super-admin/tes-skrining/:id/pemetaan berhasil memperbarui pemetaan (200)
test("6. PATCH /api/super-admin/tes-skrining/:id/pemetaan berhasil memperbarui pemetaan", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;
  const origKategoriFindMany = prisma.kategori_asesmen.findMany;
  const origTransaction = prisma.$transaction;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1 });
  prisma.pertanyaan.findMany = async () => [{ kategori_asesmen_id: 1 }];
  prisma.kategori_asesmen.findMany = async ({ where }) => {
    if (where?.id?.in) {
      return [
        {
          id: 1,
          nama: "Somatik",
          urutan: 1,
          ambang_batas: 2,
          tes_skrining_id: 10,
          tes_skrining: { id: 10, nama: "LEVEL 2 Somatik", jenjang: "SD", aktif: true, _count: { pertanyaan: 2 } }
        }
      ];
    }
    return [];
  };

  prisma.$transaction = async (fn) => {
    const tx = {
      kategori_asesmen: { update: async () => ({}) }
    };
    return fn(tx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pemetaan: [{ kategori_id: 1, tes_skrining_id: null }]
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, "Pemetaan domain berhasil diperbarui.");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
    prisma.kategori_asesmen.findMany = origKategoriFindMany;
    prisma.$transaction = origTransaction;
  }
});

// 7. PUT /api/super-admin/tes-skrining/:id/pemetaan bekerja identik sebagai alias (200)
test("7. PUT /api/super-admin/tes-skrining/:id/pemetaan bekerja sebagai alias pembaruan", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;
  const origKategoriFindMany = prisma.kategori_asesmen.findMany;
  const origTransaction = prisma.$transaction;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1 });
  prisma.pertanyaan.findMany = async () => [{ kategori_asesmen_id: 1 }];
  prisma.kategori_asesmen.findMany = async () => [
    {
      id: 1,
      nama: "Somatik",
      urutan: 1,
      ambang_batas: 2,
      tes_skrining_id: null,
      tes_skrining: null
    }
  ];

  prisma.$transaction = async (fn) => {
    const tx = {
      kategori_asesmen: { update: async () => ({}) }
    };
    return fn(tx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          kategori_id: 1,
          tes_skrining_id: null
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
    prisma.kategori_asesmen.findMany = origKategoriFindMany;
    prisma.$transaction = origTransaction;
  }
});

// 8. PATCH menolak payload kosong (400)
test("8. PATCH /api/super-admin/tes-skrining/:id/pemetaan menolak payload kosong (400)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pemetaan`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ pemetaan: [] })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak boleh kosong/);
  });
});

// 9. Rute /api/admin/tes-skrining/:id/pemetaan mengembalikan 404 karena rute Super Admin eksklusif di /super-admin
test("9. Rute /api/admin/tes-skrining/:id/pemetaan mengembalikan 404 karena rute dialihkan eksklusif ke /super-admin", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/tes-skrining/1/pemetaan`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.equal(res.status, 404);
  });
});
