/**
 * Service Bisnis untuk Alur Skrining Publik (Orang Tua / Siswa).
 * Menggunakan Prisma Client bersama untuk manipulasi data.
 */

import { prisma } from "../lib/prisma.js";
import AppError from "../utils/appError.js";

export class PublicScreeningService {
  /**
   * Langkah 1 & 2: Validasi kode sesi dan ambil data sesi + sekolah.
   * @param {string} kodeSesi
   */
  static async validasiSesi(kodeSesi) {
    const sesi = await prisma.sesiSkrining.findFirst({
      where: {
        kodeSkrining: {
          equals: kodeSesi
        },
        deletedAt: null
      },
      include: {
        sekolah: true,
        kategoriAsesmen: true
      }
    });

    if (!sesi) {
      throw AppError.notFound(`Sesi dengan kode "${kodeSesi}" tidak ditemukan.`);
    }

    if (sesi.statusSesi !== "aktif") {
      const statusPesan =
        sesi.statusSesi === "menunggu"
          ? "Sesi ini belum dimulai. Silakan hubungi pihak sekolah."
          : "Sesi skrining ini sudah selesai atau telah ditutup.";
      throw AppError.badRequest(statusPesan, { statusSesi: sesi.statusSesi });
    }

    // Format data sesuai antarmuka Langkah 2
    return {
      sessionId: sesi.idSession,
      kodeSesi: sesi.kodeSkrining,
      namaSesi: sesi.namaSesi,
      statusSesi: sesi.statusSesi,
      tanggalPelaksanaan: sesi.tanggalPelaksanaan,
      sekolah: {
        idSchool: sesi.sekolah.idSchool,
        schoolName: sesi.sekolah.schoolName,
        npsn: sesi.sekolah.npsn || "20400851", // Fallback konsisten dengan UI jika belum ada kolom npsn
        alamat: sesi.sekolah.alamat,
        kontakTelepon: sesi.sekolah.kontakTelepon
      },
      kategoriAsesmen: sesi.kategoriAsesmen
        ? {
            idKategori: sesi.kategoriAsesmen.idKategori,
            namaKategori: sesi.kategoriAsesmen.namaKategori
          }
        : null
    };
  }

  /**
   * Langkah 3: Autocomplete pencarian siswa berdasarkan nama lengkap.
   * @param {string} kodeSesi
   * @param {string} query
   */
  static async cariSiswa(kodeSesi, query) {
    const sesi = await this.validasiSesi(kodeSesi);

    const daftarSiswa = await prisma.siswa.findMany({
      where: {
        schoolId: sesi.sekolah.idSchool,
        namaLengkap: {
          contains: query
        },
        deletedAt: null
      },
      select: {
        idStudent: true,
        namaLengkap: true,
        kelas: true
      },
      orderBy: [
        { namaLengkap: "asc" },
        { kelas: "asc" }
      ],
      take: 10
    });

    return daftarSiswa;
  }

  /**
   * Langkah 4: Konfirmasi detail identitas siswa sebelum memulai skrining.
   * @param {string} kodeSesi
   * @param {number} idStudent
   */
  static async konfirmasiSiswa(kodeSesi, idStudent) {
    const sesi = await this.validasiSesi(kodeSesi);

    const siswa = await prisma.siswa.findFirst({
      where: {
        idStudent,
        schoolId: sesi.sekolah.idSchool,
        deletedAt: null
      }
    });

    if (!siswa) {
      throw AppError.notFound(`Data anak tidak ditemukan pada sekolah penyelenggara sesi ini.`);
    }

    // Cek apakah siswa sudah pernah mengerjakan skrining pada sesi ini
    const existingHasil = await prisma.hasilSkrining.findFirst({
      where: {
        studentId: siswa.idStudent,
        sessionId: sesi.sessionId,
        deletedAt: null
      },
      orderBy: { idResult: "desc" }
    });

    return {
      idStudent: siswa.idStudent,
      namaLengkap: siswa.namaLengkap,
      nisn: siswa.nisn,
      kelas: siswa.kelas,
      jenisKelamin: siswa.jenisKelamin === "laki_laki" ? "Laki-laki" : "Perempuan",
      hasExistingAttempt: Boolean(existingHasil),
      attemptStatus: existingHasil ? (existingHasil.statusSelesai ? "selesai" : "sedang_berjalan") : "belum_mulai",
      existingResultId: existingHasil ? existingHasil.idResult : null
    };
  }

