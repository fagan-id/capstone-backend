import { test } from "node:test";
import assert from "node:assert/strict";
import * as tesSkriningService from "../src/services/superAdmin/superAdminTesSkrining.js";

// ==========================================
// 1. getDaftarTesSkrining
// ==========================================
test("tesSkriningService.getDaftarTesSkrining mengambil daftar, statistik, dan paginasi", async () => {
  const dummyData = [
    {
      id: 1,
      nama: "DSM-5-TR Level 1",
      level: 1,
      jenjang: "SD",
      deskripsi: "Skrining awal",
      aktif: true,
      created_at: new Date("2026-01-01"),
      updated_at: new Date("2026-01-01"),
      _count: { pertanyaan: 25 },
      kategori_asesmen: []
    },
    {
      id: 2,
      nama: "LEVEL 2 - Depresi",
      level: 2,
      jenjang: "SD",
      deskripsi: "Instrumen lanjutan depresi",
      aktif: true,
      created_at: new Date("2026-01-02"),
      updated_at: new Date("2026-01-02"),
      _count: { pertanyaan: 11 },
      kategori_asesmen: [{ id: 3, nama: "Depresi" }]
    }
  ];

  let queryCaptured = null;
  const mockDb = {
    tes_skrining: {
      count: async ({ where } = {}) => {
        if (!where) return 10;
        if (where.level === 1) return 1;
        if (where.level === 2) return 9;
        if (where.aktif === true) return 10;
        if (where.aktif === false) return 0;
        return 2;
      },
      findMany: async (args) => {
        queryCaptured = args;
        return dummyData;
      }
    }
  };

  const hasil = await tesSkriningService.getDaftarTesSkrining(mockDb, {
    page: 1,
    limit: 10,
    search: "Depresi",
    level: 2,
    status: true,
    sortBy: "level",
    sortOrder: "asc"
  });

  assert.equal(hasil.pagination.page, 1);
  assert.equal(hasil.pagination.limit, 10);
  assert.equal(hasil.items.length, 2);
  assert.equal(hasil.items[0].jumlah_pertanyaan, 25);
  assert.equal(hasil.items[1].jumlah_pertanyaan, 11);
  assert.equal(hasil.items[1].domain.nama, "Depresi");

  // Verifikasi statistik global
  assert.equal(hasil.statistik.total_semua, 10);
  assert.equal(hasil.statistik.total_level_1, 1);
  assert.equal(hasil.statistik.total_level_2, 9);
  assert.equal(hasil.statistik.total_aktif, 10);
  assert.equal(hasil.statistik.total_nonaktif, 0);

  // Verifikasi query Prisma
  assert.equal(queryCaptured.where.level, 2);
  assert.equal(queryCaptured.where.aktif, true);
  assert.ok(queryCaptured.where.OR.length > 0);
  assert.deepEqual(queryCaptured.orderBy, [{ level: "asc" }, { id: "asc" }]);
});

// ==========================================
// 2. getDetailTesSkrining (Tab Overview)
// ==========================================
test("tesSkriningService.getDetailTesSkrining mengembalikan data Tab Overview Level 1 beserta persebaran soal", async () => {
  const dummyTes = {
    id: 1,
    nama: "DSM-5-TR Level 1",
    level: 1,
    jenjang: "SD",
    deskripsi: "Tes skrining awal untuk seluruh siswa",
    aktif: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    super_admin: { id: 1, nama: "Super Admin", email: "admin@demo.test" },
    kategori_asesmen: [],
    pertanyaan: [
      { id: 1, aktif: true, kategori_asesmen_id: 1, kategori_asesmen: { id: 1, nama: "Somatik", urutan: 1 } },
      { id: 2, aktif: true, kategori_asesmen_id: 1, kategori_asesmen: { id: 1, nama: "Somatik", urutan: 1 } },
      { id: 3, aktif: true, kategori_asesmen_id: 2, kategori_asesmen: { id: 2, nama: "Inatensi", urutan: 2 } },
      { id: 4, aktif: false, kategori_asesmen_id: 2, kategori_asesmen: { id: 2, nama: "Inatensi", urutan: 2 } }
    ]
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => dummyTes
    },
    kategori_asesmen: {
      findMany: async () => [
        { id: 1, nama: "Somatik", urutan: 1 },
        { id: 2, nama: "Inatensi", urutan: 2 }
      ]
    }
  };

  const hasil = await tesSkriningService.getDetailTesSkrining(mockDb, 1);

  assert.equal(hasil.id, 1);
  assert.equal(hasil.level, 1);
  assert.equal(hasil.jumlah_pertanyaan, 4);
  assert.equal(hasil.jumlah_pertanyaan_aktif, 3);
  assert.equal(hasil.super_admin.nama, "Super Admin");
  assert.equal(hasil.persebaran_soal.length, 2);
  assert.equal(hasil.persebaran_soal[0].nama_domain, "Somatik");
  assert.equal(hasil.persebaran_soal[0].jumlah_soal, 2);
  assert.equal(hasil.persebaran_soal[0].persentase, 50);
});

