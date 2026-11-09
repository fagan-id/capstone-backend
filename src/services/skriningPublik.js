/**
 * Layanan Alur Skrining Publik (Orang Tua / Wali).
 * Setiap fungsi menerima `db` (Prisma client atau transaction client) agar bisa diuji di dalam transaksi.
 *
 * Rute publik tidak memakai login, jadi satu percobaan selalu dialamatkan lewat `token`, bukan `id`.
 */

import { randomUUID } from "node:crypto";
import AppError from "../utils/appError.js";
import { nilaiKategori } from "./penilaianSkrining.js";

/** Label netral untuk peserta; nama domain tidak boleh terbaca orang tua (D37). */
function labelLanjutan(nomor) {
  return `Bagian lanjutan ${nomor}`;
}

/**
 * Mengambil sesi aktif beserta sekolahnya.
 * @param {object} db
 * @param {string} kode
 */
export async function validasiSesi(db, kode) {
  const sesi = await db.sesi_skrining.findUnique({
    where: { kode },
    include: { sekolah: true }
  });

  if (!sesi) throw AppError.notFound(`Sesi dengan kode "${kode}" tidak ditemukan.`);

  if (sesi.status !== "aktif") {
    const pesan =
      sesi.status === "menunggu"
        ? "Sesi ini belum dimulai. Silakan hubungi pihak sekolah."
        : "Sesi skrining ini sudah ditutup.";
    throw AppError.badRequest(pesan, { status: sesi.status });
  }

  return {
    id: sesi.id,
    kode: sesi.kode,
    nama: sesi.nama,
    status: sesi.status,
    tanggal_pelaksanaan: sesi.tanggal_pelaksanaan,
    sekolah: {
      id: sesi.sekolah.id,
      nama: sesi.sekolah.nama,
      npsn: sesi.sekolah.npsn,
      alamat: sesi.sekolah.alamat,
      kontak_telepon: sesi.sekolah.kontak_telepon
    }
  };
}

/**
 * Mencari siswa pada sekolah penyelenggara sesi.
 * Balasan hanya memuat nama dan kelas (A4, D42).
 * @param {object} db
 * @param {string} kode
 * @param {string} kataKunci
 */
export async function cariSiswa(db, kode, kataKunci) {
  const sesi = await validasiSesi(db, kode);

  const daftar = await db.siswa.findMany({
    where: { sekolah_id: sesi.sekolah.id, nama: { contains: kataKunci } },
    select: { id: true, nama: true, kelas: { select: { nama: true } } },
    orderBy: [{ nama: "asc" }],
    take: 10
  });

  return daftar.map((s) => ({ id: s.id, nama: s.nama, kelas: s.kelas.nama }));
}

/**
 * Mengambil satu siswa untuk layar konfirmasi.
 * @param {object} db
 * @param {string} kode
 * @param {number} siswa_id
 */
export async function konfirmasiSiswa(db, kode, siswa_id) {
  const sesi = await validasiSesi(db, kode);

  const siswa = await db.siswa.findFirst({
    where: { id: siswa_id, sekolah_id: sesi.sekolah.id },
    select: { id: true, nama: true, kelas: { select: { nama: true } } }
  });

  if (!siswa) throw AppError.notFound("Data anak tidak ditemukan pada sekolah penyelenggara sesi ini.");

  const percobaan = await db.hasil_skrining.findUnique({
    where: { siswa_id_sesi_skrining_id: { siswa_id: siswa.id, sesi_skrining_id: sesi.id } },
    select: { selesai: true }
  });

  return {
    id: siswa.id,
    nama: siswa.nama,
    kelas: siswa.kelas.nama,
    status_percobaan: percobaan ? (percobaan.selesai ? "selesai" : "sedang_berjalan") : "belum_mulai"
  };
}

/**
 * Mencatat persetujuan lalu membuat (atau melanjutkan) percobaan pengisian.
 *
 * shortcut: siapa pun yang memegang kode sesi bisa memulai percobaan atas nama anak mana pun di
 * sekolah itu, dan melanjutkan percobaan yang sudah ada. Pengaman tanggal lahir (A11) belum
 * diputuskan tim; tambahkan di sini begitu disetujui.
 *
 * @param {object} db
 * @param {{ kode: string, siswa_id: number, nama_responden: string, nomor_hp_responden: string,
 *   hubungan_responden: string, persetujuan: boolean }} masukan
 */
