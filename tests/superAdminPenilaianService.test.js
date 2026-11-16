import { test } from "node:test";
import assert from "node:assert/strict";
import * as penilaianService from "../src/services/superAdmin/superAdminPenilaianSkrining.js";

// ==========================================
// 1. Service: getPenilaian
// ==========================================
test("getPenilaian melempar 404 jika tes skrining tidak ada", async () => {
  const db = {
    tes_skrining: { findUnique: async () => null }
  };

  await assert.rejects(
    () => penilaianService.getPenilaian(db, 999),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Tes skrining tidak ditemukan/);
      return true;
    }
  );
});

test("getPenilaian Level 1 mengembalikan konfigurasi kosong jika belum ada pertanyaan", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1" }) },
    pertanyaan: { findMany: async () => [] }
  };

  const hasil = await penilaianService.getPenilaian(db, 1);
  assert.equal(hasil.tes.id, 1);
  assert.equal(hasil.tes.level, 1);
  assert.equal(hasil.aturan.length, 0);
  assert.equal(hasil.metadata.keluaran, "Rekomendasi Tindak Lanjut Level 2");
});

test("getPenilaian Level 1 mengembalikan aturan penilaian lintas domain beserta opsi jawaban", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "DSM-5 Cross-Cutting Level 1" }) },
    pertanyaan: {
      findMany: async () => [
        {
          id: 101,
          kategori_asesmen_id: 1,
          tipe_jawaban: "skala",
          opsi_jawaban: [
            { id: 1, teks: "Tidak sama sekali", label: "0", skor: 0, urutan: 1 },
            { id: 2, teks: "Jarang", label: "1", skor: 1, urutan: 2 },
            { id: 3, teks: "Kadang-kadang", label: "2", skor: 2, urutan: 3 }
          ]
        },
        {
          id: 102,
          kategori_asesmen_id: 2,
          tipe_jawaban: "ya_tidak",
          opsi_jawaban: [
            { id: 4, teks: "Tidak", label: "0", skor: 0, urutan: 1 },
            { id: 5, teks: "Ya", label: "Ya", skor: 2, urutan: 2 },
            { id: 6, teks: "Tidak Tahu", label: "Tidak Tahu", skor: 2, urutan: 3 }
          ]
        }
      ]
    },
    kategori_asesmen: {
      findMany: async () => [
        {
          id: 1,
          nama: "Somatik",
          urutan: 1,
          ambang_batas: 2,
          tes_skrining: { id: 10, nama: "LEVEL 2 Somatik" }
        },
        {
          id: 2,
          nama: "Psikosis",
          urutan: 2,
          ambang_batas: 2,
          tes_skrining: null
        }
      ]
    }
  };

  const hasil = await penilaianService.getPenilaian(db, 1);
  assert.equal(hasil.aturan.length, 2);

  // Aturan 1: Skala numerik
  const r1 = hasil.aturan[0];
  assert.equal(r1.nama_domain, "Somatik");
  assert.equal(r1.tipe_aturan, "numerik");
  assert.equal(r1.ambang_batas, 2);
  assert.equal(r1.operator, ">=");
  assert.equal(r1.kondisi_pemicu, ">= 2");

  // Aturan 2: Kategorikal
  const r2 = hasil.aturan[1];
  assert.equal(r2.nama_domain, "Psikosis");
  assert.equal(r2.tipe_aturan, "kategorikal");
  assert.equal(r2.kondisi_pemicu, "Ya, Tidak Tahu");
});

test("getPenilaian Level 2 mengembalikan rentang penilaian skor dan kategori hasil", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2, nama: "LEVEL 2 Inatensi" }) },
    rentang_penilaian: {
      findMany: async () => [
        { id: 1, tes_skrining_id: 10, kategori: "Batas Normal", skor_min: 0, skor_max: 54, urutan: 1 },
        { id: 2, tes_skrining_id: 10, kategori: "Ringan", skor_min: 55, skor_max: 64, urutan: 2 },
        { id: 3, tes_skrining_id: 10, kategori: "Signifikan Klinis", skor_min: 65, skor_max: null, urutan: 3 }
      ]
    }
  };

  const hasil = await penilaianService.getPenilaian(db, 10);
  assert.equal(hasil.tes.id, 10);
  assert.equal(hasil.tes.level, 2);
  assert.equal(hasil.aturan.length, 3);
  assert.equal(hasil.aturan[2].skor_max, null);
  assert.equal(hasil.aturan[2].rentang_teks, ">= 65");
  assert.equal(hasil.metadata.keluaran, "T-Score");
});

