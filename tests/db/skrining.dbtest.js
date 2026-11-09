import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../../src/lib/prisma.js";
import { dalamTransaksiBatal } from "./helpers.js";

after(() => prisma.$disconnect());

/**
 * Membangun satu rangkaian data skrining siap uji.
 * @param {object} tx
 */
async function buatRangkaian(tx) {
  const admin = await tx.super_admin.create({
    data: { nama: "Admin Uji", email: `admin-${randomUUID()}@uji.test`, password_hash: "hash-uji" }
  });

  const sekolah = await tx.sekolah.create({
    data: {
      npsn: "99991001",
      nama: "SD Uji Skrining",
      email: `sekolah-${randomUUID()}@uji.test`,
      username: `sd_uji_${Date.now()}`,
      password_hash: "hash-uji"
    }
  });

  const kelas = await tx.kelas.create({
    data: { sekolah_id: sekolah.id, nama: "5A", tingkat: 5, tahun_ajaran: "2026/2027" }
  });

  const siswa = await tx.siswa.create({
    data: {
      sekolah_id: sekolah.id,
      kelas_id: kelas.id,
      nisn: "9999100101",
      nama: "Siswa Uji Skrining",
      tanggal_lahir: new Date("2016-05-20"),
      jenis_kelamin: "L"
    }
  });

  const tes = await tx.tes_skrining.create({
    data: {
      super_admin_id: admin.id,
      nama: "Skrining Awal Uji",
      level: 1,
      jenjang: "SD",
      deskripsi: "Instrumen uji level 1."
    }
  });

  // urutan unik secara global, jadi ambil slot kosong setelah data seed.
  const terakhir = await tx.kategori_asesmen.findFirst({ orderBy: { urutan: "desc" }, select: { urutan: true } });

  const kategori = await tx.kategori_asesmen.create({
    data: { nama: "Inatensi", ambang_batas: 1, urutan: (terakhir?.urutan ?? 0) + 1 }
  });

  const pertanyaan = await tx.pertanyaan.create({
    data: {
      tes_skrining_id: tes.id,
      kategori_asesmen_id: kategori.id,
      teks: "Sulit memusatkan perhatian?",
      tipe_jawaban: "skala",
      nomor_urut: 1
    }
  });

  const opsi = await tx.opsi_jawaban.create({
    data: { pertanyaan_id: pertanyaan.id, label: "2", teks: "Ringan", skor: 2, urutan: 3 }
  });

  const sesi = await tx.sesi_skrining.create({
    data: {
      sekolah_id: sekolah.id,
      nama: "Skrining Kelas 5",
      kode: `UJI${Date.now()}`,
      tanggal_pelaksanaan: new Date("2026-11-10"),
      status: "aktif"
    }
  });

  return { admin, sekolah, kelas, siswa, tes, kategori, pertanyaan, opsi, sesi };
}

/**
 * @param {object} tx
 * @param {{ siswa: object, sesi: object }} r
 * @param {object} [data]
 */
function buatHasil(tx, r, data = {}) {
  return tx.hasil_skrining.create({
    data: {
      siswa_id: r.siswa.id,
      sesi_skrining_id: r.sesi.id,
      token: randomUUID(),
      nama_responden: "Orang Tua Uji",
      nomor_hp_responden: "08123456789",
      hubungan_responden: "orang_tua",
      waktu_persetujuan: new Date(),
      waktu_mulai: new Date(),
      ...data
    }
  });
}

test("hasil skrining menyimpan token unik", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    const token = randomUUID();
    await buatHasil(tx, r, { token });

    const siswaLain = await tx.siswa.create({
      data: {
        sekolah_id: r.sekolah.id,
        kelas_id: r.kelas.id,
        nisn: "9999100102",
        nama: "Siswa Uji Dua",
        tanggal_lahir: new Date("2016-07-01"),
        jenis_kelamin: "P"
      }
    });

    await assert.rejects(
      tx.hasil_skrining.create({
        data: {
          siswa_id: siswaLain.id,
          sesi_skrining_id: r.sesi.id,
          token,
          nama_responden: "Orang Tua Lain",
          nomor_hp_responden: "08100000000",
          hubungan_responden: "wali",
          waktu_persetujuan: new Date(),
          waktu_mulai: new Date()
        }
      }),
      { code: "P2002" }
    );
  });
});

test("satu siswa hanya punya satu percobaan per sesi", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    await buatHasil(tx, r);

    await assert.rejects(buatHasil(tx, r), { code: "P2002" });
  });
});

