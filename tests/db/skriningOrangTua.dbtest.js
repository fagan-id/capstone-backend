import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { buatDataSeed, jalankanSeed } from "../../prisma/seedData.js";
import { dalamTransaksiBatal } from "./helpers.js";
import * as layanan from "../../src/services/public/skriningOrangTua.js";

after(() => prisma.$disconnect());

const SANDI = { SEED_PASSWORD: "rahasia123" };

/**
 * Menyiapkan data seed di dalam transaksi lalu mengembalikan rujukan yang sering dipakai.
 * @param {object} tx
 */
async function siapkan(tx) {
  const data = await buatDataSeed(SANDI);
  await jalankanSeed(tx, data);

  const sesi = await tx.sesi_skrining.findUnique({ where: { kode: data.sesi.kode } });
  const siswa = await tx.siswa.findUnique({ where: { nisn: "0000000001" } });
  const siswaLain = await tx.siswa.findUnique({ where: { nisn: "0000000002" } });
  const level1 = await tx.tes_skrining.findFirst({
    where: { level: 1 },
    include: { pertanyaan: { include: { opsi_jawaban: true, kategori_asesmen: true } } }
  });

  return { data, sesi, siswa, siswaLain, level1 };
}

/**
 * @param {object} tx
 * @param {{ sesi: object, siswa: object }} r
 */
function mulai(tx, r, siswa = r.siswa) {
  return layanan.mulaiSkrining(tx, {
    kode: r.sesi.kode,
    siswa_id: siswa.id,
    nama_responden: "Ibu Uji",
    nomor_hp_responden: "08123456789",
    hubungan_responden: "orang_tua",
    persetujuan: true
  });
}

/**
 * Menjawab satu butir level 1 dengan opsi berskor tertentu.
 * @param {object} tx
 */
async function jawab(tx, r, token, nomor_urut, skor) {
  const p = r.level1.pertanyaan.find((x) => x.nomor_urut === nomor_urut);
  const opsi = p.opsi_jawaban.find((o) => o.skor === skor);
  assert.ok(opsi, `butir ${nomor_urut} tidak punya opsi berskor ${skor}`);
  return layanan.simpanJawaban(tx, token, { pertanyaan_id: p.id, opsi_jawaban_id: opsi.id });
}

/** Mengisi seluruh butir level 1 dengan skor 0, lalu menimpa yang disebut di `khusus`. */
async function isiPenuh(tx, r, token, khusus = {}) {
  for (const p of r.level1.pertanyaan) {
    const skor = khusus[p.nomor_urut] ?? 0;
    await jawab(tx, r, token, p.nomor_urut, skor);
  }
}

test("validasiSesi menolak kode yang tidak ada", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await assert.rejects(layanan.validasiSesi(tx, "TIDAKADA"), { statusCode: 404 });
  });
});

test("validasiSesi menolak sesi yang belum aktif", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    await tx.sesi_skrining.update({ where: { id: r.sesi.id }, data: { status: "menunggu" } });

    await assert.rejects(layanan.validasiSesi(tx, r.sesi.kode), { statusCode: 400 });
  });
});

test("validasiSesi mengembalikan data sekolah tanpa kolom rahasia", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const hasil = await layanan.validasiSesi(tx, r.sesi.kode);

    assert.equal(hasil.kode, r.sesi.kode);
    assert.equal(hasil.sekolah.nama, "SD Demo");
    assert.equal(hasil.sekolah.npsn, "00000001");
    assert.equal("password_hash" in hasil.sekolah, false);
    assert.equal("username" in hasil.sekolah, false);
  });
});

test("cariSiswa hanya mengembalikan nama dan kelas", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const daftar = await layanan.cariSiswa(tx, r.sesi.kode, "Siswa Demo");

    assert.ok(daftar.length >= 2);
    for (const s of daftar) {
      assert.deepEqual(Object.keys(s).sort(), ["id", "kelas", "nama"]);
    }
  });
});

test("konfirmasiSiswa tidak membocorkan NISN maupun jenis kelamin", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const hasil = await layanan.konfirmasiSiswa(tx, r.sesi.kode, r.siswa.id);

    assert.equal(hasil.nama, r.siswa.nama);
    assert.equal(hasil.kelas, "4A");
    assert.equal("nisn" in hasil, false);
    assert.equal("jenis_kelamin" in hasil, false);
  });
});

