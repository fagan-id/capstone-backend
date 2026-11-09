/**
 * Automated Test: Alur Percabangan Skrining (Level 1 -> Level 2).
 *
 * Menguji secara komprehensif dua jalur utama:
 * 1. Siswa yang memenuhi nilai aman / kriteria normal -> HANYA selesai sampai skrining awal.
 * 2. Siswa yang belum memenuhi nilai aman / terindikasi gejala -> BARU masuk ke tindak lanjut.
 * 3. Siswa dengan multi-domain terindikasi -> tindak lanjut berurutan (sequential lock).
 * 4. Siswa terindikasi pada domain tanpa instrumen Level 2 -> selesai di awal dan ditandai untuk sekolah.
 */

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../src/lib/prisma.js";
import { buatDataSeed, jalankanSeed } from "../../prisma/seedData.js";
import { dalamTransaksiBatal } from "./helpers.js";
import * as layanan from "../../src/services/skriningPublik.js";

after(() => prisma.$disconnect());

const SANDI = { SEED_PASSWORD: "rahasia123" };

/**
 * Menyiapkan data seed di dalam transaksi uji.
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
 * Memulai sesi skrining untuk seorang siswa.
 * @param {object} tx
 * @param {{ sesi: object, siswa: object }} r
 * @param {object} [siswa]
 */
function mulai(tx, r, siswa = r.siswa) {
  return layanan.mulaiSkrining(tx, {
    kode: r.sesi.kode,
    siswa_id: siswa.id,
    nama_responden: "Orang Tua Uji",
    nomor_hp_responden: "081234567890",
    hubungan_responden: "orang_tua",
    persetujuan: true
  });
}

/**
 * Menjawab satu butir Level 1.
 * @param {object} tx
 * @param {object} r
 * @param {string} token
 * @param {number} nomor_urut
 * @param {number} skor
 */
async function jawab(tx, r, token, nomor_urut, skor) {
  const p = r.level1.pertanyaan.find((x) => x.nomor_urut === nomor_urut);
  const opsi = p.opsi_jawaban.find((o) => o.skor === skor);
  assert.ok(opsi, `Butir ${nomor_urut} tidak memiliki opsi dengan skor ${skor}`);
  return layanan.simpanJawaban(tx, token, { pertanyaan_id: p.id, opsi_jawaban_id: opsi.id });
}

/**
 * Mengisi seluruh butir Level 1 (default skor 0 / Tidak ada gejala).
 * Nilai khusus per nomor butir dapat dilewatkan di parameter `khusus`.
 * @param {object} tx
 * @param {object} r
 * @param {string} token
 * @param {Record<number, number>} [khusus]
 */
async function isiPenuh(tx, r, token, khusus = {}) {
  for (const p of r.level1.pertanyaan) {
    const skor = khusus[p.nomor_urut] ?? 0;
    await jawab(tx, r, token, p.nomor_urut, skor);
  }
}

test("ALUR 1: Siswa memenuhi kriteria normal (semua skor aman) -> selesai di skrining awal", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);

    // Semua butir dijawab skor 0 (Tidak sama sekali / tidak ada indikasi masalah)
    await isiPenuh(tx, r, token);

    // Submit Skrining Awal
    const hasilSubmit = await layanan.submitLevel1(tx, token);

    // 1. Verifikasi respon submit skrining awal
    assert.equal(hasilSubmit.selesai, true, "Status percobaan harus selesai");
    assert.equal(hasilSubmit.status, "selesai", "Status harus 'selesai'");
    assert.equal(hasilSubmit.tindak_lanjut_tersedia, false, "Tidak boleh ada tindak lanjut");
    assert.equal(hasilSubmit.tindakLanjutTersedia, false, "Compatibility camelCase harus false");
    assert.equal(hasilSubmit.total_domain_terindikasi, 0, "Jumlah domain terindikasi harus 0");
    assert.equal(hasilSubmit.jumlah_instrumen_lanjutan, 0, "Jumlah instrumen lanjutan harus 0");
    assert.match(hasilSubmit.pesan, /selesai/i, "Pesan harus menyatakan skrining selesai");

    // 2. Verifikasi status database
    const dbHasil = await tx.hasil_skrining.findUnique({ where: { token } });
    assert.equal(dbHasil.selesai, true, "Record database harus selesai = true");
    assert.ok(dbHasil.waktu_selesai instanceof Date, "waktu_selesai harus tercatat");
    assert.ok(dbHasil.kesimpulan, "kesimpulan harus terisi");

    // Pastikan HANYA tes Level 1 yang tercatat, tidak ada penugasan instrumen Level 2
    const daftarTes = await tx.hasil_tes.findMany({ where: { hasil_skrining_id: dbHasil.id } });
    assert.equal(daftarTes.length, 1, "Hanya instrumen Level 1 yang terdaftar");
    assert.equal(daftarTes[0].tes_skrining_id, r.level1.id);
    assert.equal(daftarTes[0].selesai, true);

    // 3. Verifikasi dashboard tindak lanjut
    const dashboard = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dashboard.total_instrumen, 0, "Total instrumen tindak lanjut harus 0");
    assert.equal(dashboard.tindak_lanjut_tersedia, false, "Tindak lanjut tidak tersedia");
    assert.equal(dashboard.seluruh_selesai, true, "Seluruh skrining selesai");
    assert.equal(dashboard.persentase, 100, "Persentase 100%");
    assert.equal(dashboard.status_skrining, "selesai");
    assert.equal(dashboard.daftar_instrumen.length, 0);
  });
});

