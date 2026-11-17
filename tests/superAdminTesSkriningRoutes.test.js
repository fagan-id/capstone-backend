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
test("1. Rute Tes Skrining menolak request tanpa token (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

// 2. Role selain SUPER_ADMIN ditolak (403)
test("2. Rute Tes Skrining menolak pengguna dengan role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@demo.test");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

// 3. Daftar tes berhasil (200)
test("3. GET /api/super-admin/tes-skrining berhasil memuat daftar tes skrining", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origCount = prisma.tes_skrining.count;
  const origFindMany = prisma.tes_skrining.findMany;

  prisma.tes_skrining.count = async () => 1;
  prisma.tes_skrining.findMany = async () => [
    {
      id: 1,
      nama: "DSM-5-TR Parent-Rated Level 1",
      level: 1,
      jenjang: "SD",
      deskripsi: "Skrining awal gejala lintas domain",
      aktif: true,
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-01"),
      _count: { pertanyaan: 25 },
      kategori_asesmen: []
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].nama, "DSM-5-TR Parent-Rated Level 1");
      assert.equal(body.data[0].jumlah_pertanyaan, 25);
      assert.ok(body.pagination);
      assert.ok(body.statistik);
    });
  } finally {
    prisma.tes_skrining.count = origCount;
    prisma.tes_skrining.findMany = origFindMany;
  }
});

// 4. Search, filter, dan pagination bekerja
test("4. Search, filter level & status, dan paginasi pada query daftar tes bekerja", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origCount = prisma.tes_skrining.count;
  const origFindMany = prisma.tes_skrining.findMany;

  let capturedWhere = null;
  prisma.tes_skrining.count = async ({ where } = {}) => {
    capturedWhere = where;
    return 1;
  };
  prisma.tes_skrining.findMany = async ({ where }) => {
    capturedWhere = where;
    return [];
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(
        `${baseUrl}/api/super-admin/tes-skrining?page=2&limit=5&search=Depresi&level=2&status=aktif&sortBy=level&sortOrder=asc`,
        {
          headers: { Authorization: `Bearer ${tokenAdmin}` }
        }
      );
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.pagination.page, 2);
      assert.equal(body.pagination.limit, 5);
      assert.equal(capturedWhere.level, 2);
      assert.equal(capturedWhere.aktif, true);
      assert.ok(capturedWhere.OR);
    });
  } finally {
    prisma.tes_skrining.count = origCount;
    prisma.tes_skrining.findMany = origFindMany;
  }
});

// 5. Tambah tes Level 1 berhasil (201)
test("5. POST /api/super-admin/tes-skrining membuat tes Level 1 berhasil (201)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origFindFirst = prisma.tes_skrining.findFirst;
  const origCreate = prisma.tes_skrining.create;
  const origAdminFindUnique = prisma.super_admin?.findUnique;

  prisma.tes_skrining.findFirst = async () => null;
  if (prisma.super_admin) {
    prisma.super_admin.findUnique = async () => ({ id: 1 });
  }
  prisma.tes_skrining.create = async ({ data }) => ({
    id: 101,
    ...data,
    created_at: new Date(),
    updated_at: new Date()
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          level: 1,
          nama: "DSM-5-TR Level 1 Baru",
          deskripsi: "Instrumen skrining awal siswa baru",
          jenjang: "SD",
          aktif: true
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 101);
      assert.equal(body.data.level, 1);
      assert.equal(body.data.nama, "DSM-5-TR Level 1 Baru");
      assert.equal(body.data.aktif, true);
    });
  } finally {
    prisma.tes_skrining.findFirst = origFindFirst;
    prisma.tes_skrining.create = origCreate;
    if (prisma.super_admin && origAdminFindUnique) {
      prisma.super_admin.findUnique = origAdminFindUnique;
    }
  }
});

// 6. Tambah tes Level 2 berhasil (201)
test("6. POST /api/super-admin/tes-skrining membuat tes Level 2 dan menautkan domain berhasil (201)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origFindFirst = prisma.tes_skrining.findFirst;
  const origCreate = prisma.tes_skrining.create;
  const origKatFindUnique = prisma.kategori_asesmen.findUnique;
  const origKatUpdate = prisma.kategori_asesmen.update;
  const origAdminFindUnique = prisma.super_admin?.findUnique;

  prisma.tes_skrining.findFirst = async () => null;
  if (prisma.super_admin) {
    prisma.super_admin.findUnique = async () => ({ id: 1 });
  }
  prisma.kategori_asesmen.findUnique = async ({ where }) =>
    where.id === 3 ? { id: 3, nama: "Depresi" } : null;
  prisma.kategori_asesmen.update = async () => ({ id: 3, tes_skrining_id: 202 });

  prisma.tes_skrining.create = async ({ data }) => ({
    id: 202,
    ...data,
    created_at: new Date(),
    updated_at: new Date()
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          level: 2,
          nama: "LEVEL 2 - Depresi Lanjutan",
          deskripsi: "Instrumen lanjutan untuk domain depresi",
          kategori_asesmen_id: 3,
          aktif: true
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 202);
      assert.equal(body.data.level, 2);
      assert.equal(body.data.domain.nama, "Depresi");
    });
  } finally {
    prisma.tes_skrining.findFirst = origFindFirst;
    prisma.tes_skrining.create = origCreate;
    prisma.kategori_asesmen.findUnique = origKatFindUnique;
    prisma.kategori_asesmen.update = origKatUpdate;
    if (prisma.super_admin && origAdminFindUnique) {
      prisma.super_admin.findUnique = origAdminFindUnique;
    }
  }
});

