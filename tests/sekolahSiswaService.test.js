import { test } from "node:test";
import assert from "node:assert/strict";
import * as siswaService from "../src/services/sekolah/sekolahSiswa.js";

const SEKOLAH_ID = 10;
const KELAS = { id: 1, nama: "4A", tahun_ajaran: "2026/2027" };

function barisSiswa(over = {}) {
  return {
    id: 5,
    sekolah_id: SEKOLAH_ID,
    kelas_id: 1,
    nisn: "0123456789",
    nama: "Budi Santoso",
    tanggal_lahir: new Date("2017-05-12T00:00:00Z"),
    jenis_kelamin: "L",
    created_at: new Date("2026-07-01T00:00:00Z"),
    updated_at: new Date("2026-07-01T00:00:00Z"),
    kelas: KELAS,
    ...over
  };
}

const input = {
  nisn: "0123456789",
  nama: "Budi Santoso",
  tanggal_lahir: new Date("2017-05-12T00:00:00Z"),
  jenis_kelamin: "L",
  kelas_id: 1
};

const ditolak = (status, pola) => (err) => err.statusCode === status && pola.test(err.message);
const errPrisma = (code) => Object.assign(new Error(code), { code });

test("getDaftarSiswa memfilter per sekolah, mencari nama/NISN, dan berpaginasi", async () => {
  let argsCount, argsFind;
  const db = {
    siswa: {
      count: async (a) => {
        argsCount = a;
        return 11;
      },
      findMany: async (a) => {
        argsFind = a;
        return [barisSiswa()];
      }
    }
  };

  const hasil = await siswaService.getDaftarSiswa(db, SEKOLAH_ID, { page: 2, limit: 10, search: "Budi", kelas_id: 1 });

  const whereDiharapkan = {
    sekolah_id: SEKOLAH_ID,
    kelas_id: 1,
    OR: [{ nama: { contains: "Budi" } }, { nisn: { contains: "Budi" } }]
  };
  assert.deepEqual(argsCount.where, whereDiharapkan);
  assert.deepEqual(argsFind.where, whereDiharapkan);
  assert.equal(argsFind.skip, 10);
  assert.equal(argsFind.take, 10);
  assert.deepEqual(argsFind.orderBy, [{ nama: "asc" }, { id: "asc" }]);
  assert.deepEqual(hasil.pagination, { page: 2, limit: 10, total: 11, totalPages: 2 });

  const s = hasil.items[0];
  assert.equal(s.tanggal_lahir, "2017-05-12");
  assert.deepEqual(s.kelas, KELAS);
  assert.equal(s.sekolah_id, undefined);
  assert.equal(s.kelas_id, undefined);
});

test("getDaftarSiswa tanpa filter hanya membatasi sekolah", async () => {
  let where;
  const db = {
    siswa: {
      count: async (a) => {
        where = a.where;
        return 0;
      },
      findMany: async () => []
    }
  };
  const hasil = await siswaService.getDaftarSiswa(db, SEKOLAH_ID, { page: 1, limit: 10 });
  assert.deepEqual(where, { sekolah_id: SEKOLAH_ID });
  assert.equal(hasil.pagination.totalPages, 1);
});

test("getDetailSiswa: siswa sekolah lain dianggap tidak ada (404)", async () => {
  let filter;
  const db = {
    siswa: {
      findFirst: async ({ where }) => {
        filter = where;
        return null;
      }
    }
  };
  await assert.rejects(siswaService.getDetailSiswa(db, SEKOLAH_ID, 77), ditolak(404, /Siswa tidak ditemukan/));
  assert.deepEqual(filter, { id: 77, sekolah_id: SEKOLAH_ID });
});

test("tambahSiswa menolak kelas milik sekolah lain (404)", async () => {
  let filterKelas;
  const db = {
    kelas: {
      findFirst: async ({ where }) => {
        filterKelas = where;
        return null;
      }
    }
  };
  await assert.rejects(siswaService.tambahSiswa(db, SEKOLAH_ID, input), ditolak(404, /Kelas tidak ditemukan/));
  assert.deepEqual(filterKelas, { id: 1, sekolah_id: SEKOLAH_ID });
});

test("tambahSiswa menolak NISN yang sudah terdaftar di sekolah mana pun (409), termasuk P2002", async () => {
  const pesan = /^NISN sudah terdaftar\.$/;
  const dbAda = {
    kelas: { findFirst: async () => KELAS },
    siswa: { findUnique: async ({ where }) => (where.nisn === "0123456789" ? barisSiswa({ sekolah_id: 99 }) : null) }
  };
  await assert.rejects(siswaService.tambahSiswa(dbAda, SEKOLAH_ID, input), ditolak(409, pesan));

  const dbBalapan = {
    kelas: { findFirst: async () => KELAS },
    siswa: {
      findUnique: async () => null,
      create: async () => {
        throw errPrisma("P2002");
      }
    }
  };
  await assert.rejects(siswaService.tambahSiswa(dbBalapan, SEKOLAH_ID, input), ditolak(409, pesan));
});

