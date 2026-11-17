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
test("1. Rute Tab Interpretasi menolak request tanpa token (401)", async () => {
  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/interpretasi`);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /Token autentikasi tidak ditemukan/);
  });
});

// 2. Role selain SUPER_ADMIN ditolak (403)
test("2. Rute Tab Interpretasi menolak role selain SUPER_ADMIN (403)", async () => {
  const tokenSekolah = buatTestToken("SEKOLAH", 10, "sekolah@demo.test");

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/interpretasi`, {
      headers: { Authorization: `Bearer ${tokenSekolah}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /tidak memiliki hak akses/);
  });
});

// 3. GET /:id/interpretasi mengembalikan 404 jika tes tidak ditemukan
test("3. GET /api/super-admin/tes-skrining/:id/interpretasi melempar 404 jika tes tidak ada", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  prisma.tes_skrining.findUnique = async () => null;

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/999/interpretasi`, {
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

// 4. GET /:id/interpretasi berhasil membaca konfigurasi Level 1 (200)
test("4. GET /api/super-admin/tes-skrining/:id/interpretasi membaca daftar Level 1 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindMany = prisma.pertanyaan.findMany;
  const origKategoriFindMany = prisma.kategori_asesmen.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1", jenjang: "SD" });
  prisma.pertanyaan.findMany = async () => [{ kategori_asesmen_id: 1 }];
  prisma.kategori_asesmen.findMany = async () => [
    {
      id: 1,
      nama: "Somatik",
      urutan: 1,
      deskripsi: "Somatik lanjutan",
      rekomendasi: "Rujuk",
      deskripsi_belum_memenuhi: "Somatik normal",
      rekomendasi_belum_memenuhi: "Pantau"
    }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/interpretasi`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.tes.id, 1);
      assert.equal(body.data.items.length, 1);
      assert.equal(body.data.items[0].kondisi.length, 2);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findMany = origPertanyaanFindMany;
    prisma.kategori_asesmen.findMany = origKategoriFindMany;
  }
});

// 5. GET /:id/interpretasi berhasil membaca konfigurasi Level 2 (200)
test("5. GET /api/super-admin/tes-skrining/:id/interpretasi membaca daftar Level 2 (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindMany = prisma.rentang_penilaian.findMany;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2, nama: "LEVEL 2 Inatensi", jenjang: "SD" });
  prisma.rentang_penilaian.findMany = async () => [
    { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 54, urutan: 1, deskripsi: "Baik", rekomendasi: "Rutin" },
    { id: 2, tes_skrining_id: 10, kategori: "Klinis", skor_min: 55, skor_max: null, urutan: 2, deskripsi: null, rekomendasi: null }
  ];

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/interpretasi`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.tes.id, 10);
      assert.equal(body.data.items.length, 2);
      assert.equal(body.data.items[0].terisi, true);
      assert.equal(body.data.items[1].terisi, false);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findMany = origRentangFindMany;
  }
});

// 6. GET /:id/interpretasi/:interpretasiId detail Level 1 dengan compound ID (200)
test("6. GET detail Level 1 dengan compound ID (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindFirst = prisma.pertanyaan.findFirst;
  const origKategoriFindUnique = prisma.kategori_asesmen.findUnique;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1, nama: "DSM-5 L1" });
  prisma.pertanyaan.findFirst = async () => ({ id: 101, kategori_asesmen_id: 1 });
  prisma.kategori_asesmen.findUnique = async () => ({
    id: 1,
    nama: "Somatik",
    urutan: 1,
    deskripsi: "Somatik lanjutan",
    rekomendasi: "Rujuk",
    deskripsi_belum_memenuhi: "Somatik normal",
    rekomendasi_belum_memenuhi: "Pantau"
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/interpretasi/1-belum_memenuhi`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.kondisi, "belum_memenuhi");
      assert.equal(body.data.deskripsi, "Somatik normal");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findFirst = origPertanyaanFindFirst;
    prisma.kategori_asesmen.findUnique = origKategoriFindUnique;
  }
});

// 7. GET /:id/interpretasi/:interpretasiId detail Level 2 (200)
test("7. GET detail Level 2 dengan ID rentang (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindUnique = prisma.rentang_penilaian.findUnique;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findUnique = async () => ({
    id: 5,
    tes_skrining_id: 10,
    kategori: "Sedang",
    skor_min: 55,
    skor_max: 64,
    urutan: 2,
    deskripsi: "Gejala sedang",
    rekomendasi: "Pantau berkala"
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/interpretasi/5`, {
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 5);
      assert.equal(body.data.kategori, "Sedang");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findUnique = origRentangFindUnique;
  }
});

// 8. PATCH /:id/interpretasi/:interpretasiId Level 1 memperbarui narasi (200)
test("8. PATCH Level 1 memperbarui deskripsi dan rekomendasi (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origPertanyaanFindFirst = prisma.pertanyaan.findFirst;
  const origKategoriFindUnique = prisma.kategori_asesmen.findUnique;
  const origKategoriUpdate = prisma.kategori_asesmen.update;

  prisma.tes_skrining.findUnique = async () => ({ id: 1, level: 1 });
  prisma.pertanyaan.findFirst = async () => ({ id: 101, kategori_asesmen_id: 1 });
  prisma.kategori_asesmen.findUnique = async () => ({ id: 1, nama: "Somatik", urutan: 1 });
  prisma.kategori_asesmen.update = async ({ data }) => ({
    id: 1,
    nama: "Somatik",
    urutan: 1,
    deskripsi: data.deskripsi ?? "Lama",
    rekomendasi: data.rekomendasi ?? "Lama"
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/1/interpretasi/1-memenuhi`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deskripsi: "Perkembangan memerlukan observasi lanjutan.",
          rekomendasi: "Konsultasikan dengan dokter spesialis anak."
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.kategori_id, 1);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.pertanyaan.findFirst = origPertanyaanFindFirst;
    prisma.kategori_asesmen.findUnique = origKategoriFindUnique;
    prisma.kategori_asesmen.update = origKategoriUpdate;
  }
});

// 9. PATCH /:id/interpretasi/:interpretasiId Level 2 memperbarui narasi (200)
test("9. PATCH Level 2 memperbarui deskripsi dan rekomendasi rentang (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindUnique = prisma.rentang_penilaian.findUnique;
  const origRentangUpdate = prisma.rentang_penilaian.update;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findUnique = async () => ({
    id: 3,
    tes_skrining_id: 10,
    kategori: "Klinis Signifikan",
    skor_min: 65,
    skor_max: null,
    urutan: 3
  });
  prisma.rentang_penilaian.update = async ({ data }) => ({
    id: 3,
    tes_skrining_id: 10,
    kategori: "Klinis Signifikan",
    skor_min: 65,
    skor_max: null,
    urutan: 3,
    deskripsi: data.deskripsi,
    rekomendasi: data.rekomendasi
  });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/interpretasi/3`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${tokenAdmin}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          deskripsi: "Gejala klinis signifikan teridentifikasi.",
          rekomendasi: "Rujukan mendalam ke psikolog / psikiater anak."
        })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.id, 3);
      assert.equal(body.data.deskripsi, "Gejala klinis signifikan teridentifikasi.");
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findUnique = origRentangFindUnique;
    prisma.rentang_penilaian.update = origRentangUpdate;
  }
});