// 7. Payload, query, dan parameter tidak valid ditolak (400)
test("7. Payload, query, dan parameter tidak valid ditolak dengan 400 Bad Request", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  await denganServer(async (baseUrl) => {
    // ID bukan angka
    const resId = await fetch(`${baseUrl}/api/super-admin/tes-skrining/bukan-angka`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.equal(resId.status, 400);

    // Filter level tidak valid
    const resQuery = await fetch(`${baseUrl}/api/super-admin/tes-skrining?level=9`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.equal(resQuery.status, 400);

    // Payload tambah tanpa level
    const resBody = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({ nama: "Tes Baru" })
    });
    assert.equal(resBody.status, 400);

    // Level 2 tanpa domain
    const resL2 = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        level: 2,
        nama: "Tes Level 2 Tanpa Domain",
        deskripsi: "Deskripsi"
      })
    });
    assert.equal(resL2.status, 400);
  });
});

// 8. Konflik unique constraint / duplikasi nama ditangani (409)
test("8. POST /api/super-admin/tes-skrining menangani duplikasi nama dengan 409 Conflict", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origFindFirst = prisma.tes_skrining.findFirst;
  prisma.tes_skrining.findFirst = async () => ({ id: 1, nama: "Tes Sama" });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          level: 1,
          nama: "Tes Sama",
          deskripsi: "Deskripsi",
          jenjang: "SD"
        })
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /sudah terdaftar/);
    });
  } finally {
    prisma.tes_skrining.findFirst = origFindFirst;
  }
});

// 9. Detail tes ditemukan (200)
test("9. GET /api/super-admin/tes-skrining/:id mengembalikan data lengkap Tab Overview", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origFindUnique = prisma.tes_skrining.findUnique;
  const origKatFindMany = prisma.kategori_asesmen.findMany;

  prisma.tes_skrining.findUnique = async () => ({
    id: 1,
    nama: "DSM-5-TR Level 1",
    level: 1,
    jenjang: "SD",
    deskripsi: "Laporan lengkap kriteria dan parameter penilaian tes.",
    aktif: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    super_admin: { id: 1, nama: "Super Admin", email: "admin@demo.test" },
    kategori_asesmen: [],
    pertanyaan: [
      { id: 1, aktif: true, kategori_asesmen_id: 1, kategori_asesmen: { id: 1, nama: "Somatik", urutan: 1 } },
      { id: 2, aktif: true, kategori_asesmen_id: 1, kategori_asesmen: { id: 1, nama: "Somatik", urutan: 1 } }
    ]
  });

  prisma.kategori_asesmen.findMany = async () => [
    { id: 1, nama: "Somatik", urutan: 1 }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 1);
      assert.equal(body.data.jumlah_pertanyaan, 2);
      assert.equal(body.data.jumlah_pertanyaan_aktif, 2);
      assert.equal(body.data.persebaran_soal[0].persentase, 100);
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
    prisma.kategori_asesmen.findMany = origKatFindMany;
  }
});

