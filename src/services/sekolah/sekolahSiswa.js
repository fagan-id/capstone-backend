/**
 * Layanan Siswa untuk akun Sekolah.
 * Setiap query difilter sekolah_id dari token; siswa atau kelas sekolah lain diperlakukan sebagai tidak ada (404).
 */

import AppError from "../../utils/appError.js";

// NISN unik se-sistem (D22); pesan sengaja tidak menyebut sekolah pemiliknya.
const PESAN_NISN = "NISN sudah terdaftar.";
const PESAN_ADA_HASIL = "Siswa sudah memiliki riwayat skrining dan tidak dapat dihapus.";

const INCLUDE_KELAS = { kelas: { select: { id: true, nama: true, tahun_ajaran: true } } };

function formatSiswa(s) {
  return {
    id: s.id,
    nisn: s.nisn,
    nama: s.nama,
    tanggal_lahir: s.tanggal_lahir.toISOString().slice(0, 10),
    jenis_kelamin: s.jenis_kelamin,
    kelas: s.kelas,
    created_at: s.created_at,
    updated_at: s.updated_at
  };
}

async function cariSiswa(db, sekolahId, id) {
  const siswa = await db.siswa.findFirst({ where: { id, sekolah_id: sekolahId }, include: INCLUDE_KELAS });
  if (!siswa) throw AppError.notFound("Siswa tidak ditemukan.");
  return siswa;
}

async function pastikanKelasMilikSekolah(db, sekolahId, kelasId) {
  const kelas = await db.kelas.findFirst({ where: { id: kelasId, sekolah_id: sekolahId } });
  if (!kelas) throw AppError.notFound("Kelas tidak ditemukan.");
}

/** Balapan setelah cek awal: unique NISN (P2002) atau FK komposit kelas (P2003). */
function tanganiErrorTulis(err) {
  if (err.code === "P2002") throw AppError.conflict(PESAN_NISN);
  if (err.code === "P2003") throw AppError.notFound("Kelas tidak ditemukan.");
  throw err;
}

/**
 * @param {object} db Prisma client / transaction
 * @param {number} sekolahId
 * @param {{ page: number, limit: number, search?: string, kelas_id?: number }} params
 */
export async function getDaftarSiswa(db, sekolahId, { page = 1, limit = 10, search, kelas_id }) {
  const where = { sekolah_id: sekolahId };
  if (kelas_id !== undefined) where.kelas_id = kelas_id;
  if (search) where.OR = [{ nama: { contains: search } }, { nisn: { contains: search } }];

  const total = await db.siswa.count({ where });
  const items = await db.siswa.findMany({
    where,
    include: INCLUDE_KELAS,
    orderBy: [{ nama: "asc" }, { id: "asc" }],
    skip: (page - 1) * limit,
    take: limit
  });

  return {
    items: items.map(formatSiswa),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
  };
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 */
export async function getDetailSiswa(db, sekolahId, id) {
  return formatSiswa(await cariSiswa(db, sekolahId, id));
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {{ nisn: string, nama: string, tanggal_lahir: Date, jenis_kelamin: "L" | "P", kelas_id: number }} data
 */
export async function tambahSiswa(db, sekolahId, data) {
  await pastikanKelasMilikSekolah(db, sekolahId, data.kelas_id);

  if (await db.siswa.findUnique({ where: { nisn: data.nisn } })) {
    throw AppError.conflict(PESAN_NISN);
  }

  try {
    const baru = await db.siswa.create({ data: { ...data, sekolah_id: sekolahId }, include: INCLUDE_KELAS });
    return formatSiswa(baru);
  } catch (err) {
    return tanganiErrorTulis(err);
  }
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 * @param {Partial<{ nisn: string, nama: string, tanggal_lahir: Date, jenis_kelamin: "L" | "P", kelas_id: number }>} data
 */
export async function updateSiswa(db, sekolahId, id, data) {
  const lama = await cariSiswa(db, sekolahId, id);

  if (data.kelas_id !== undefined && data.kelas_id !== lama.kelas_id) {
    await pastikanKelasMilikSekolah(db, sekolahId, data.kelas_id);
  }

  if (data.nisn !== undefined && data.nisn !== lama.nisn) {
    if (await db.siswa.findFirst({ where: { nisn: data.nisn, NOT: { id } } })) {
      throw AppError.conflict(PESAN_NISN);
    }
  }

  try {
    const baru = await db.siswa.update({ where: { id }, data, include: INCLUDE_KELAS });
    return formatSiswa(baru);
  } catch (err) {
    return tanganiErrorTulis(err);
  }
}

/**
 * Hard delete (D24). Siswa yang sudah pernah diskrining ditolak 409 (A13).
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 */
export async function hapusSiswa(db, sekolahId, id) {
  await cariSiswa(db, sekolahId, id);

  if ((await db.hasil_skrining.count({ where: { siswa_id: id } })) > 0) {
    throw AppError.conflict(PESAN_ADA_HASIL);
  }

  try {
    await db.siswa.delete({ where: { id } });
  } catch (err) {
    // Orang tua memulai skrining di antara count dan delete: FK Restrict menolak.
    if (err.code === "P2003") throw AppError.conflict(PESAN_ADA_HASIL);
    throw err;
  }
}