  /**
   * Langkah 5 & 6: Pendaftaran orang tua & persetujuan consent, inisialisasi / resume HasilSkrining.
   * @param {object} params
   */
  static async mulaiSkrining({ kodeSesi, studentId, namaOrangTua, nomorHp, hubungan, persetujuan }) {
    const sesi = await this.validasiSesi(kodeSesi);

    const siswa = await prisma.siswa.findFirst({
      where: {
        idStudent,
        schoolId: sesi.sekolah.idSchool,
        deletedAt: null
      }
    });

    if (!siswa) {
      throw AppError.notFound(`Siswa tidak terdaftar di sekolah ini.`);
    }

    // Periksa riwayat pengerjaan sebelumnya
    let hasil = await prisma.hasilSkrining.findFirst({
      where: {
        studentId: siswa.idStudent,
        sessionId: sesi.sessionId,
        deletedAt: null
      },
      orderBy: { idResult: "desc" }
    });

    const metadataResponden = {
      responden: {
        namaLengkap: namaOrangTua,
        nomorHp,
        hubungan
      },
      persetujuanWali: Boolean(persetujuan),
      waktuPersetujuan: new Date().toISOString()
    };

    if (hasil) {
      // Jika skrining level 1 sudah selesai, periksa apakah ada instrumen lanjutan
      if (hasil.statusSelesai) {
        return {
          idHasil: hasil.idResult,
          studentId: siswa.idStudent,
          namaSiswa: siswa.namaLengkap,
          statusSelesai: true,
          totalSkor: hasil.totalSkor,
          responden: metadataResponden.responden,
          message: "Skrining awal untuk siswa ini telah selesai diisi. Anda dapat melanjutkan instrumen tindak lanjut."
        };
      }
    } else {
      // Inisialisasi draft pengerjaan baru
      hasil = await prisma.hasilSkrining.create({
        data: {
          studentId: siswa.idStudent,
          sessionId: sesi.sessionId,
          tanggalSkrining: new Date(),
          waktuSelesai: new Date(),
          totalSkor: 0,
          kesimpulanIndikasi: JSON.stringify(metadataResponden),
          statusSelesai: false
        }
      });
    }

    return {
      idHasil: hasil.idResult,
      studentId: siswa.idStudent,
      namaSiswa: siswa.namaLengkap,
      statusSelesai: hasil.statusSelesai,
      responden: metadataResponden.responden
    };
  }

  /**
   * Langkah 7: Ambil soal Skrining Awal (Level 1) beserta autosaved answers.
   * @param {number} idHasil
   */
  static async getPertanyaanLevel1(idHasil) {
    const hasil = await prisma.hasilSkrining.findUnique({
      where: { idResult: idHasil },
      include: {
        sesiSkrining: true,
        siswa: true
      }
    });

    if (!hasil) {
      throw AppError.notFound("Sesi pengerjaan skrining tidak ditemukan.");
    }

    // Cari tes Level 1 (misal tes pertama atau namaTes yang mengandung 'Level 1' / 'Skrining Awal')
    let testLevel1 = await prisma.tesSkrining.findFirst({
      where: {
        namaTes: { contains: "Awal" },
        statusAktif: true,
        deletedAt: null
      }
    });

    if (!testLevel1) {
      // Fallback ke tes aktif pertama
      testLevel1 = await prisma.tesSkrining.findFirst({
        where: { statusAktif: true, deletedAt: null },
        orderBy: { idTest: "asc" }
      });
    }

    if (!testLevel1) {
      throw AppError.notFound("Instrumen tes skrining awal belum dikonfigurasi.");
    }

    // Ambil seluruh pertanyaan beserta opsi jawabannya
    const daftarPertanyaan = await prisma.pertanyaan.findMany({
      where: {
        testId: testLevel1.idTest,
        statusAktif: true,
        deletedAt: null
      },
      include: {
        opsiJawaban: {
          where: { deletedAt: null },
          orderBy: { idJawaban: "asc" }
        }
      },
      orderBy: { idPertanyaan: "asc" }
    });

    // Ambil jawaban yang sudah pernah tersimpan (autosaved answers)
    const jawabanTersimpan = await prisma.detailJawabanSiswa.findMany({
      where: {
        idHasil,
        deletedAt: null
      }
    });

    const mapJawaban = new Map(jawabanTersimpan.map((j) => [j.idPertanyaan, j.idOpsi]));

    const pertanyaanFormatted = daftarPertanyaan.map((p, index) => ({
      nomorUrut: index + 1,
      idPertanyaan: p.idPertanyaan,
      teksPertanyaan: p.teksPertanyaan,
      urlGambar: p.urlGambar,
      jawabanTerpilih: mapJawaban.get(p.idPertanyaan) || null,
      opsiJawaban: p.opsiJawaban.map((o) => ({
        idJawaban: o.idJawaban,
        labelOpsi: o.labelOpsi,
        teksOpsi: o.teksOpsi,
        urlGambar: o.urlGambar
      }))
    }));

    const totalDijawab = jawabanTersimpan.filter((j) =>
      daftarPertanyaan.some((p) => p.idPertanyaan === j.idPertanyaan)
    ).length;

    return {
      idHasil: hasil.idResult,
      namaTes: testLevel1.namaTes,
      petunjukWaktu: "Selama DUA (2) MINGGU terakhir, seberapa sering anak Anda mengalami hal berikut?",
      totalSoal: daftarPertanyaan.length,
      totalDijawab,
      pertanyaan: pertanyaanFormatted
    };
  }

