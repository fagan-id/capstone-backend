/**
 * Layanan Fitur Tab Penilaian Tes Skrining untuk Super Admin.
 * Menangani pembacaan konfigurasi penilaian Level 1 & Level 2,
 * pembaruan aturan numerik & kategorikal Level 1, serta pengelolaan rentang skor Level 2.
 */

import AppError from "../../utils/appError.js";
import { apakahRentangOverlap } from "../../validators/superAdmin/superAdminPenilaianSkrining.js";

/**
 * Memastikan tes skrining ada di database.
 * @param {object} db
 * @param {number} tesId
 */
async function pastikanTesAda(db, tesId) {
  const tes = await db.tes_skrining.findUnique({
    where: { id: tesId }
  });

  if (!tes) {
    throw AppError.notFound("Tes skrining tidak ditemukan.");
  }

  return tes;
}

/**
 * Mengambil konfigurasi penilaian tes skrining (Level 1 atau Level 2).
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining
 */
export async function getPenilaian(db, tesId) {
  const tes = await pastikanTesAda(db, tesId);

  // ==========================================
  // LEVEL 1: Aturan Penilaian Lintas Domain
  // ==========================================
  if (tes.level === 1) {
    const questions = await db.pertanyaan.findMany({
      where: { tes_skrining_id: tesId },
      include: {
        opsi_jawaban: { orderBy: { urutan: "asc" } }
      }
    });

    const domainIds = [...new Set(questions.map((p) => p.kategori_asesmen_id))];

    if (domainIds.length === 0) {
      return {
        tes: { id: tes.id, nama: tes.nama, level: tes.level, jenjang: tes.jenjang },
        level: 1,
        metode_penilaian: "Skor tertinggi dari seluruh pertanyaan dalam masing-masing domain digunakan sebagai skor domain.",
        sifat_konfigurasi: "global",
        metadata: {
          keluaran: "Rekomendasi Tindak Lanjut Level 2",
          formula: "Max(Item_1, Item_2, ...) >= Ambang Batas",
          bisa_tambah_aturan: false,
          bisa_hapus_aturan: false
        },
        aturan: []
      };
    }

    const domains = await db.kategori_asesmen.findMany({
      where: { id: { in: domainIds } },
      orderBy: [{ urutan: "asc" }, { id: "asc" }]
    });

    const aturan = domains.map((k) => {
      const qList = questions.filter((q) => q.kategori_asesmen_id === k.id);
      const hasYaTidak = qList.some((q) => q.tipe_jawaban === "ya_tidak");
      const tipe_aturan = hasYaTidak ? "kategorikal" : "numerik";
      const format_jawaban = hasYaTidak ? "Ya / Tidak / Tidak Tahu" : "Skala 0-4";
      const operator = hasYaTidak ? "in" : ">=";

      const opsiList = qList[0]?.opsi_jawaban || [];
      const opsi_tersedia = opsiList.map((o) => ({
        label: o.label,
        teks: o.teks,
        skor: o.skor,
        pemicu: o.skor >= k.ambang_batas
      }));

      const kondisi_pemicu = hasYaTidak
        ? "Ya, Tidak Tahu"
        : k.ambang_batas !== undefined
          ? `>= ${k.ambang_batas}`
          : "-";

      const nilai_pemicu = hasYaTidak
        ? opsi_tersedia.filter((o) => o.pemicu).map((o) => o.teks)
        : undefined;

      return {
        id: k.id,
        domain_id: k.id,
        nama_domain: k.nama,
        urutan: k.urutan,
        tipe_aturan,
        format_jawaban,
        operator,
        ambang_batas: k.ambang_batas,
        kondisi_pemicu,
        nilai_pemicu,
        opsi_tersedia
      };
    });

    return {
      tes: { id: tes.id, nama: tes.nama, level: tes.level, jenjang: tes.jenjang },
      level: 1,
      metode_penilaian: "Skor tertinggi dari seluruh pertanyaan dalam masing-masing domain digunakan sebagai skor domain.",
      sifat_konfigurasi: "global",
      aturan
    };
  }

  // ==========================================
  // LEVEL 2: Rentang Skor & Kategori Keparahan
  // ==========================================
  let rentang = [];
  if (db.rentang_penilaian && typeof db.rentang_penilaian.findMany === "function") {
    rentang = await db.rentang_penilaian.findMany({
      where: { tes_skrining_id: tesId },
      orderBy: [{ urutan: "asc" }, { skor_min: "asc" }]
    });
  }

  const formattedRentang = rentang.map((r) => {
    const minVal = Number(r.skor_min);
    const maxVal = r.skor_max !== null && r.skor_max !== undefined ? Number(r.skor_max) : null;
    const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;

    return {
      id: r.id,
      tes_skrining_id: r.tes_skrining_id,
      keluaran: "T-Score",
      skor_min: minVal,
      skor_max: maxVal,
      rentang_label,
      rentang_teks: rentang_label,
      kategori: r.kategori,
      urutan: r.urutan
    };
  });

  return {
    tes: { id: tes.id, nama: tes.nama, level: tes.level, jenjang: tes.jenjang },
    level: 2,
    metode_penilaian: {
      rumus: "Raw Score = Total skor seluruh item",
      hasil_perhitungan: "Konversi raw score menjadi T-Score",
      keluaran: "T-Score"
    },
    metadata: {
      keluaran: "T-Score",
      rumus: "Raw Score = Total skor seluruh item",
      hasil_perhitungan: "Konversi raw score menjadi T-Score",
      bisa_tambah_aturan: true,
      bisa_hapus_aturan: true
    },
    sifat_konfigurasi: "per_tes",
    rentang: formattedRentang,
    aturan: formattedRentang
  };
}

