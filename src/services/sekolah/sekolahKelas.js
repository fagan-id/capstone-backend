/**
 * Layanan Kelas untuk akun Sekolah.
 * Setiap query difilter sekolah_id dari token; kelas sekolah lain diperlakukan sebagai tidak ada (404).
 */

import AppError from "../../utils/appError.js";

const PESAN_DUPLIKAT = "Kelas dengan nama tersebut sudah ada pada tahun ajaran ini.";
const PESAN_ADA_SISWA = "Kelas masih memiliki siswa.";

/** Menghapus sekolah_id dari respon dan menambahkan jumlah_siswa. */
function formatKelas(k) {
  return {
    id: k.id,
    nama: k.nama,
    tingkat: k.tingkat,
    tahun_ajaran: k.tahun_ajaran,
    jumlah_siswa: k._count?.siswa ?? 0,
    created_at: k.created_at,
    updated_at: k.updated_at
  };
}

async function cariKelas(db, sekolahId, id) {
  const kelas = await db.kelas.findFirst({ where: { id, sekolah_id: sekolahId } });
  if (!kelas) throw AppError.notFound("Kelas tidak ditemukan.");
  return kelas;
}

/** Mengubah pelanggaran unique [sekolah_id, tahun_ajaran, nama] menjadi 409. */
function tanganiDuplikat(err) {
  if (err.code === "P2002") throw AppError.conflict(PESAN_DUPLIKAT);
  throw err;
}

/**
 * @param {object} db Prisma client / transaction
 * @param {number} sekolahId
 * @param {{ tahun_ajaran?: string, tingkat?: number }} filter
 */
export async function getDaftarKelas(db, sekolahId, { tahun_ajaran, tingkat } = {}) {
  const where = { sekolah_id: sekolahId };
  if (tahun_ajaran !== undefined) where.tahun_ajaran = tahun_ajaran;
  if (tingkat !== undefined) where.tingkat = tingkat;

  const items = await db.kelas.findMany({
    where,
    include: { _count: { select: { siswa: true } } },
    orderBy: [{ tingkat: "asc" }, { nama: "asc" }]
  });
  return items.map(formatKelas);
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {{ nama: string, tingkat: number, tahun_ajaran: string }} data
 */
export async function tambahKelas(db, sekolahId, data) {
  const ada = await db.kelas.findFirst({
    where: { sekolah_id: sekolahId, nama: data.nama, tahun_ajaran: data.tahun_ajaran }
  });
  if (ada) throw AppError.conflict(PESAN_DUPLIKAT);

  try {
    const baru = await db.kelas.create({ data: { sekolah_id: sekolahId, ...data } });
    return formatKelas(baru);
  } catch (err) {
    return tanganiDuplikat(err);
  }
}

/**
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 * @param {{ nama?: string, tingkat?: number, tahun_ajaran?: string }} data
 */
export async function updateKelas(db, sekolahId, id, data) {
  const lama = await cariKelas(db, sekolahId, id);

  const nama = data.nama ?? lama.nama;
  const tahun_ajaran = data.tahun_ajaran ?? lama.tahun_ajaran;
  if (nama !== lama.nama || tahun_ajaran !== lama.tahun_ajaran) {
    const bentrok = await db.kelas.findFirst({
      where: { sekolah_id: sekolahId, nama, tahun_ajaran, NOT: { id } }
    });
    if (bentrok) throw AppError.conflict(PESAN_DUPLIKAT);
  }

  try {
    const baru = await db.kelas.update({
      where: { id },
      data,
      include: { _count: { select: { siswa: true } } }
    });
    return formatKelas(baru);
  } catch (err) {
    return tanganiDuplikat(err);
  }
}

/**
 * Menghapus kelas kosong. Kelas yang masih punya siswa ditolak 409.
 * @param {object} db
 * @param {number} sekolahId
 * @param {number} id
 */
export async function hapusKelas(db, sekolahId, id) {
  await cariKelas(db, sekolahId, id);

  if ((await db.siswa.count({ where: { kelas_id: id } })) > 0) {
    throw AppError.conflict(PESAN_ADA_SISWA);
  }

  try {
    await db.kelas.delete({ where: { id } });
  } catch (err) {
    // Siswa ditambahkan di antara count dan delete: FK Restrict menolak.
    if (err.code === "P2003") throw AppError.conflict(PESAN_ADA_SISWA);
    throw err;
  }
}
