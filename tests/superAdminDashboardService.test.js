import { test } from "node:test";
import assert from "node:assert/strict";
import { getDashboardData } from "../src/services/superAdmin/superAdminDashboard.js";

function createMockDb(overrides = {}) {
  const defaultSekolahList = [
    {
      id: "sek-1",
      nama: "SD Inklusi Harapan Bunda",
      aktif: true,
      created_at: new Date("2026-09-24T10:00:00Z"),
      updated_at: new Date("2026-09-24T10:00:00Z")
    },
    {
      id: "sek-2",
      nama: "SMP Negeri 5 Mandiri",
      aktif: false,
      created_at: new Date("2026-09-20T08:00:00Z"),
      updated_at: new Date("2026-09-23T14:30:00Z")
    }
  ];

  const defaultTesList = [
    {
      id: "tes-1",
      nama: "Instrumen Skrining Tahap 1 (Level 1)",
      created_at: new Date("2026-09-21T09:00:00Z"),
      updated_at: new Date("2026-09-24T09:00:00Z")
    }
  ];

  const defaultSesiList = [
    {
      id: "sesi-1",
      nama: "Skrining Siswa Baru 2026/2027",
      created_at: new Date("2026-09-24T08:30:00Z"),
      status: "aktif",
      sekolah: { nama: "SD Inklusi Harapan Bunda" }
    }
  ];

  return {
    sekolah: {
      count: async ({ where } = {}) => {
        if (where?.aktif === true) return 21;
        if (where?.aktif === false) return 3;
        return 24;
      },
      findMany: async () => defaultSekolahList
    },
    sesi_skrining: {
      count: async ({ where } = {}) => {
        if (where?.waktu_mulai?.lte && where?.waktu_selesai?.gt) return 8;
        return 12;
      },
      findMany: async () => defaultSesiList
    },
    siswa: {
      count: async () => 1247
    },
    tes_skrining: {
      findMany: async () => defaultTesList
    },
    hasil_skrining: {
      findMany: async ({ where, distinct } = {}) => {
        return [
          { siswa_id: "sis-1" },
          { siswa_id: "sis-2" },
          { siswa_id: "sis-3" }
        ];
      },
      count: async () => 3
    },
    ...overrides
  };
}

test("getDashboardData: menghitung seluruh ringkasan statistik dan KPI cards sesuai referensi", async () => {
  const db = createMockDb();
  const res = await getDashboardData(db, { page: 1, limit: 5 });

  // Verifikasi statistik objek
  assert.equal(res.statistik.total_sekolah, 24);
  assert.equal(res.statistik.sekolah_aktif, 21);
  assert.equal(res.statistik.sekolah_nonaktif, 3);
  assert.equal(res.statistik.sesi_aktif, 8);
  assert.equal(res.statistik.total_sesi, 12);
  assert.equal(res.statistik.total_siswa_diskrining, 3);
  assert.equal(res.statistik.total_siswa_terdaftar, 1247);

  // Verifikasi 4 KPI cards
  assert.equal(res.kpi_cards.length, 4);
  assert.equal(res.kpi_cards[0].id, "total_sekolah");
  assert.equal(res.kpi_cards[0].nilai, 24);

  assert.equal(res.kpi_cards[1].id, "sekolah_aktif");
  assert.equal(res.kpi_cards[1].nilai, 21);

  assert.equal(res.kpi_cards[2].id, "sesi_aktif");
  assert.equal(res.kpi_cards[2].nilai, 8);

  assert.equal(res.kpi_cards[3].id, "total_siswa");
  assert.equal(res.kpi_cards[3].nilai, 3);
});

