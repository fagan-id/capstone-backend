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
test("1. Rute Tab Penilaian menolak request tanpa token (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

// 2. Role selain SUPER_ADMIN ditolak (403)
test("2. Rute Tab Penilaian menolak role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@demo.test");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

// 3. GET /:id/penilaian mengembalikan 404 jika tes tidak ditemukan
test("3. GET /api/super-admin/tes-skrining/:id/penilaian melempar 404 jika tes tidak ada", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => null;

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/999/penilaian`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Tes skrining tidak ditemukan/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
  }
});

// 4. GET /:id/penilaian berhasil membaca konfigurasi Level 1 (200)
test("4. GET /api/super-admin/tes-skrining/:id/penilaian membaca konfigurasi Level 1 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;
  const origKategoriFindMany = prisma.kategori_asesmen.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1", jenjang: "SD" });
  prisma.pertanyaan.findMany = async () => [
    {
      id: 101,
      kategori_asesmen_id: 1,
      tipe_jawaban: "skala",
      opsi_jawaban: [{ label: "0", skor: 0 }, { label: "2", skor: 2 }]
    }
  ];
  prisma.kategori_asesmen.findMany = async () => [
    {
      id: 1,
      nama: "Somatik",
      urutan: 1,
      ambang_batas: 2,
      tes_skrining: { id: 10, nama: "LEVEL 2 Somatik" }
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.tes.id, 1);
      assert.equal(body.data.aturan.length, 1);
      assert.equal(body.data.aturan[0].ambang_batas, 2);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
    prisma.kategori_asesmen.findMany = origKategoriFindMany;
  }
});

// 5. GET /:id/penilaian berhasil membaca konfigurasi Level 2 (200)
test("5. GET /api/super-admin/tes-skrining/:id/penilaian membaca konfigurasi Level 2 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindMany = prisma.rentang_penilaian.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2, nama: "LEVEL 2 Inatensi", jenjang: "SD" });
  prisma.rentang_penilaian.findMany = async () => [
    { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 54, urutan: 1 },
    { id: 2, tes_skrining_id: 10, kategori: "Klinis", skor_min: 55, skor_max: null, urutan: 2 }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/penilaian`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.tes.id, 10);
      assert.equal(body.data.rentang.length, 2);
      assert.equal(body.data.metadata.keluaran, "T-Score");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findMany = origRentangFindMany;
  }
});

// 6. PATCH /:id/penilaian/:aturanId berhasil memperbarui ambang batas domain Level 1 (200)
test("6. PATCH /api/super-admin/tes-skrining/:id/penilaian/:aturanId memperbarui domain Level 1 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindFirst = prisma.pertanyaan.findFirst;
  const origKategoriFindUnique = prisma.kategori_asesmen.findUnique;
  const origKategoriUpdate = prisma.kategori_asesmen.update;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1" });
  prisma.pertanyaan.findFirst = async () => ({
    id: 101,
    kategori_asesmen_id: 1,
    tipe_jawaban: "skala",
    opsi_jawaban: []
  });
  prisma.kategori_asesmen.findUnique = async () => ({ id: 1, nama: "Somatik", ambang_batas: 2 });
  prisma.kategori_asesmen.update = async ({ data }) => ({ id: 1, nama: "Somatik", ambang_batas: data.ambang_batas });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian/1`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ ambang_batas: 3 })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.ambang_batas, 3);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findFirst = origPertanyaanFindFirst;
    prisma.kategori_asesmen.findUnique = origKategoriFindUnique;
    prisma.kategori_asesmen.update = origKategoriUpdate;
  }
});

// 7. PATCH /:id/penilaian/:aturanId berhasil memperbarui rentang Level 2 (200)
test("7. PATCH /api/super-admin/tes-skrining/:id/penilaian/:aturanId memperbarui rentang Level 2 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindUnique = prisma.rentang_penilaian.findUnique;
  const origRentangFindMany = prisma.rentang_penilaian.findMany;
  const origRentangUpdate = prisma.rentang_penilaian.update;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findUnique = async () => ({
    id: 1,
    tes_skrining_id: 10,
    kategori: "Normal",
    skor_min: 0,
    skor_max: 54,
    urutan: 1
  });
  prisma.rentang_penilaian.findMany = async () => [];
  prisma.rentang_penilaian.update = async ({ data }) => ({
    id: 1,
    tes_skrining_id: 10,
    kategori: data.kategori ?? "Normal",
    skor_min: data.skor_min ?? 0,
    skor_max: data.skor_max ?? 54,
    urutan: 1
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/penilaian/1`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ kategori: "Batas Normal Baru" })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.kategori, "Batas Normal Baru");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findUnique = origRentangFindUnique;
    prisma.rentang_penilaian.findMany = origRentangFindMany;
    prisma.rentang_penilaian.update = origRentangUpdate;
  }
});