test("konfirmasiSiswa menolak siswa dari sekolah lain", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const admin = await tx.super_admin.findFirst();
    const sekolahLain = await tx.sekolah.create({
      data: {
        npsn: "00000099",
        nama: "SD Lain",
        email: "lain@demo.test",
        username: "sd_lain",
        password_hash: "hash"
      }
    });
    const kelasLain = await tx.kelas.create({
      data: { sekolah_id: sekolahLain.id, nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" }
    });
    const siswaLuar = await tx.siswa.create({
      data: {
        sekolah_id: sekolahLain.id,
        kelas_id: kelasLain.id,
        nisn: "0000000099",
        nama: "Siswa Luar",
        tanggal_lahir: new Date("2017-01-01"),
        jenis_kelamin: "L"
      }
    });
    assert.ok(admin);

    await assert.rejects(layanan.konfirmasiSiswa(tx, r.sesi.kode, siswaLuar.id), { statusCode: 404 });
  });
});

test("mulaiSkrining membuat percobaan bertoken beserta baris instrumen level 1", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const hasil = await mulai(tx, r);

    assert.match(hasil.token, /^[0-9a-f-]{36}$/);
    assert.equal(hasil.selesai, false);

    const tersimpan = await tx.hasil_skrining.findUnique({ where: { token: hasil.token } });
    assert.equal(tersimpan.nama_responden, "Ibu Uji");
    assert.equal(tersimpan.hubungan_responden, "orang_tua");
    assert.ok(tersimpan.waktu_persetujuan instanceof Date);
    assert.ok(tersimpan.waktu_mulai instanceof Date);
    assert.equal(tersimpan.kesimpulan, null);

    const barisTes = await tx.hasil_tes.findMany({ where: { hasil_skrining_id: tersimpan.id } });
    assert.equal(barisTes.length, 1);
    assert.equal(barisTes[0].tes_skrining_id, r.level1.id);
  });
});

test("mulaiSkrining menolak tanpa persetujuan", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);

    await assert.rejects(
      layanan.mulaiSkrining(tx, {
        kode: r.sesi.kode,
        siswa_id: r.siswa.id,
        nama_responden: "Ibu Uji",
        nomor_hp_responden: "08123456789",
        hubungan_responden: "orang_tua",
        persetujuan: false
      }),
      { statusCode: 400 }
    );
  });
});

test("mulaiSkrining melanjutkan percobaan yang sama tanpa menduplikasi", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const pertama = await mulai(tx, r);
    const kedua = await mulai(tx, r);

    assert.equal(kedua.token, pertama.token);
    assert.equal(await tx.hasil_skrining.count({ where: { siswa_id: r.siswa.id } }), 1);
  });
});

test("getPertanyaanLevel1 memuat butir beserta opsi dan jawaban tersimpan", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await jawab(tx, r, token, 3, 1);

    const hasil = await layanan.getPertanyaanLevel1(tx, token);

    assert.equal(hasil.total_soal, r.level1.pertanyaan.length);
    assert.equal(hasil.total_dijawab, 1);

    const butir3 = hasil.pertanyaan.find((p) => p.nomor_urut === 3);
    assert.ok(butir3.opsi_jawaban.length >= 2);
    assert.ok(butir3.jawaban_terpilih);
    // Skor tidak pernah dikirim ke peserta.
    assert.equal("skor" in butir3.opsi_jawaban[0], false);

    const butir1 = hasil.pertanyaan.find((p) => p.nomor_urut === 1);
    assert.equal(butir1.jawaban_terpilih, null);
  });
});

test("token tidak dikenal ditolak sebagai 404", async () => {
  await dalamTransaksiBatal(async (tx) => {
    await siapkan(tx);
    await assert.rejects(layanan.getPertanyaanLevel1(tx, "bukan-token"), { statusCode: 404 });
  });
});

test("token satu percobaan tidak bisa menyimpan jawaban percobaan lain", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const milikA = await mulai(tx, r, r.siswa);
    const milikB = await mulai(tx, r, r.siswaLain);

    await jawab(tx, r, milikA.token, 1, 2);

    const hasilB = await layanan.getPertanyaanLevel1(tx, milikB.token);
    assert.equal(hasilB.total_dijawab, 0);

    const idA = (await tx.hasil_skrining.findUnique({ where: { token: milikA.token } })).id;
    assert.equal(await tx.jawaban_siswa.count({ where: { hasil_skrining_id: idA } }), 1);
  });
});