// 10. DELETE /:id/interpretasi/:interpretasiId mengosongkan narasi (200)
test("10. DELETE mengosongkan narasi interpretasi tanpa menghapus entitas (200)", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);
  const origTesFindUnique = prisma.tes_skrining.findUnique;
  const origRentangFindUnique = prisma.rentang_penilaian.findUnique;
  const origRentangUpdate = prisma.rentang_penilaian.update;

  prisma.tes_skrining.findUnique = async () => ({ id: 10, level: 2 });
  prisma.rentang_penilaian.findUnique = async () => ({ id: 3, tes_skrining_id: 10 });
  prisma.rentang_penilaian.update = async () => ({ id: 3 });

  try {
    await denganServer(async (baseUrl) => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/10/interpretasi/3`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${tokenAdmin}` }
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.match(body.message, /berhasil dikosongkan/);
    });
  } finally {
    prisma.tes_skrining.findUnique = origTesFindUnique;
    prisma.rentang_penilaian.findUnique = origRentangFindUnique;
    prisma.rentang_penilaian.update = origRentangUpdate;
  }
});

// 11. Rute /api/admin/tes-skrining/:id/interpretasi mengembalikan 404 karena rute Super Admin eksklusif di /super-admin
test("11. Rute /api/admin/tes-skrining/:id/interpretasi mengembalikan 404 karena rute dialihkan eksklusif ke /super-admin", async () => {
  const tokenAdmin = buatTestToken("SUPER_ADMIN", 1);

  await denganServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/admin/tes-skrining/1/interpretasi`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    assert.equal(res.status, 404);
  });
});