test("ALUR 2: Siswa belum memenuhi kriteria normal (terindikasi Inatensi) -> masuk ke tindak lanjut", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);

    // Butir 3 (Inatensi) berambang batas 1. Diisi skor 2 (indikasi ringan/sedang), butir lain skor 0.
    await isiPenuh(tx, r, token, { 3: 2 });

    // Submit Skrining Awal
    const hasilSubmit = await layanan.submitLevel1(tx, token);

    // 1. Verifikasi respon submit skrining awal
    assert.equal(hasilSubmit.selesai, false, "Status selesai harus false karena perlu tindak lanjut");
    assert.equal(hasilSubmit.status, "tindak_lanjut", "Status harus 'tindak_lanjut'");
    assert.equal(hasilSubmit.tindak_lanjut_tersedia, true, "Tindak lanjut harus tersedia");
    assert.equal(hasilSubmit.tindakLanjutTersedia, true, "Compatibility camelCase harus true");
    assert.equal(hasilSubmit.total_domain_terindikasi, 1, "Ada 1 domain terindikasi");
    assert.equal(hasilSubmit.jumlah_instrumen_lanjutan, 1, "Harus ditugaskan 1 instrumen lanjutan");
    assert.match(hasilSubmit.pesan, /bagian lanjutan/i);

    // 2. Verifikasi status database
    const dbHasil = await tx.hasil_skrining.findUnique({ where: { token } });
    assert.equal(dbHasil.selesai, false, "Record database belum selesai");
    assert.equal(dbHasil.waktu_selesai, null, "waktu_selesai masih null");

    // Harus ada 2 record tes: Level 1 (selesai) dan Level 2 Inatensi (belum selesai)
    const daftarTes = await tx.hasil_tes.findMany({
      where: { hasil_skrining_id: dbHasil.id },
      include: { tes_skrining: true }
    });
    assert.equal(daftarTes.length, 2);
    const lanjutan = daftarTes.find((t) => t.tes_skrining.level === 2);
    assert.ok(lanjutan, "Instrumen level 2 harus tercatat");
    assert.equal(lanjutan.tes_skrining.nama, "Instrumen Lanjutan Inatensi");
    assert.equal(lanjutan.selesai, false, "Instrumen level 2 belum selesai");

    // 3. Verifikasi dashboard tindak lanjut (status awal)
    const dashboard = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dashboard.total_instrumen, 1);
    assert.equal(dashboard.instrumen_selesai, 0);
    assert.equal(dashboard.tindak_lanjut_tersedia, true);
    assert.equal(dashboard.seluruh_selesai, false);
    assert.equal(dashboard.daftar_instrumen[0].status, "aktif", "Instrumen lanjutan harus berstatus aktif");

    // 4. Pengerjaan Soal Instrumen Lanjutan
    const idLanjutan = dashboard.daftar_instrumen[0].tes_skrining_id;
    const soalLanjutan = await layanan.getPertanyaanLanjutan(tx, token, idLanjutan);
    assert.ok(soalLanjutan.pertanyaan.length > 0);

    for (const p of soalLanjutan.pertanyaan) {
      await layanan.simpanJawaban(tx, token, {
        pertanyaan_id: p.id,
        opsi_jawaban_id: p.opsi_jawaban[0].id
      });
    }

    // 5. Submit Instrumen Lanjutan
    const hasilSubmitLanjutan = await layanan.submitLanjutan(tx, token, idLanjutan);
    assert.equal(hasilSubmitLanjutan.selesai, true, "Pengerjaan lanjutan harus selesai");
    assert.equal(hasilSubmitLanjutan.sisa_instrumen, 0, "Sisa instrumen lanjutan harus 0");

    // 6. Verifikasi final setelah seluruh tindak lanjut dikerjakan
    const dbHasilAkhir = await tx.hasil_skrining.findUnique({ where: { token } });
    assert.equal(dbHasilAkhir.selesai, true, "Record database sekarang harus selesai = true");
    assert.ok(dbHasilAkhir.waktu_selesai instanceof Date);

    const dashboardAkhir = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dashboardAkhir.seluruh_selesai, true, "Seluruh tindak lanjut selesai");
    assert.equal(dashboardAkhir.instrumen_selesai, 1);
    assert.equal(dashboardAkhir.persentase, 100);
  });
});

