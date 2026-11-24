import { test } from "node:test";
import assert from "node:assert/strict";
import * as interpretasiService from "../src/services/superAdmin/superAdminInterpretasiSkrining.js";
import { submitLevel1, submitLanjutan } from "../src/services/public/skriningOrangTua.js";
import { updateBatchRentangLevel2 } from "../src/services/superAdmin/superAdminPenilaianSkrining.js";

// ==========================================
// 1. Service: getInterpretasi
// ==========================================
test("getInterpretasi melempar 404 jika tes skrining tidak ada", async () => {
  const db = {
    tes_skrining: { findUnique: async () => null }
  };

  await assert.rejects(
    () => interpretasiService.getInterpretasi(db, 999),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Tes skrining tidak ditemukan/);
      return true;
    }
  );
});

test("getInterpretasi Level 1 mengembalikan konfigurasi kosong jika belum ada pertanyaan", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "DSM-5 Level 1", jenjang: "SD" }) },
    pertanyaan: { findMany: async () => [] }
  };

  const hasil = await interpretasiService.getInterpretasi(db, 1);
  assert.equal(hasil.tes.id, 1);
  assert.equal(hasil.tes.level, 1);
  assert.equal(hasil.items.length, 0);
  assert.equal(hasil.sifat_konfigurasi, "global");
  assert.match(hasil.catatan_klinis, /bukan diagnosis/);
});

test("getInterpretasi Level 1 mengembalikan daftar domain dan kedua kondisi hasil", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "DSM-5 Cross-Cutting Level 1", jenjang: "SD" }) },
    pertanyaan: {
      findMany: async () => [{ kategori_asesmen_id: 1 }]
    },
    kategori_asesmen: {
      findMany: async () => [
        {
          id: 1,
          nama: "Gejala Somatik",
          urutan: 1,
          deskripsi: "Memenuhi ambang somatik",
          rekomendasi: "Konsultasikan profesional",
          deskripsi_belum_memenuhi: "Perkembangan normal",
          rekomendasi_belum_memenuhi: "Pantau rutin"
        }
      ]
    }
  };

  const hasil = await interpretasiService.getInterpretasi(db, 1);
  assert.equal(hasil.items.length, 1);
  const domain = hasil.items[0];
  assert.equal(domain.kategori_id, 1);
  assert.equal(domain.nama_domain, "Gejala Somatik");
  assert.equal(domain.kondisi.length, 2);

  const k1 = domain.kondisi[0];
  assert.equal(k1.kondisi, "belum_memenuhi");
  assert.equal(k1.label_kondisi, "Belum Memenuhi Ambang Batas");
  assert.equal(k1.deskripsi, "Perkembangan normal");
  assert.equal(k1.terindikasi, false);
  assert.equal(k1.terisi, true);

  const k2 = domain.kondisi[1];
  assert.equal(k2.kondisi, "memenuhi");
  assert.equal(k2.label_kondisi, "Memenuhi Ambang Skrining Lanjutan");
  assert.equal(k2.deskripsi, "Memenuhi ambang somatik");
  assert.equal(k2.terindikasi, true);
  assert.equal(k2.terisi, true);
});

test("getInterpretasi Level 2 mengembalikan daftar rentang dan narasi interpretasi", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2, nama: "LEVEL 2 Inatensi", jenjang: "SD" }) },
    rentang_penilaian: {
      findMany: async () => [
        {
          id: 1,
          tes_skrining_id: 10,
          kategori: "Normal",
          skor_min: 0,
          skor_max: 54,
          urutan: 1,
          deskripsi: "Perkembangan normal",
          rekomendasi: "Pantau rutin"
        },
        {
          id: 2,
          tes_skrining_id: 10,
          kategori: "Klinis",
          skor_min: 55,
          skor_max: null,
          urutan: 2,
          deskripsi: null,
          rekomendasi: null
        }
      ]
    }
  };

  const hasil = await interpretasiService.getInterpretasi(db, 10);
  assert.equal(hasil.tes.id, 10);
  assert.equal(hasil.tes.level, 2);
  assert.equal(hasil.sifat_konfigurasi, "per_tes");
  assert.equal(hasil.items.length, 2);
  assert.equal(hasil.items[0].terisi, true);
  assert.equal(hasil.items[1].terisi, false);
  assert.equal(hasil.items[1].rentang_label, ">= 55");
});