// 8. POST /:id/penilaian menolak penambahan pada tes Level 1 (400)
test("8. POST /api/super-admin/tes-skrining/:id/penilaian menolak tes Level 1 (400)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1 });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ kategori: "Tinggi", skor_min: 70, skor_max: null })
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /hanya didukung untuk tes skrining Level 2/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
  }
});

// 9. POST /:id/penilaian berhasil menambahkan rentang baru pada Level 2 (201)
test("9. POST /api/super-admin/tes-skrining/:id/penilaian berhasil menambah rentang Level 2 (201)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindMany = prisma.rentang_penilaian.findMany;
  const origRentangCreate = prisma.rentang_penilaian.create;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findMany = async () => [
    { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 54 }
  ];
  prisma.rentang_penilaian.create = async ({ data }) => ({
    id: 2,
    ...data,
    created_at: new Date(),
    updated_at: new Date()
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/penilaian`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ kategori: "Signifikan Klinis", skor_min: 65, skor_max: null })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 2);
      assert.equal(body.data.kategori, "Signifikan Klinis");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findMany = origRentangFindMany;
    prisma.rentang_penilaian.create = origRentangCreate;
  }
});

// 10. POST /:id/penilaian menolak rentang yang overlap pada Level 2 (409)
test("10. POST /api/super-admin/tes-skrining/:id/penilaian menolak rentang overlap (409)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindMany = prisma.rentang_penilaian.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findMany = async () => [
    { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 54 }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/penilaian`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ kategori: "Ringan", skor_min: 50, skor_max: 60 })
      });
      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /tumpang tindih \(overlap\)/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findMany = origRentangFindMany;
  }
});

// 11. PATCH /:id/penilaian (batch) menolak pada Level 1 (400)
test("11. PATCH /api/super-admin/tes-skrining/:id/penilaian (batch) menolak Level 1 (400)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1 });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          { kategori: "A", skor_min: 0, skor_max: 10 }
        ])
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /hanya didukung untuk tes skrining Level 2/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
  }
});

// 12. PATCH /:id/penilaian (batch) berhasil memperbarui seluruh rentang Level 2 (200)
test("12. PATCH /api/super-admin/tes-skrining/:id/penilaian (batch) memperbarui rentang Level 2 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origTransaction = prisma.$transaction;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.$transaction = async (cb) => {
    let createdCount = 0;
    const fakeTx = {
      rentang_penilaian: {
        deleteMany: async () => {},
        create: async ({ data }) => {
          createdCount++;
          return { id: createdCount, ...data, created_at: new Date(), updated_at: new Date() };
        }
      }
    };
    return cb(fakeTx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/penilaian`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify([
          { kategori: "Normal", skor_min: 0, skor_max: 54, urutan: 1 },
          { kategori: "Klinis", skor_min: 55, skor_max: null, urutan: 2 }
        ])
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.length, 2);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.$transaction = origTransaction;
  }
});

// 13. DELETE /:id/penilaian/:aturanId menolak penghapusan pada Level 1 (400)
test("13. DELETE /api/super-admin/tes-skrining/:id/penilaian/:aturanId menolak Level 1 (400)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1 });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/penilaian/1`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /hanya didukung untuk tes skrining Level 2/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
  }
});

// 14. DELETE /:id/penilaian/:aturanId berhasil menghapus rentang pada Level 2 (200)
test("14. DELETE /api/super-admin/tes-skrining/:id/penilaian/:aturanId menghapus rentang Level 2 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindUnique = prisma.rentang_penilaian.findUnique;
  const origRentangDelete = prisma.rentang_penilaian.delete;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findUnique = async () => ({
    id: 5,
    tes_skrining_id: 10,
    kategori: "Klinis",
    skor_min: 70,
    skor_max: null
  });
  prisma.rentang_penilaian.delete = async () => ({ id: 5 });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/penilaian/5`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.match(body.message, /Rentang penilaian berhasil dihapus/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findUnique = origRentangFindUnique;
    prisma.rentang_penilaian.delete = origRentangDelete;
  }
});

// 15. Alias /api/admin/tes-skrining/:id/penilaian bekerja identik (200)
test("15. Alias /api/admin/tes-skrining/:id/penilaian berfungsi identik", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1" });
  prisma.pertanyaan.findMany = async () => [];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/tes-skrining/1/penilaian`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
  }
});
