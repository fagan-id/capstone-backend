import { test } from "node:test";
import assert from "node:assert/strict";
import * as pemetaanService from "../src/services/superAdmin/superAdminPemetaanSkrining.js";

// ==========================================
// 1. Service: getDaftarPemetaan
// ==========================================
test("getDaftarPemetaan melempar 404 jika tes skrining tidak ada", async () => {
  const db = {
    tes_skrining: { findUnique: async () => null }
  };

  await assert.rejects(
    () => pemetaanService.getDaftarPemetaan(db, 999),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Tes skrining tidak ditemukan/);
      return true;
    }
  );
});

test("getDaftarPemetaan melempar 400 jika tes skrining bertipe Level 2", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 2, level: 2 }) }
  };

  await assert.rejects(
    () => pemetaanService.getDaftarPemetaan(db, 2),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Tab Pemetaan hanya berlaku untuk tes skrining Level 1/);
      return true;
    }
  );
});

test("getDaftarPemetaan mengembalikan daftar kosong jika tes belum memiliki pertanyaan", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "Tes L1", jenjang: "SD" }) },
    pertanyaan: { findMany: async () => [] }
  };

  const hasil = await pemetaanService.getDaftarPemetaan(db, 1);
  assert.equal(hasil.items.length, 0);
  assert.equal(hasil.statistik.total_domain, 0);
  assert.equal(hasil.sifat_konfigurasi, "global");
});

test("getDaftarPemetaan mengembalikan daftar pemetaan domain, target Level 2, dan statistik", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1", jenjang: "SD" }) },
    pertanyaan: {
      findMany: async () => [
        { kategori_asesmen_id: 1, tipe_jawaban: "skala" },
        { kategori_asesmen_id: 2, tipe_jawaban: "skala" },
        { kategori_asesmen_id: 3, tipe_jawaban: "ya_tidak" }
      ]
    },
    kategori_asesmen: {
      findMany: async () => [
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
            _count: { pertanyaan: 5 },
            pertanyaan: [{ id: 101, aktif: true }]
          }
        },
        {
          id: 2,
          nama: "Inatensi",
          urutan: 2,
          ambang_batas: 1,
          tes_skrining_id: 20,
          tes_skrining: {
            id: 20,
            nama: "LEVEL 2 Inatensi",
            jenjang: "SD",
            aktif: false, // Target nonaktif
            _count: { pertanyaan: 4 },
            pertanyaan: [{ id: 102, aktif: true }]
          }
        },
        {
          id: 3,
          nama: "Penggunaan Zat",
          urutan: 3,
          ambang_batas: 1,
          tes_skrining_id: null,
          tes_skrining: null
        }
      ]
    }
  };

  const hasil = await pemetaanService.getDaftarPemetaan(db, 1);

  assert.equal(hasil.items.length, 3);
  assert.equal(hasil.items[0].nama, "Somatik");
  assert.equal(hasil.items[0].terpetakan, true);
  assert.equal(hasil.items[0].status_pemetaan, "siap_digunakan");
  assert.equal(hasil.items[0].kondisi_pemicu, ">= 2");

  assert.equal(hasil.items[1].nama, "Inatensi");
  assert.equal(hasil.items[1].status_pemetaan, "target_nonaktif");

  assert.equal(hasil.items[2].nama, "Penggunaan Zat");
  assert.equal(hasil.items[2].terpetakan, false);
  assert.equal(hasil.items[2].kondisi_pemicu, "Ya, Tidak Tahu");
  assert.equal(hasil.items[2].status_pemetaan, "belum_dikonfigurasi");

  assert.equal(hasil.statistik.total_domain, 3);
  assert.equal(hasil.statistik.total_terpetakan, 2);
  assert.equal(hasil.statistik.total_belum_terpetakan, 1);
  assert.equal(hasil.statistik.total_target_siap, 1);
  assert.equal(hasil.statistik.total_target_perlu_perhatian, 1);
});