test("tesSkriningService.getDetailTesSkrining mengembalikan data Tab Overview Level 2 dengan domain terkait", async () => {
  const dummyTes = {
    id: 2,
    nama: "LEVEL 2 - Depresi",
    level: 2,
    jenjang: "SD",
    deskripsi: "Instrumen lanjutan domain depresi",
    aktif: true,
    created_at: new Date("2026-01-01"),
    updated_at: new Date("2026-01-01"),
    super_admin: { id: 1, nama: "Super Admin", email: "admin@demo.test" },
    kategori_asesmen: [{ id: 3, nama: "Depresi", urutan: 3, ambang_batas: 2 }],
    pertanyaan: [
      { id: 10, aktif: true, kategori_asesmen_id: 3, kategori_asesmen: { id: 3, nama: "Depresi", urutan: 3 } },
      { id: 11, aktif: true, kategori_asesmen_id: 3, kategori_asesmen: { id: 3, nama: "Depresi", urutan: 3 } }
    ]
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => dummyTes
    }
  };

  const hasil = await tesSkriningService.getDetailTesSkrining(mockDb, 2);

  assert.equal(hasil.id, 2);
  assert.equal(hasil.level, 2);
  assert.equal(hasil.nama_domain, "Depresi");
  assert.equal(hasil.domain.id, 3);
  assert.equal(hasil.jumlah_pertanyaan, 2);
  assert.equal(hasil.persebaran_soal.length, 1);
  assert.equal(hasil.persebaran_soal[0].nama_domain, "Depresi");
  assert.equal(hasil.persebaran_soal[0].persentase, 100);
});

test("tesSkriningService.getDetailTesSkrining melemparkan 404 jika tes tidak ditemukan", async () => {
  const mockDb = {
    tes_skrining: {
      findUnique: async () => null
    }
  };

  await assert.rejects(
    async () => tesSkriningService.getDetailTesSkrining(mockDb, 999),
    (err) => err.statusCode === 404 && /Data tes skrining tidak ditemukan/.test(err.message)
  );
});

// ==========================================
// 3. tambahTesSkrining (Level 1 & Level 2)
// ==========================================
test("tesSkriningService.tambahTesSkrining berhasil menambah tes Level 1", async () => {
  let createdData = null;
  const mockDb = {
    tes_skrining: {
      findFirst: async () => null,
      create: async ({ data }) => {
        createdData = data;
        return { id: 10, ...data, created_at: new Date(), updated_at: new Date() };
      }
    },
    super_admin: {
      findUnique: async () => ({ id: 1 })
    }
  };

  const hasil = await tesSkriningService.tambahTesSkrining(
    mockDb,
    {
      level: 1,
      nama: "Tes Baru Level 1",
      deskripsi: "Deskripsi",
      jenjang: "SD",
      aktif: true
    },
    1
  );

  assert.equal(hasil.id, 10);
  assert.equal(hasil.level, 1);
  assert.equal(createdData.super_admin_id, 1);
  assert.equal(hasil.nama, "Tes Baru Level 1");
  assert.equal(hasil.domain, null);
});

