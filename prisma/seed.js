/**
 * Seeder Data Skrining ABK.
 * Mengisi data awal sesuai dengan tangkapan layar desain untuk pengujian via Postman:
 * - Sekolah: SD Negeri Sleman 1
 * - Sesi: ABC123 (Skrining Kelas 5 TA 2026/2027)
 * - Siswa: Ahmad Fauzan (5A), Ahmad Fauzan (5B), Siti Rahma (5A)
 * - Instrumen: Skrining Awal (Level 1, 25 butir), Instrumen A (8 butir), Instrumen B (5 butir), Instrumen C (11 butir)
 */

import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("🌱 Memulai seeding data Skrining ABK...");

  // 1. Super Admin
  const admin = await prisma.superAdmin.upsert({
    where: { email: "admin@kemdikbud.go.id" },
    update: {},
    create: {
      username: "superadmin",
      email: "admin@kemdikbud.go.id",
      password: "password123"
    }
  });

  // 2. Sekolah: SD Negeri Sleman 1
  const sekolah = await prisma.sekolah.upsert({
    where: { email: "sdnsleman1@sekolah.id" },
    update: {},
    create: {
      adminId: admin.idAdmin,
      schoolName: "SD Negeri Sleman 1",
      email: "sdnsleman1@sekolah.id",
      password: "password123",
      alamat: "Jl. Magelang No. 12, Sleman, D.I. Yogyakarta",
      kontakTelepon: "0274-881234",
      statusAktif: true
    }
  });

  // 3. Kategori Asesmen
  const kategori = await prisma.kategoriAsesmen.upsert({
    where: { idKategori: 1 },
    update: {},
    create: {
      idKategori: 1,
      namaKategori: "Skrining Perkembangan ABK"
    }
  });

  // 4. Sesi Skrining: ABC123
  const sesi = await prisma.sesiSkrining.upsert({
    where: { kodeSkrining: "ABC123" },
    update: {
      statusSesi: "aktif"
    },
    create: {
      schoolId: sekolah.idSchool,
      idKategori: kategori.idKategori,
      namaSesi: "Skrining Kelas 5 TA 2026/2027",
      kodeSkrining: "ABC123",
      tanggalPelaksanaan: new Date("2026-11-03"),
      statusSesi: "aktif"
    }
  });

  // 5. Data Siswa
  const siswaData = [
    {
      namaLengkap: "Ahmad Fauzan",
      nisn: "0012345678",
      kelas: "5A",
      jenisKelamin: "laki_laki",
      tanggalLahir: new Date("2015-05-14")
    },
    {
      namaLengkap: "Ahmad Fauzan",
      nisn: "0012345679",
      kelas: "5B",
      jenisKelamin: "laki_laki",
      tanggalLahir: new Date("2015-07-20")
    },
    {
      namaLengkap: "Siti Rahma",
      nisn: "0012345680",
      kelas: "5A",
      jenisKelamin: "perempuan",
      tanggalLahir: new Date("2015-03-10")
    }
  ];

  for (const s of siswaData) {
    const existing = await prisma.siswa.findFirst({
      where: { nisn: s.nisn, schoolId: sekolah.idSchool }
    });
    if (!existing) {
      await prisma.siswa.create({
        data: {
          schoolId: sekolah.idSchool,
          ...s
        }
      });
    }
  }

  // 6. Tes Skrining (Level 1 & Level 2 Instrumen A, B, C)
  const tesLevel1 = await prisma.tesSkrining.upsert({
    where: { idTest: 1 },
    update: {},
    create: {
      idTest: 1,
      adminId: admin.idAdmin,
      namaTes: "Skrining Awal (Level 1)",
      jenjang: "SD",
      deskripsi: "Selama DUA (2) MINGGU terakhir, seberapa sering anak Anda mengalami hal berikut?",
      statusAktif: true
    }
  });

  const tesInstA = await prisma.tesSkrining.upsert({
    where: { idTest: 2 },
    update: {},
    create: {
      idTest: 2,
      adminId: admin.idAdmin,
      namaTes: "Instrumen A",
      jenjang: "SD",
      deskripsi: "Untuk setiap pernyataan, pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir",
      statusAktif: true
    }
  });

  const tesInstB = await prisma.tesSkrining.upsert({
    where: { idTest: 3 },
    update: {},
    create: {
      idTest: 3,
      adminId: admin.idAdmin,
      namaTes: "Instrumen B",
      jenjang: "SD",
      deskripsi: "Instrumen lanjutan untuk evaluasi interaksi dan perilaku anak.",
      statusAktif: true
    }
  });

  const tesInstC = await prisma.tesSkrining.upsert({
    where: { idTest: 4 },
    update: {},
    create: {
      idTest: 4,
      adminId: admin.idAdmin,
      namaTes: "Instrumen C",
      jenjang: "SD",
      deskripsi: "Dalam Tujuh (7) hari terakhir, anak saya mengatakan bahwa...",
      statusAktif: true
    }
  });

  // 7. Butir Soal Skrining Awal (Level 1 - 25 Butir)
  const level1Questions = [
    "Merasa gugup, cemas, atau tegang?",
    "Merasa tidak dapat menghentikan atau mengendalikan kekhawatiran?",
    "Merasa tidak tertarik atau tidak menikmati hal-hal yang biasanya disukai?",
    "Merasa sedih, murung, atau putus asa?",
    "Mengeluhkan sakit perut, sakit kepala, atau nyeri lainnya?", // Soal No. 5 di Tangkapan Layar
    "Mudah lelah atau merasa tidak bertenaga?",
    "Mengalami kesulitan tidur atau sering terbangun di malam hari?",
    "Mengalami perubahan nafsu makan atau pola makan?",
    "Sering merasa gelisah sehingga sulit untuk diam?",
    "Mudah marah, kesal, atau tersinggung oleh hal-hal kecil?",
    "Mengalami kesulitan memusatkan perhatian pada tugas sekolah?",
    "Sering melamun atau tampak tidak mendengarkan saat diajak bicara?",
    "Mengalami kesulitan mengikuti instruksi yang diberikan?",
    "Sering kehilangan barang-barang keperluan sekolah?",
    "Menghindari atau enggan melakukan tugas yang membutuhkan ketelitian?",
    "Sering menyela atau memotong pembicaraan orang lain?",
    "Mengalami kesulitan menunggu giliran saat bermain bersama teman?",
    "Menunjukkan perilaku agresif secara fisik terhadap orang lain?",
    "Sering merusak barang milik sendiri atau milik orang lain?",
    "Mengalami kesulitan dalam menjalin pertemanan dengan teman sebaya?",
    "Lebih suka menyendiri dan menarik diri dari lingkungan sosial?",
    "Mengalami kesulitan membaca kata-kata sederhana sesuai usianya?",
    "Mengalami kesulitan dalam memahami konsep berhitung dasar?",
    "Menunjukkan gerakan tubuh berulang yang tidak wajar (misal mengayun badan)?",
    "Menolak perubahan rutinitas harian secara ekstrem atau mengalami tantrum hebat?"
  ];

  const opsiLevel1 = [
    { labelOpsi: "0", teksOpsi: "Tidak sama sekali" },
    { labelOpsi: "1", teksOpsi: "Sangat ringan" },
    { labelOpsi: "2", teksOpsi: "Ringan" },
    { labelOpsi: "3", teksOpsi: "Sedang" },
    { labelOpsi: "4", teksOpsi: "Berat" }
  ];

  for (let i = 0; i < level1Questions.length; i++) {
    const teksPertanyaan = level1Questions[i];
    let q = await prisma.pertanyaan.findFirst({
      where: { testId: tesLevel1.idTest, teksPertanyaan }
    });

    if (!q) {
      q = await prisma.pertanyaan.create({
        data: {
          testId: tesLevel1.idTest,
          kategoriId: kategori.idKategori,
          teksPertanyaan,
          jawabanBenar: "0",
          skor: 1,
          statusAktif: true
        }
      });

      for (const opt of opsiLevel1) {
        await prisma.opsiJawaban.create({
          data: {
            pertanyaanId: q.idPertanyaan,
            labelOpsi: opt.labelOpsi,
            teksOpsi: opt.teksOpsi
          }
        });
      }
    }
  }

  // 8. Butir Soal Instrumen A (8 Butir - Atensi / SNAP-IV)
  const instAQuestions = [
    "Sering gagal memberikan perhatian penuh pada hal-hal kecil atau membuat kesalahan ceroboh.",
    "Sering kurang memperhatikan detail atau melakukan kesalahan karena kurang teliti saat mengerjakan tugas sekolah, pekerjaan, atau kegiatan lainnya.", // Soal No. 2 di Layar
    "Sering mengalami kesulitan mempertahankan perhatian saat mengerjakan tugas atau bermain.",
    "Sering tampak tidak mendengarkan ketika diajak berbicara secara langsung.",
    "Sering tidak mengikuti instruksi dan gagal menyelesaikan tugas sekolah.",
    "Sering mengalami kesulitan mengatur tugas dan aktivitas secara mandiri.",
    "Sering menghindari, tidak menyukai, atau enggan terlibat dalam tugas yang membutuhkan usaha mental terus-menerus.",
    "Sering mudah teralihkan perhatiannya oleh rangsangan dari luar."
  ];

  const opsiInstA = [
    { labelOpsi: "0", teksOpsi: "Tidak sama sekali" },
    { labelOpsi: "1", teksOpsi: "Sedikit" },
    { labelOpsi: "2", teksOpsi: "Cukup sering" },
    { labelOpsi: "3", teksOpsi: "Sangat sering" }
  ];

  for (let i = 0; i < instAQuestions.length; i++) {
    const teksPertanyaan = instAQuestions[i];
    let q = await prisma.pertanyaan.findFirst({
      where: { testId: tesInstA.idTest, teksPertanyaan }
    });

    if (!q) {
      q = await prisma.pertanyaan.create({
        data: {
          testId: tesInstA.idTest,
          kategoriId: kategori.idKategori,
          teksPertanyaan,
          jawabanBenar: "0",
          skor: 1,
          statusAktif: true
        }
      });

      for (const opt of opsiInstA) {
        await prisma.opsiJawaban.create({
          data: {
            pertanyaanId: q.idPertanyaan,
            labelOpsi: opt.labelOpsi,
            teksOpsi: opt.teksOpsi
          }
        });
      }
    }
  }

  // 9. Butir Soal Instrumen B (5 Butir - Perilaku)
  const instBQuestions = [
    "Sering berdebat atau membantah orang dewasa.",
    "Sering secara aktif menentang atau menolak mematuhi aturan orang dewasa.",
    "Sering sengaja mengganggu atau menjengkelkan orang lain.",
    "Sering menyalahkan orang lain atas kesalahan atau perilaku buruknya sendiri.",
    "Sering mudah tersinggung atau lekas marah karena perlakuan orang lain."
  ];

  for (let i = 0; i < instBQuestions.length; i++) {
    const teksPertanyaan = instBQuestions[i];
    let q = await prisma.pertanyaan.findFirst({
      where: { testId: tesInstB.idTest, teksPertanyaan }
    });

    if (!q) {
      q = await prisma.pertanyaan.create({
        data: {
          testId: tesInstB.idTest,
          kategoriId: kategori.idKategori,
          teksPertanyaan,
          jawabanBenar: "0",
          skor: 1,
          statusAktif: true
        }
      });

      for (const opt of opsiInstA) {
        await prisma.opsiJawaban.create({
          data: {
            pertanyaanId: q.idPertanyaan,
            labelOpsi: opt.labelOpsi,
            teksOpsi: opt.teksOpsi
          }
        });
      }
    }
  }

  // 10. Butir Soal Instrumen C (11 Butir - Emosi / Depresi PROMIS)
  const instCQuestions = [
    "Merasa tidak berdaya dan putus asa.",
    "Tidak bisa berhenti merasa sedih", // Soal No. 2 di Layar
    "Merasa kesepian meskipun berada di dekat orang lain.",
    "Merasa tidak ada hal baik yang akan terjadi padanya.",
    "Merasa sulit untuk merasa bahagia atau tersenyum.",
    "Merasa lelah sepanjang hari tanpa alasan yang jelas.",
    "Merasa tidak ada orang yang peduli atau menyayanginya.",
    "Merasa ingin menangis lebih sering dari biasanya.",
    "Merasa terbebani dengan kegiatan sehari-hari.",
    "Merasa dirinya tidak berguna atau selalu membuat kesalahan.",
    "Merasa membenci dirinya sendiri atau merasa serba salah."
  ];

  const opsiInstC = [
    { labelOpsi: "0", teksOpsi: "Tidak pernah" },
    { labelOpsi: "1", teksOpsi: "Hampir tidak pernah" },
    { labelOpsi: "2", teksOpsi: "Kadang - kadang" },
    { labelOpsi: "3", teksOpsi: "Sering" },
    { labelOpsi: "4", teksOpsi: "Hampir selalu" }
  ];

  for (let i = 0; i < instCQuestions.length; i++) {
    const teksPertanyaan = instCQuestions[i];
    let q = await prisma.pertanyaan.findFirst({
      where: { testId: tesInstC.idTest, teksPertanyaan }
    });

    if (!q) {
      q = await prisma.pertanyaan.create({
        data: {
          testId: tesInstC.idTest,
          kategoriId: kategori.idKategori,
          teksPertanyaan,
          jawabanBenar: "0",
          skor: 1,
          statusAktif: true
        }
      });

      for (const opt of opsiInstC) {
        await prisma.opsiJawaban.create({
          data: {
            pertanyaanId: q.idPertanyaan,
            labelOpsi: opt.labelOpsi,
            teksOpsi: opt.teksOpsi
          }
        });
      }
    }
  }

  // 11. Konfigurasi Penilaian
  await prisma.konfigurasiPenilaian.upsert({
    where: { idKonfigurasiPenilaian: 1 },
    update: {},
    create: {
      idKonfigurasiPenilaian: 1,
      testId: tesLevel1.idTest,
      skorMin: 0,
      skorMax: 10,
      kategoriHasil: "Indikasi Ringan / Dalam Batas Wajar",
      deskripsi: "Skor menunjukkan gejala minimal.",
      rekomendasi: "Pemantauan berkala di kelas oleh guru."
    }
  });

  await prisma.konfigurasiPenilaian.upsert({
    where: { idKonfigurasiPenilaian: 2 },
    update: {},
    create: {
      idKonfigurasiPenilaian: 2,
      testId: tesLevel1.idTest,
      skorMin: 11,
      skorMax: 100,
      kategoriHasil: "Perlu Tindak Lanjut Instrumen Tambahan",
      deskripsi: "Ditemukan beberapa indikasi gejala yang memerlukan pemeriksaan lebih mendalam melalui instrumen lanjutan Level 2.",
      rekomendasi: "Orang tua melanjutkan pengisian instrumen tindak lanjut (Instrumen A, B, C)."
    }
  });

  console.log("✅ Seeding selesai! Data sesi ABC123, siswa, dan seluruh instrumen telah siap digunakan.");
}

main()
  .catch((e) => {
    console.error("❌ Gagal melakukan seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
 * Titik Masuk Seed (`npm run db:seed`).
 * Membuat akun demo; aman dijalankan berulang.
 */

import { prisma } from "../src/lib/prisma.js";
import { buatDataSeed, jalankanSeed } from "./seedData.js";
import logger from "../src/utils/logger.js";

try {
  await jalankanSeed(prisma, await buatDataSeed(process.env));
  logger.success("Seed selesai: akun demo Super Admin, sekolah, kelas, dan siswa siap.");
} catch (err) {
  logger.error(`Seed gagal: ${err.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
