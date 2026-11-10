/**
 * Layanan Fitur Kelola Sekolah untuk Super Admin.
 * Menangani operasi Create, Read, dan Update (CRU) data sekolah dan akun admin sekolah.
 */

import bcrypt from "bcrypt";
import AppError from "../../utils/appError.js";

/**
 * Menghasilkan 8-digit NPSN unik acak bila tidak disediakan oleh klien.
 * @param {object} db Prisma client / transaction
 * @returns {Promise<string>}
 */
async function buatNpsnUnik(db) {
  for (let i = 0; i < 20; i++) {
    const kandidat = String(Math.floor(10000000 + Math.random() * 90000000));
    const ada = await db.sekolah.findUnique({ where: { npsn: kandidat } });
    if (!ada) return kandidat;
  }
  throw AppError.badRequest("Gagal membuat NPSN unik otomatis. Silakan masukkan NPSN secara manual.");
}

/**
 * Menghasilkan username unik dari email atau nama sekolah bila tidak disediakan.
 * @param {object} db Prisma client / transaction
 * @param {string} email
 * @param {string} nama
 * @returns {Promise<string>}
 */
async function buatUsernameUnik(db, email, nama) {
  let basis = (email.split("@")[0] || nama || "sekolah")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);

  if (basis.length < 3) {
    basis = "sekolah";
  }

  let kandidat = basis;
  let counter = 1;

  while (await db.sekolah.findUnique({ where: { username: kandidat } })) {
    const akhiran = `_${counter}`;
    kandidat = `${basis.slice(0, 50 - akhiran.length)}${akhiran}`;
    counter++;
  }

  return kandidat;
}

/**
 * Format objek sekolah untuk respon klien (menghapus password_hash dan merapikan total_sesi).
 * @param {object} s Baris sekolah dari database
 */
function formatSekolah(s) {
  return {
    id: s.id,
    npsn: s.npsn,
    nama: s.nama,
    email: s.email,
    username: s.username,
    alamat: s.alamat ?? null,
    kontak_telepon: s.kontak_telepon ?? null,
    aktif: s.aktif,
    total_sesi: s._count?.sesi_skrining ?? 0,
    created_at: s.created_at,
    updated_at: s.updated_at
  };
}

/**
 * Mendapatkan daftar sekolah dengan paginasi, filter status, pencarian, dan pengurutan.
 *
 * @param {object} db Prisma client / transaction
 * @param {{
 *   page: number,
 *   limit: number,
 *   search?: string,
 *   status?: boolean,
 *   sortBy: "nama" | "created_at" | "total_sesi",
 *   sortOrder: "asc" | "desc"
 * }} params
 */