// 10. Detail tes tidak ditemukan (404)
test("10. GET /api/super-admin/tes-skrining/:id mengembalikan 404 jika tidak ditemukan", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => null;

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/999`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 404);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /tidak ditemukan/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
  }
});

// 11. Update Overview berhasil (200)
test("11. PUT /api/super-admin/tes-skrining/:id berhasil memperbarui nama dan deskripsi Overview", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const existing = {
    id: 1,
    nama: "Nama Awal",
    level: 1,
    jenjang: "SD",
    deskripsi: "Deskripsi Awal",
    aktif: true,
    _count: { pertanyaan: 0, hasil_tes: 0 },
    kategori_asesmen: []
  };

  const origFindUnique = prisma.tes_skrining.findUnique;
  const origFindFirst = prisma.tes_skrining.findFirst;
  const origUpdate = prisma.tes_skrining.update;

  prisma.tes_skrining.findUnique = async () => existing;
  prisma.tes_skrining.findFirst = async () => null;
  prisma.tes_skrining.update = async ({ data }) => ({
    ...existing,
    ...data,
    created_at: new Date(),
    updated_at: new Date(),
    _count: { pertanyaan: 0 }
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          nama: "Nama Baru Overview",
          deskripsi: "Deskripsi Baru Overview"
        })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.nama, "Nama Baru Overview");
      assert.equal(body.data.deskripsi, "Deskripsi Baru Overview");
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
    prisma.tes_skrining.findFirst = origFindFirst;
    prisma.tes_skrining.update = origUpdate;
  }
});

// 12. Perubahan status berhasil (200)
test("12. PATCH /api/super-admin/tes-skrining/:id berhasil mengubah status aktif/nonaktif", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const existing = {
    id: 1,
    nama: "Tes Skrining",
    level: 1,
    jenjang: "SD",
    deskripsi: "Deskripsi",
    aktif: true,
    _count: { pertanyaan: 0, hasil_tes: 0 },
    kategori_asesmen: []
  };

  const origFindUnique = prisma.tes_skrining.findUnique;
  const origFindFirst = prisma.tes_skrining.findFirst;
  const origUpdate = prisma.tes_skrining.update;

  prisma.tes_skrining.findUnique = async () => existing;
  prisma.tes_skrining.update = async ({ data }) => ({
    ...existing,
    ...data,
    created_at: new Date(),
    updated_at: new Date(),
    _count: { pertanyaan: 0 }
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({ aktif: false })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.aktif, false);
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
    prisma.tes_skrining.findFirst = origFindFirst;
    prisma.tes_skrining.update = origUpdate;
  }
});

// 13. Field di luar izin tidak dapat dimodifikasi (allowlist)
test("13. Update overview mengabaikan field yang tidak diizinkan", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const existing = {
    id: 1,
    nama: "Tes Skrining",
    level: 1,
    jenjang: "SD",
    deskripsi: "Deskripsi",
    aktif: true,
    _count: { pertanyaan: 0, hasil_tes: 0 },
    kategori_asesmen: []
  };

  const origFindUnique = prisma.tes_skrining.findUnique;
  const origFindFirst = prisma.tes_skrining.findFirst;
  const origUpdate = prisma.tes_skrining.update;

  let capturedUpdateData = null;
  prisma.tes_skrining.findUnique = async () => existing;
  prisma.tes_skrining.findFirst = async () => null;
  prisma.tes_skrining.update = async ({ data }) => {
    capturedUpdateData = data;
    return {
      ...existing,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
      _count: { pertanyaan: 0 }
    };
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          nama: "Nama Sah",
          super_admin_id: 999,
          total_skor: 100,
          created_at: "2020-01-01"
        })
      });

      assert.equal(res.status, 200);
      assert.equal(capturedUpdateData.nama, "Nama Sah");
      assert.equal(capturedUpdateData.super_admin_id, undefined);
      assert.equal(capturedUpdateData.total_skor, undefined);
      assert.equal(capturedUpdateData.created_at, undefined);
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
    prisma.tes_skrining.findFirst = origFindFirst;
    prisma.tes_skrining.update = origUpdate;
  }
});

// 14. Hapus tes tanpa relasi terlarang berhasil (200)
test("14. DELETE /api/super-admin/tes-skrining/:id berhasil menghapus tes tanpa relasi terlarang", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const existing = {
    id: 1,
    nama: "Tes Draf",
    _count: { hasil_tes: 0, pertanyaan: 0 },
    pertanyaan: []
  };

  const origFindUnique = prisma.tes_skrining.findUnique;
  const origDelete = prisma.tes_skrining.delete;
  const origKatUpdateMany = prisma.kategori_asesmen.updateMany;
  const origTransaction = prisma.$transaction;

  prisma.tes_skrining.findUnique = async () => existing;
  prisma.kategori_asesmen.updateMany = async () => {};
  prisma.tes_skrining.delete = async () => existing;
  prisma.$transaction = async (fn) => await fn(prisma);

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.match(body.message, /berhasil dihapus/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
    prisma.tes_skrining.delete = origDelete;
    prisma.kategori_asesmen.updateMany = origKatUpdateMany;
    prisma.$transaction = origTransaction;
  }
});

// 15. Hapus tes dengan riwayat/relasi terlarang ditolak (400)
test("15. DELETE /api/super-admin/tes-skrining/:id menolak penghapusan tes dengan riwayat hasil skrining", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const existing = {
    id: 1,
    nama: "Tes dengan Riwayat",
    _count: { hasil_tes: 5, pertanyaan: 25 },
    pertanyaan: []
  };

  const origFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => existing;

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /memiliki riwayat hasil skrining/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origFindUnique;
  }
});

// 16. Alias rute /api/admin/tes-skrining
test("16. Alias rute /api/admin/tes-skrining dapat diakses dengan hasil yang sama", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origCount = prisma.tes_skrining.count;
  const origFindMany = prisma.tes_skrining.findMany;

  prisma.tes_skrining.count = async () => 0;
  prisma.tes_skrining.findMany = async () => [];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/tes-skrining`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });
  } finally {
    prisma.tes_skrining.count = origCount;
    prisma.tes_skrining.findMany = origFindMany;
  }
});