test("tesSkriningService.tambahTesSkrining berhasil menambah tes Level 2 dan menautkan domain", async () => {
  let updatedDomain = null;
  const mockDb = {
    tes_skrining: {
      findFirst: async () => null,
      create: async ({ data }) => ({
        id: 20,
        ...data,
        created_at: new Date(),
        updated_at: new Date()
      })
    },
    kategori_asesmen: {
      findUnique: async ({ where }) => (where.id === 3 ? { id: 3, nama: "Depresi" } : null),
      update: async (args) => {
        updatedDomain = args;
        return { id: 3, tes_skrining_id: 20 };
      }
    },
    super_admin: {
      findUnique: async () => ({ id: 1 })
    }
  };

  const hasil = await tesSkriningService.tambahTesSkrining(
    mockDb,
    {
      level: 2,
      nama: "LEVEL 2 - Depresi Baru",
      deskripsi: "Deskripsi Level 2",
      kategori_asesmen_id: 3,
      aktif: true
    },
    1
  );

  assert.equal(hasil.id, 20);
  assert.equal(hasil.level, 2);
  assert.equal(hasil.domain.nama, "Depresi");
  assert.equal(updatedDomain.where.id, 3);
  assert.equal(updatedDomain.data.tes_skrining_id, 20);
});

test("tesSkriningService.tambahTesSkrining menolak duplikasi nama pada level dan jenjang yang sama (409)", async () => {
  const mockDb = {
    tes_skrining: {
      findFirst: async () => ({ id: 1, nama: "Tes Duplikat" })
    }
  };

  await assert.rejects(
    async () =>
      tesSkriningService.tambahTesSkrining(
        mockDb,
        { level: 1, nama: "Tes Duplikat", deskripsi: "D", jenjang: "SD" },
        1
      ),
    (err) => err.statusCode === 409 && /sudah terdaftar/.test(err.message)
  );
});

test("tesSkriningService.tambahTesSkrining menolak jika domain Level 2 tidak ditemukan (404)", async () => {
  const mockDb = {
    tes_skrining: {
      findFirst: async () => null
    },
    kategori_asesmen: {
      findUnique: async () => null
    }
  };

  await assert.rejects(
    async () =>
      tesSkriningService.tambahTesSkrining(
        mockDb,
        { level: 2, nama: "Tes L2", deskripsi: "D", kategori_asesmen_id: 999 },
        1
      ),
    (err) => err.statusCode === 404 && /Domain .* tidak ditemukan/.test(err.message)
  );
});

// ==========================================
// 4. updateOverviewTesSkrining
// ==========================================
test("tesSkriningService.updateOverviewTesSkrining berhasil memperbarui nama dan status aktif", async () => {
  const existing = {
    id: 1,
    nama: "Tes Lama",
    level: 1,
    jenjang: "SD",
    deskripsi: "Deskripsi Lama",
    aktif: true,
    _count: { pertanyaan: 0, hasil_tes: 0 },
    kategori_asesmen: []
  };

  let updatePayload = null;
  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing,
      findFirst: async () => null,
      update: async ({ data }) => {
        updatePayload = data;
        return {
          ...existing,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          _count: { pertanyaan: 0 }
        };
      }
    }
  };

  const hasil = await tesSkriningService.updateOverviewTesSkrining(mockDb, 1, {
    nama: "Tes Diperbarui",
    aktif: false
  });

  assert.equal(hasil.nama, "Tes Diperbarui");
  assert.equal(hasil.aktif, false);
  assert.equal(updatePayload.nama, "Tes Diperbarui");
  assert.equal(updatePayload.aktif, false);
});

test("tesSkriningService.updateOverviewTesSkrining menolak perubahan level jika tes sudah memiliki pertanyaan (400)", async () => {
  const existing = {
    id: 1,
    nama: "Tes Lama",
    level: 1,
    jenjang: "SD",
    deskripsi: "Deskripsi",
    aktif: true,
    _count: { pertanyaan: 5, hasil_tes: 0 },
    kategori_asesmen: []
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing
    }
  };

  await assert.rejects(
    async () => tesSkriningService.updateOverviewTesSkrining(mockDb, 1, { level: 2 }),
    (err) => err.statusCode === 400 && /Perubahan level tidak diizinkan/.test(err.message)
  );
});

