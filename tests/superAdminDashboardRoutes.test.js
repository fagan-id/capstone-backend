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
 * Setup mock Prisma untuk mengisolasi pengujian dashboard dari pool database fisik.
 */
function pasangMockPrismaDashboard() {
  const original = {
    sekolahCount: prisma.sekolah?.count,
    sekolahFindMany: prisma.sekolah?.findMany,
    sesiCount: prisma.sesi_skrining?.count,
    sesiFindMany: prisma.sesi_skrining?.findMany,
    siswaCount: prisma.siswa?.count,
    hasilFindMany: prisma.hasil_skrining?.findMany,
    tesFindMany: prisma.tes_skrining?.findMany
  };

  prisma.sekolah.count = async ({ where } = {}) => {
    if (where?.aktif === true) return 21;
    if (where?.aktif === false) return 3;
    return 24;
  };
  prisma.sekolah.findMany = async () => [
    {
      id: "sek-1",
      nama: "SD Inklusi Harapan Bunda",
      aktif: true,
      created_at: new Date("2026-09-24T10:00:00Z"),
      updated_at: new Date("2026-09-24T10:00:00Z")
    }
  ];

  prisma.sesi_skrining.count = async ({ where } = {}) => {
    if (where?.status === "aktif") return 8;
    return 12;
  };
  prisma.sesi_skrining.findMany = async () => [
    {
      id: "sesi-1",
      nama: "Skrining Siswa Baru 2026/2027",
      created_at: new Date("2026-09-24T08:30:00Z"),
      status: "aktif",
      sekolah: { nama: "SD Inklusi Harapan Bunda" }
    }
  ];

  prisma.siswa.count = async () => 1247;

  prisma.hasil_skrining.findMany = async () => [
    { siswa_id: "sis-1" },
    { siswa_id: "sis-2" },
    { siswa_id: "sis-3" }
  ];

  prisma.tes_skrining.findMany = async () => [
    {
      id: 1,
      nama: "Instrumen Skrining Tahap 1 (Level 1)",
      created_at: new Date("2026-09-21T09:00:00Z"),
      updated_at: new Date("2026-09-24T09:00:00Z")
    }
  ];

  return () => {
    prisma.sekolah.count = original.sekolahCount;
    prisma.sekolah.findMany = original.sekolahFindMany;
    prisma.sesi_skrining.count = original.sesiCount;
    prisma.sesi_skrining.findMany = original.sesiFindMany;
    prisma.siswa.count = original.siswaCount;
    prisma.hasil_skrining.findMany = original.hasilFindMany;
    prisma.tes_skrining.findMany = original.tesFindMany;
  };
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

// 1. Dashboard: Tanpa autentikasi ditolak (401)
test("1. Rute Dashboard menolak request tanpa token autentikasi (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/dashboard`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

// 2. Dashboard: Role selain SUPER_ADMIN ditolak (403)
test("2. Rute Dashboard menolak role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@test.com");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/dashboard`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

// 3. Dashboard: Sukses dengan token SUPER_ADMIN (200)
test("3. GET /api/super-admin/dashboard sukses mengembalikan statistik dan aktivitas", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");
  const restoreMock = pasangMockPrismaDashboard();

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/dashboard`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, "Data dashboard Super Admin berhasil dimuat.");

      // Cek statistik
      assert.ok(body.data.statistik);
      assert.equal(body.data.statistik.total_sekolah, 24);
      assert.equal(body.data.statistik.sekolah_aktif, 21);
      assert.equal(body.data.statistik.sesi_aktif, 8);
      assert.equal(body.data.statistik.total_siswa_diskrining, 3);

      // Cek 4 KPI cards
      assert.ok(Array.isArray(body.data.kpi_cards));
      assert.equal(body.data.kpi_cards.length, 4);
      const cardIds = body.data.kpi_cards.map((c) => c.id);
      assert.deepEqual(cardIds, ["total_sekolah", "sekolah_aktif", "sesi_aktif", "total_siswa"]);

      // Cek aktivitas terbaru & paginasi
      assert.ok(Array.isArray(body.data.aktivitas_terbaru));
      assert.ok(body.data.pagination);
      assert.equal(body.data.pagination.page, 1);
      assert.equal(body.data.pagination.limit, 5);
    });
  } finally {
    restoreMock();
  }
});

// 4. Dashboard: Rute /api/admin/dashboard tidak terdaftar (404) karena rute Super Admin eksklusif di /super-admin/dashboard
test("4. GET /api/admin/dashboard mengembalikan 404 karena rute dialihkan eksklusif ke /super-admin/dashboard", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });

    assert.equal(res.status, 404);
  });
});

// 5. Dashboard: Paginasi kustom (page=2, limit=2)
test("5. GET /api/super-admin/dashboard mendukung parameter query pagination", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");
  const restoreMock = pasangMockPrismaDashboard();

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/dashboard?page=2&limit=2`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.pagination.page, 2);
      assert.equal(body.data.pagination.limit, 2);
    });
  } finally {
    restoreMock();
  }
});

// 6. Dashboard: Filter kategori
test("6. GET /api/super-admin/dashboard mendukung filter kategori", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");
  const restoreMock = pasangMockPrismaDashboard();

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/dashboard?kategori=sekolah`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(body.data.aktivitas_terbaru.every((a) => a.aktivitas.includes("Sekolah")));
    });
  } finally {
    restoreMock();
  }
});

// 7. Dashboard: Validasi query error (400)
test("7. GET /api/super-admin/dashboard menolak query parameter tidak valid (400)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/dashboard?page=invalid`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Parameter 'page' harus berupa bilangan bulat positif/);
  });
});

// 8. Logout: POST /api/auth/logout oleh SUPER_ADMIN menghapus cookie dan sukses (200)
test("8. POST /api/auth/logout oleh Super Admin berhasil mengakhiri sesi dan membersihkan cookie", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        Cookie: `token=${tokenAdmin}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /Logout berhasil/);

    // Verifikasi header Set-Cookie membersihkan token
    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /token=;/);
  });
});

// 9. Logout: POST /api/super-admin/logout berhasil membersihkan cookie (200)
test("9. POST /api/super-admin/logout berhasil mengakhiri sesi Super Admin dan membersihkan cookie", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenAdmin}`,
        Cookie: `token=${tokenAdmin}`
      }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /Logout berhasil. Sesi Super Admin telah diakhiri./);

    // Verifikasi header Set-Cookie membersihkan token
    const setCookie = res.headers.get("set-cookie");
    assert.ok(setCookie);
    assert.match(setCookie, /token=;/);
  });
});

// 10. Logout: POST /api/admin/logout tidak terdaftar (404) karena rute Super Admin eksklusif di /super-admin/logout
test("10. POST /api/admin/logout mengembalikan 404 karena rute Super Admin eksklusif di /super-admin/logout", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/logout`, {
      method: "POST"
    });

    assert.equal(res.status, 404);
  });
});

// 11. Logout: POST /api/super-admin/dashboard/logout berhasil dengan token SUPER_ADMIN
test("11. POST /api/super-admin/dashboard/logout berhasil untuk Super Admin", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "admin@skriningabk.id");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/dashboard/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.match(body.message, /Logout berhasil. Sesi Super Admin telah diakhiri./);
  });
});