export async function mulaiSkrining(db, masukan) {
  if (masukan.persetujuan !== true) {
    throw AppError.badRequest("Anda harus menyetujui lembar informasi skrining terlebih dahulu.");
  }

  const sesi = await validasiSesi(db, masukan.kode);

  const siswa = await db.siswa.findFirst({
    where: { id: masukan.siswa_id, sekolah_id: sesi.sekolah.id },
    select: { id: true, nama: true }
  });
  if (!siswa) throw AppError.notFound("Data anak tidak ditemukan pada sekolah penyelenggara sesi ini.");

  const adaSebelumnya = await db.hasil_skrining.findUnique({
    where: { siswa_id_sesi_skrining_id: { siswa_id: siswa.id, sesi_skrining_id: sesi.id } }
  });

  if (adaSebelumnya) {
    return {
      token: adaSebelumnya.token,
      nama_siswa: siswa.nama,
      selesai: adaSebelumnya.selesai
    };
  }

  const level1 = await ambilLevel1(db);
  const sekarang = new Date();

  const hasil = await db.hasil_skrining.create({
    data: {
      siswa_id: siswa.id,
      sesi_skrining_id: sesi.id,
      token: randomUUID(),
      nama_responden: masukan.nama_responden,
      nomor_hp_responden: masukan.nomor_hp_responden,
      hubungan_responden: masukan.hubungan_responden,
      waktu_persetujuan: sekarang,
      waktu_mulai: sekarang
    }
  });

  await db.hasil_tes.create({
    data: { hasil_skrining_id: hasil.id, tes_skrining_id: level1.id }
  });

  return { token: hasil.token, nama_siswa: siswa.nama, selesai: hasil.selesai };
}

/**
 * Instrumen Level 1 yang aktif. Dipilih lewat `level`, bukan nama (D43).
 * @param {object} db
 */
async function ambilLevel1(db) {
  const level1 = await db.tes_skrining.findFirst({
    where: { level: 1, aktif: true },
    orderBy: { id: "asc" }
  });

  if (!level1) throw AppError.notFound("Instrumen skrining awal belum tersedia.");
  return level1;
}

/**
 * Mengambil percobaan dari token.
 * @param {object} db
 * @param {string} token
 */
async function ambilPercobaan(db, token) {
  const hasil = await db.hasil_skrining.findUnique({
    where: { token },
    include: { siswa: { select: { nama: true } } }
  });

  if (!hasil) throw AppError.notFound("Sesi pengerjaan tidak ditemukan atau tautannya tidak berlaku.");
  return hasil;
}

/**
 * Menyusun daftar butir satu instrumen beserta jawaban yang sudah tersimpan.
 * Skor opsi tidak pernah dikirim ke peserta.
 * @param {object} db
 * @param {number} hasil_skrining_id
 * @param {number} tes_skrining_id
 */
async function susunPertanyaan(db, hasil_skrining_id, tes_skrining_id) {
  const pertanyaan = await db.pertanyaan.findMany({
    where: { tes_skrining_id, aktif: true },
    include: { opsi_jawaban: { orderBy: { urutan: "asc" } } },
    orderBy: { nomor_urut: "asc" }
  });

  const jawaban = await db.jawaban_siswa.findMany({
    where: { hasil_skrining_id, pertanyaan: { tes_skrining_id } },
    select: { pertanyaan_id: true, opsi_jawaban_id: true }
  });

  const terpilih = new Map(jawaban.map((j) => [j.pertanyaan_id, j.opsi_jawaban_id]));

  return {
    total_soal: pertanyaan.length,
    total_dijawab: jawaban.length,
    pertanyaan: pertanyaan.map((p) => ({
      id: p.id,
      nomor_urut: p.nomor_urut,
      teks: p.teks,
      tipe_jawaban: p.tipe_jawaban,
      url_gambar: p.url_gambar,
      jawaban_terpilih: terpilih.get(p.id) ?? null,
      opsi_jawaban: p.opsi_jawaban.map((o) => ({
        id: o.id,
        label: o.label,
        teks: o.teks,
        url_gambar: o.url_gambar
      }))
    }))
  };
}

/**
 * Butir Skrining Awal beserta jawaban tersimpan.
 * @param {object} db
 * @param {string} token
 */
export async function getPertanyaanLevel1(db, token) {
  const hasil = await ambilPercobaan(db, token);
  const level1 = await ambilLevel1(db);
  const soal = await susunPertanyaan(db, hasil.id, level1.id);

  return {
    token,
    nama_siswa: hasil.siswa.nama,
    tes_skrining_id: level1.id,
    nama: level1.nama,
    petunjuk: level1.deskripsi,
    selesai: hasil.selesai,
    ...soal
  };
}