export async function getDaftarSekolah(db, {
  page = 1,
  limit = 10,
  search,
  status,
  sortBy = "created_at",
  sortOrder = "desc"
}) {
  const where = {};

  if (status !== undefined) {
    where.aktif = status;
  }

  if (search) {
    where.OR = [
      { nama: { contains: search } },
      { email: { contains: search } },
      { npsn: { contains: search } },
      { username: { contains: search } }
    ];
  }

  const total = await db.sekolah.count({ where });

  let orderBy;
  if (sortBy === "nama") {
    orderBy = { nama: sortOrder };
  } else if (sortBy === "total_sesi") {
    orderBy = { sesi_skrining: { _count: sortOrder } };
  } else {
    orderBy = { created_at: sortOrder };
  }

  const skip = (page - 1) * limit;
  const items = await db.sekolah.findMany({
    where,
    include: {
      _count: {
        select: { sesi_skrining: true }
      }
    },
    skip,
    take: limit,
    orderBy
  });

  return {
    items: items.map(formatSekolah),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

/**
 * Mendapatkan data detail satu sekolah berdasarkan ID.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} id ID sekolah
 */
export async function getDetailSekolah(db, id) {
  const sekolah = await db.sekolah.findUnique({
    where: { id },
    include: {
      _count: {
        select: { sesi_skrining: true }
      }
    }
  });

  if (!sekolah) {
    throw AppError.notFound("Data sekolah tidak ditemukan.");
  }

  return formatSekolah(sekolah);
}

/**
 * Menambahkan sekolah baru beserta akun admin sekolah.
 *
 * @param {object} db Prisma client / transaction
 * @param {{
 *   nama: string,
 *   email: string,
 *   password: string,
 *   aktif?: boolean,
 *   npsn?: string,
 *   username?: string,
 *   alamat?: string | null,
 *   kontak_telepon?: string | null
 * }} data
 */
export async function tambahSekolah(db, data) {
  // 1. Cek keunikan email di tabel sekolah
  const emailAdaDiSekolah = await db.sekolah.findUnique({
    where: { email: data.email }
  });
  if (emailAdaDiSekolah) {
    throw AppError.conflict("Email admin sekolah sudah terdaftar.");
  }

  // 2. Cek keunikan email di tabel super_admin
  const superAdminModel = db.super_admin || db.superAdmin;
  if (superAdminModel && typeof superAdminModel.findUnique === "function") {
    const emailAdaDiAdmin = await superAdminModel.findUnique({
      where: { email: data.email }
    });
    if (emailAdaDiAdmin) {
      throw AppError.conflict("Email sudah digunakan oleh akun Super Admin.");
    }
  }

  // 3. Tentukan NPSN (jika diisi periksa keunikan, jika belum buat otomatis)
  let npsn = data.npsn;
  if (npsn) {
    const npsnAda = await db.sekolah.findUnique({ where: { npsn } });
    if (npsnAda) {
      throw AppError.conflict("NPSN sudah terdaftar pada sekolah lain.");
    }
  } else {
    npsn = await buatNpsnUnik(db);
  }

  // 4. Tentukan Username (jika diisi periksa keunikan, jika belum buat otomatis dari email/nama)
  let username = data.username;
  if (username) {
    const usernameAda = await db.sekolah.findUnique({ where: { username } });
    if (usernameAda) {
      throw AppError.conflict("Username sudah digunakan oleh akun lain.");
    }
  } else {
    username = await buatUsernameUnik(db, data.email, data.nama);
  }

  // 5. Hash password dengan bcrypt
  const password_hash = await bcrypt.hash(data.password, 10);

  // 6. Simpan baris sekolah baru
  const baru = await db.sekolah.create({
    data: {
      npsn,
      nama: data.nama,
      email: data.email,
      username,
      password_hash,
      alamat: data.alamat ?? null,
      kontak_telepon: data.kontak_telepon ?? null,
      aktif: data.aktif !== undefined ? Boolean(data.aktif) : true
    },
    include: {
      _count: {
        select: { sesi_skrining: true }
      }
    }
  });

  return formatSekolah(baru);
}

/**
 * Memperbarui data sekolah yang sudah ada.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} id ID sekolah
 * @param {{
 *   nama?: string,
 *   email?: string,
 *   password?: string,
 *   aktif?: boolean,
 *   npsn?: string,
 *   username?: string,
 *   alamat?: string | null,
 *   kontak_telepon?: string | null
 * }} data
 */
export async function updateSekolah(db, id, data) {
  // 1. Verifikasi sekolah ada
  const existing = await db.sekolah.findUnique({
    where: { id }
  });

  if (!existing) {
    throw AppError.notFound("Data sekolah tidak ditemukan.");
  }

  const updateData = {};

  // 2. Jika email diubah, periksa keunikan
  if (data.email && data.email !== existing.email) {
    const emailAdaDiSekolah = await db.sekolah.findFirst({
      where: { email: data.email, NOT: { id } }
    });
    if (emailAdaDiSekolah) {
      throw AppError.conflict("Email sudah digunakan oleh sekolah lain.");
    }

    const superAdminModel = db.super_admin || db.superAdmin;
    if (superAdminModel && typeof superAdminModel.findUnique === "function") {
      const emailAdaDiAdmin = await superAdminModel.findUnique({
        where: { email: data.email }
      });
      if (emailAdaDiAdmin) {
        throw AppError.conflict("Email sudah digunakan oleh akun Super Admin.");
      }
    }

    updateData.email = data.email;
  }

  // 3. Jika NPSN diubah, periksa keunikan
  if (data.npsn && data.npsn !== existing.npsn) {
    const npsnAda = await db.sekolah.findFirst({
      where: { npsn: data.npsn, NOT: { id } }
    });
    if (npsnAda) {
      throw AppError.conflict("NPSN sudah terdaftar pada sekolah lain.");
    }
    updateData.npsn = data.npsn;
  }

  // 4. Jika username diubah, periksa keunikan
  if (data.username && data.username !== existing.username) {
    const usernameAda = await db.sekolah.findFirst({
      where: { username: data.username, NOT: { id } }
    });
    if (usernameAda) {
      throw AppError.conflict("Username sudah digunakan oleh akun lain.");
    }
    updateData.username = data.username;
  }

  if (data.nama !== undefined) {
    updateData.nama = data.nama;
  }

  if (data.aktif !== undefined) {
    updateData.aktif = Boolean(data.aktif);
  }

  if (data.alamat !== undefined) {
    updateData.alamat = data.alamat;
  }

  if (data.kontak_telepon !== undefined) {
    updateData.kontak_telepon = data.kontak_telepon;
  }

  // 5. Ganti password jika diisi dan bukan string kosong
  if (data.password && typeof data.password === "string" && data.password.trim() !== "") {
    updateData.password_hash = await bcrypt.hash(data.password.trim(), 10);
  }

  // 6. Jalankan update di database
  const updated = await db.sekolah.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { sesi_skrining: true }
      }
    }
  });

  return formatSekolah(updated);
}