test("simpanJawaban menolak opsi milik pertanyaan lain", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    const p1 = r.level1.pertanyaan.find((p) => p.nomor_urut === 1);
    const p2 = r.level1.pertanyaan.find((p) => p.nomor_urut === 2);

    await assert.rejects(
      layanan.simpanJawaban(tx, token, { pertanyaan_id: p1.id, opsi_jawaban_id: p2.opsi_jawaban[0].id }),
      { statusCode: 400 }
    );
  });
});

test("autosave jawaban yang sama dua kali menyisakan satu baris", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);

    await jawab(tx, r, token, 1, 0);
    const akhir = await jawab(tx, r, token, 1, 4);

    assert.equal(akhir.total_dijawab, 1);

    const id = (await tx.hasil_skrining.findUnique({ where: { token } })).id;
    const baris = await tx.jawaban_siswa.findMany({ where: { hasil_skrining_id: id } });
    assert.equal(baris.length, 1);
  });
});

test("submitLevel1 menolak jawaban yang belum lengkap", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await jawab(tx, r, token, 1, 0);

    await assert.rejects(layanan.submitLevel1(tx, token), { statusCode: 400 });
  });
});

test("submitLevel1 menyimpan hasil per domain beserta ambang yang dipakai", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    // Inatensi (butir 3) berambang 1, jadi skor 1 menandainya; domain lain tetap 0.
    await isiPenuh(tx, r, token, { 3: 1 });

    const hasil = await layanan.submitLevel1(tx, token);

    const id = (await tx.hasil_skrining.findUnique({ where: { token } })).id;
    const perDomain = await tx.hasil_kategori.findMany({
      where: { hasil_skrining_id: id },
      include: { kategori_asesmen: true }
    });

    const domainLevel1 = new Set(r.level1.pertanyaan.map((p) => p.kategori_asesmen_id));
    assert.equal(perDomain.length, domainLevel1.size);

    const inatensi = perDomain.find((h) => h.kategori_asesmen.nama === "Inatensi");
    assert.equal(inatensi.terindikasi, true);
    assert.equal(inatensi.skor_tertinggi, 1);
    assert.equal(inatensi.ambang_batas, 1);

    const somatik = perDomain.find((h) => h.kategori_asesmen.nama === "Somatik");
    assert.equal(somatik.terindikasi, false);

    assert.equal(hasil.selesai, false, "masih ada instrumen lanjutan");
  });
});

test("submitLevel1 hanya menugaskan instrumen domain yang terindikasi", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token, { 3: 1 });

    await layanan.submitLevel1(tx, token);

    const id = (await tx.hasil_skrining.findUnique({ where: { token } })).id;
    const barisTes = await tx.hasil_tes.findMany({
      where: { hasil_skrining_id: id },
      include: { tes_skrining: true }
    });

    const lanjutan = barisTes.filter((b) => b.tes_skrining.level === 2);
    assert.equal(lanjutan.length, 1);
    assert.equal(lanjutan[0].tes_skrining.nama, "Instrumen Lanjutan Inatensi");
  });
});

test("submitLevel1 menyelesaikan percobaan bila tidak ada domain terindikasi", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token);

    const hasil = await layanan.submitLevel1(tx, token);

    assert.equal(hasil.selesai, true);
    assert.equal(hasil.status, "selesai");
    assert.equal(hasil.tindak_lanjut_tersedia, false);
    assert.equal(hasil.jumlah_instrumen_lanjutan, 0);

    const tersimpan = await tx.hasil_skrining.findUnique({ where: { token } });
    assert.equal(tersimpan.selesai, true);
    assert.ok(tersimpan.waktu_selesai instanceof Date);
    assert.ok(tersimpan.kesimpulan);

    const dash = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dash.seluruh_selesai, true);
    assert.equal(dash.tindak_lanjut_tersedia, false);
    assert.equal(dash.total_instrumen, 0);
  });
});

test("submitLevel1 menolak percobaan yang sudah dikirim", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token, { 3: 1 });
    await layanan.submitLevel1(tx, token);

    await assert.rejects(layanan.submitLevel1(tx, token), { statusCode: 400 });
  });
});