// ==========================================
// 2. Service: getOpsiTesLevel2
// ==========================================
test("getOpsiTesLevel2 mengidentifikasi kandidat yang dapat dipilih dan alasan penolakan", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1, jenjang: "SD" }),
      count: async () => 4,
      findMany: async () => [
        {
          id: 10,
          nama: "LEVEL 2 - Somatik",
          jenjang: "SD",
          aktif: true,
          _count: { pertanyaan: 3 },
          pertanyaan: [{ id: 1, aktif: true, kategori_asesmen_id: 1 }],
          kategori_asesmen: [{ id: 1, nama: "Somatik", urutan: 1 }]
        },
        {
          id: 20,
          nama: "LEVEL 2 - Inatensi",
          jenjang: "SD",
          aktif: true,
          _count: { pertanyaan: 2 },
          pertanyaan: [{ id: 2, aktif: true, kategori_asesmen_id: 2 }],
          kategori_asesmen: [{ id: 2, nama: "Inatensi", urutan: 2 }]
        },
        {
          id: 30,
          nama: "LEVEL 2 - SMP Tes",
          jenjang: "SMP", // Beda jenjang
          aktif: true,
          _count: { pertanyaan: 1 },
          pertanyaan: [{ id: 3, aktif: true, kategori_asesmen_id: 1 }],
          kategori_asesmen: []
        },
        {
          id: 40,
          nama: "LEVEL 2 - Bebas",
          jenjang: "SD",
          aktif: true,
          _count: { pertanyaan: 0 },
          pertanyaan: [],
          kategori_asesmen: []
        }
      ]
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 1, nama: "Somatik" })
    }
  };

  // Konteks edit domain 1 ("Somatik")
  const hasil = await pemetaanService.getOpsiTesLevel2(db, 1, { kategori_id: 1 });

  assert.equal(hasil.items.length, 4);

  // Tes 10: Milik domain 1 sendiri -> dapat dipilih
  assert.equal(hasil.items[0].id, 10);
  assert.equal(hasil.items[0].dapat_dipilih, true);
  assert.equal(hasil.items[0].sedang_digunakan_domain_ini, true);

  // Tes 20: Sudah dipetakan ke domain Inatensi (ID 2) -> tidak dapat dipilih
  assert.equal(hasil.items[1].id, 20);
  assert.equal(hasil.items[1].dapat_dipilih, false);
  assert.match(hasil.items[1].alasan_tidak_dapat_dipilih, /Sudah dipetakan ke domain 'Inatensi'/);

  // Tes 30: Jenjang tidak sesuai (SMP vs SD) -> tidak dapat dipilih
  assert.equal(hasil.items[2].id, 30);
  assert.equal(hasil.items[2].dapat_dipilih, false);
  assert.match(hasil.items[2].alasan_tidak_dapat_dipilih, /Jenjang instrumen tidak sesuai/);

  // Tes 40: Bebas tanpa konflik -> dapat dipilih
  assert.equal(hasil.items[3].id, 40);
  assert.equal(hasil.items[3].dapat_dipilih, true);
  assert.equal(hasil.items[3].alasan_tidak_dapat_dipilih, null);
});

// ==========================================
// 3. Service: updatePemetaan
// ==========================================
test("updatePemetaan melempar 400 jika domain berada di luar cakupan tes Level 1", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: {
      findMany: async () => [{ kategori_asesmen_id: 1 }] // Hanya domain 1
    }
  };

  await assert.rejects(
    () => pemetaanService.updatePemetaan(db, 1, [{ kategori_id: 99, tes_skrining_id: 10 }]),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /berada di luar cakupan tes skrining Level 1 ini/);
      return true;
    }
  );
});

test("updatePemetaan melempar 400 jika target tes bukan Level 2", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1 }),
      findMany: async () => [{ id: 5, nama: "Tes Sumber", level: 1, kategori_asesmen: [], pertanyaan: [] }]
    },
    pertanyaan: { findMany: async () => [{ kategori_asesmen_id: 1 }] },
    kategori_asesmen: { findMany: async () => [{ id: 1, nama: "Somatik" }] }
  };

  await assert.rejects(
    () => pemetaanService.updatePemetaan(db, 1, [{ kategori_id: 1, tes_skrining_id: 5 }]),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /bukan instrumen Level 2/);
      return true;
    }
  );
});