// ==========================================
// 2. Service: updatePenilaianLevel1
// ==========================================
test("updatePenilaianLevel1 menolak jika tes adalah Level 2 (400)", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) }
  };

  await assert.rejects(
    () => penilaianService.updatePenilaianLevel1(db, 10, 1, { ambang_batas: 2 }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /hanya berlaku untuk tes skrining Level 1/);
      return true;
    }
  );
});

test("updatePenilaianLevel1 menolak jika domain di luar cakupan pertanyaan tes Level 1", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: { findFirst: async () => null }
  };

  await assert.rejects(
    () => penilaianService.updatePenilaianLevel1(db, 1, 99, { ambang_batas: 2 }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /di luar cakupan tes Level 1/);
      return true;
    }
  );
});

test("updatePenilaianLevel1 memperbarui ambang batas numerik domain secara langsung", async () => {
  let updatedData = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: {
      findFirst: async () => ({
        id: 101,
        kategori_asesmen_id: 1,
        tipe_jawaban: "skala",
        opsi_jawaban: [{ skor: 0 }, { skor: 1 }, { skor: 2 }]
      })
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 1, nama: "Somatik", ambang_batas: 2 }),
      update: async ({ where, data }) => {
        updatedData = { where, data };
        return { id: 1, nama: "Somatik", ambang_batas: data.ambang_batas };
      }
    }
  };

  const hasil = await penilaianService.updatePenilaianLevel1(db, 1, 1, { ambang_batas: 3 });
  assert.equal(updatedData.data.ambang_batas, 3);
  assert.equal(hasil.ambang_batas, 3);
  assert.equal(hasil.kondisi_pemicu, ">= 3");
});

test("updatePenilaianLevel1 memetakan pilihan kategorikal ke skor opsi", async () => {
  let updatedData = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: {
      findFirst: async () => ({
        id: 102,
        kategori_asesmen_id: 2,
        tipe_jawaban: "ya_tidak",
        opsi_jawaban: [
          { label: "Tidak", teks: "Tidak", skor: 0 },
          { label: "Ya", teks: "Ya", skor: 2 },
          { label: "Tidak Tahu", teks: "Tidak Tahu", skor: 2 }
        ]
      })
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 2, nama: "Psikosis", ambang_batas: 0 }),
      update: async ({ where, data }) => {
        updatedData = { where, data };
        return { id: 2, nama: "Psikosis", ambang_batas: data.ambang_batas };
      }
    }
  };

  const hasil = await penilaianService.updatePenilaianLevel1(db, 1, 2, { nilai_pemicu: ["Ya", "Tidak Tahu"] });
  assert.equal(updatedData.data.ambang_batas, 2);
  assert.equal(hasil.ambang_batas, 2);
  assert.equal(hasil.tipe_aturan, "kategorikal");
});

// ==========================================
// 3. Service: tambahRentangLevel2
// ==========================================
test("tambahRentangLevel2 menolak pada tes Level 1 (400)", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) }
  };

  await assert.rejects(
    () => penilaianService.tambahRentangLevel2(db, 1, { kategori: "Sedang", skor_min: 60, skor_max: 70 }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /hanya didukung untuk tes skrining Level 2/);
      return true;
    }
  );
});

test("tambahRentangLevel2 menolak rentang yang overlap dengan rentang existing (400)", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findMany: async () => [
        { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 55, urutan: 1 }
      ]
    }
  };

  await assert.rejects(
    () => penilaianService.tambahRentangLevel2(db, 10, { kategori: "Sedang", skor_min: 50, skor_max: 65 }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /tumpang tindih \(overlap\)/);
      return true;
    }
  );
});

test("tambahRentangLevel2 berhasil menambahkan rentang baru", async () => {
  let createdPayload = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findMany: async () => [
        { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 54, urutan: 1 }
      ],
      create: async ({ data }) => {
        createdPayload = data;
        return { id: 2, ...data, created_at: new Date(), updated_at: new Date() };
      }
    }
  };

  const hasil = await penilaianService.tambahRentangLevel2(db, 10, {
    kategori: "Signifikan Klinis",
    skor_min: 65,
    skor_max: null
  });

  assert.equal(createdPayload.tes_skrining_id, 10);
  assert.equal(createdPayload.kategori, "Signifikan Klinis");
  assert.equal(createdPayload.skor_min, 65);
  assert.equal(createdPayload.skor_max, null);
  assert.equal(hasil.id, 2);
});