test("getDashboardData: menyusun feed aktivitas secara kronologis descending dengan badge yang sesuai", async () => {
  const db = createMockDb();
  const res = await getDashboardData(db, { page: 1, limit: 10 });

  assert.ok(res.aktivitas_terbaru.length >= 4);

  // Item terbaru adalah sek-1 created (2026-09-24T10:00:00Z)
  assert.equal(res.aktivitas_terbaru[0].aktivitas, "Sekolah baru ditambahkan");
  assert.equal(res.aktivitas_terbaru[0].detail, "SD Inklusi Harapan Bunda");
  assert.equal(res.aktivitas_terbaru[0].status, "Baru");
  assert.equal(res.aktivitas_terbaru[0].badge_color, "green");

  // Item berikutnya adalah tes-1 updated (2026-09-24T09:00:00Z)
  assert.equal(res.aktivitas_terbaru[1].aktivitas, "Tes Skrining diperbarui");
  assert.equal(res.aktivitas_terbaru[1].detail, "Instrumen Skrining Tahap 1 (Level 1)");
  assert.equal(res.aktivitas_terbaru[1].status, "Diperbarui");
  assert.equal(res.aktivitas_terbaru[1].badge_color, "blue");

  // Item sesi baru (2026-09-24T08:30:00Z)
  assert.equal(res.aktivitas_terbaru[2].aktivitas, "Sesi baru dibuat");
  assert.equal(res.aktivitas_terbaru[2].detail, "SD Inklusi Harapan Bunda — Skrining Siswa Baru 2026/2027");
  assert.equal(res.aktivitas_terbaru[2].status, "Sesi Baru");
  assert.equal(res.aktivitas_terbaru[2].badge_color, "orange");

  // Item sekolah dinonaktifkan (2026-09-23T14:30:00Z)
  assert.equal(res.aktivitas_terbaru[3].aktivitas, "Sekolah dinonaktifkan");
  assert.equal(res.aktivitas_terbaru[3].detail, "SMP Negeri 5 Mandiri");
  assert.equal(res.aktivitas_terbaru[3].status, "Nonaktif");
  assert.equal(res.aktivitas_terbaru[3].badge_color, "red");
});

test("getDashboardData: mendukung filter kategori aktivitas", async () => {
  const db = createMockDb();

  // Filter sekolah
  const resSekolah = await getDashboardData(db, { page: 1, limit: 10, kategori: "sekolah" });
  assert.ok(resSekolah.aktivitas_terbaru.every((a) => a.aktivitas.includes("Sekolah")));

  // Filter tes
  const resTes = await getDashboardData(db, { page: 1, limit: 10, kategori: "tes" });
  assert.ok(resTes.aktivitas_terbaru.every((a) => a.aktivitas.includes("Tes Skrining")));

  // Filter sesi
  const resSesi = await getDashboardData(db, { page: 1, limit: 10, kategori: "sesi" });
  assert.ok(resSesi.aktivitas_terbaru.every((a) => a.aktivitas.includes("Sesi baru")));
});

test("getDashboardData: mendukung paginasi data aktivitas", async () => {
  const db = createMockDb();

  const page1 = await getDashboardData(db, { page: 1, limit: 2 });
  assert.equal(page1.pagination.page, 1);
  assert.equal(page1.pagination.limit, 2);
  assert.equal(page1.aktivitas_terbaru.length, 2);
  assert.equal(page1.pagination.total_items, 5); // 2 sekolah + 1 deactivated + 1 tes + 1 sesi = 5
  assert.equal(page1.pagination.total_pages, 3);

  const page2 = await getDashboardData(db, { page: 2, limit: 2 });
  assert.equal(page2.pagination.page, 2);
  assert.equal(page2.aktivitas_terbaru.length, 2);
  assert.notEqual(page1.aktivitas_terbaru[0].id, page2.aktivitas_terbaru[0].id);
});

test("getDashboardData: tetap aman jika database kosong / model tidak memiliki data", async () => {
  const emptyDb = {
    sekolah: { count: async () => 0, findMany: async () => [] },
    sesi_skrining: { count: async () => 0, findMany: async () => [] },
    siswa: { count: async () => 0 },
    hasil_skrining: { findMany: async () => [], count: async () => 0 },
    tes_skrining: { findMany: async () => [] }
  };

  const res = await getDashboardData(emptyDb, { page: 1, limit: 5 });
  assert.equal(res.statistik.total_sekolah, 0);
  assert.equal(res.statistik.sekolah_aktif, 0);
  assert.equal(res.statistik.sesi_aktif, 0);
  assert.equal(res.statistik.total_siswa_diskrining, 0);
  assert.equal(res.aktivitas_terbaru.length, 0);
  assert.equal(res.pagination.total_items, 0);
});
