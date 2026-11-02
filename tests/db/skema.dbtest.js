import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { dalamTransaksiBatal } from "./helpers.js";

after(() => prisma.$disconnect());

/**
 * Membuat sekolah uji bernomor no; field bisa ditimpa lewat data.
 * @param {object} tx
 * @param {number} no
 * @param {object} [data]
 */
function buatSekolah(tx, no, data = {}) {
  const nomor = String(no).padStart(2, "0");
  return tx.sekolah.create({
    data: {
      npsn: `999900${nomor}`,
      nama: `SD Uji ${nomor}`,
      email: `sekolah${nomor}@uji.test`,
      username: `sd_uji_${nomor}`,
      password_hash: "hash-uji",
      ...data
    }
  });
}

/**
 * @param {object} tx
 * @param {number} sekolah_id
 * @param {object} [data]
 */
function buatKelas(tx, sekolah_id, data = {}) {
  return tx.kelas.create({ data: { sekolah_id, nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027", ...data } });
}

/**
 * @param {object} tx
 * @param {number} sekolah_id
 * @param {number} kelas_id
 * @param {object} [data]
 */
function buatSiswa(tx, sekolah_id, kelas_id, data = {}) {
  return tx.siswa.create({
    data: {
      sekolah_id,
      kelas_id,
      nisn: "9999999901",
      nama: "Siswa Uji",
      tanggal_lahir: new Date("2017-03-14"),
      jenis_kelamin: "L",
      ...data
    }
  });
}

test("siswa tersimpan lengkap dengan nol di depan NISN", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const a = await buatSekolah(tx, 1);
    const k = await buatKelas(tx, a.id);
    const dibuat = await buatSiswa(tx, a.id, k.id, { nisn: "0012345678", jenis_kelamin: "P" });

    const s = await tx.siswa.findUnique({ where: { id: dibuat.id } });
    assert.equal(s.nisn, "0012345678");
    assert.equal(s.jenis_kelamin, "P");
    assert.equal(s.tanggal_lahir.toISOString().slice(0, 10), "2017-03-14");
    assert.ok(s.created_at instanceof Date);
    assert.ok(s.updated_at instanceof Date);
  });
});

test("NISN unik di seluruh sistem", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const a = await buatSekolah(tx, 1);
    const b = await buatSekolah(tx, 2);
    const ka = await buatKelas(tx, a.id);
    const kb = await buatKelas(tx, b.id);
    await buatSiswa(tx, a.id, ka.id, { nisn: "9999999911" });

    await assert.rejects(buatSiswa(tx, b.id, kb.id, { nisn: "9999999911" }), { code: "P2002" });
  });
});

test("email sekolah unik tanpa membedakan huruf besar", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await buatSekolah(tx, 1, { email: "admin@uji.test" });

    await assert.rejects(buatSekolah(tx, 2, { email: "Admin@Uji.test" }), { code: "P2002" });
  });
});

test("email super admin unik tanpa membedakan huruf besar", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await tx.super_admin.create({ data: { nama: "Admin Uji", email: "x@uji.test", password_hash: "hash-uji" } });

    await assert.rejects(
      tx.super_admin.create({ data: { nama: "Admin Uji 2", email: "X@UJI.test", password_hash: "hash-uji" } }),
      { code: "P2002" }
    );
  });
});

test("username sekolah unik tanpa membedakan huruf besar", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await buatSekolah(tx, 1, { username: "sd_uji" });

    await assert.rejects(buatSekolah(tx, 2, { username: "SD_Uji" }), { code: "P2002" });
  });
});

test("NPSN unik", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await buatSekolah(tx, 1, { npsn: "99990001" });

    await assert.rejects(buatSekolah(tx, 2, { npsn: "99990001" }), { code: "P2002" });
  });
});

test("nama kelas unik per sekolah dan tahun ajaran", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const a = await buatSekolah(tx, 1);
    const b = await buatSekolah(tx, 2);
    await buatKelas(tx, a.id);

    await assert.doesNotReject(buatKelas(tx, a.id, { tahun_ajaran: "2027/2028" }));
    await assert.doesNotReject(buatKelas(tx, b.id));
    await assert.rejects(buatKelas(tx, a.id), { code: "P2002" });
  });
});

test("kelas siswa harus milik sekolah yang sama", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const a = await buatSekolah(tx, 1);
    const b = await buatSekolah(tx, 2);
    const kb = await buatKelas(tx, b.id);

    await assert.rejects(buatSiswa(tx, a.id, kb.id), { code: "P2003" });
  });
});

test("kelas yang masih punya siswa tidak bisa dihapus", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const a = await buatSekolah(tx, 1);
    const k = await buatKelas(tx, a.id);
    await buatSiswa(tx, a.id, k.id);

    await assert.rejects(tx.kelas.delete({ where: { id: k.id } }), { code: "P2003" });
  });
});

test("sekolah yang masih punya kelas tidak bisa dihapus", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const a = await buatSekolah(tx, 1);
    await buatKelas(tx, a.id);

    await assert.rejects(tx.sekolah.delete({ where: { id: a.id } }), { code: "P2003" });
  });
});

test("aktif bawaan true", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const s = await buatSekolah(tx, 1);
    const sa = await tx.super_admin.create({ data: { nama: "Admin Uji", email: "y@uji.test", password_hash: "hash-uji" } });

    assert.equal(s.aktif, true);
    assert.equal(sa.aktif, true);
  });
});
