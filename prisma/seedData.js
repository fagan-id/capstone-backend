/**
 * Data Seed Akun + Instrumen Skrining Demo.
 * buatDataSeed menyiapkan data (password di-hash bcrypt), jalankanSeed menyimpannya dengan upsert.
 *
 * shortcut: isi instrumen masih contoh (4 domain, 5 butir level 1), bukan DSM-5 lengkap 12 domain.
 * Naikkan saat tim mengisi pemetaan butir ke domain dan ambang batas sebenarnya.
 */

import bcrypt from "bcryptjs";

/** Skala 0–4 untuk butir skrining awal. */
const OPSI_SKALA = [
  { label: "0", teks: "Tidak sama sekali", skor: 0, urutan: 1 },
  { label: "1", teks: "Sangat ringan", skor: 1, urutan: 2 },
  { label: "2", teks: "Ringan", skor: 2, urutan: 3 },
  { label: "3", teks: "Sedang", skor: 3, urutan: 4 },
  { label: "4", teks: "Berat", skor: 4, urutan: 5 }
];

/** "Tidak tahu" disetarakan dengan "Ya" agar tetap ditindaklanjuti. */
const OPSI_YA_TIDAK = [
  { label: "T", teks: "Tidak", skor: 0, urutan: 1 },
  { label: "Y", teks: "Ya", skor: 2, urutan: 2 },
  { label: "TT", teks: "Tidak tahu", skor: 2, urutan: 3 }
];

const NAMA_LEVEL_1 = "Skrining Awal";
const NAMA_LANJUTAN_INATENSI = "Instrumen Lanjutan Inatensi";
const NAMA_LANJUTAN_DEPRESI = "Instrumen Lanjutan Depresi";

/** Domain DSM-5. Ambang 1 untuk inatensi dan psikosis, 2 untuk domain lainnya. */
const KATEGORI = [
  {
    nama: "Somatik",
    ambang_batas: 2,
    urutan: 1,
    tes_nama: null,
    deskripsi: "Keluhan fisik tanpa sebab medis yang jelas.",
    rekomendasi: "Pantau keluhan dan catat pemicunya bersama guru kelas."
  },
  {
    nama: "Inatensi",
    ambang_batas: 1,
    urutan: 2,
    tes_nama: NAMA_LANJUTAN_INATENSI,
    deskripsi: "Kesulitan memusatkan dan mempertahankan perhatian.",
    rekomendasi: "Lanjutkan ke instrumen tindak lanjut inatensi."
  },
  {
    nama: "Depresi",
    ambang_batas: 2,
    urutan: 3,
    tes_nama: NAMA_LANJUTAN_DEPRESI,
    deskripsi: "Suasana hati menurun dan kehilangan minat.",
    rekomendasi: "Lanjutkan ke instrumen tindak lanjut depresi."
  },
  {
    nama: "Ide Menyakiti Diri",
    ambang_batas: 2,
    urutan: 4,
    tes_nama: null,
    deskripsi: "Pikiran atau upaya menyakiti diri sendiri.",
    rekomendasi: "Hubungi orang tua dan tenaga profesional secepatnya."
  }
];

/**
 * @param {number} nomor_urut
 * @param {string} kategori_nama
 * @param {string} teks
 * @param {"skala"|"ya_tidak"} [tipe_jawaban]
 */
function butir(nomor_urut, kategori_nama, teks, tipe_jawaban = "skala") {
  return {
    nomor_urut,
    kategori_nama,
    teks,
    tipe_jawaban,
    opsi: tipe_jawaban === "ya_tidak" ? OPSI_YA_TIDAK : OPSI_SKALA
  };
}

const TES = [
  {
    nama: NAMA_LEVEL_1,
    level: 1,
    jenjang: "SD",
    deskripsi: "Selama DUA (2) MINGGU terakhir, seberapa sering anak Anda mengalami hal berikut?",
    pertanyaan: [
      butir(1, "Somatik", "Mengeluhkan sakit perut, sakit kepala, atau nyeri lainnya?"),
      butir(2, "Somatik", "Mudah lelah atau merasa tidak bertenaga?"),
      butir(3, "Inatensi", "Mengalami kesulitan memusatkan perhatian pada tugas sekolah?"),
      butir(4, "Depresi", "Merasa sedih, murung, atau putus asa?"),
      butir(5, "Ide Menyakiti Diri", "Pernah menyampaikan keinginan menyakiti diri sendiri?", "ya_tidak")
    ]
  },
  {
    nama: NAMA_LANJUTAN_INATENSI,
    level: 2,
    jenjang: "SD",
    deskripsi: "Pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir.",
    pertanyaan: [
      butir(1, "Inatensi", "Sering tampak tidak mendengarkan ketika diajak berbicara langsung?"),
      butir(2, "Inatensi", "Sering kehilangan barang keperluan sekolah?")
    ]
  },
  {
    nama: NAMA_LANJUTAN_DEPRESI,
    level: 2,
    jenjang: "SD",
    deskripsi: "Pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir.",
    pertanyaan: [
      butir(1, "Depresi", "Tidak lagi menikmati hal-hal yang biasanya disukai?"),
      butir(2, "Depresi", "Mengalami perubahan nafsu makan atau pola tidur?")
    ]
  }
];

