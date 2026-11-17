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
test("1. Rute Tab Pertanyaan menolak request tanpa token (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

// 2. Role selain SUPER_ADMIN ditolak (403)
test("2. Rute Tab Pertanyaan menolak pengguna dengan role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@demo.test");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

// 3. GET /api/super-admin/tes-skrining/:id/pertanyaan berhasil (200)
test("3. GET /api/super-admin/tes-skrining/:id/pertanyaan memuat daftar pertanyaan", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanCount = prisma.pertanyaan.count;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, nama: "Tes L1", level: 1, kategori_asesmen: [] });
  prisma.pertanyaan.count = async () => 2;
  prisma.pertanyaan.findMany = async () => [
    {
      id: 1,
      tes_skrining_id: 1,
      nomor_urut: 1,
      teks: "Pertanyaan pertama",
      kalimat_pengantar: null,
      tipe_jawaban: "skala",
      url_gambar: null,
      aktif: true,
      kategori_asesmen: { id: 1, kode: "K1", nama: "Kat 1" },
      opsi_jawaban: [
        { id: 1, label: "0", teks: "Tidak", penjelasan: null, skor: 0, urutan: 1, url_gambar: null },
        { id: 2, label: "1", teks: "Ya", penjelasan: null, skor: 1, urutan: 2, url_gambar: null }
      ],
      pemicu_pertanyaan: null,
      pemicu_opsi: null,
      _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 },
      created_at: new Date(),
      updated_at: new Date()
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].teks, "Pertanyaan pertama");
      assert.ok(body.pagination);
      assert.ok(body.statistik);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.count = origPertanyaanCount;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
  }
});

// 4. GET /api/super-admin/tes-skrining/:id/pertanyaan/opsi-pemicu tidak terbentur :pertanyaanId (200)
test("4. GET /api/super-admin/tes-skrining/:id/pertanyaan/opsi-pemicu memuat opsi pemicu tanpa bentrok rute dinamis", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, nama: "Tes L1" });
  prisma.pertanyaan.findMany = async () => [
    {
      id: 1,
      nomor_urut: 1,
      teks: "Pertanyaan 1",
      tipe_jawaban: "skala",
      opsi_jawaban: [{ id: 1, label: "0", teks: "Tidak", skor: 0, urutan: 1 }]
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan/opsi-pemicu`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.length, 1);
      assert.equal(body.data[0].id, 1);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
  }
});

// 5. POST /api/super-admin/tes-skrining/:id/pertanyaan berhasil membuat pertanyaan (201)
test("5. POST /api/super-admin/tes-skrining/:id/pertanyaan berhasil menambahkan pertanyaan baru (201)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origKatFindUnique = prisma.kategori_asesmen.findUnique;
  const origPertanyaanFindFirst = prisma.pertanyaan.findFirst;
  const origTransaction = prisma.$transaction;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, kategori_asesmen: [] });
  prisma.kategori_asesmen.findUnique = async () => ({ id: 2, kode: "K2", nama: "Kat 2" });
  prisma.pertanyaan.findFirst = async () => null;

  prisma.$transaction = async (fn) => {
    const tx = {
      pertanyaan: {
        create: async () => ({
          id: 50,
          tes_skrining_id: 1,
          kategori_asesmen_id: 2,
          teks: "Apakah anak sulit konsentrasi?",
          kalimat_pengantar: null,
          tipe_jawaban: "skala",
          nomor_urut: 1,
          url_gambar: null,
          aktif: true,
          pemicu_pertanyaan_id: null,
          pemicu_opsi_id: null,
          pemicu_operator: null,
          pemicu_nilai: null,
          kategori_asesmen: { id: 2, kode: "K2", nama: "Kat 2" },
          opsi_jawaban: [
            { id: 10, label: "0", teks: "Tidak Pernah", penjelasan: null, skor: 0, urutan: 1, url_gambar: null },
            { id: 11, label: "1", teks: "Kadang-kadang", penjelasan: null, skor: 1, urutan: 2, url_gambar: null }
          ],
          pemicu_pertanyaan: null,
          pemicu_opsi: null,
          _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 },
          created_at: new Date(),
          updated_at: new Date()
        })
      }
    };
    return fn(tx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teks: "Apakah anak sulit konsentrasi?",
          kategori_asesmen_id: 2,
          tipe_jawaban: "skala",
          opsi_jawaban: [
            { label: "0", teks: "Tidak Pernah", skor: 0, urutan: 1 },
            { label: "1", teks: "Kadang-kadang", skor: 1, urutan: 2 }
          ]
        })
      });
      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 50);
      assert.equal(body.data.teks, "Apakah anak sulit konsentrasi?");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.kategori_asesmen.findUnique = origKatFindUnique;
    prisma.pertanyaan.findFirst = origPertanyaanFindFirst;
    prisma.$transaction = origTransaction;
  }
});

// 6. GET /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId memuat detail (200)
test("6. GET /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId memuat detail pertanyaan", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origPertanyaanFindUnique = prisma.pertanyaan.findUnique;

  prisma.pertanyaan.findUnique = async () => ({
    id: 50,
    tes_skrining_id: 1,
    nomor_urut: 1,
    teks: "Pertanyaan detail",
    kalimat_pengantar: null,
    tipe_jawaban: "skala",
    url_gambar: null,
    aktif: true,
    tes_skrining: { id: 1, nama: "Tes 1", level: 1, jenjang: "SD" },
    kategori_asesmen: { id: 2, kode: "K2", nama: "Kat 2" },
    opsi_jawaban: [],
    pemicu_pertanyaan: null,
    pemicu_opsi: null,
    _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 },
    created_at: new Date(),
    updated_at: new Date()
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan/50`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 50);
      assert.equal(body.data.riwayat.dapat_dihapus, true);
    });
  } finally {
    prisma.pertanyaan.findUnique = origPertanyaanFindUnique;
  }
});