  /**
   * Langkah 7, 11, 15: Autosave jawaban butir soal.
   * @param {number} idHasil
   * @param {number} idPertanyaan
   * @param {number} idOpsi
   */
  static async simpanJawaban(idHasil, idPertanyaan, idOpsi) {
    const hasil = await prisma.hasilSkrining.findUnique({
      where: { idResult: idHasil }
    });

    if (!hasil) {
      throw AppError.notFound("Sesi pengerjaan tidak ditemukan.");
    }

    // Verifikasi opsi jawaban valid
    const opsi = await prisma.opsiJawaban.findFirst({
      where: {
        idJawaban: idOpsi,
        pertanyaanId: idPertanyaan,
        deletedAt: null
      }
    });

    if (!opsi) {
      throw AppError.badRequest("Opsi jawaban tidak cocok dengan pertanyaan yang dipilih.");
    }

    // Upsert jawaban
    const existingJawaban = await prisma.detailJawabanSiswa.findFirst({
      where: {
        idHasil,
        idPertanyaan,
        deletedAt: null
      }
    });

    if (existingJawaban) {
      await prisma.detailJawabanSiswa.update({
        where: { id: existingJawaban.id },
        data: { idOpsi }
      });
    } else {
      await prisma.detailJawabanSiswa.create({
        data: {
          idHasil,
          idPertanyaan,
          idOpsi
        }
      });
    }

    const totalDijawab = await prisma.detailJawabanSiswa.count({
      where: { idHasil, deletedAt: null }
    });

    return {
      idHasil,
      idPertanyaan,
      idOpsi,
      totalDijawab
    };
  }