// ==========================================
// 2. Service: Detail Interpretasi
// ==========================================
test("getDetailInterpretasiLevel1 melempar error jika tes adalah Level 2 atau domain di luar cakupan", async () => {
  const dbL2 = {
    tes_skrining: { findUnique: async () => ({ id: 2, level: 2 }) }
  };
  await assert.rejects(
    () => interpretasiService.getDetailInterpretasiLevel1(dbL2, 2, 1),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /hanya berlaku untuk tes skrining Level 1/);
      return true;
    }
  );

  const dbOutOfScope = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: { findFirst: async () => null }
  };
  await assert.rejects(
    () => interpretasiService.getDetailInterpretasiLevel1(dbOutOfScope, 1, 99),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /di luar cakupan tes Level 1/);
      return true;
    }
  );
});

test("getDetailInterpretasiLevel1 mengembalikan detail kondisi tertentu", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1, nama: "DSM-5 L1" }) },
    pertanyaan: { findFirst: async () => ({ id: 101, kategori_asesmen_id: 1 }) },
    kategori_asesmen: {
      findUnique: async () => ({
        id: 1,
        nama: "Somatik",
        urutan: 1,
        deskripsi: "Deskripsi Lanjutan",
        rekomendasi: "Rekomendasi Lanjutan",
        deskripsi_belum_memenuhi: "Deskripsi Normal",
        rekomendasi_belum_memenuhi: "Rekomendasi Normal"
      })
    }
  };

  const hasilBelum = await interpretasiService.getDetailInterpretasiLevel1(db, 1, 1, "belum_memenuhi");
  assert.equal(hasilBelum.kondisi, "belum_memenuhi");
  assert.equal(hasilBelum.deskripsi, "Deskripsi Normal");

  const hasilMemenuhi = await interpretasiService.getDetailInterpretasiLevel1(db, 1, 1, "memenuhi");
  assert.equal(hasilMemenuhi.kondisi, "memenuhi");
  assert.equal(hasilMemenuhi.deskripsi, "Deskripsi Lanjutan");
});

test("getDetailInterpretasiLevel2 melempar 404 jika rentang tidak ada atau milik tes lain", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: { findUnique: async () => ({ id: 1, tes_skrining_id: 999 }) }
  };

  await assert.rejects(
    () => interpretasiService.getDetailInterpretasiLevel2(db, 10, 1),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Rentang penilaian tidak ditemukan/);
      return true;
    }
  );
});

test("getDetailInterpretasiLevel2 mengembalikan data rentang penilaian", async () => {
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2, nama: "Tes L2" }) },
    rentang_penilaian: {
      findUnique: async () => ({
        id: 5,
        tes_skrining_id: 10,
        kategori: "Sedang",
        skor_min: 60,
        skor_max: 69,
        urutan: 2,
        deskripsi: "Gejala sedang",
        rekomendasi: "Pantau"
      })
    }
  };

  const hasil = await interpretasiService.getDetailInterpretasiLevel2(db, 10, 5);
  assert.equal(hasil.id, 5);
  assert.equal(hasil.kategori, "Sedang");
  assert.equal(hasil.rentang_label, "60 - 69");
  assert.equal(hasil.deskripsi, "Gejala sedang");
});

// ==========================================
// 3. Service: Update Interpretasi
// ==========================================
test("updateInterpretasiLevel1 memperbarui kondisi tunggal dan batch", async () => {
  let updatedPayload = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: { findFirst: async () => ({ id: 101, kategori_asesmen_id: 1 }) },
    kategori_asesmen: {
      findUnique: async () => ({ id: 1, nama: "Somatik", urutan: 1 }),
      update: async ({ data }) => {
        updatedPayload = data;
        return { id: 1, nama: "Somatik", urutan: 1, ...data };
      }
    }
  };

  // 1. Single condition: belum_memenuhi
  await interpretasiService.updateInterpretasiLevel1(db, 1, 1, {
    tipe: "single",
    kondisi: "belum_memenuhi",
    deskripsi: "Normal baru",
    rekomendasi: "Pantau rutin baru"
  });
  assert.equal(updatedPayload.deskripsi_belum_memenuhi, "Normal baru");
  assert.equal(updatedPayload.rekomendasi_belum_memenuhi, "Pantau rutin baru");

  // 2. Single condition: memenuhi
  await interpretasiService.updateInterpretasiLevel1(db, 1, 1, {
    tipe: "single",
    kondisi: "memenuhi",
    deskripsi: "Perlu dokter",
    rekomendasi: "Segera rujuk"
  });
  assert.equal(updatedPayload.deskripsi, "Perlu dokter");
  assert.equal(updatedPayload.rekomendasi, "Segera rujuk");
});

