import { test } from "node:test";
import assert from "node:assert/strict";
import * as sesiService from "../src/services/sekolah/sekolahSesi.js";

const SEKOLAH_ID = 10;
const TES = { id: 24, nama: "Skrining Awal" };

function barisSesi(over = {}) {
  return {
    id: 7,
    sekolah_id: SEKOLAH_ID,
    nama: "Skrining Kelas 4",
    kode: "ABC234",
    tanggal_pelaksanaan: new Date("2026-11-24T00:00:00Z"),
    status: "aktif",
    tes_skrining_id: 24,
    created_at: new Date("2026-11-24T01:00:00Z"),
    updated_at: new Date("2026-11-24T01:00:00Z"),
    tes_skrining: TES,
    ...over
  };
}

const ditolak = (status, pola) => (err) => err.statusCode === status && pola.test(err.message);
const errPrisma = (code) => Object.assign(new Error(code), { code });

test("buatKodeSesi menghasilkan 6 karakter tanpa 0/O/1/I/L", () => {
  for (let i = 0; i < 200; i++) {
    assert.match(sesiService.buatKodeSesi(), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  }
});

test("getDaftarTes hanya mengambil tes Level 1 yang aktif", async () => {
  let args;
  const db = {
    tes_skrining: {
      findMany: async (a) => {
        args = a;
        return [{ id: 24, nama: "Skrining Awal", jenjang: "SD", deskripsi: "x" }];
      }
    }
  };

  const hasil = await sesiService.getDaftarTes(db);
  assert.deepEqual(args.where, { level: 1, aktif: true });
  assert.equal(hasil[0].id, 24);
});

test("tambahSesi menolak tes yang tidak aktif atau bukan Level 1", async () => {
  for (const tes of [null, { id: 24, level: 1, aktif: false }, { id: 25, level: 2, aktif: true }]) {
    const db = { tes_skrining: { findUnique: async () => tes } };
    await assert.rejects(
      sesiService.tambahSesi(db, SEKOLAH_ID, { nama: "Sesi", tes_skrining_id: 24 }),
      ditolak(400, /^Tes skrining tidak valid\. Pilih tes skrining awal yang aktif\.$/)
    );
  }
});

test("tambahSesi menyimpan status aktif dan tanggal hari ini menurut WIB", async () => {
  let data;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 24, level: 1, aktif: true }) },
    sesi_skrining: {
      create: async (a) => {
        data = a.data;
        return barisSesi(a.data);
      }
    }
  };

  // 18:00 UTC = 01:00 WIB hari berikutnya.
  await sesiService.tambahSesi(db, SEKOLAH_ID, { nama: "Sesi", tes_skrining_id: 24 }, new Date("2026-11-24T18:00:00Z"));

  assert.equal(data.status, "aktif");
  assert.equal(data.sekolah_id, SEKOLAH_ID);
  assert.equal(data.tes_skrining_id, 24);
  assert.equal(data.tanggal_pelaksanaan.toISOString(), "2026-11-25T00:00:00.000Z");
  assert.match(data.kode, /^[A-Z2-9]{6}$/);
});

test("tambahSesi mencoba ulang kode yang bentrok, lalu menyerah setelah 5 kali", async () => {
  let panggilan = 0;
  const db = {
    tes_skrining: { findUnique: async () => ({ id: 24, level: 1, aktif: true }) },
    sesi_skrining: {
      create: async (a) => {
        panggilan++;
        if (panggilan < 3) throw errPrisma("P2002");
        return barisSesi(a.data);
      }
    }
  };
  await sesiService.tambahSesi(db, SEKOLAH_ID, { nama: "Sesi", tes_skrining_id: 24 });
  assert.equal(panggilan, 3);

  panggilan = 0;
  db.sesi_skrining.create = async () => {
    panggilan++;
    throw errPrisma("P2002");
  };
  await assert.rejects(sesiService.tambahSesi(db, SEKOLAH_ID, { nama: "Sesi", tes_skrining_id: 24 }), { code: "P2002" });
  assert.equal(panggilan, 5);
});