// 7. PATCH /api/super-admin/tes-skrining/:id/pertanyaan/urutan bekerja dan tidak bentrok (200)
test("7. PATCH /api/super-admin/tes-skrining/:id/pertanyaan/urutan memproses batch reordering", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;
  const origTransaction = prisma.$transaction;

  prisma.tes_skrining.findUnique = async () => ({ id: 1 });
  prisma.pertanyaan.findMany = async () => [
    { id: 10, nomor_urut: 1, teks: "P1" },
    { id: 20, nomor_urut: 2, teks: "P2" }
  ];

  prisma.$transaction = async (fn) => {
    const tx = {
      pertanyaan: {
        update: async () => ({})
      }
    };
    return fn(tx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan/urutan`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          urutan: [
            { id: 10, nomor_urut: 2 },
            { id: 20, nomor_urut: 1 }
          ]
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.message, "Urutan pertanyaan berhasil diperbarui.");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
    prisma.$transaction = origTransaction;
  }
});

// 8. PUT /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId memperbarui pertanyaan (200)
test("8. PUT /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId berhasil memperbarui data", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origPertanyaanFindUnique = prisma.pertanyaan.findUnique;
  const origTransaction = prisma.$transaction;

  prisma.pertanyaan.findUnique = async () => ({
    id: 50,
    tes_skrining_id: 1,
    nomor_urut: 1,
    teks: "Teks Lama",
    kalimat_pengantar: null,
    tipe_jawaban: "skala",
    url_gambar: null,
    aktif: true,
    kategori_asesmen_id: 2,
    pemicu_pertanyaan_id: null,
    pemicu_opsi_id: null,
    pemicu_operator: null,
    pemicu_nilai: null,
    tes_skrining: { level: 1, kategori_asesmen: [] },
    _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 }
  });

  prisma.$transaction = async (fn) => {
    const tx = {
      opsi_jawaban: {
        deleteMany: async () => {},
        createMany: async () => {}
      },
      pertanyaan: {
        update: async () => ({
          id: 50,
          tes_skrining_id: 1,
          nomor_urut: 1,
          teks: "Teks Baru Hasil Edit",
          kalimat_pengantar: null,
          tipe_jawaban: "skala",
          url_gambar: null,
          aktif: false,
          kategori_asesmen: { id: 2, kode: "K2", nama: "Kat 2" },
          opsi_jawaban: [],
          pemicu_pertanyaan: null,
          pemicu_opsi: null,
          _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 },
          created_at: new Date(),
          updated_at: new Date()
        })
      }
    };
    return fn(tx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan/50`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teks: "Teks Baru Hasil Edit",
          aktif: false
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.teks, "Teks Baru Hasil Edit");
      assert.equal(body.data.aktif, false);
    });
  } finally {
    prisma.pertanyaan.findUnique = origPertanyaanFindUnique;
    prisma.$transaction = origTransaction;
  }
});

// 9. DELETE /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId berhasil menghapus (200)
test("9. DELETE /api/super-admin/tes-skrining/:id/pertanyaan/:pertanyaanId berhasil menghapus pertanyaan aman", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  const origPertanyaanFindUnique = prisma.pertanyaan.findUnique;
  const origTransaction = prisma.$transaction;

  prisma.pertanyaan.findUnique = async () => ({
    id: 50,
    tes_skrining_id: 1,
    _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 }
  });

  prisma.$transaction = async (fn) => {
    const tx = {
      opsi_jawaban: { deleteMany: async () => {} },
      pertanyaan: { delete: async () => {} }
    };
    return fn(tx);
  };

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/pertanyaan/50`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 50);
    });
  } finally {
    prisma.pertanyaan.findUnique = origPertanyaanFindUnique;
    prisma.$transaction = origTransaction;
  }
});

// 10. Rute /api/admin/tes-skrining/:id/pertanyaan mengembalikan 404 karena rute Super Admin eksklusif di /super-admin/tes-skrining
test("10. Rute /api/admin/tes-skrining/:id/pertanyaan mengembalikan 404 karena rute dialihkan eksklusif ke /super-admin", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/tes-skrining/1/pertanyaan`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.equal(res.status, 404);
  });
});
