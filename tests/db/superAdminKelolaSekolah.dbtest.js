import { test, after } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { prisma } from "../../src/lib/prisma.js";
import { dalamTransaksiBatal } from "./helpers.js";
import * as sekolahService from "../../src/services/superAdmin/superAdminKelolaSekolah.js";

after(() => prisma.$disconnect());

test("DB: getDaftarSekolah menghitung total sesi skrining secara agregat dari database", async () => {
  await dalamTransaksiBatal(async (tx) => {
    // 1. Buat 2 sekolah uji
    const s1 = await tx.sekolah.create({
      data: {
        npsn: "99000001",
        nama: "SDN Sukamaju 01 Uji",
        email: "sukamaju01@uji.sch.id",
        username: "sukamaju01_uji",
        password_hash: "hash",
        aktif: true
      }
    });

    const s2 = await tx.sekolah.create({
      data: {
        npsn: "99000002",
        nama: "SD Al-Hikmah Uji",
        email: "alhikmah@uji.sch.id",
        username: "alhikmah_uji",
        password_hash: "hash",
        aktif: false
      }
    });

    // 2. Buat 3 sesi untuk sekolah 1 dan 1 sesi untuk sekolah 2
    for (let i = 1; i <= 3; i++) {
      await tx.sesi_skrining.create({
        data: {
          sekolah_id: s1.id,
          nama: `Sesi ${i}`,
          kode: `SKM00${i}`,
          tanggal_pelaksanaan: new Date(),
          status: "aktif"
        }
      });
    }

    await tx.sesi_skrining.create({
      data: {
        sekolah_id: s2.id,
        nama: "Sesi 1",
        kode: `ALH001`,
        tanggal_pelaksanaan: new Date(),
        status: "menunggu"
      }
    });

    // 3. Query daftar sekolah aktif dengan filter pencarian Sukamaju
    const hasil = await sekolahService.getDaftarSekolah(tx, {
      search: "Sukamaju 01 Uji",
      status: true
    });

    assert.equal(hasil.items.length, 1);
    assert.equal(hasil.items[0].nama, "SDN Sukamaju 01 Uji");
    assert.equal(hasil.items[0].total_sesi, 3);
    assert.equal(hasil.items[0].aktif, true);
    assert.equal(hasil.items[0].password_hash, undefined);

    // 4. Query sekolah nonaktif
    const hasilNonaktif = await sekolahService.getDaftarSekolah(tx, {
      search: "Al-Hikmah Uji",
      status: false
    });

    assert.equal(hasilNonaktif.items.length, 1);
    assert.equal(hasilNonaktif.items[0].nama, "SD Al-Hikmah Uji");
    assert.equal(hasilNonaktif.items[0].total_sesi, 1);
    assert.equal(hasilNonaktif.items[0].aktif, false);
  });
});

test("DB: tambahSekolah menyimpan sekolah baru dan password dapat diverifikasi", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const plainPassword = "PasswordSekolahAman123!";

    const baru = await sekolahService.tambahSekolah(tx, {
      nama: "SD Cempaka 03 Uji",
      email: "cempaka03@uji.sch.id",
      password: plainPassword,
      aktif: true
    });

    assert.ok(baru.id);
    assert.equal(baru.nama, "SD Cempaka 03 Uji");
    assert.equal(baru.email, "cempaka03@uji.sch.id");
    assert.equal(baru.aktif, true);
    assert.equal(baru.total_sesi, 0);
    assert.ok(baru.npsn);
    assert.equal(baru.npsn.length, 8);
    assert.ok(baru.username);

    // Verifikasi data mentah di database dan hash password
    const diDb = await tx.sekolah.findUnique({ where: { id: baru.id } });
    assert.ok(diDb);
    const cekPassword = await bcrypt.compare(plainPassword, diDb.password_hash);
    assert.equal(cekPassword, true);
  });
});

test("DB: updateSekolah mengubah data profil dan password secara selektif", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const passwordLama = "PasswordLama123!";
    const hashLama = await bcrypt.hash(passwordLama, 10);

    const sekolah = await tx.sekolah.create({
      data: {
        npsn: "99000003",
        nama: "SD Asli Uji",
        email: "asli@uji.sch.id",
        username: "sd_asli_uji",
        password_hash: hashLama,
        aktif: true
      }
    });

    // 1. Update nama dan status tanpa mengubah password
    const update1 = await sekolahService.updateSekolah(tx, sekolah.id, {
      nama: "SD Asli Diubah",
      aktif: false
    });

    assert.equal(update1.nama, "SD Asli Diubah");
    assert.equal(update1.aktif, false);

    const db1 = await tx.sekolah.findUnique({ where: { id: sekolah.id } });
    assert.equal(db1.password_hash, hashLama);

    // 2. Update dengan password baru
    const passwordBaru = "PasswordBaruGanti999!";
    const update2 = await sekolahService.updateSekolah(tx, sekolah.id, {
      password: passwordBaru
    });

    const db2 = await tx.sekolah.findUnique({ where: { id: sekolah.id } });
    assert.notEqual(db2.password_hash, hashLama);
    const cekPasswordBaru = await bcrypt.compare(passwordBaru, db2.password_hash);
    assert.equal(cekPasswordBaru, true);
  });
});

test("DB: tambahSekolah dan updateSekolah menolak email duplikat", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await tx.sekolah.create({
      data: {
        npsn: "99000004",
        nama: "SD Satu",
        email: "satu@uji.sch.id",
        username: "sd_satu_uji",
        password_hash: "hash",
        aktif: true
      }
    });

    const sekolahDua = await tx.sekolah.create({
      data: {
        npsn: "99000005",
        nama: "SD Dua",
        email: "dua@uji.sch.id",
        username: "sd_dua_uji",
        password_hash: "hash",
        aktif: true
      }
    });

    // Tambah dengan email yang sudah ada -> 409
    await assert.rejects(
      async () =>
        sekolahService.tambahSekolah(tx, {
          nama: "SD Tiga",
          email: "satu@uji.sch.id",
          password: "password123"
        }),
      (err) => err.statusCode === 409
    );

    // Update sekolahDua dengan email sekolah satu -> 409
    await assert.rejects(
      async () =>
        sekolahService.updateSekolah(tx, sekolahDua.id, {
          email: "satu@uji.sch.id"
        }),
      (err) => err.statusCode === 409
    );
  });
});