/**
 * Autosave satu jawaban. Menjawab ulang butir yang sama menimpa barisnya.
 * @param {object} db
 * @param {string} token
 * @param {{ pertanyaan_id: number, opsi_jawaban_id: number }} masukan
 */
export async function simpanJawaban(db, token, { pertanyaan_id, opsi_jawaban_id }) {
  const hasil = await ambilPercobaan(db, token);

  if (hasil.selesai) {
    throw AppError.badRequest("Skrining ini sudah dikirim, jawaban tidak dapat diubah lagi.");
  }

  const opsi = await db.opsi_jawaban.findFirst({
    where: { id: opsi_jawaban_id, pertanyaan_id },
    select: { id: true }
  });
  if (!opsi) throw AppError.badRequest("Opsi jawaban tidak cocok dengan pertanyaan yang dipilih.");

  const kunci = { hasil_skrining_id: hasil.id, pertanyaan_id };

  await db.jawaban_siswa.upsert({
    where: { hasil_skrining_id_pertanyaan_id: kunci },
    update: { opsi_jawaban_id },
    create: { ...kunci, opsi_jawaban_id }
  });

  const total_dijawab = await db.jawaban_siswa.count({ where: { hasil_skrining_id: hasil.id } });

  return { token, pertanyaan_id, opsi_jawaban_id, total_dijawab };
}

/**
 * Memastikan seluruh butir satu instrumen sudah dijawab.
 * @param {{ pertanyaan: Array<{ id: number, nomor_urut: number, jawaban_terpilih: number|null }>,
 *   total_soal: number, total_dijawab: number }} soal
 * @param {string} pesan
 */
function pastikanLengkap(soal, pesan) {
  const belum = soal.pertanyaan
    .filter((p) => p.jawaban_terpilih === null)
    .map((p) => ({ id: p.id, nomor_urut: p.nomor_urut }));

  if (belum.length > 0) {
    throw AppError.badRequest(pesan, {
      total_soal: soal.total_soal,
      total_dijawab: soal.total_dijawab,
      belum_dijawab: belum
    });
  }
}

/**
 * Menutup percobaan: menandai selesai beserta kesimpulan untuk peserta.
 * @param {object} db
 * @param {number} hasil_skrining_id
 */
async function tutupPercobaan(db, hasil_skrining_id) {
  await db.hasil_skrining.update({
    where: { id: hasil_skrining_id },
    data: {
      selesai: true,
      waktu_selesai: new Date(),
      kesimpulan:
        "Pengisian skrining telah selesai. Hasil ini bukan diagnosis; pihak sekolah akan menindaklanjuti bila diperlukan."
    }
  });
}

/**
 * Mengirim Skrining Awal: menilai per domain, menyimpan hasilnya, lalu menugaskan instrumen lanjutan
 * untuk domain yang terindikasi saja (D33, D34).
 * @param {object} db
 * @param {string} token
 */
