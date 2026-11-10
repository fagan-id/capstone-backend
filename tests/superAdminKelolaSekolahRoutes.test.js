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

test("Rute Kelola Sekolah menolak request tanpa token (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/sekolah`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

test("Rute Kelola Sekolah menolak pengguna dengan role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@demo.test");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/sekolah`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

test("GET /api/super-admin/sekolah berhasil diambil oleh SUPER_ADMIN", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1, "superadmin@skriningabk.id");

  const originalCount = prisma.sekolah.count;
  const originalFindMany = prisma.sekolah.findMany;

  prisma.sekolah.count = async () => 1;
  prisma.sekolah.findMany = async () => [
    {
      id: 1,
      npsn: "12345678",
      nama: "SDN Sukamaju 01",
      email: "admin@sdnsukamaju01.sch.id",
      username: "sdnsukamaju01",
      alamat: null,
      kontak_telepon: null,
      password_hash: "secret_hash",
      aktif: true,
      created_at: new Date("2026-01-15"),
      updated_at: new Date("2026-01-15"),
      _count: { sesi_skrining: 12 }
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/sekolah?status=aktif&search=Sukamaju`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, "Data sekolah berhasil dimuat.");
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].nama, "SDN Sukamaju 01");
      assert.equal(body.data[0].total_sesi, 12);
      assert.equal(body.data[0].password_hash, undefined);
      assert.equal(body.pagination.total, 1);
      assert.equal(body.pagination.page, 1);
    });
  } finally {
    prisma.sekolah.count = originalCount;
    prisma.sekolah.findMany = originalFindMany;
  }
});

test("GET /api/super-admin/sekolah/:id mengembalikan detail sekolah atau 404", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const originalFindUnique = prisma.sekolah.findUnique;
  prisma.sekolah.findUnique = async ({ where }) => {
    if (where.id === 1) {
      return {
        id: 1,
        npsn: "12345678",
        nama: "SDN Sukamaju 01",
        email: "admin@sdnsukamaju01.sch.id",
        username: "sdnsukamaju01",
        alamat: "Jl. Merdeka No. 1",
        kontak_telepon: "021-1234567",
        password_hash: "secret_hash",
        aktif: true,
        created_at: new Date(),
        updated_at: new Date(),
        _count: { sesi_skrining: 12 }
      };
    }
    return null;
  };

  try {
    await denganServer(async (baseUrl) => {
      // 1. Ditemukan
      const res1 = await fetch(`${baseUrl}/api/super-admin/sekolah/1`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res1.status, 200);
      const body1 = await res1.json();
      assert.equal(body1.data.nama, "SDN Sukamaju 01");
      assert.equal(body1.data.total_sesi, 12);
      assert.equal(body1.data.password_hash, undefined);

      // 2. Tidak ditemukan
      const res2 = await fetch(`${baseUrl}/api/super-admin/sekolah/999`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res2.status, 404);
      const body2 = await res2.json();
      assert.equal(body2.success, false);
      assert.match(body2.message, /Data sekolah tidak ditemukan/);
    });
  } finally {
    prisma.sekolah.findUnique = originalFindUnique;
  }
});

test("POST /api/super-admin/sekolah membuat sekolah baru", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const originalFindUnique = prisma.sekolah.findUnique;
  const originalCreate = prisma.sekolah.create;

  prisma.sekolah.findUnique = async () => null;
  prisma.sekolah.create = async ({ data }) => ({
    id: 15,
    ...data,
    created_at: new Date(),
    updated_at: new Date(),
    _count: { sesi_skrining: 0 }
  });

  try {
    await denganServer(async (baseUrl) => {
      // 1. Validasi error saat input kosong
      const resErr = await fetch(`${baseUrl}/api/super-admin/sekolah`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({})
      });
      assert.equal(resErr.status, 400);

      // 2. Sukses tambah sekolah baru (sesuai input modal)
      const resOk = await fetch(`${baseUrl}/api/super-admin/sekolah`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          nama: "SD Cempaka 03",
          email: "admin@cempaka03.sch.id",
          password: "PasswordRahasia123!",
          aktif: true
        })
      });

      assert.equal(resOk.status, 201);
      const bodyOk = await resOk.json();
      assert.equal(bodyOk.success, true);
      assert.equal(bodyOk.message, "Sekolah berhasil ditambahkan.");
      assert.equal(bodyOk.data.nama, "SD Cempaka 03");
      assert.equal(bodyOk.data.email, "admin@cempaka03.sch.id");
      assert.equal(bodyOk.data.aktif, true);
      assert.equal(bodyOk.data.total_sesi, 0);
      assert.equal(bodyOk.data.password_hash, undefined);
    });
  } finally {
    prisma.sekolah.findUnique = originalFindUnique;
    prisma.sekolah.create = originalCreate;
  }
});