test("tesSkriningService.updateOverviewTesSkrining menolak konflik nama dengan tes lain (409)", async () => {
  const existing = {
    id: 1,
    nama: "Tes A",
    level: 1,
    jenjang: "SD",
    deskripsi: "Deskripsi",
    aktif: true,
    _count: { pertanyaan: 0, hasil_tes: 0 },
    kategori_asesmen: []
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing,
      findFirst: async () => ({ id: 2, nama: "Tes B" })
    }
  };

  await assert.rejects(
    async () => tesSkriningService.updateOverviewTesSkrining(mockDb, 1, { nama: "Tes B" }),
    (err) => err.statusCode === 409 && /sudah terdaftar/.test(err.message)
  );
});

// ==========================================
// 5. hapusTesSkrining (Keamanan Relasi)
// ==========================================
test("tesSkriningService.hapusTesSkrining berhasil menghapus tes tanpa relasi terlarang", async () => {
  const existing = {
    id: 1,
    nama: "Tes Draf Kosong",
    _count: { hasil_tes: 0, pertanyaan: 0 },
    pertanyaan: []
  };

  let deletedId = null;
  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing,
      delete: async ({ where }) => {
        deletedId = where.id;
        return existing;
      }
    },
    kategori_asesmen: {
      updateMany: async () => {}
    },
    $transaction: async (fn) => await fn(mockDb)
  };

  const hasil = await tesSkriningService.hapusTesSkrining(mockDb, 1);
  assert.equal(hasil.id, 1);
  assert.equal(deletedId, 1);
});

test("tesSkriningService.hapusTesSkrining menolak penghapusan tes yang memiliki riwayat hasil skrining (400)", async () => {
  const existing = {
    id: 1,
    nama: "Tes Pernah Dikerjakan Siswa",
    _count: { hasil_tes: 14, pertanyaan: 25 },
    pertanyaan: []
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing
    }
  };

  await assert.rejects(
    async () => tesSkriningService.hapusTesSkrining(mockDb, 1),
    (err) => err.statusCode === 400 && /memiliki riwayat hasil skrining siswa/.test(err.message)
  );
});

test("tesSkriningService.hapusTesSkrining menolak penghapusan jika butir soal sudah ada jawaban siswa (400)", async () => {
  const existing = {
    id: 1,
    nama: "Tes dengan Jawaban Siswa",
    _count: { hasil_tes: 0, pertanyaan: 2 },
    pertanyaan: [
      { id: 101, _count: { jawaban_siswa: 5 } }
    ]
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing
    }
  };

  await assert.rejects(
    async () => tesSkriningService.hapusTesSkrining(mockDb, 1),
    (err) => err.statusCode === 400 && /memiliki riwayat jawaban siswa/.test(err.message)
  );
});

test("tesSkriningService.hapusTesSkrining menangani error Prisma P2003 foreign key constraint", async () => {
  const existing = {
    id: 1,
    nama: "Tes Terkunci FK",
    _count: { hasil_tes: 0, pertanyaan: 0 },
    pertanyaan: []
  };

  const mockDb = {
    tes_skrining: {
      findUnique: async () => existing,
      delete: async () => {
        const err = new Error("FK conflict");
        err.code = "P2003";
        throw err;
      }
    },
    kategori_asesmen: {
      updateMany: async () => {}
    },
    $transaction: async (fn) => await fn(mockDb)
  };

  await assert.rejects(
    async () => tesSkriningService.hapusTesSkrining(mockDb, 1),
    (err) => err.statusCode === 400 && /masih terkait dengan data lain/.test(err.message)
  );
});

// ==========================================
// 6. getDaftarKategori
// ==========================================
test("tesSkriningService.getDaftarKategori mengambil daftar domain DSM-5", async () => {
  const dummyKategori = [
    { id: 1, nama: "Somatik", urutan: 1, ambang_batas: 2, deskripsi: "D", tes_skrining_id: null },
    { id: 2, nama: "Inatensi", urutan: 2, ambang_batas: 1, deskripsi: "D", tes_skrining_id: 5 }
  ];

  const mockDb = {
    kategori_asesmen: {
      findMany: async () => dummyKategori
    }
  };

  const hasil = await tesSkriningService.getDaftarKategori(mockDb);
  assert.equal(hasil.length, 2);
  assert.equal(hasil[0].nama, "Somatik");
  assert.equal(hasil[1].nama, "Inatensi");
});
