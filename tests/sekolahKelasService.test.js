import { test } from "node:test";
import assert from "node:assert/strict";
import * as kelasService from "../src/services/sekolah/sekolahKelas.js";

const SEKOLAH_ID = 10;

function barisKelas(over = {}) {
  return {
    id: 1,
    sekolah_id: SEKOLAH_ID,
    nama: "4A",
    tingkat: 4,
    tahun_ajaran: "2026/2027",
    created_at: new Date("2026-07-01T00:00:00Z"),
    updated_at: new Date("2026-07-01T00:00:00Z"),
    ...over
  };
}

const ditolak = (status, pola) => (err) => err.statusCode === status && pola.test(err.message);

test("getDaftarKelas memfilter per sekolah, mengurutkan tingkat lalu nama, dan menghitung siswa", async () => {
  let args;
  const db = {
    kelas: {
      findMany: async (a) => {
        args = a;
        return [{ ...barisKelas(), _count: { siswa: 28 } }];
      }
    }
  };

  const hasil = await kelasService.getDaftarKelas(db, SEKOLAH_ID, { tahun_ajaran: "2026/2027", tingkat: 4 });

  assert.deepEqual(args.where, { sekolah_id: SEKOLAH_ID, tahun_ajaran: "2026/2027", tingkat: 4 });
  assert.deepEqual(args.orderBy, [{ tingkat: "asc" }, { nama: "asc" }]);
  assert.equal(hasil[0].jumlah_siswa, 28);
  assert.equal(hasil[0].sekolah_id, undefined);
});

test("tambahKelas menyimpan kelas dengan sekolah_id dari token", async () => {
  let dibuat;
  const db = {
    kelas: {
      findFirst: async () => null,
      create: async ({ data }) => {
        dibuat = data;
        return { ...barisKelas(data), id: 7 };
      }
    }
  };

  const hasil = await kelasService.tambahKelas(db, SEKOLAH_ID, { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" });

  assert.equal(dibuat.sekolah_id, SEKOLAH_ID);
  assert.equal(hasil.id, 7);
  assert.equal(hasil.jumlah_siswa, 0);
});

test("tambahKelas menolak duplikat nama pada tahun ajaran yang sama (409), termasuk P2002", async () => {
  const input = { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" };
  const pesan = /Kelas dengan nama tersebut sudah ada pada tahun ajaran ini/;

  let filter;
  const dbAda = {
    kelas: {
      findFirst: async ({ where }) => {
        filter = where;
        return barisKelas();
      }
    }
  };
  await assert.rejects(kelasService.tambahKelas(dbAda, SEKOLAH_ID, input), ditolak(409, pesan));
  assert.deepEqual(filter, { sekolah_id: SEKOLAH_ID, nama: "4A", tahun_ajaran: "2026/2027" });

  // Balapan: lolos cek awal, lalu unique index menolak
  const dbBalapan = {
    kelas: {
      findFirst: async () => null,
      create: async () => {
        throw Object.assign(new Error("unique"), { code: "P2002" });
      }
    }
  };
  await assert.rejects(kelasService.tambahKelas(dbBalapan, SEKOLAH_ID, input), ditolak(409, pesan));
});

test("updateKelas: kelas milik sekolah lain dianggap tidak ada (404)", async () => {
  let filter;
  const db = {
    kelas: {
      findFirst: async ({ where }) => {
        filter = where;
        return null;
      }
    }
  };

  await assert.rejects(kelasService.updateKelas(db, SEKOLAH_ID, 99, { nama: "4B" }), ditolak(404, /Kelas tidak ditemukan/));
  assert.deepEqual(filter, { id: 99, sekolah_id: SEKOLAH_ID });
});

test("updateKelas mengecek duplikat hanya bila nama atau tahun ajaran berubah", async () => {
  const cekDuplikat = [];
  let diubah;
  const db = {
    kelas: {
      findFirst: async ({ where }) => {
        if (where.id !== undefined) return barisKelas(); // cariKelas
        cekDuplikat.push(where);
        return null;
      },
      update: async ({ where, data }) => {
        diubah = { where, data };
        return { ...barisKelas(data), _count: { siswa: 3 } };
      }
    }
  };

  await kelasService.updateKelas(db, SEKOLAH_ID, 1, { tingkat: 5 });
  assert.equal(cekDuplikat.length, 0);
  assert.deepEqual(diubah, { where: { id: 1 }, data: { tingkat: 5 } });

  const hasil = await kelasService.updateKelas(db, SEKOLAH_ID, 1, { nama: "4B" });
  assert.deepEqual(cekDuplikat[0], { sekolah_id: SEKOLAH_ID, nama: "4B", tahun_ajaran: "2026/2027", NOT: { id: 1 } });
  assert.equal(hasil.nama, "4B");
  assert.equal(hasil.jumlah_siswa, 3);
});

test("updateKelas menolak nama yang sudah dipakai kelas lain (409)", async () => {
  const db = {
    kelas: {
      findFirst: async ({ where }) => (where.id !== undefined ? barisKelas() : barisKelas({ id: 2, nama: "4B" }))
    }
  };
  await assert.rejects(
    kelasService.updateKelas(db, SEKOLAH_ID, 1, { nama: "4B" }),
    ditolak(409, /sudah ada pada tahun ajaran ini/)
  );
});

test("hapusKelas ditolak bila masih ada siswa, termasuk saat FK menolak (P2003)", async () => {
  let dihapus = false;
  const db = (jumlahSiswa, gagalFk = false) => ({
    kelas: {
      findFirst: async () => barisKelas(),
      delete: async () => {
        if (gagalFk) throw Object.assign(new Error("fk"), { code: "P2003" });
        dihapus = true;
      }
    },
    siswa: { count: async ({ where }) => (where.kelas_id === 1 ? jumlahSiswa : 0) }
  });

  await assert.rejects(kelasService.hapusKelas(db(2), SEKOLAH_ID, 1), ditolak(409, /Kelas masih memiliki siswa/));
  assert.equal(dihapus, false);

  await assert.rejects(kelasService.hapusKelas(db(0, true), SEKOLAH_ID, 1), ditolak(409, /Kelas masih memiliki siswa/));

  await kelasService.hapusKelas(db(0), SEKOLAH_ID, 1);
  assert.equal(dihapus, true);
});

test("hapusKelas: kelas sekolah lain 404", async () => {
  const db = { kelas: { findFirst: async () => null } };
  await assert.rejects(kelasService.hapusKelas(db, SEKOLAH_ID, 5), ditolak(404, /Kelas tidak ditemukan/));
});