export async function submitLevel1(db, token) {
  const hasil = await ambilPercobaan(db, token);

  // D41: percobaan yang sudah selesai tidak pernah dinilai ulang.
  if (hasil.selesai) throw AppError.badRequest("Skrining ini sudah dikirim sebelumnya.");

  const sudahDinilai = await db.hasil_kategori.count({ where: { hasil_skrining_id: hasil.id } });
  if (sudahDinilai > 0) throw AppError.badRequest("Skrining awal ini sudah dikirim sebelumnya.");

  const level1 = await ambilLevel1(db);
  const soal = await susunPertanyaan(db, hasil.id, level1.id);
  pastikanLengkap(soal, "Harap lengkapi seluruh pertanyaan sebelum mengirimkan jawaban.");

  const pertanyaan = await db.pertanyaan.findMany({
    where: { tes_skrining_id: level1.id, aktif: true },
    select: { id: true, kategori_asesmen_id: true }
  });

  const jawaban = await db.jawaban_siswa.findMany({
    where: { hasil_skrining_id: hasil.id, pertanyaan: { tes_skrining_id: level1.id } },
    select: { pertanyaan_id: true, opsi_jawaban: { select: { skor: true } } }
  });

  const idDomain = [...new Set(pertanyaan.map((p) => p.kategori_asesmen_id))];
  const kategori = await db.kategori_asesmen.findMany({
    where: { id: { in: idDomain } },
    orderBy: { urutan: "asc" }
  });

  const penilaian = nilaiKategori({
    kategori,
    pertanyaan,
    jawaban: jawaban.map((j) => ({ pertanyaan_id: j.pertanyaan_id, skor: j.opsi_jawaban.skor }))
  });

  // Ambang yang dipakai ikut disimpan, jadi hasil ini tidak berubah bila ambangnya diedit (D35).
  await db.hasil_kategori.createMany({
    data: penilaian.map((p) => ({ hasil_skrining_id: hasil.id, ...p }))
  });

  const total_skor = jawaban.reduce((n, j) => n + j.opsi_jawaban.skor, 0);
  await db.hasil_tes.update({
    where: {
      hasil_skrining_id_tes_skrining_id: { hasil_skrining_id: hasil.id, tes_skrining_id: level1.id }
    },
    data: { total_skor, selesai: true, waktu_selesai: new Date() }
  });

  // Domain terindikasi yang punya instrumen lanjutan; domain tanpa instrumen hanya ditandai (D34).
  const terindikasi = kategori.filter(
    (k) => penilaian.find((p) => p.kategori_asesmen_id === k.id).terindikasi
  );
  const instrumen = terindikasi.filter((k) => k.tes_skrining_id !== null);

  if (instrumen.length > 0) {
    await db.hasil_tes.createMany({
      data: instrumen.map((k) => ({ hasil_skrining_id: hasil.id, tes_skrining_id: k.tes_skrining_id }))
    });
  } else {
    await tutupPercobaan(db, hasil.id);
  }

  const perluLanjutan = instrumen.length > 0;
  const kesimpulan = perluLanjutan
    ? "Ditemukan beberapa indikasi gejala yang memerlukan pemeriksaan lebih mendalam melalui instrumen lanjutan."
    : "Pengisian skrining telah selesai. Hasil ini bukan diagnosis; pihak sekolah akan menindaklanjuti bila diperlukan.";

  return {
    token,
    selesai: !perluLanjutan,
    status: perluLanjutan ? "tindak_lanjut" : "selesai",
    tindak_lanjut_tersedia: perluLanjutan,
    tindakLanjutTersedia: perluLanjutan,
    total_domain_terindikasi: terindikasi.length,
    jumlah_instrumen_lanjutan: instrumen.length,
    kesimpulan,
    pesan:
      perluLanjutan
        ? "Terima kasih. Masih ada bagian lanjutan yang perlu Anda isi."
        : "Pengisian skrining telah selesai. Anda boleh menutup halaman ini."
  };
}

/**
 * Daftar instrumen lanjutan milik percobaan ini, urut `kategori_asesmen.urutan` (D36)
 * dan berlabel netral (D37).
 * @param {object} db
 * @param {number} hasil_skrining_id
 */
async function daftarLanjutan(db, hasil_skrining_id) {
  const baris = await db.hasil_tes.findMany({
    where: { hasil_skrining_id, tes_skrining: { level: 2 } },
    include: { tes_skrining: { include: { kategori_asesmen: { select: { urutan: true } } } } }
  });

  // Urutan domain menentukan urutan pengerjaan; satu instrumen dipakai satu domain.
  return baris.sort(
    (a, b) =>
      (a.tes_skrining.kategori_asesmen[0]?.urutan ?? 0) - (b.tes_skrining.kategori_asesmen[0]?.urutan ?? 0)
  );
}

/**
 * Dashboard instrumen lanjutan. Hanya satu instrumen terbuka sekaligus.
 * @param {object} db
 * @param {string} token
 */
export async function getDashboardTindakLanjut(db, token) {
  const hasil = await ambilPercobaan(db, token);
  const baris = await daftarLanjutan(db, hasil.id);

  let berikutnya = true;
  const daftar_instrumen = baris.map((b, i) => {
    let status = "terkunci";
    if (b.selesai) {
      status = "selesai";
    } else if (berikutnya) {
      status = "aktif";
      berikutnya = false;
    }

    return {
      tes_skrining_id: b.tes_skrining_id,
      label: labelLanjutan(i + 1),
      status,
      total_skor: b.selesai ? b.total_skor : null
    };
  });

  const selesai = daftar_instrumen.filter((i) => i.status === "selesai").length;
  const seluruh_selesai = baris.length === 0 ? hasil.selesai : selesai === baris.length;

  return {
    token,
    nama_siswa: hasil.siswa.nama,
    status_skrining: hasil.selesai ? "selesai" : "sedang_berjalan",
    tindak_lanjut_tersedia: baris.length > 0,
    tindakLanjutTersedia: baris.length > 0,
    total_instrumen: baris.length,
    instrumen_selesai: selesai,
    persentase: baris.length === 0 ? 100 : Math.round((selesai / baris.length) * 100),
    seluruh_selesai,
    kesimpulan: hasil.kesimpulan,
    pesan_penutup: seluruh_selesai
      ? (hasil.kesimpulan ||
        "Seluruh instrumen skrining lanjutan yang ditugaskan untuk anak Anda telah selesai diisi. Penyelesaian skrining bukan merupakan diagnosis. Anda diperbolehkan menutup halaman ini.")
      : null,
    daftar_instrumen
  };
}

