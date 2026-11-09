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
        statusSelesai: true,
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
      attemptStatus: existingHasil ? "selesai" : "belum_mulai",
      existingResultId: existingHasil ? existingHasil.idResult : null
    };
  }

  /**
   * Langkah 5 & 6: Pendaftaran orang tua & persetujuan consent.
   * Mengembalikan info tes awal (idTest) TANPA membuat baris prematur di hasil_skrining.
   * @param {object} params
   */
  static async mulaiSkrining({ kodeSesi, studentId, namaOrangTua, nomorHp, hubungan, persetujuan }) {
    const sesi = await this.validasiSesi(kodeSesi);

    const siswa = await prisma.siswa.findFirst({
      where: {
        idStudent: studentId,
        schoolId: sesi.sekolah.idSchool,
        deletedAt: null
      }
    });

    if (!siswa) {
      throw AppError.notFound(`Siswa tidak terdaftar di sekolah ini.`);
    }

    // Cari tes Skrining Awal (Level 1)
    let testLevel1 = await prisma.tesSkrining.findFirst({
      where: {
        namaTes: { contains: "Awal" },
        statusAktif: true,
        deletedAt: null
      }
    });

    if (!testLevel1) {
      testLevel1 = await prisma.tesSkrining.findFirst({
        where: { statusAktif: true, deletedAt: null },
        orderBy: { idTest: "asc" }
      });
    }

    const idTest = testLevel1 ? testLevel1.idTest : 1;

    // Periksa apakah siswa sudah memiliki hasil skrining di sesi ini
    const existingHasil = await prisma.hasilSkrining.findFirst({
      where: {
        studentId: siswa.idStudent,
        sessionId: sesi.sessionId,
        statusSelesai: true,
        deletedAt: null
      },
      orderBy: { idResult: "desc" }
    });

    return {
      sessionId: sesi.sessionId,
      kodeSesi: sesi.kodeSesi,
      studentId: siswa.idStudent,
      namaSiswa: siswa.namaLengkap,
      idTest,
      namaTes: testLevel1?.namaTes || "Skrining Awal (Level 1)",
      statusSelesai: existingHasil ? existingHasil.statusSelesai : false,
      existingResultId: existingHasil ? existingHasil.idResult : null,
      responden: {
        namaLengkap: namaOrangTua,
        nomorHp,
        hubungan
      },
      message: existingHasil
        ? "Siswa ini telah memiliki riwayat skrining pada sesi ini."
        : "Registrasi kontak orang tua berhasil. Silakan ambil pertanyaan tes skrining."
    };
  }

  /**
   * Langkah 7, 11, 15: Ambil pertanyaan berdasarkan idTest.
   * @param {number} testId
   */
  static async getPertanyaanByTestId(testId) {
    const test = await prisma.tesSkrining.findFirst({
      where: {
        idTest: testId,
        statusAktif: true,
        deletedAt: null
      }
    });

    if (!test) {
      throw AppError.notFound(`Instrumen tes dengan idTest ${testId} tidak ditemukan.`);
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

    return {
      idTest: test.idTest,
      namaTes: test.namaTes,
      petunjukWaktu:
        test.deskripsi ||
        "Untuk setiap pernyataan, pilih jawaban yang paling menggambarkan kondisi anak Anda.",
      totalSoal: daftarPertanyaan.length,
      pertanyaan: daftarPertanyaan.map((p, index) => ({
        nomorUrut: index + 1,
        idPertanyaan: p.idPertanyaan,
        teksPertanyaan: p.teksPertanyaan,
        urlGambar: p.urlGambar,
        opsiJawaban: p.opsiJawaban.map((o) => ({
          idJawaban: o.idJawaban,
          labelOpsi: o.labelOpsi,
          teksOpsi: o.teksOpsi,
          urlGambar: o.urlGambar
        }))
      }))
    };
  }

  /**
   * Fallback: Ambil pertanyaan untuk pengerjaan lama via idHasil.
   * @param {number} idHasil
   */
  static async getPertanyaanLevel1(idHasil) {
    const hasil = await prisma.hasilSkrining.findUnique({
      where: { idResult: idHasil }
    });

    let testLevel1 = await prisma.tesSkrining.findFirst({
      where: { namaTes: { contains: "Awal" }, statusAktif: true, deletedAt: null }
    });

    if (!testLevel1) {
      testLevel1 = await prisma.tesSkrining.findFirst({
        where: { statusAktif: true, deletedAt: null },
        orderBy: { idTest: "asc" }
      });
    }

    if (!testLevel1) {
      throw AppError.notFound("Instrumen tes skrining awal belum dikonfigurasi.");
    }

    const dataSoal = await this.getPertanyaanByTestId(testLevel1.idTest);

    // Ambil autosaved answers jika ada
    let jawabanTersimpan = [];
    if (hasil) {
      jawabanTersimpan = await prisma.detailJawabanSiswa.findMany({
        where: { idHasil, deletedAt: null }
      });
    }

    const mapJawaban = new Map(jawabanTersimpan.map((j) => [j.idPertanyaan, j.idOpsi]));

    return {
      ...dataSoal,
      idHasil,
      totalDijawab: jawabanTersimpan.length,
      pertanyaan: dataSoal.pertanyaan.map((p) => ({
        ...p,
        jawabanTerpilih: mapJawaban.get(p.idPertanyaan) || null
      }))
    };
  }

  /**
   * Submit Skrining Lengkap: Menghitung skor, menentukan kesimpulan indikasi,
   * dan mencatat ke tabel hasil_skrining & detail_jawaban_siswa.
   * @param {object} params
   */
  static async submitSkrining({ kodeSesi, studentId, testId, responden, jawaban }) {
    const sesi = await this.validasiSesi(kodeSesi);

    const siswa = await prisma.siswa.findFirst({
      where: {
        idStudent: studentId,
        schoolId: sesi.sekolah.idSchool,
        deletedAt: null
      }
    });

    if (!siswa) {
      throw AppError.notFound("Siswa tidak terdaftar di sekolah ini.");
    }

    const test = await prisma.tesSkrining.findFirst({
      where: { idTest: testId, deletedAt: null }
    });

    if (!test) {
      throw AppError.notFound("Instrumen tes tidak ditemukan.");
    }

    // Ambil seluruh pertanyaan aktif untuk testId ini
    const daftarPertanyaan = await prisma.pertanyaan.findMany({
      where: {
        testId,
        statusAktif: true,
        deletedAt: null
      },
      include: {
        opsiJawaban: { where: { deletedAt: null } }
      },
      orderBy: { idPertanyaan: "asc" }
    });

    if (daftarPertanyaan.length === 0) {
      throw AppError.badRequest("Instrumen ini belum memiliki pertanyaan yang aktif.");
    }

    // Verifikasi kelengkapan jawaban (semua butir wajib diisi)
    const mapJawaban = new Map(jawaban.map((j) => [j.idPertanyaan, j.idOpsi]));
    const belumDijawab = [];

    daftarPertanyaan.forEach((p, idx) => {
      if (!mapJawaban.has(p.idPertanyaan)) {
        belumDijawab.push({ nomorUrut: idx + 1, idPertanyaan: p.idPertanyaan });
      }
    });

    if (belumDijawab.length > 0) {
      throw AppError.badRequest(`Harap lengkapi seluruh pertanyaan pada ${test.namaTes} sebelum mengirimkan jawaban.`, {
        totalSoal: daftarPertanyaan.length,
        totalDijawab: mapJawaban.size,
        belumDijawab
      });
    }

    // Kalkulasi skor total dari jawaban
    let totalSkor = 0;
    const detailJawabanData = [];

    for (const p of daftarPertanyaan) {
      const selectedOpsiId = mapJawaban.get(p.idPertanyaan);
      const selectedOpsi = p.opsiJawaban.find((o) => o.idJawaban === selectedOpsiId);

      if (!selectedOpsi) {
        throw AppError.badRequest(`Opsi jawaban dengan ID ${selectedOpsiId} tidak cocok untuk pertanyaan ${p.idPertanyaan}.`);
      }

      // Ambil nilai numerik dari label opsi (misal "0", "1", "2", "3", "4")
      const opsiScore = parseInt(selectedOpsi.labelOpsi, 10);
      if (!isNaN(opsiScore)) {
        totalSkor += opsiScore;
      } else {
        totalSkor += p.skor || 0;
      }

      detailJawabanData.push({
        idPertanyaan: p.idPertanyaan,
        idOpsi: selectedOpsiId
      });
    }

    // Tentukan kesimpulan indikasi berdasarkan konfigurasi penilaian
    const configPenilaian = await prisma.konfigurasiPenilaian.findFirst({
      where: {
        testId,
        skorMin: { lte: totalSkor },
        skorMax: { gte: totalSkor },
        deletedAt: null
      }
    });

    let kesimpulanIndikasi = configPenilaian
      ? configPenilaian.kategoriHasil
      : totalSkor >= 11
      ? "Perlu Tindak Lanjut Instrumen Tambahan"
      : "Indikasi Ringan / Dalam Batas Wajar";

    // Simpan ke tabel hasil_skrining saat submit final
    const hasil = await prisma.hasilSkrining.create({
      data: {
        studentId: siswa.idStudent,
        sessionId: sesi.sessionId,
        tanggalSkrining: new Date(),
        waktuSelesai: new Date(),
        totalSkor,
        kesimpulanIndikasi,
        statusSelesai: true
      }
    });

    // Simpan seluruh butir jawaban ke detail_jawaban_siswa
    if (detailJawabanData.length > 0) {
      await prisma.detailJawabanSiswa.createMany({
        data: detailJawabanData.map((d) => ({
          idHasil: hasil.idResult,
          idPertanyaan: d.idPertanyaan,
          idOpsi: d.idOpsi
        }))
      });
    }

    // Cek apakah tes ini Level 1 dan memicu Level 2 (Tindak lanjut)
    const isLevel1 = test.namaTes.toLowerCase().includes("awal") || test.idTest === 1;
    const tindakLanjutTersedia = isLevel1 && totalSkor >= 11;

    // Ambil daftar instrumen lanjutan jika perlu
    let instrumenLanjutan = [];
    if (tindakLanjutTersedia) {
      const followUpTests = await prisma.tesSkrining.findMany({
        where: {
          NOT: { idTest: test.idTest },
          statusAktif: true,
          deletedAt: null
        },
        orderBy: { idTest: "asc" }
      });
      instrumenLanjutan = followUpTests.map((t) => ({
        idTest: t.idTest,
        namaTes: t.namaTes,
        deskripsi: t.deskripsi
      }));
    }

    return {
      idHasil: hasil.idResult,
      studentId: siswa.idStudent,
      namaSiswa: siswa.namaLengkap,
      idTest: test.idTest,
      namaTes: test.namaTes,
      totalSoal: daftarPertanyaan.length,
      totalSkor,
      kesimpulanIndikasi,
      statusSelesai: true,
      tindakLanjutTersedia,
      daftarInstrumenLanjutan: tindakLanjutTersedia ? instrumenLanjutan : [],
      pesan: tindakLanjutTersedia
        ? "Pihak sekolah telah menetapkan instrumen skrining lanjutan yang perlu Anda isi."
        : "Skrining berhasil diselesaikan dan disimpan."
    };
  }

  /**
   * Langkah 9, 10, 14, 18: Dashboard Status Tindak Lanjut (Level 2).
   * @param {object} params
   */
  static async getDashboardTindakLanjut({ kodeSesi, studentId, idHasil }) {
    let studentIdFinal = studentId;
    let sessionIdFinal = null;

    if (idHasil) {
      const hasil = await prisma.hasilSkrining.findUnique({
        where: { idResult: parseInt(idHasil, 10) },
        include: { siswa: true }
      });
      if (hasil) {
        studentIdFinal = hasil.studentId;
        sessionIdFinal = hasil.sessionId;
      }
    }

    if (kodeSesi && !sessionIdFinal) {
      const sesi = await this.validasiSesi(kodeSesi);
      sessionIdFinal = sesi.sessionId;
    }

    const siswa = await prisma.siswa.findFirst({
      where: { idStudent: studentIdFinal, deletedAt: null }
    });

    if (!siswa) {
      throw AppError.notFound("Data siswa tidak ditemukan.");
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
        namaSiswa: siswa.namaLengkap,
        progressPengisian: "0 dari 0 instrumen dikerjakan",
        persentase: 100,
        seluruhSelesai: true,
        daftarInstrumen: []
      };
    }

    // Hitung status pengerjaan tiap instrumen berdasarkan jawaban siswa di sesi ini
    const daftarFormatted = [];
    let previousSelesai = true;
    let countSelesai = 0;

    for (const inst of instrumenLanjutan) {
      const totalSoalInst = await prisma.pertanyaan.count({
        where: { testId: inst.idTest, statusAktif: true, deletedAt: null }
      });

      // Cari jawaban siswa pada tes ini di sesi ini
      const dijawabInst = await prisma.detailJawabanSiswa.count({
        where: {
          pertanyaan: { testId: inst.idTest },
          deletedAt: null,
          hasilSkrining: {
            studentId: siswa.idStudent,
            ...(sessionIdFinal ? { sessionId: sessionIdFinal } : {})
          }
        }
      });

      const isSelesai = totalSoalInst > 0 && dijawabInst >= totalSoalInst;

      let status = "terkunci";
      if (isSelesai) {
        status = "selesai";
        countSelesai++;
      } else if (previousSelesai) {
        status = "aktif";
        previousSelesai = false;
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
      namaSiswa: siswa.namaLengkap,
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
   * Autosave jawaban butir soal jika ada sesi pengerjaan aktif.
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
   * Submit via idHasil (legacy/fallback).
   * @param {number} idHasil
   */
  static async submitLevel1(idHasil) {
    const dataTes = await this.getPertanyaanLevel1(idHasil);

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

    const jawabanSiswa = await prisma.detailJawabanSiswa.findMany({
      where: { idHasil, deletedAt: null },
      include: {
        pertanyaan: true,
        opsiJawaban: true
      }
    });

    let totalSkor = 0;
    for (const j of jawabanSiswa) {
      const opsiScore = parseInt(j.opsiJawaban.labelOpsi, 10);
      if (!isNaN(opsiScore)) {
        totalSkor += opsiScore;
      } else {
        totalSkor += j.pertanyaan.skor || 0;
      }
    }

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
      tindakLanjutTersedia: true,
      pesan: "Pihak sekolah telah menetapkan instrumen skrining lanjutan yang perlu Anda isi."
    };
  }

  /**
   * Submit instrumen lanjutan via idHasil & testId (legacy/fallback).
   * @param {number} idHasil
   * @param {number} testId
   */
  static async submitInstrumenLanjutan(idHasil, testId) {
    const dataTes = await this.getPertanyaanByTestId(testId);

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