// ==========================================
// 4. Service: updateRentangLevel2
// ==========================================
test("updateRentangLevel2 menolak jika aturan tidak ditemukan (404)", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: { findUnique: async () => null }
  };

  await assert.rejects(
    () => penilaianService.updateRentangLevel2(db, 10, 99, { kategori: "Revisi" }),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Rentang penilaian tidak ditemukan/);
      return true;
    }
  );
});

test("updateRentangLevel2 menolak jika overlap dengan rentang lain dalam tes yang sama", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findUnique: async () => ({ id: 2, tes_skrining_id: 10, kategori: "Ringan", skor_min: 55, skor_max: 64 }),
      findMany: async () => [
        { id: 1, tes_skrining_id: 10, kategori: "Normal", skor_min: 0, skor_max: 54 }
      ]
    }
  };

  // Mencoba memperluas rentang ID 2 ke bawah hingga menyentuh 50 (overlap dengan Normal 0-54)
  await assert.rejects(
    () => penilaianService.updateRentangLevel2(db, 10, 2, { skor_min: 50 }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /tumpang tindih \(overlap\)/);
      return true;
    }
  );
});

test("updateRentangLevel2 berhasil memperbarui rentang penilaian", async () => {
  let updatedPayload = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findUnique: async () => ({ id: 1, tes_skrining_id: 10, kategori: "Normal Lama", skor_min: 0, skor_max: 54, urutan: 1 }),
      findMany: async () => [],
      update: async ({ where, data }) => {
        updatedPayload = { where, data };
        return { id: 1, tes_skrining_id: 10, ...data, updated_at: new Date() };
      }
    }
  };

  const hasil = await penilaianService.updateRentangLevel2(db, 10, 1, { kategori: "Batas Normal Baru" });
  assert.equal(updatedPayload.data.kategori, "Batas Normal Baru");
  assert.equal(hasil.kategori, "Batas Normal Baru");
});

// ==========================================
// 5. Service: updateBatchRentangLevel2
// ==========================================
test("updateBatchRentangLevel2 mengganti seluruh rentang secara atomik via transaksi", async () => {
  let deleteExecuted = false;
  let createdCount = 0;

  const fakeTx = {
    rentang_penilaian: {
      deleteMany: async () => {
        deleteExecuted = true;
      },
      create: async ({ data }) => {
        createdCount++;
        return { id: createdCount, ...data, created_at: new Date(), updated_at: new Date() };
      }
    }
  };

  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    $transaction: async (callback) => callback(fakeTx)
  };

  const items = [
    { kategori: "Normal", skor_min: 0, skor_max: 54, urutan: 1 },
    { kategori: "Sedang", skor_min: 55, skor_max: 69, urutan: 2 },
    { kategori: "Tinggi", skor_min: 70, skor_max: null, urutan: 3 }
  ];

  const hasil = await penilaianService.updateBatchRentangLevel2(db, 10, items);
  assert.equal(deleteExecuted, true);
  assert.equal(createdCount, 3);
  assert.equal(hasil.length, 3);
  assert.equal(hasil[2].kategori, "Tinggi");
});

// ==========================================
// 6. Service: hapusRentangLevel2
// ==========================================
test("hapusRentangLevel2 menolak pada tes Level 1 (400)", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) }
  };

  await assert.rejects(
    () => penilaianService.hapusRentangLevel2(db, 1, 10),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /hanya didukung untuk tes skrining Level 2/);
      return true;
    }
  );
});

test("hapusRentangLevel2 menolak jika rentang tidak ada atau milik tes lain", async () => {
  const db1 = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: { findUnique: async () => null }
  };

  await assert.rejects(
    () => penilaianService.hapusRentangLevel2(db1, 10, 99),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Rentang penilaian tidak ditemukan/);
      return true;
    }
  );

  const db2 = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: { findUnique: async () => ({ id: 5, tes_skrining_id: 999 }) }
  };

  await assert.rejects(
    () => penilaianService.hapusRentangLevel2(db2, 10, 5),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Rentang penilaian tidak ditemukan/);
      return true;
    }
  );
});

test("hapusRentangLevel2 berhasil menghapus rentang penilaian", async () => {
  let deletedId = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findUnique: async () => ({ id: 3, tes_skrining_id: 10, kategori: "Ringan", skor_min: 50, skor_max: 60 }),
      delete: async ({ where }) => {
        deletedId = where.id;
        return { id: 3 };
      }
    }
  };

  const hasil = await penilaianService.hapusRentangLevel2(db, 10, 3);
  assert.equal(deletedId, 3);
  assert.equal(hasil.id, 3);
});