/**
 * Memastikan instrumen lanjutan ini memang ditugaskan dan sudah boleh dibuka.
 * @param {object} db
 * @param {number} hasil_skrining_id
 * @param {number} tes_skrining_id
 */
async function pastikanBolehDibuka(db, hasil_skrining_id, tes_skrining_id) {
  const baris = await daftarLanjutan(db, hasil_skrining_id);
  const posisi = baris.findIndex((b) => b.tes_skrining_id === tes_skrining_id);

  if (posisi === -1) throw AppError.notFound("Bagian lanjutan ini tidak ditugaskan untuk anak Anda.");

  const belumSelesaiSebelumnya = baris.slice(0, posisi).some((b) => !b.selesai);
  if (belumSelesaiSebelumnya) {
    throw AppError.badRequest("Selesaikan bagian sebelumnya terlebih dahulu.");
  }

  return { baris, posisi };
}

/**
 * Butir satu instrumen lanjutan.
 * @param {object} db
 * @param {string} token
 * @param {number} tes_skrining_id
 */
export async function getPertanyaanLanjutan(db, token, tes_skrining_id) {
  const hasil = await ambilPercobaan(db, token);
  const { posisi } = await pastikanBolehDibuka(db, hasil.id, tes_skrining_id);

  const tes = await db.tes_skrining.findUnique({ where: { id: tes_skrining_id } });
  const soal = await susunPertanyaan(db, hasil.id, tes_skrining_id);

  return {
    token,
    tes_skrining_id,
    label: labelLanjutan(posisi + 1),
    petunjuk: tes.deskripsi,
    ...soal
  };
}

/**
 * Mengirim satu instrumen lanjutan.
 *
 * shortcut: Level 2 hanya menyimpan total skor per instrumen tanpa pita interpretasi; tim belum
 * menetapkan ambang dan teks hasilnya. Tambahkan saat sudah ada.
 *
 * @param {object} db
 * @param {string} token
 * @param {number} tes_skrining_id
 */
export async function submitLanjutan(db, token, tes_skrining_id) {
  const hasil = await ambilPercobaan(db, token);
  const { baris, posisi } = await pastikanBolehDibuka(db, hasil.id, tes_skrining_id);

  if (baris[posisi].selesai) throw AppError.badRequest("Bagian ini sudah dikirim sebelumnya.");

  const soal = await susunPertanyaan(db, hasil.id, tes_skrining_id);
  pastikanLengkap(soal, "Harap lengkapi seluruh pertanyaan pada bagian ini sebelum mengirim.");

  const jawaban = await db.jawaban_siswa.findMany({
    where: { hasil_skrining_id: hasil.id, pertanyaan: { tes_skrining_id } },
    select: { opsi_jawaban: { select: { skor: true } } }
  });
  const total_skor = jawaban.reduce((n, j) => n + j.opsi_jawaban.skor, 0);

  await db.hasil_tes.update({
    where: { hasil_skrining_id_tes_skrining_id: { hasil_skrining_id: hasil.id, tes_skrining_id } },
    data: { total_skor, selesai: true, waktu_selesai: new Date() }
  });

  const sisa = baris.filter((b, i) => i !== posisi && !b.selesai).length;
  if (sisa === 0) await tutupPercobaan(db, hasil.id);

  return {
    token,
    tes_skrining_id,
    label: labelLanjutan(posisi + 1),
    selesai: sisa === 0,
    sisa_instrumen: sisa,
    pesan:
      sisa === 0
        ? "Seluruh bagian telah selesai diisi. Anda boleh menutup halaman ini."
        : "Jawaban Anda tersimpan. Lanjutkan ke bagian berikutnya."
  };
}