test("percobaan baru belum selesai dan belum punya kesimpulan", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    const hasil = await buatHasil(tx, r);

    assert.equal(hasil.selesai, false);
    assert.equal(hasil.waktu_selesai, null);
    assert.equal(hasil.kesimpulan, null);
  });
});

test("autosave jawaban menimpa, bukan menambah baris", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    const hasil = await buatHasil(tx, r);
    const opsiLain = await tx.opsi_jawaban.create({
      data: { pertanyaan_id: r.pertanyaan.id, label: "4", teks: "Berat", skor: 4, urutan: 5 }
    });

    const kunci = { hasil_skrining_id: hasil.id, pertanyaan_id: r.pertanyaan.id };
    await tx.jawaban_siswa.create({ data: { ...kunci, opsi_jawaban_id: r.opsi.id } });

    await assert.rejects(tx.jawaban_siswa.create({ data: { ...kunci, opsi_jawaban_id: opsiLain.id } }), {
      code: "P2002"
    });

    await tx.jawaban_siswa.update({
      where: { hasil_skrining_id_pertanyaan_id: kunci },
      data: { opsi_jawaban_id: opsiLain.id }
    });

    const jawaban = await tx.jawaban_siswa.findMany({ where: { hasil_skrining_id: hasil.id } });
    assert.equal(jawaban.length, 1);
    assert.equal(jawaban[0].opsi_jawaban_id, opsiLain.id);
  });
});

test("hasil kategori tersimpan sekali per domain dengan ambang saat itu", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    const hasil = await buatHasil(tx, r);

    const baris = {
      hasil_skrining_id: hasil.id,
      kategori_asesmen_id: r.kategori.id,
      skor_tertinggi: 2,
      ambang_batas: 1,
      terindikasi: true
    };
    await tx.hasil_kategori.create({ data: baris });

    await assert.rejects(tx.hasil_kategori.create({ data: baris }), { code: "P2002" });

    // Ambang domain berubah setelah percobaan selesai: baris hasil tidak ikut berubah (D35, D41).
    await tx.kategori_asesmen.update({ where: { id: r.kategori.id }, data: { ambang_batas: 4 } });

    const tersimpan = await tx.hasil_kategori.findFirst({ where: { hasil_skrining_id: hasil.id } });
    assert.equal(tersimpan.ambang_batas, 1);
    assert.equal(tersimpan.terindikasi, true);
  });
});

test("hasil tes tersimpan sekali per instrumen", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    const hasil = await buatHasil(tx, r);

    const baris = { hasil_skrining_id: hasil.id, tes_skrining_id: r.tes.id };
    const dibuat = await tx.hasil_tes.create({ data: baris });

    assert.equal(dibuat.selesai, false);
    assert.equal(dibuat.total_skor, null);
    await assert.rejects(tx.hasil_tes.create({ data: baris }), { code: "P2002" });
  });
});

test("nomor urut pertanyaan unik per instrumen", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);

    await assert.rejects(
      tx.pertanyaan.create({
        data: {
          tes_skrining_id: r.tes.id,
          kategori_asesmen_id: r.kategori.id,
          teks: "Pertanyaan lain dengan nomor sama.",
          tipe_jawaban: "skala",
          nomor_urut: 1
        }
      }),
      { code: "P2002" }
    );
  });
});

test("kode sesi unik", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);

    await assert.rejects(
      tx.sesi_skrining.create({
        data: {
          sekolah_id: r.sekolah.id,
          nama: "Sesi Lain",
          kode: r.sesi.kode,
          tanggal_pelaksanaan: new Date("2026-12-01"),
          status: "menunggu"
        }
      }),
      { code: "P2002" }
    );
  });
});

test("siswa yang punya hasil skrining tidak bisa dihapus", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    await buatHasil(tx, r);

    await assert.rejects(tx.siswa.delete({ where: { id: r.siswa.id } }), { code: "P2003" });
  });
});

test("pertanyaan yang sudah dijawab tidak bisa dihapus", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);
    const hasil = await buatHasil(tx, r);
    await tx.jawaban_siswa.create({
      data: { hasil_skrining_id: hasil.id, pertanyaan_id: r.pertanyaan.id, opsi_jawaban_id: r.opsi.id }
    });

    await assert.rejects(tx.pertanyaan.delete({ where: { id: r.pertanyaan.id } }), { code: "P2003" });
  });
});

test("instrumen dan domain aktif secara bawaan", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await buatRangkaian(tx);

    assert.equal(r.tes.aktif, true);
    assert.equal(r.pertanyaan.aktif, true);
    assert.equal(r.kategori.tes_skrining_id, null);
  });
});