test("dashboard lanjutan memakai label netral dan membuka satu per satu", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    // Inatensi (urutan 2) dan Depresi (urutan 3) sama-sama ditandai.
    await isiPenuh(tx, r, token, { 3: 1, 4: 2 });
    await layanan.submitLevel1(tx, token);

    const dash = await layanan.getDashboardTindakLanjut(tx, token);

    assert.equal(dash.daftar_instrumen.length, 2);
    assert.deepEqual(
      dash.daftar_instrumen.map((i) => i.label),
      ["Bagian lanjutan 1", "Bagian lanjutan 2"]
    );
    // Nama domain tidak boleh terbaca peserta (D37).
    for (const i of dash.daftar_instrumen) {
      assert.equal("nama" in i, false);
      assert.equal(/Inatensi|Depresi/.test(JSON.stringify(i)), false);
    }
    assert.deepEqual(
      dash.daftar_instrumen.map((i) => i.status),
      ["aktif", "terkunci"]
    );
    assert.equal(dash.seluruh_selesai, false);
  });
});

test("instrumen lanjutan terkunci tidak bisa dibuka lebih dulu", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token, { 3: 1, 4: 2 });
    await layanan.submitLevel1(tx, token);

    const dash = await layanan.getDashboardTindakLanjut(tx, token);
    const terkunci = dash.daftar_instrumen[1];

    await assert.rejects(layanan.getPertanyaanLanjutan(tx, token, terkunci.tes_skrining_id), {
      statusCode: 400
    });
  });
});

test("submit instrumen lanjutan menyimpan total skor lalu membuka yang berikutnya", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token, { 3: 1, 4: 2 });
    await layanan.submitLevel1(tx, token);

    const dash = await layanan.getDashboardTindakLanjut(tx, token);
    const pertama = dash.daftar_instrumen[0].tes_skrining_id;

    const soal = await layanan.getPertanyaanLanjutan(tx, token, pertama);
    assert.equal(soal.label, "Bagian lanjutan 1");

    for (const p of soal.pertanyaan) {
      const opsi = p.opsi_jawaban[p.opsi_jawaban.length - 1];
      await layanan.simpanJawaban(tx, token, { pertanyaan_id: p.id, opsi_jawaban_id: opsi.id });
    }

    const kirim = await layanan.submitLanjutan(tx, token, pertama);
    assert.equal(kirim.selesai, false, "masih ada satu instrumen lagi");

    const id = (await tx.hasil_skrining.findUnique({ where: { token } })).id;
    const baris = await tx.hasil_tes.findFirst({
      where: { hasil_skrining_id: id, tes_skrining_id: pertama }
    });
    assert.equal(baris.selesai, true);
    assert.ok(baris.total_skor > 0);
    assert.ok(baris.waktu_selesai instanceof Date);

    const dashBaru = await layanan.getDashboardTindakLanjut(tx, token);
    assert.deepEqual(
      dashBaru.daftar_instrumen.map((i) => i.status),
      ["selesai", "aktif"]
    );
  });
});

test("percobaan selesai setelah instrumen lanjutan terakhir dikirim", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token, { 3: 1 });
    await layanan.submitLevel1(tx, token);

    const dash = await layanan.getDashboardTindakLanjut(tx, token);
    const satuSatunya = dash.daftar_instrumen[0].tes_skrining_id;

    const soal = await layanan.getPertanyaanLanjutan(tx, token, satuSatunya);
    for (const p of soal.pertanyaan) {
      await layanan.simpanJawaban(tx, token, {
        pertanyaan_id: p.id,
        opsi_jawaban_id: p.opsi_jawaban[0].id
      });
    }

    const kirim = await layanan.submitLanjutan(tx, token, satuSatunya);
    assert.equal(kirim.selesai, true);

    const tersimpan = await tx.hasil_skrining.findUnique({ where: { token } });
    assert.equal(tersimpan.selesai, true);
    assert.ok(tersimpan.waktu_selesai instanceof Date);
  });
});

test("submit instrumen lanjutan menolak jawaban yang belum lengkap", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);
    await isiPenuh(tx, r, token, { 3: 1 });
    await layanan.submitLevel1(tx, token);

    const dash = await layanan.getDashboardTindakLanjut(tx, token);
    await assert.rejects(layanan.submitLanjutan(tx, token, dash.daftar_instrumen[0].tes_skrining_id), {
      statusCode: 400
    });
  });
});
