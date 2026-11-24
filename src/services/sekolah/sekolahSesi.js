/**
 * Layanan Sesi Skrining untuk akun Sekolah (dan "akhiri" untuk Super Admin).
 * Setiap query difilter sekolah_id dari token; sesi sekolah lain diperlakukan sebagai tidak ada (404).
 */

import { randomInt } from "node:crypto";
import AppError from "../../utils/appError.js";

// Tanpa 0/O dan 1/I/L agar kode tidak salah dibaca orang tua.
const HURUF_KODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PANJANG_KODE = 6;
const MAKS_PERCOBAAN_KODE = 5;
const WIB_MS = 7 * 60 * 60 * 1000;

const PESAN_TIDAK_ADA = "Sesi skrining tidak ditemukan.";
const PESAN_ADA_PESERTA = "Sesi sudah memiliki peserta dan tidak dapat dihapus.";
const INCLUDE_TES = { tes_skrining: { select: { id: true, nama: true } } };

function formatSesi(s) {
  return {
    id: s.id,
    nama: s.nama,
    kode: s.kode,
    status: s.status,
    tanggal_pelaksanaan: s.tanggal_pelaksanaan.toISOString().slice(0, 10),
    tes: s.tes_skrining,
    created_at: s.created_at,
    updated_at: s.updated_at
  };
}

async function cariSesi(db, sekolahId, id) {
  const sesi = await db.sesi_skrining.findFirst({ where: { id, sekolah_id: sekolahId }, include: INCLUDE_TES });
  if (!sesi) throw AppError.notFound(PESAN_TIDAK_ADA);
  return sesi;
}

/** @returns {string} */
export function buatKodeSesi() {
  let kode = "";
  for (let i = 0; i < PANJANG_KODE; i++) kode += HURUF_KODE[randomInt(HURUF_KODE.length)];
  return kode;
}

/**
 * Tes Level 1 aktif untuk pilihan saat membuat sesi.
 * @param {object} db
 */
export async function getDaftarTes(db) {
  return db.tes_skrining.findMany({
    where: { level: 1, aktif: true },
    select: { id: true, nama: true, jenjang: true, deskripsi: true },
    orderBy: [{ nama: "asc" }, { id: "asc" }]
  });
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {{ page: number, limit: number, status?: "aktif" | "selesai" }} params
 */
export async function getDaftarSesi(db, sekolahId, { page = 1, limit = 10, status }) {
  const where = { sekolah_id: sekolahId };
  if (status) where.status = status;

  const total = await db.sesi_skrining.count({ where });
  const items = await db.sesi_skrining.findMany({
    where,
    include: { ...INCLUDE_TES, _count: { select: { hasil_skrining: true } } },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip: (page - 1) * limit,
    take: limit
  });

  const selesai = items.length
    ? await db.hasil_skrining.groupBy({
        by: ["sesi_skrining_id"],
        where: { sesi_skrining_id: { in: items.map((s) => s.id) }, selesai: true },
        _count: { _all: true }
      })
    : [];
  const selesaiPerSesi = new Map(selesai.map((g) => [g.sesi_skrining_id, g._count._all]));

  return {
    items: items.map((s) => ({
      ...formatSesi(s),
      jumlah_peserta: s._count.hasil_skrining,
      jumlah_selesai: selesaiPerSesi.get(s.id) ?? 0
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
  };
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 */
export async function getDetailSesi(db, sekolahId, id) {
  const sesi = await cariSesi(db, sekolahId, id);
  const [jumlah_peserta, jumlah_selesai] = await Promise.all([
    db.hasil_skrining.count({ where: { sesi_skrining_id: id } }),
    db.hasil_skrining.count({ where: { sesi_skrining_id: id, selesai: true } })
  ]);
  return { ...formatSesi(sesi), jumlah_peserta, jumlah_selesai, jumlah_belum_selesai: jumlah_peserta - jumlah_selesai };
}

/**
 * Sesi langsung aktif; tanggal_pelaksanaan = tanggal hari ini menurut WIB.
 * @param {object} db
 * @param {number} sekolahId
 * @param {{ nama: string, tes_skrining_id: number }} data
 * @param {Date} [sekarang] Disuntikkan oleh test.
 */
export async function tambahSesi(db, sekolahId, data, sekarang = new Date()) {
  const tes = await db.tes_skrining.findUnique({ where: { id: data.tes_skrining_id } });
  if (!tes || tes.level !== 1 || !tes.aktif) {
    throw AppError.badRequest("Tes skrining tidak valid. Pilih tes skrining awal yang aktif.");
  }

  const tanggal_pelaksanaan = new Date(`${new Date(sekarang.getTime() + WIB_MS).toISOString().slice(0, 10)}T00:00:00Z`);

  for (let percobaan = 1; ; percobaan++) {
    try {
      const baru = await db.sesi_skrining.create({
        data: {
          sekolah_id: sekolahId,
          nama: data.nama,
          tes_skrining_id: data.tes_skrining_id,
          kode: buatKodeSesi(),
          tanggal_pelaksanaan,
          status: "aktif"
        },
        include: INCLUDE_TES
      });
      return formatSesi(baru);
    } catch (err) {
      // Satu-satunya kolom unik yang diisi di sini adalah kode.
      if (err.code !== "P2002" || percobaan >= MAKS_PERCOBAAN_KODE) throw err;
    }
  }
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 * @param {{ nama: string }} data
 */
export async function updateSesi(db, sekolahId, id, data) {
  await cariSesi(db, sekolahId, id);
  const baru = await db.sesi_skrining.update({ where: { id }, data: { nama: data.nama }, include: INCLUDE_TES });
  return formatSesi(baru);
}

/**
 * "Akhiri Sesi Skrining": aktif → selesai, tidak bisa dibuka lagi.
 * Peserta yang sudah memegang token tetap bisa menyelesaikan pengisiannya.
 * @param {object} db
 * @param {number | null} sekolahId null = Super Admin (sesi sekolah mana pun).
 * @param {number} id
 */
export async function akhiriSesi(db, sekolahId, id) {
  const milik = sekolahId == null ? {} : { sekolah_id: sekolahId };
  // updateMany bersyarat status agar dua klik bersamaan tidak sama-sama "berhasil".
  const { count } = await db.sesi_skrining.updateMany({ where: { id, status: "aktif", ...milik }, data: { status: "selesai" } });

  const sesi = await db.sesi_skrining.findFirst({ where: { id, ...milik }, include: INCLUDE_TES });
  if (!sesi) throw AppError.notFound(PESAN_TIDAK_ADA);
  if (count === 0) throw AppError.conflict("Sesi skrining sudah diakhiri.");
  return formatSesi(sesi);
}

/**
 * Hanya sesi tanpa peserta yang boleh dihapus.
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 */
export async function hapusSesi(db, sekolahId, id) {
  await cariSesi(db, sekolahId, id);

  if ((await db.hasil_skrining.count({ where: { sesi_skrining_id: id } })) > 0) {
    throw AppError.conflict(PESAN_ADA_PESERTA);
  }

  try {
    await db.sesi_skrining.delete({ where: { id } });
  } catch (err) {
    // Orang tua memulai skrining di antara count dan delete: FK Restrict menolak.
    if (err.code === "P2003") throw AppError.conflict(PESAN_ADA_PESERTA);
    throw err;
  }
}