test("updateInterpretasiLevel2 memperbarui deskripsi dan rekomendasi pada rentang", async () => {
  let updatedPayload = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findUnique: async () => ({ id: 1, tes_skrining_id: 10 }),
      update: async ({ data }) => {
        updatedPayload = data;
        return { id: 1, tes_skrining_id: 10, kategori: "Ringan", skor_min: 0, skor_max: 50, urutan: 1, ...data };
      }
    }
  };

  const hasil = await interpretasiService.updateInterpretasiLevel2(db, 10, 1, {
    deskripsi: "Deskripsi rentang baru",
    rekomendasi: "Rekomendasi rentang baru"
  });

  assert.equal(updatedPayload.deskripsi, "Deskripsi rentang baru");
  assert.equal(updatedPayload.rekomendasi, "Rekomendasi rentang baru");
  assert.equal(hasil.deskripsi, "Deskripsi rentang baru");
  assert.equal(hasil.terisi, true);
});

// ==========================================
// 4. Service: Reset / Kosongkan Interpretasi
// ==========================================
test("resetInterpretasiLevel1 mengosongkan deskripsi dan rekomendasi", async () => {
  let resetPayload = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 1, level: 1 }) },
    pertanyaan: { findFirst: async () => ({ id: 101, kategori_asesmen_id: 1 }) },
    kategori_asesmen: {
      update: async ({ data }) => {
        resetPayload = data;
        return { id: 1 };
      }
    }
  };

  await interpretasiService.resetInterpretasiLevel1(db, 1, 1, "belum_memenuhi");
  assert.equal(resetPayload.deskripsi_belum_memenuhi, null);
  assert.equal(resetPayload.rekomendasi_belum_memenuhi, null);
});

test("resetInterpretasiLevel2 mengosongkan deskripsi dan rekomendasi pada rentang", async () => {
  let resetPayload = null;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    rentang_penilaian: {
      findUnique: async () => ({ id: 2, tes_skrining_id: 10 }),
      update: async ({ data }) => {
        resetPayload = data;
        return { id: 2 };
      }
    }
  };

  await interpretasiService.resetInterpretasiLevel2(db, 10, 2);
  assert.equal(resetPayload.deskripsi, null);
  assert.equal(resetPayload.rekomendasi, null);
});

// ==========================================
// 5. Integrasi Snapshot Engine Skrining
// ==========================================
test("submitLevel1 menyimpan snapshot deskripsi dan rekomendasi sesuai kondisi hasil", async () => {
  let savedSnapshot = null;
  const db = {
    hasil_skrining: {
      findUnique: async () => ({
        id: 100,
        selesai: false,
        token: "token-test",
        siswa: { nama: "Budi" },
        sesi_skrining: { tes_skrining_id: 1 }
      })
    },
    hasil_kategori: {
      count: async () => 0,
      createMany: async ({ data }) => {
        savedSnapshot = data;
      }
    },
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1 })
    },
    pertanyaan: {
      findMany: async () => [
        { id: 101, tes_skrining_id: 1, kategori_asesmen_id: 1, aktif: true, nomor_urut: 1, teks: "Q1", tipe_jawaban: "skala", opsi_jawaban: [{ id: 1, label: "0", teks: "0" }] },
        { id: 102, tes_skrining_id: 1, kategori_asesmen_id: 2, aktif: true, nomor_urut: 2, teks: "Q2", tipe_jawaban: "skala", opsi_jawaban: [{ id: 2, label: "3", teks: "3" }] }
      ]
    },
    jawaban_siswa: {
      findMany: async () => [
        { pertanyaan_id: 101, opsi_jawaban: { skor: 0 }, opsi_jawaban_id: 1 },
        { pertanyaan_id: 102, opsi_jawaban: { skor: 3 }, opsi_jawaban_id: 2 }
      ]
    },
    kategori_asesmen: {
      findMany: async () => [
        {
          id: 1,
          ambang_batas: 2,
          tes_skrining_id: null,
          deskripsi: "Somatik terindikasi",
          rekomendasi: "Konsul dokter",
          deskripsi_belum_memenuhi: "Somatik normal",
          rekomendasi_belum_memenuhi: "Pantau berkala"
        },
        {
          id: 2,
          ambang_batas: 1,
          tes_skrining_id: 10,
          deskripsi: "Inatensi terindikasi",
          rekomendasi: "Ikuti instrumen lanjutan",
          deskripsi_belum_memenuhi: "Inatensi normal",
          rekomendasi_belum_memenuhi: "Pantau kelas"
        }
      ]
    },
    hasil_tes: {
      update: async () => {},
      createMany: async () => {}
    }
  };

  await submitLevel1(db, "token-test");
  assert.equal(savedSnapshot.length, 2);

  // Domain 1: Skor 0 < Ambang 2 (terindikasi: false) -> snapshot belum_memenuhi
  const d1 = savedSnapshot.find((s) => s.kategori_asesmen_id === 1);
  assert.equal(d1.terindikasi, false);
  assert.equal(d1.deskripsi, "Somatik normal");
  assert.equal(d1.rekomendasi, "Pantau berkala");

  // Domain 2: Skor 3 >= Ambang 1 (terindikasi: true) -> snapshot memenuhi
  const d2 = savedSnapshot.find((s) => s.kategori_asesmen_id === 2);
  assert.equal(d2.terindikasi, true);
  assert.equal(d2.deskripsi, "Inatensi terindikasi");
  assert.equal(d2.rekomendasi, "Ikuti instrumen lanjutan");
});