/**
 * Memperbarui aturan penilaian domain Level 1 (ambang numerik atau kategorikal).
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 1
 * @param {number} aturanId ID domain / kategori_asesmen
 * @param {object} data
 */
export async function updatePenilaianLevel1(db, tesId, aturanId, data) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 1) {
    throw AppError.badRequest("Pembaruan aturan Level 1 hanya berlaku untuk tes skrining Level 1.");
  }

  // 1. Pastikan domain berada dalam cakupan pertanyaan tes Level 1 ini
  const domainInTest = await db.pertanyaan.findFirst({
    where: { tes_skrining_id: tesId, kategori_asesmen_id: aturanId },
    include: { opsi_jawaban: true }
  });

  if (!domainInTest) {
    throw AppError.badRequest("Domain asesmen berada di luar cakupan tes Level 1 ini.");
  }

  const domain = await db.kategori_asesmen.findUnique({
    where: { id: aturanId }
  });

  if (!domain) {
    throw AppError.notFound("Domain asesmen tidak ditemukan.");
  }

  // 2. Tentukan ambang batas baru
  let ambang_batas = domain.ambang_batas;

  if (data.ambang_batas !== undefined) {
    ambang_batas = data.ambang_batas;
  } else if (data.nilai_pemicu) {
    // Pada format kategorikal ya_tidak, nilai pemicu "Ya" / "Tidak tahu" bersesuaian dengan ambang batas skor opsi
    const matchingOption = domainInTest.opsi_jawaban?.find((o) =>
      data.nilai_pemicu.some((val) => val.toLowerCase() === o.teks.toLowerCase() || val.toLowerCase() === o.label.toLowerCase())
    );
    if (matchingOption) {
      ambang_batas = matchingOption.skor;
    }
  }

  // 3. Simpan perubahan pada kategori_asesmen
  const updated = await db.kategori_asesmen.update({
    where: { id: aturanId },
    data: { ambang_batas }
  });

  const hasYaTidak = domainInTest.tipe_jawaban === "ya_tidak";
  const tipe_aturan = hasYaTidak ? "kategorikal" : "numerik";
  const format_jawaban = hasYaTidak ? "Ya / Tidak / Tidak Tahu" : "Skala 0-4";
  const kondisi_pemicu = hasYaTidak
    ? "Ya, Tidak Tahu"
    : `>= ${updated.ambang_batas}`;

  return {
    id: updated.id,
    domain_id: updated.id,
    nama_domain: updated.nama,
    urutan: updated.urutan,
    tipe_aturan,
    format_jawaban,
    operator: hasYaTidak ? "in" : ">=",
    ambang_batas: updated.ambang_batas,
    kondisi_pemicu,
    nilai_pemicu: hasYaTidak ? ["Ya", "Tidak Tahu"] : undefined
  };
}