test("tambahSiswa menyimpan siswa dengan sekolah_id dari token", async () => {
  let dibuat;
  const db = {
    kelas: { findFirst: async () => KELAS },
    siswa: {
      findUnique: async () => null,
      create: async (a) => {
        dibuat = a.data;
        return barisSiswa({ id: 9, ...a.data });
      }
    }
  };
  const hasil = await siswaService.tambahSiswa(db, SEKOLAH_ID, input);
  assert.deepEqual(dibuat, { ...input, sekolah_id: SEKOLAH_ID });
  assert.equal(hasil.id, 9);
  assert.deepEqual(hasil.kelas, KELAS);
});

test("updateSiswa memeriksa kelas dan NISN hanya bila berubah", async () => {
  const dicek = { kelas: 0, nisn: 0 };
  let diubah;
  const db = {
    kelas: {
      findFirst: async () => {
        dicek.kelas++;
        return { id: 2, nama: "5A", tahun_ajaran: "2026/2027" };
      }
    },
    siswa: {
      findFirst: async ({ where }) => {
        if (where.sekolah_id !== undefined) return barisSiswa(); // cariSiswa
        dicek.nisn++;
        return null;
      },
      update: async (a) => {
        diubah = a;
        return barisSiswa(a.data);
      }
    }
  };

  // Nilai sama dengan yang tersimpan: tidak ada cek tambahan
  await siswaService.updateSiswa(db, SEKOLAH_ID, 5, { nisn: "0123456789", kelas_id: 1, nama: "Budi S." });
  assert.deepEqual(dicek, { kelas: 0, nisn: 0 });
  assert.deepEqual(diubah.where, { id: 5 });

  await siswaService.updateSiswa(db, SEKOLAH_ID, 5, { nisn: "9876543210", kelas_id: 2 });
  assert.deepEqual(dicek, { kelas: 1, nisn: 1 });
});

test("updateSiswa: siswa, kelas, atau NISN bermasalah", async () => {
  const dbTidakAda = { siswa: { findFirst: async () => null } };
  await assert.rejects(siswaService.updateSiswa(dbTidakAda, SEKOLAH_ID, 5, { nama: "Budi" }), ditolak(404, /Siswa tidak ditemukan/));

  const dbKelasAsing = {
    kelas: { findFirst: async () => null },
    siswa: { findFirst: async () => barisSiswa() }
  };
  await assert.rejects(siswaService.updateSiswa(dbKelasAsing, SEKOLAH_ID, 5, { kelas_id: 50 }), ditolak(404, /Kelas tidak ditemukan/));

  const dbNisnBentrok = {
    siswa: {
      findFirst: async ({ where }) => (where.sekolah_id !== undefined ? barisSiswa() : barisSiswa({ id: 6 }))
    }
  };
  await assert.rejects(
    siswaService.updateSiswa(dbNisnBentrok, SEKOLAH_ID, 5, { nisn: "9876543210" }),
    ditolak(409, /NISN sudah terdaftar/)
  );
});

test("hapusSiswa ditolak bila siswa punya riwayat skrining (A13), termasuk saat FK menolak", async () => {
  let dihapus = false;
  const db = (jumlahHasil, gagalFk = false) => ({
    siswa: {
      findFirst: async () => barisSiswa(),
      delete: async () => {
        if (gagalFk) throw errPrisma("P2003");
        dihapus = true;
      }
    },
    hasil_skrining: { count: async ({ where }) => (where.siswa_id === 5 ? jumlahHasil : 0) }
  });
  const pesan = /Siswa sudah memiliki riwayat skrining dan tidak dapat dihapus/;

  await assert.rejects(siswaService.hapusSiswa(db(1), SEKOLAH_ID, 5), ditolak(409, pesan));
  assert.equal(dihapus, false);
  await assert.rejects(siswaService.hapusSiswa(db(0, true), SEKOLAH_ID, 5), ditolak(409, pesan));

  await siswaService.hapusSiswa(db(0), SEKOLAH_ID, 5);
  assert.equal(dihapus, true);
});

test("hapusSiswa: siswa sekolah lain 404", async () => {
  const db = { siswa: { findFirst: async () => null } };
  await assert.rejects(siswaService.hapusSiswa(db, SEKOLAH_ID, 5), ditolak(404, /Siswa tidak ditemukan/));
});