test("submitLanjutan menyimpan snapshot kategori_hasil, deskripsi_hasil, dan rekomendasi_hasil", async () => {
  let updatedHasilTes = null;
  const db = {
    hasil_skrining: {
      findUnique: async () => ({ id: 100, selesai: false, token: "token-test", siswa: { nama: "Budi" } }),
      update: async () => {}
    },
    hasil_tes: {
      findMany: async () => [
        { tes_skrining_id: 10, selesai: false, tes_skrining: { level: 2, kategori_asesmen: [{ urutan: 1 }] } }
      ],
      update: async ({ data }) => {
        updatedHasilTes = data;
      }
    },
    pertanyaan: {
      findMany: async () => [
        { id: 201, tes_skrining_id: 10, aktif: true, nomor_urut: 1, teks: "Q1", tipe_jawaban: "skala", opsi_jawaban: [{ id: 1, label: "4", teks: "4" }] }
      ]
    },
    jawaban_siswa: {
      findMany: async () => [
        { pertanyaan_id: 201, opsi_jawaban: { skor: 4 }, opsi_jawaban_id: 1 }
      ]
    },
    rentang_penilaian: {
      findMany: async () => [
        {
          id: 1,
          kategori: "Batas Normal",
          skor_min: 0,
          skor_max: 2,
          deskripsi: "Normal",
          rekomendasi: "Pantau"
        },
        {
          id: 2,
          kategori: "Klinis Signifikan",
          skor_min: 3,
          skor_max: null,
          deskripsi: "Terdapat indikasi klinis signifikan",
          rekomendasi: "Rujukan profesional lanjutan"
        }
      ]
    }
  };

  await submitLanjutan(db, "token-test", 10);
  assert.equal(updatedHasilTes.total_skor, 4);
  assert.equal(updatedHasilTes.kategori_hasil, "Klinis Signifikan");
  assert.equal(updatedHasilTes.deskripsi_hasil, "Terdapat indikasi klinis signifikan");
  assert.equal(updatedHasilTes.rekomendasi_hasil, "Rujukan profesional lanjutan");
});

// ==========================================
// 6. Audit Siklus Hidup Batch Update Rentang
// ==========================================
test("updateBatchRentangLevel2 menjaga narasi interpretasi existing agar tidak hilang", async () => {
  const existingRanges = [
    {
      id: 1,
      kategori: "Normal",
      skor_min: 0,
      skor_max: 54,
      deskripsi: "Interpretasi Normal Tersimpan",
      rekomendasi: "Rekomendasi Normal Tersimpan"
    }
  ];

  const createdRows = [];
  const fakeTx = {
    rentang_penilaian: {
      findMany: async () => existingRanges,
      deleteMany: async () => {},
      create: async ({ data }) => {
        createdRows.push(data);
        return { id: createdRows.length, ...data };
      }
    }
  };

  const db = {
    tes_skrining: { findUnique: async () => ({ id: 10, level: 2 }) },
    $transaction: async (cb) => cb(fakeTx)
  };

  const items = [
    { kategori: "Normal", skor_min: 0, skor_max: 59, urutan: 1 }
  ];

  await updateBatchRentangLevel2(db, 10, items);
  assert.equal(createdRows.length, 1);
  assert.equal(createdRows[0].kategori, "Normal");
  assert.equal(createdRows[0].skor_max, 59);
  // Narasi lama tetap terpasang
  assert.equal(createdRows[0].deskripsi, "Interpretasi Normal Tersimpan");
  assert.equal(createdRows[0].rekomendasi, "Rekomendasi Normal Tersimpan");
});