/**
 * Menambahkan rentang skor baru untuk tes Level 2.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 2
 * @param {object} data
 */
export async function tambahRentangLevel2(db, tesId, data) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Penambahan rentang skor hanya didukung untuk tes skrining Level 2.");
  }

  // 1. Cek tumpang tindih (overlap) dengan rentang yang sudah ada
  const existing = await db.rentang_penilaian.findMany({
    where: { tes_skrining_id: tesId }
  });

  for (const ex of existing) {
    const exMin = Number(ex.skor_min);
    const exMax = ex.skor_max !== null && ex.skor_max !== undefined ? Number(ex.skor_max) : null;
    if (apakahRentangOverlap(data.skor_min, data.skor_max, exMin, exMax)) {
      throw AppError.conflict(
        `Rentang skor yang dimasukkan tumpang tindih (overlap) dengan rentang '${ex.kategori}' (${exMin} - ${exMax ?? "∞"}).`
      );
    }
  }

  const urutan = data.urutan || existing.length + 1;

  // 2. Simpan rentang baru
  const baru = await db.rentang_penilaian.create({
    data: {
      tes_skrining_id: tesId,
      kategori: data.kategori,
      skor_min: data.skor_min,
      skor_max: data.skor_max ?? null,
      urutan
    }
  });

  const minVal = Number(baru.skor_min);
  const maxVal = baru.skor_max !== null ? Number(baru.skor_max) : null;
  const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;

  return {
    id: baru.id,
    tes_skrining_id: baru.tes_skrining_id,
    keluaran: "T-Score",
    skor_min: minVal,
    skor_max: maxVal,
    rentang_label,
    kategori: baru.kategori,
    urutan: baru.urutan
  };
}

/**
 * Memperbarui rentang skor pada tes Level 2.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 2
 * @param {number} aturanId ID rentang penilaian
 * @param {object} data
 */
export async function updateRentangLevel2(db, tesId, aturanId, data) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Pembaruan rentang skor hanya didukung untuk tes skrining Level 2.");
  }

  const curr = await db.rentang_penilaian.findUnique({
    where: { id: aturanId }
  });

  if (!curr || curr.tes_skrining_id !== tesId) {
    throw AppError.notFound("Rentang penilaian tidak ditemukan pada tes ini.");
  }

  const minVal = data.skor_min !== undefined ? data.skor_min : Number(curr.skor_min);
  const maxVal = data.skor_max !== undefined ? data.skor_max : (curr.skor_max !== null ? Number(curr.skor_max) : null);

  if (maxVal !== null && minVal > maxVal) {
    throw AppError.badRequest("Nilai minimum tidak boleh lebih besar dari nilai maksimum.");
  }

  // Cek overlap dengan rentang lain
  const others = await db.rentang_penilaian.findMany({
    where: { tes_skrining_id: tesId, id: { not: aturanId } }
  });

  for (const ex of others) {
    const exMin = Number(ex.skor_min);
    const exMax = ex.skor_max !== null && ex.skor_max !== undefined ? Number(ex.skor_max) : null;
    if (apakahRentangOverlap(minVal, maxVal, exMin, exMax)) {
      throw AppError.conflict(
        `Rentang skor hasil pembaruan tumpang tindih (overlap) dengan rentang '${ex.kategori}' (${exMin} - ${exMax ?? "∞"}).`
      );
    }
  }

  const updated = await db.rentang_penilaian.update({
    where: { id: aturanId },
    data: {
      kategori: data.kategori !== undefined ? data.kategori : curr.kategori,
      skor_min: minVal,
      skor_max: maxVal,
      urutan: data.urutan !== undefined ? data.urutan : curr.urutan
    }
  });

  const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;

  return {
    id: updated.id,
    tes_skrining_id: updated.tes_skrining_id,
    keluaran: "T-Score",
    skor_min: minVal,
    skor_max: maxVal,
    rentang_label,
    kategori: updated.kategori,
    urutan: updated.urutan
  };
}