test("PUT dan PATCH /api/super-admin/sekolah/:id memperbarui data sekolah", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const existing = {
    id: 1,
    npsn: "12345678",
    nama: "SD Lama",
    email: "lama@sekolah.sch.id",
    username: "sd_lama",
    alamat: null,
    kontak_telepon: null,
    password_hash: "hash_lama",
    aktif: true
  };

  const originalFindUnique = prisma.sekolah.findUnique;
  const originalFindFirst = prisma.sekolah.findFirst;
  const originalUpdate = prisma.sekolah.update;

  prisma.sekolah.findUnique = async ({ where }) => (where.id === 1 ? existing : null);
  prisma.sekolah.findFirst = async () => null;
  prisma.sekolah.update = async ({ data }) => ({
    ...existing,
    ...data,
    created_at: new Date(),
    updated_at: new Date(),
    _count: { sesi_skrining: 8 }
  });

  try {
    await denganServer(async (baseUrl) => {
      // PUT update
      const resPut = await fetch(`${baseUrl}/api/super-admin/sekolah/1`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          nama: "SD Sukamaju Diperbarui",
          email: "admin@sukamaju.sch.id",
          password: "", // Kosongkan jika tidak ingin mengubah password
          aktif: false
        })
      });

      assert.equal(resPut.status, 200);
      const bodyPut = await resPut.json();
      assert.equal(bodyPut.success, true);
      assert.equal(bodyPut.data.nama, "SD Sukamaju Diperbarui");
      assert.equal(bodyPut.data.aktif, false);
      assert.equal(bodyPut.data.password_hash, undefined);

      // PATCH update juga didukung
      const resPatch = await fetch(`${baseUrl}/api/super-admin/sekolah/1`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({
          aktif: true
        })
      });

      assert.equal(resPatch.status, 200);
      const bodyPatch = await resPatch.json();
      assert.equal(bodyPatch.success, true);
    });
  } finally {
    prisma.sekolah.findUnique = originalFindUnique;
    prisma.sekolah.findFirst = originalFindFirst;
    prisma.sekolah.update = originalUpdate;
  }
});

test("DELETE /api/super-admin/sekolah/:id ditolak dengan 405 Method Not Allowed (CRU tanpa Delete)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  await denganServer(async (baseUrl) => {
    // 1. DELETE pada /:id
    const resId = await fetch(`${baseUrl}/api/super-admin/sekolah/1`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });

    assert.equal(resId.status, 405);
    const bodyId = await resId.json();
    assert.equal(bodyId.success, false);
    assert.match(bodyId.message, /Operasi hapus sekolah tidak diizinkan/);

    // 2. DELETE pada root /
    const resRoot = await fetch(`${baseUrl}/api/super-admin/sekolah`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });

    assert.equal(resRoot.status, 405);
  });
});

test("Alias rute /api/admin/sekolah juga dapat diakses dengan hasil yang sama", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const originalCount = prisma.sekolah.count;
  const originalFindMany = prisma.sekolah.findMany;

  prisma.sekolah.count = async () => 0;
  prisma.sekolah.findMany = async () => [];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/admin/sekolah`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });
  } finally {
    prisma.sekolah.count = originalCount;
    prisma.sekolah.findMany = originalFindMany;
  }
});