  /**
   * Langkah 8: Submit dan kalkulasi skor Skrining Awal (Level 1).
   * @param {number} idHasil
   */
  static async submitLevel1(idHasil) {
    const dataTes = await this.getPertanyaanLevel1(idHasil);

    // Cek kelengkapan pengisian seluruh butir (Decision D14)
    const belumDijawab = dataTes.pertanyaan
      .filter((p) => !p.jawabanTerpilih)
      .map((p) => ({ nomorUrut: p.nomorUrut, idPertanyaan: p.idPertanyaan }));

    if (belumDijawab.length > 0) {
      throw AppError.badRequest("Harap lengkapi seluruh pertanyaan sebelum mengirimkan jawaban.", {
        totalSoal: dataTes.totalSoal,
        totalDijawab: dataTes.totalDijawab,
        belumDijawab
      });
    }

    // Ambil seluruh detail jawaban untuk menghitung skor
    const jawabanSiswa = await prisma.detailJawabanSiswa.findMany({
      where: { idHasil, deletedAt: null },
      include: {
        pertanyaan: true,
        opsiJawaban: true
      }
    });

    // Kalkulasi skor berdasarkan bobot opsi / pertanyaan
    let totalSkor = 0;
    for (const j of jawabanSiswa) {
      // Ambil angka dari labelOpsi jika numerik (misal '0', '1', '2', '3', '4') atau skor pertanyaan
      const opsiScore = parseInt(j.opsiJawaban.labelOpsi, 10);
      if (!isNaN(opsiScore)) {
        totalSkor += opsiScore;
      } else {
        totalSkor += j.pertanyaan.skor || 0;
      }
    }

    // Cari konfigurasi penilaian
    const test = await prisma.tesSkrining.findFirst({
      where: { namaTes: { contains: "Awal" }, deletedAt: null }
    });

    let kesimpulan = "Perlu Tindak Lanjut Instrumen Tambahan";
    if (test) {
      const config = await prisma.konfigurasiPenilaian.findFirst({
        where: {
          testId: test.idTest,
          skorMin: { lte: totalSkor },
          skorMax: { gte: totalSkor },
          deletedAt: null
        }
      });
      if (config) {
        kesimpulan = config.kategoriHasil;
      }
    }

    // Update status selesai pada HasilSkrining
    await prisma.hasilSkrining.update({
      where: { idResult: idHasil },
      data: {
        statusSelesai: true,
        waktuSelesai: new Date(),
        totalSkor,
        kesimpulanIndikasi: kesimpulan
      }
    });

    return {
      idHasil,
      statusSelesai: true,
      totalSoal: dataTes.totalSoal,
      totalSkor,
      kesimpulanIndikasi: kesimpulan,
      tindakLanjutTersedia: true, // Memicu Layar 9 & 10
      pesan: "Pihak sekolah telah menetapkan instrumen skrining lanjutan yang perlu Anda isi."
    };
  }

  /**
   * Langkah 9, 10, 14, 18: Dashboard Instrumen Lanjutan (Level 2).
   * @param {number} idHasil
   */
  static async getDashboardTindakLanjut(idHasil) {
    const hasil = await prisma.hasilSkrining.findUnique({
      where: { idResult: idHasil },
      include: { siswa: true }
    });

    if (!hasil) {
      throw AppError.notFound("Data hasil skrining tidak ditemukan.");
    }

    // Ambil daftar instrumen lanjutan (Tes yang bukan Skrining Awal)
    const instrumenLanjutan = await prisma.tesSkrining.findMany({
      where: {
        NOT: {
          namaTes: { contains: "Awal" }
        },
        statusAktif: true,
        deletedAt: null
      },
      orderBy: { idTest: "asc" }
    });

    if (instrumenLanjutan.length === 0) {
      return {
        idHasil,
        namaSiswa: hasil.siswa.namaLengkap,
        progressText: "0 dari 0 instrumen dikerjakan",
        persentase: 100,
        seluruhSelesai: true,
        daftarInstrumen: []
      };
    }

    // Hitung status pengerjaan tiap instrumen
    const daftarFormatted = [];
    let previousSelesai = true; // Instrumen pertama langsung aktif jika belum selesai
    let countSelesai = 0;

    for (const inst of instrumenLanjutan) {
      const totalSoalInst = await prisma.pertanyaan.count({
        where: { testId: inst.idTest, statusAktif: true, deletedAt: null }
      });

      const dijawabInst = await prisma.detailJawabanSiswa.count({
        where: {
          idHasil,
          deletedAt: null,
          pertanyaan: { testId: inst.idTest }
        }
      });

      const isSelesai = totalSoalInst > 0 && dijawabInst >= totalSoalInst;

      let status = "terkunci";
      if (isSelesai) {
        status = "selesai";
        countSelesai++;
      } else if (previousSelesai) {
        status = "aktif";
        previousSelesai = false; // Instrumen selanjutnya harus menunggu instrumen ini
      } else {
        status = "terkunci";
      }

      daftarFormatted.push({
        idTest: inst.idTest,
        namaTes: inst.namaTes,
        deskripsi: inst.deskripsi,
        totalSoal: totalSoalInst,
        soalDijawab: dijawabInst,
        status, // 'selesai' | 'aktif' | 'terkunci'
        canStart: status === "aktif"
      });
    }

    const totalInstrumen = instrumenLanjutan.length;
    const seluruhSelesai = countSelesai === totalInstrumen;
    const persentase = totalInstrumen > 0 ? Math.round((countSelesai / totalInstrumen) * 100) : 100;

    return {
      idHasil,
      namaSiswa: hasil.siswa.namaLengkap,
      progressPengisian: `${countSelesai} dari ${totalInstrumen} instrumen dikerjakan`,
      totalInstrumen,
      instrumenSelesai: countSelesai,
      persentase,
      seluruhSelesai,
      pesanPenutup: seluruhSelesai
        ? "Seluruh instrumen skrining lanjutan yang ditugaskan untuk anak Anda telah selesai diisi. Penyelesaian skrining bukan merupakan diagnosis. Anda diperbolehkan menutup halaman ini."
        : null,
      daftarInstrumen: daftarFormatted
    };
  }