test("ALUR 3: Multi-domain terindikasi (Inatensi & Depresi) -> instrumen lanjutan dibuka berurutan", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);

    // Butir 3 (Inatensi, ambang 1) skor 1 & Butir 4 (Depresi, ambang 2) skor 2
    await isiPenuh(tx, r, token, { 3: 1, 4: 2 });

    const submitL1 = await layanan.submitLevel1(tx, token);
    assert.equal(submitL1.selesai, false);
    assert.equal(submitL1.total_domain_terindikasi, 2);
    assert.equal(submitL1.jumlah_instrumen_lanjutan, 2);

    // Dashboard awal: Instrumen pertama aktif, instrumen kedua terkunci
    const dash1 = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dash1.total_instrumen, 2);
    assert.equal(dash1.daftar_instrumen[0].status, "aktif");
    assert.equal(dash1.daftar_instrumen[1].status, "terkunci");

    // Mengerjakan instrumen pertama
    const idPertama = dash1.daftar_instrumen[0].tes_skrining_id;
    const soal1 = await layanan.getPertanyaanLanjutan(tx, token, idPertama);
    for (const p of soal1.pertanyaan) {
      await layanan.simpanJawaban(tx, token, {
        pertanyaan_id: p.id,
        opsi_jawaban_id: p.opsi_jawaban[0].id
      });
    }
    const submitP1 = await layanan.submitLanjutan(tx, token, idPertama);
    assert.equal(submitP1.selesai, false, "Masih ada 1 instrumen tersisa");
    assert.equal(submitP1.sisa_instrumen, 1);

    // Dashboard tengah: Instrumen pertama selesai, instrumen kedua sekarang aktif
    const dash2 = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dash2.daftar_instrumen[0].status, "selesai");
    assert.equal(dash2.daftar_instrumen[1].status, "aktif");

    // Mengerjakan instrumen kedua
    const idKedua = dash2.daftar_instrumen[1].tes_skrining_id;
    const soal2 = await layanan.getPertanyaanLanjutan(tx, token, idKedua);
    for (const p of soal2.pertanyaan) {
      await layanan.simpanJawaban(tx, token, {
        pertanyaan_id: p.id,
        opsi_jawaban_id: p.opsi_jawaban[0].id
      });
    }
    const submitP2 = await layanan.submitLanjutan(tx, token, idKedua);
    assert.equal(submitP2.selesai, true, "Semua instrumen telah tuntas");
    assert.equal(submitP2.sisa_instrumen, 0);

    // Dashboard akhir: 100% selesai
    const dash3 = await layanan.getDashboardTindakLanjut(tx, token);
    assert.equal(dash3.seluruh_selesai, true);
    assert.equal(dash3.persentase, 100);
  });
});

test("ALUR 4: Domain terindikasi tanpa instrumen Level 2 -> selesai di awal dan dicatat untuk pihak sekolah", async () => {
  await dalamTransaksiBatal(async (tx) => {
    const r = await siapkan(tx);
    const { token } = await mulai(tx, r);

    // Butir 1 (Somatik, ambang 2) diisi skor 3. Somatik tidak punya instrumen lanjutan (tes_skrining_id: null).
    await isiPenuh(tx, r, token, { 1: 3 });

    const submitL1 = await layanan.submitLevel1(tx, token);

    // Domain terindikasi ada 1, tetapi jumlah instrumen lanjutan 0
    assert.equal(submitL1.total_domain_terindikasi, 1);
    assert.equal(submitL1.jumlah_instrumen_lanjutan, 0);
    assert.equal(submitL1.selesai, true, "Selesai di awal karena tidak ada tes Level 2 untuk domain ini");
    assert.equal(submitL1.tindak_lanjut_tersedia, false);

    // Hasil per-domain tetap tersimpan untuk sekolah di tabel hasil_kategori
    const dbHasil = await tx.hasil_skrining.findUnique({ where: { token } });
    const kategori = await tx.hasil_kategori.findMany({
      where: { hasil_skrining_id: dbHasil.id },
      include: { kategori_asesmen: true }
    });
    const somatik = kategori.find((k) => k.kategori_asesmen.nama === "Somatik");
    assert.equal(somatik.terindikasi, true, "Somatik harus tetap tercatat terindikasi");
    assert.equal(somatik.skor_tertinggi, 3);
  });
});
