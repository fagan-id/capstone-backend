/**
 * Data Seed Akun Demo.
 * buatDataSeed menyiapkan data (password di-hash bcrypt), jalankanSeed menyimpannya dengan upsert.
 */

import bcrypt from "bcryptjs";

/**
 * Menyiapkan data seed demo dari environment.
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<{
 *   superAdmin: { nama: string, email: string, password_hash: string },
 *   sekolah: { npsn: string, nama: string, alamat: string, email: string, username: string, password_hash: string },
 *   kelas: { nama: string, tingkat: number, tahun_ajaran: string },
 *   siswa: Array<{ nisn: string, nama: string, tanggal_lahir: Date, jenis_kelamin: "L"|"P" }>
 * }>}
 */
export async function buatDataSeed(env) {
  if (env.NODE_ENV === "production") {
    throw new Error("Seed tidak boleh dijalankan saat NODE_ENV=production.");
  }
  const password = env.SEED_PASSWORD;
  if (password === undefined || password.trim() === "") {
    throw new Error("SEED_PASSWORD belum diisi. Tambahkan SEED_PASSWORD di .env (minimal 8 karakter).");
  }
  if (password.trim() === "ganti_password_seed_ini") {
    throw new Error("SEED_PASSWORD masih memakai contoh dari .env.example. Ganti dengan password sendiri.");
  }
  if (password.length < 8) {
    throw new Error("SEED_PASSWORD minimal 8 karakter.");
  }

  const password_hash = await bcrypt.hash(password, 10);

  return {
    superAdmin: { nama: "Super Admin Demo", email: "superadmin@demo.test", password_hash },
    sekolah: {
      npsn: "00000001",
      nama: "SD Demo",
      alamat: "Jl. Contoh No. 1",
      email: "sekolah@demo.test",
      username: "sd_demo",
      password_hash
    },
    kelas: { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" },
    siswa: [
      { nisn: "0000000001", nama: "Siswa Demo Satu", tanggal_lahir: new Date("2017-03-14"), jenis_kelamin: "L" },
      { nisn: "0000000002", nama: "Siswa Demo Dua", tanggal_lahir: new Date("2017-08-02"), jenis_kelamin: "P" }
    ]
  };
}

/**
 * Menyimpan data seed. Aman dijalankan berulang: baris yang sudah ada tidak diubah.
 * @param {object} db Prisma client atau transaction client
 * @param {Awaited<ReturnType<typeof buatDataSeed>>} data
 * @returns {Promise<void>}
 */
export async function jalankanSeed(db, data) {
  await db.super_admin.upsert({ where: { email: data.superAdmin.email }, update: {}, create: data.superAdmin });

  const sekolah = await db.sekolah.upsert({ where: { npsn: data.sekolah.npsn }, update: {}, create: data.sekolah });

  const kelas = await db.kelas.upsert({
    where: {
      sekolah_id_tahun_ajaran_nama: {
        sekolah_id: sekolah.id,
        tahun_ajaran: data.kelas.tahun_ajaran,
        nama: data.kelas.nama
      }
    },
    update: {},
    create: { ...data.kelas, sekolah_id: sekolah.id }
  });

  for (const siswa of data.siswa) {
    await db.siswa.upsert({
      where: { nisn: siswa.nisn },
      update: {},
      create: { ...siswa, sekolah_id: sekolah.id, kelas_id: kelas.id }
    });
  }
}