test("getDaftarSesi memfilter sekolah dan status, menghitung peserta", async () => {
  let where;
  const db = {
    sesi_skrining: {
      count: async (a) => {
        where = a.where;
        return 1;
      },
      findMany: async () => [barisSesi({ _count: { hasil_skrining: 3 } })]
    },
    hasil_skrining: {
      groupBy: async () => [{ sesi_skrining_id: 7, _count: { _all: 2 } }]
    }
  };

  const hasil = await sesiService.getDaftarSesi(db, SEKOLAH_ID, { page: 1, limit: 10, status: "aktif" });

  assert.deepEqual(where, { sekolah_id: SEKOLAH_ID, status: "aktif" });
  assert.equal(hasil.items[0].jumlah_peserta, 3);
  assert.equal(hasil.items[0].jumlah_selesai, 2);
  assert.deepEqual(hasil.items[0].tes, TES);
  assert.deepEqual(hasil.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
});

test("getDetailSesi: 404 untuk sekolah lain, menghitung belum selesai", async () => {
  const db = {
    sesi_skrining: {
      findFirst: async ({ where }) => (where.id === 7 && where.sekolah_id === SEKOLAH_ID ? barisSesi() : null)
    },
    hasil_skrining: { count: async ({ where }) => (where.selesai ? 2 : 5) }
  };

  const detail = await sesiService.getDetailSesi(db, SEKOLAH_ID, 7);
  assert.equal(detail.jumlah_peserta, 5);
  assert.equal(detail.jumlah_selesai, 2);
  assert.equal(detail.jumlah_belum_selesai, 3);

  await assert.rejects(sesiService.getDetailSesi(db, 99, 7), ditolak(404, /^Sesi skrining tidak ditemukan\.$/));
});

test("updateSesi hanya mengubah nama milik sekolah sendiri", async () => {
  let data;
  const db = {
    sesi_skrining: {
      findFirst: async ({ where }) => (where.sekolah_id === SEKOLAH_ID ? barisSesi() : null),
      update: async (a) => {
        data = a.data;
        return barisSesi(a.data);
      }
    }
  };

  const hasil = await sesiService.updateSesi(db, SEKOLAH_ID, 7, { nama: "Nama Baru" });
  assert.deepEqual(data, { nama: "Nama Baru" });
  assert.equal(hasil.nama, "Nama Baru");
  await assert.rejects(sesiService.updateSesi(db, 99, 7, { nama: "X" }), ditolak(404, /tidak ditemukan/));
});

test("akhiriSesi: aktif menjadi selesai, kedua kali 409, sekolah lain 404", async () => {
  let baris = barisSesi();
  let whereUpdate;
  const db = {
    sesi_skrining: {
      updateMany: async ({ where, data }) => {
        whereUpdate = where;
        const cocok = baris.id === where.id && baris.status === where.status &&
          (where.sekolah_id === undefined || baris.sekolah_id === where.sekolah_id);
        if (!cocok) return { count: 0 };
        baris = { ...baris, ...data };
        return { count: 1 };
      },
      findFirst: async ({ where }) =>
        baris.id === where.id && (where.sekolah_id === undefined || baris.sekolah_id === where.sekolah_id) ? baris : null
    }
  };

  const hasil = await sesiService.akhiriSesi(db, SEKOLAH_ID, 7);
  assert.equal(hasil.status, "selesai");
  assert.deepEqual(whereUpdate, { id: 7, status: "aktif", sekolah_id: SEKOLAH_ID });

  await assert.rejects(sesiService.akhiriSesi(db, SEKOLAH_ID, 7), ditolak(409, /^Sesi skrining sudah diakhiri\.$/));
  await assert.rejects(sesiService.akhiriSesi(db, 99, 7), ditolak(404, /^Sesi skrining tidak ditemukan\.$/));
});

test("akhiriSesi tanpa sekolahId (Super Admin) tidak memfilter sekolah", async () => {
  let whereUpdate;
  const db = {
    sesi_skrining: {
      updateMany: async ({ where }) => {
        whereUpdate = where;
        return { count: 1 };
      },
      findFirst: async () => barisSesi({ status: "selesai", sekolah_id: 55 })
    }
  };

  await sesiService.akhiriSesi(db, null, 7);
  assert.deepEqual(whereUpdate, { id: 7, status: "aktif" });
});

test("hapusSesi menolak sesi yang sudah punya peserta", async () => {
  let dihapus = false;
  const db = {
    sesi_skrining: {
      findFirst: async () => barisSesi(),
      delete: async () => {
        dihapus = true;
      }
    },
    hasil_skrining: { count: async () => 1 }
  };

  await assert.rejects(
    sesiService.hapusSesi(db, SEKOLAH_ID, 7),
    ditolak(409, /^Sesi sudah memiliki peserta dan tidak dapat dihapus\.$/)
  );
  assert.equal(dihapus, false);

  db.hasil_skrining.count = async () => 0;
  db.sesi_skrining.delete = async () => {
    throw errPrisma("P2003");
  };
  await assert.rejects(sesiService.hapusSesi(db, SEKOLAH_ID, 7), ditolak(409, /sudah memiliki peserta/));
});