/**
 * Menyiapkan data seed demo dari environment.
 * @param {Record<string, string|undefined>} env
 * @returns {Promise<{
 *   superAdmin: { nama: string, email: string, password_hash: string },
 *   sekolah: { npsn: string, nama: string, alamat: string, email: string, username: string, password_hash: string, kontak_telepon: string },
 *   kelas: { nama: string, tingkat: number, tahun_ajaran: string },
 *   siswa: Array<{ nisn: string, nama: string, tanggal_lahir: Date, jenis_kelamin: "L"|"P" }>,
 *   kategori: typeof KATEGORI,
 *   tes: typeof TES,
 *   sesi: { nama: string, kode: string, tanggal_pelaksanaan: Date, status: "aktif" }
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
      password_hash,
      kontak_telepon: "0274-000001"
    },
    kelas: { nama: "4A", tingkat: 4, tahun_ajaran: "2026/2027" },
    siswa: [
      { nisn: "0000000001", nama: "Siswa Demo Satu", tanggal_lahir: new Date("2017-03-14"), jenis_kelamin: "L" },
      { nisn: "0000000002", nama: "Siswa Demo Dua", tanggal_lahir: new Date("2017-08-02"), jenis_kelamin: "P" }
    ],
    kategori: KATEGORI,
    tes: TES,
    sesi: {
      nama: "Skrining Kelas 4 TA 2026/2027",
      kode: "ABC123",
      tanggal_pelaksanaan: new Date("2026-11-10"),
      status: "aktif"
    }
  };
}

/**
 * Menyimpan data seed. Aman dijalankan berulang: baris yang sudah ada tidak diubah.
 * @param {object} db Prisma client atau transaction client
 * @param {Awaited<ReturnType<typeof buatDataSeed>>} data
 * @returns {Promise<void>}
 */
export async function jalankanSeed(db, data) {
  const superAdmin = await db.super_admin.upsert({
    where: { email: data.superAdmin.email },
    update: {},
    create: data.superAdmin
  });

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

  await db.sesi_skrining.upsert({
    where: { kode: data.sesi.kode },
    update: {},
    create: { ...data.sesi, sekolah_id: sekolah.id }
  });

  // Instrumen lebih dulu: kategori_asesmen menunjuk instrumen Level 2-nya.
  // shortcut: nama instrumen tidak unik di skema (nama yang sama boleh beda jenjang), jadi
  // idempotensi seed dicek manual. Ganti ke upsert bila nanti ada kunci unik yang tepat.
  const idTes = new Map();
  for (const tes of data.tes) {
    const { pertanyaan, ...kolom } = tes;
    const ada = await db.tes_skrining.findFirst({ where: { nama: tes.nama, jenjang: tes.jenjang } });
    const tersimpan =
      ada ?? (await db.tes_skrining.create({ data: { ...kolom, super_admin_id: superAdmin.id } }));
    idTes.set(tes.nama, tersimpan.id);
  }

  const idKategori = new Map();
  for (const kategori of data.kategori) {
    const { tes_nama, ...kolom } = kategori;
    const tersimpan = await db.kategori_asesmen.upsert({
      where: { urutan: kategori.urutan },
      update: {},
      create: { ...kolom, tes_skrining_id: tes_nama ? idTes.get(tes_nama) : null }
    });
    idKategori.set(kategori.nama, tersimpan.id);
  }

  for (const tes of data.tes) {
    const tes_skrining_id = idTes.get(tes.nama);

    for (const p of tes.pertanyaan) {
      const { kategori_nama, opsi, ...kolom } = p;
      const pertanyaan = await db.pertanyaan.upsert({
        where: { tes_skrining_id_nomor_urut: { tes_skrining_id, nomor_urut: p.nomor_urut } },
        update: {},
        create: { ...kolom, tes_skrining_id, kategori_asesmen_id: idKategori.get(kategori_nama) }
      });

      for (const o of opsi) {
        await db.opsi_jawaban.upsert({
          where: { pertanyaan_id_urutan: { pertanyaan_id: pertanyaan.id, urutan: o.urutan } },
          update: {},
          create: { ...o, pertanyaan_id: pertanyaan.id }
        });
      }
    }
  }
}