/**
 * Memperbarui batch seluruh rentang skor pada tes Level 2 secara atomik.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 2
 * @param {Array<object>} items
 */
export async function updateBatchRentangLevel2(db, tesId, items) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Pembaruan batch rentang skor hanya didukung untuk tes skrining Level 2.");
  }

  const hasil = await db.$transaction(async (tx) => {
    // Audit Tahap 4 & 5: Lindungi narasi interpretasi existing agar tidak terhapus saat batch update rentang
    let descMap = new Map();
    if (typeof tx.rentang_penilaian.findMany === "function") {
      try {
        const existingList = await tx.rentang_penilaian.findMany({
          where: { tes_skrining_id: tesId }
        });
        if (Array.isArray(existingList)) {
          descMap = new Map(
            existingList.map((r) => [
              r.kategori ? r.kategori.toLowerCase().trim() : "",
              { deskripsi: r.deskripsi ?? null, rekomendasi: r.rekomendasi ?? null }
            ])
          );
        }
      } catch {
        // Mock DB fallback jika findMany belum didefinisikan
      }
    }

    await tx.rentang_penilaian.deleteMany({
      where: { tes_skrining_id: tesId }
    });

    const createdList = [];
    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      const prevDesc = descMap.get(it.kategori ? it.kategori.toLowerCase().trim() : "");
      const created = await tx.rentang_penilaian.create({
        data: {
          tes_skrining_id: tesId,
          kategori: it.kategori,
          skor_min: it.skor_min,
          skor_max: it.skor_max ?? null,
          urutan: it.urutan ?? (idx + 1),
          deskripsi: it.deskripsi !== undefined ? it.deskripsi : (prevDesc?.deskripsi ?? null),
          rekomendasi: it.rekomendasi !== undefined ? it.rekomendasi : (prevDesc?.rekomendasi ?? null)
        }
      });
      createdList.push(created);
    }
    return createdList;
  });

  return hasil.map((r) => {
    const minVal = Number(r.skor_min);
    const maxVal = r.skor_max !== null ? Number(r.skor_max) : null;
    const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;

    return {
      id: r.id,
      tes_skrining_id: r.tes_skrining_id,
      keluaran: "T-Score",
      skor_min: minVal,
      skor_max: maxVal,
      rentang_label,
      kategori: r.kategori,
      urutan: r.urutan
    };
  });
}

/**
 * Menghapus satu rentang skor pada tes Level 2.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 2
 * @param {number} aturanId ID rentang penilaian
 */
export async function hapusRentangLevel2(db, tesId, aturanId) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Penghapusan aturan penilaian hanya didukung untuk tes skrining Level 2.");
  }

  const curr = await db.rentang_penilaian.findUnique({
    where: { id: aturanId }
  });

  if (!curr || curr.tes_skrining_id !== tesId) {
    throw AppError.notFound("Rentang penilaian tidak ditemukan pada tes ini.");
  }

  await db.rentang_penilaian.delete({
    where: { id: aturanId }
  });

  return {
    id: aturanId,
    message: "Rentang penilaian berhasil dihapus."
  };
}