test("updatePemetaan melempar 409 jika target tes digunakan domain di luar batch", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1 }),
      findMany: async () => [
        {
          id: 20,
          nama: "LEVEL 2 Inatensi",
          level: 2,
          kategori_asesmen: [{ id: 2, nama: "Inatensi" }], // Dipakai domain 2
          pertanyaan: []
        }
      ]
    },
    pertanyaan: { findMany: async () => [{ kategori_asesmen_id: 1 }, { kategori_asesmen_id: 2 }] },
    kategori_asesmen: { findMany: async () => [{ id: 1, nama: "Somatik" }] }
  };

  // Hanya update domain 1, tapi mencoba mengambil target domain 2 tanpa menyertakan domain 2
  await assert.rejects(
    () => pemetaanService.updatePemetaan(db, 1, [{ kategori_id: 1, tes_skrining_id: 20 }]),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /sudah digunakan oleh domain 'Inatensi'/);
      return true;
    }
  );
});

test("updatePemetaan melempar 400 jika target tes memiliki pertanyaan terikat pada domain lain", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1 }),
      findMany: async () => [
        {
          id: 50,
          nama: "LEVEL 2 Asing",
          level: 2,
          kategori_asesmen: [],
          pertanyaan: [{ kategori_asesmen_id: 9 }] // Terikat domain 9
        }
      ]
    },
    pertanyaan: { findMany: async () => [{ kategori_asesmen_id: 1 }] },
    kategori_asesmen: { findMany: async () => [{ id: 1, nama: "Somatik" }] }
  };

  await assert.rejects(
    () => pemetaanService.updatePemetaan(db, 1, [{ kategori_id: 1, tes_skrining_id: 50 }]),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /karena pertanyaan di dalamnya terikat pada kategori domain lain/);
      return true;
    }
  );
});

test("updatePemetaan sukses memperbarui target dan ambang batas secara atomik", async () => {
  const updatedOperations = [];

  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1 }),
      findMany: async () => [
        {
          id: 15,
          nama: "LEVEL 2 Somatik Baru",
          level: 2,
          kategori_asesmen: [],
          pertanyaan: [{ kategori_asesmen_id: 1 }]
        }
      ]
    },
    pertanyaan: { findMany: async () => [{ kategori_asesmen_id: 1 }] },
    kategori_asesmen: {
      findMany: async ({ where }) => {
        if (where?.id?.in) {
          return [
            {
              id: 1,
              nama: "Somatik",
              urutan: 1,
              ambang_batas: 3,
              tes_skrining_id: 15,
              tes_skrining: { id: 15, nama: "LEVEL 2 Somatik Baru", jenjang: "SD", aktif: true, _count: { pertanyaan: 2 } }
            }
          ];
        }
        return [];
      }
    },
    $transaction: async (fn) => {
      const tx = {
        kategori_asesmen: {
          update: async (args) => {
            updatedOperations.push(args);
            return args;
          }
        }
      };
      return fn(tx);
    }
  };

  const hasil = await pemetaanService.updatePemetaan(db, 1, [
    { kategori_id: 1, tes_skrining_id: 15, ambang_batas: 3 }
  ]);

  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].id, 1);
  assert.equal(hasil[0].ambang_batas, 3);
  assert.equal(hasil[0].target_tes.id, 15);
  // Pastikan two-phase update dijalankan
  assert.equal(updatedOperations.length, 2);
  assert.equal(updatedOperations[0].data.tes_skrining_id, null); // Fase 1 lepas
  assert.equal(updatedOperations[1].data.tes_skrining_id, 15); // Fase 2 terapkan
  assert.equal(updatedOperations[1].data.ambang_batas, 3);
});

test("updatePemetaan sukses melepaskan pemetaan (tes_skrining_id: null)", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: { findMany: async () => [{ kategori_asesmen_id: 2 }] },
    kategori_asesmen: {
      findMany: async () => [
        {
          id: 2,
          nama: "Inatensi",
          urutan: 2,
          ambang_batas: 1,
          tes_skrining_id: null,
          tes_skrining: null
        }
      ]
    },
    $transaction: async (fn) => {
      const tx = {
        kategori_asesmen: {
          update: async () => ({})
        }
      };
      return fn(tx);
    }
  };

  const hasil = await pemetaanService.updatePemetaan(db, 1, [
    { kategori_id: 2, tes_skrining_id: null }
  ]);

  assert.equal(hasil.length, 1);
  assert.equal(hasil[0].id, 2);
  assert.equal(hasil[0].terpetakan, false);
  assert.equal(hasil[0].target_tes, null);
});