  /**
   * Langkah 11, 15: Ambil pertanyaan untuk instrumen lanjutan spesifik.
   * @param {number} idHasil
   * @param {number} testId
   */
  static async getPertanyaanInstrumenLanjutan(idHasil, testId) {
    const instrumen = await prisma.tesSkrining.findUnique({
      where: { idTest: testId }
    });

    if (!instrumen) {
      throw AppError.notFound("Instrumen lanjutan tidak ditemukan.");
    }

    const daftarPertanyaan = await prisma.pertanyaan.findMany({
      where: {
        testId,
        statusAktif: true,
        deletedAt: null
      },
      include: {
        opsiJawaban: {
          where: { deletedAt: null },
          orderBy: { idJawaban: "asc" }
        }
      },
      orderBy: { idPertanyaan: "asc" }
    });

    const jawabanTersimpan = await prisma.detailJawabanSiswa.findMany({
      where: {
        idHasil,
        deletedAt: null,
        pertanyaan: { testId }
      }
    });

    const mapJawaban = new Map(jawabanTersimpan.map((j) => [j.idPertanyaan, j.idOpsi]));

    const pertanyaanFormatted = daftarPertanyaan.map((p, index) => ({
      nomorUrut: index + 1,
      idPertanyaan: p.idPertanyaan,
      teksPertanyaan: p.teksPertanyaan,
      urlGambar: p.urlGambar,
      jawabanTerpilih: mapJawaban.get(p.idPertanyaan) || null,
      opsiJawaban: p.opsiJawaban.map((o) => ({
        idJawaban: o.idJawaban,
        labelOpsi: o.labelOpsi,
        teksOpsi: o.teksOpsi
      }))
    }));

    return {
      idHasil,
      idTest: instrumen.idTest,
      namaTes: instrumen.namaTes,
      petunjukWaktu:
        instrumen.deskripsi ||
        "Untuk setiap pernyataan, pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir",
      totalSoal: daftarPertanyaan.length,
      totalDijawab: jawabanTersimpan.length,
      pertanyaan: pertanyaanFormatted
    };
  }

  /**
   * Langkah 12, 13, 16, 17: Submit instrumen lanjutan.
   * @param {number} idHasil
   * @param {number} testId
   */
  static async submitInstrumenLanjutan(idHasil, testId) {
    const dataTes = await this.getPertanyaanInstrumenLanjutan(idHasil, testId);

    const belumDijawab = dataTes.pertanyaan
      .filter((p) => !p.jawabanTerpilih)
      .map((p) => ({ nomorUrut: p.nomorUrut, idPertanyaan: p.idPertanyaan }));

    if (belumDijawab.length > 0) {
      throw AppError.badRequest(`Harap lengkapi seluruh pertanyaan pada ${dataTes.namaTes} sebelum mengirim.`, {
        totalSoal: dataTes.totalSoal,
        totalDijawab: dataTes.totalDijawab,
        belumDijawab
      });
    }

    return {
      idHasil,
      idTest: testId,
      namaTes: dataTes.namaTes,
      status: "selesai",
      totalSoal: dataTes.totalSoal,
      pesan: `${dataTes.namaTes} Berhasil Dikirim. Jawaban Anda telah berhasil tersimpan.`
    };
  }
}
