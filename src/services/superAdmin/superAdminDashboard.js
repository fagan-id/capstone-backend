/**
 * Layanan Fitur Dashboard Super Admin.
 * Menghitung ringkasan statistik KPI dan menyusun feed aktivitas platform terbaru.
 */

import { filterSesiAktif } from "../../utils/statusSesi.js";

/**
 * Format tanggal ramah pengguna (misal: "24 Sep 2026").
 * @param {Date|string} date
 * @returns {string}
 */
function formatTanggalAktivitas(date) {
  if (!date) return "-";
  try {
    const d = new Date(date);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return String(date);
  }
}

/**
 * Mengambil data ringkasan KPI dan aktivitas terbaru untuk Dashboard Super Admin.
 *
 * @param {object} db Prisma client / transaction
 * @param {{ page: number, limit: number, kategori?: string }} query
 */
export async function getDashboardData(db, query = { page: 1, limit: 5 }) {
  const { page = 1, limit = 5, kategori } = query;

  // 1. Eksekusi hitungan KPI utama
  const [totalSekolah, sekolahAktif, sekolahNonaktif, sesiAktif, totalSesi, totalSiswa] =
    await Promise.all([
      db.sekolah ? db.sekolah.count() : 0,
      db.sekolah ? db.sekolah.count({ where: { aktif: true } }) : 0,
      db.sekolah ? db.sekolah.count({ where: { aktif: false } }) : 0,
      db.sesi_skrining ? db.sesi_skrining.count({ where: filterSesiAktif() }) : 0,
      db.sesi_skrining ? db.sesi_skrining.count() : 0,
      db.siswa ? db.siswa.count() : 0
    ]);

  // Hitung jumlah siswa yang telah diskrining (hasil skrining yang telah selesai)
  let totalSiswaDiskrining = 0;
  if (db.hasil_skrining && typeof db.hasil_skrining.findMany === "function") {
    try {
      const hasilSelesai = await db.hasil_skrining.findMany({
        where: { selesai: true },
        select: { siswa_id: true },
        distinct: ["siswa_id"]
      });
      totalSiswaDiskrining = hasilSelesai.length;
    } catch {
      // Fallback count biasa jika distinct mock belum lengkap
      if (typeof db.hasil_skrining.count === "function") {
        totalSiswaDiskrining = await db.hasil_skrining.count({ where: { selesai: true } }).catch(() => 0);
      }
    }
  }

  // 2. Kumpulkan feed aktivitas terbaru lintas entitas
  const daftarAktivitas = [];

  // A. Aktivitas Sekolah (Sekolah Baru & Sekolah Dinonaktifkan)
  if (db.sekolah && typeof db.sekolah.findMany === "function" && (!kategori || kategori === "sekolah")) {
    try {
      const sekolahList = await db.sekolah.findMany({
        select: { id: true, nama: true, created_at: true, updated_at: true, aktif: true },
        orderBy: { created_at: "desc" },
        take: 20
      });

      for (const s of sekolahList) {
        // Sekolah baru ditambahkan
        if (s.created_at) {
          daftarAktivitas.push({
            id: `sekolah-created-${s.id}`,
            tipe: "sekolah",
            aktivitas: "Sekolah baru ditambahkan",
            detail: s.nama,
            tanggal: new Date(s.created_at),
            tanggal_format: formatTanggalAktivitas(s.created_at),
            status: "Baru",
            badge: "Baru",
            badge_color: "green"
          });
        }

        // Sekolah dinonaktifkan (jika berstatus nonaktif dan pernah diperbarui)
        if (!s.aktif && s.updated_at && s.created_at && s.updated_at > s.created_at) {
          daftarAktivitas.push({
            id: `sekolah-deactivated-${s.id}`,
            tipe: "sekolah",
            aktivitas: "Sekolah dinonaktifkan",
            detail: s.nama,
            tanggal: new Date(s.updated_at),
            tanggal_format: formatTanggalAktivitas(s.updated_at),
            status: "Nonaktif",
            badge: "Nonaktif",
            badge_color: "red"
          });
        }
      }
    } catch {
      // Abaikan jika tabel tidak tersedia
    }
  }

  // B. Aktivitas Tes Skrining (Tes Skrining Diperbarui / Dibuat)
  if (db.tes_skrining && typeof db.tes_skrining.findMany === "function" && (!kategori || kategori === "tes")) {
    try {
      const tesList = await db.tes_skrining.findMany({
        select: { id: true, nama: true, updated_at: true, created_at: true },
        orderBy: { updated_at: "desc" },
        take: 15
      });

      for (const t of tesList) {
        const waktu = t.updated_at || t.created_at;
        if (waktu) {
          daftarAktivitas.push({
            id: `tes-updated-${t.id}`,
            tipe: "tes",
            aktivitas: "Tes Skrining diperbarui",
            detail: t.nama,
            tanggal: new Date(waktu),
            tanggal_format: formatTanggalAktivitas(waktu),
            status: "Diperbarui",
            badge: "Diperbarui",
            badge_color: "blue"
          });
        }
      }
    } catch {
      // Abaikan jika tabel tidak tersedia
    }
  }

  // C. Aktivitas Sesi Skrining (Sesi Baru Dibuat)
  if (db.sesi_skrining && typeof db.sesi_skrining.findMany === "function" && (!kategori || kategori === "sesi")) {
    try {
      const sesiList = await db.sesi_skrining.findMany({
        select: {
          id: true,
          nama: true,
          created_at: true,
          sekolah: { select: { nama: true } }
        },
        orderBy: { created_at: "desc" },
        take: 15
      });

      for (const ss of sesiList) {
        if (ss.created_at) {
          const detailSekolah = ss.sekolah?.nama ? `${ss.sekolah.nama} — ${ss.nama}` : ss.nama;
          daftarAktivitas.push({
            id: `sesi-created-${ss.id}`,
            tipe: "sesi",
            aktivitas: "Sesi baru dibuat",
            detail: detailSekolah,
            tanggal: new Date(ss.created_at),
            tanggal_format: formatTanggalAktivitas(ss.created_at),
            status: "Sesi Baru",
            badge: "Sesi Baru",
            badge_color: "orange"
          });
        }
      }
    } catch {
      // Abaikan jika tabel tidak tersedia
    }
  }

  // 3. Urutkan seluruh aktivitas secara deterministik (tanggal desc)
  daftarAktivitas.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());

  // 4. Paginasi aktivitas
  const totalItems = daftarAktivitas.length;
  const totalPages = Math.ceil(totalItems / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedAktivitas = daftarAktivitas.slice(startIndex, startIndex + limit);

  // 5. Susun format response terstruktur sesuai referensi UI
  return {
    statistik: {
      total_sekolah: totalSekolah,
      sekolah_aktif: sekolahAktif,
      sekolah_nonaktif: sekolahNonaktif,
      sesi_aktif: sesiAktif,
      total_sesi: totalSesi,
      total_siswa_diskrining: totalSiswaDiskrining,
      total_siswa_terdaftar: totalSiswa
    },
    kpi_cards: [
      {
        id: "total_sekolah",
        judul: "Total Sekolah",
        nilai: totalSekolah,
        deskripsi: "Jumlah sekolah yang terdaftar di platform"
      },
      {
        id: "sekolah_aktif",
        judul: "Sekolah Aktif",
        nilai: sekolahAktif,
        deskripsi: "Sekolah dengan aktivitas aktif"
      },
      {
        id: "sesi_aktif",
        judul: "Sesi Aktif",
        nilai: sesiAktif,
        deskripsi: "Sesi skrining yang sedang berjalan"
      },
      {
        id: "total_siswa",
        judul: "Total Siswa",
        nilai: totalSiswaDiskrining,
        deskripsi: "Siswa yang telah diskrining"
      }
    ],
    aktivitas_terbaru: paginatedAktivitas.map((a) => ({
      id: a.id,
      aktivitas: a.aktivitas,
      detail: a.detail,
      tanggal: a.tanggal.toISOString(),
      tanggal_format: a.tanggal_format,
      status: a.status,
      badge: a.badge,
      badge_color: a.badge_color
    })),
    pagination: {
      page,
      limit,
      total_items: totalItems,
      total_pages: totalPages
    }
  };
}
