/**
 * Layanan Fitur Tab Interpretasi Tes Skrining untuk Super Admin.
 * Menangani pembacaan dan pembaruan konfigurasi narasi interpretasi serta rekomendasi
 * untuk tes skrining Level 1 (berbasis domain & kondisi ambang) dan Level 2 (berbasis rentang skor).
 */

import AppError from "../../utils/appError.js";

const CATATAN_KLINIS_DEFAULT =
  "Screening ini merupakan skrining awal dan bukan diagnosis. Hasil perlu ditindaklanjuti dengan observasi atau asesmen profesional apabila diperlukan.";

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
 * Memastikan domain asesmen berada dalam cakupan tes Level 1.
 * @param {object} db
 * @param {number} tesId
 * @param {number} domainId
 */
async function pastikanDomainDalamCakupan(db, tesId, domainId) {
  const ada = await db.pertanyaan.findFirst({
    where: { tes_skrining_id: tesId, kategori_asesmen_id: domainId }
  });

  if (!ada) {
    throw AppError.badRequest("Domain asesmen berada di luar cakupan tes Level 1 ini.");
  }
}

/**
 * Mengambil daftar konfigurasi interpretasi tes skrining (Level 1 atau Level 2).
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining
 */
export async function getInterpretasi(db, tesId) {
  const tes = await pastikanTesAda(db, tesId);

  // ==========================================
  // LEVEL 1: Interpretasi Berbasis Domain & Kondisi
  // ==========================================
  if (tes.level === 1) {
    const questions = await db.pertanyaan.findMany({
      where: { tes_skrining_id: tesId, aktif: true },
      select: { kategori_asesmen_id: true }
    });

    const domainIds = [...new Set(questions.map((p) => p.kategori_asesmen_id))];

    if (domainIds.length === 0) {
      return {
        tes: { id: tes.id, nama: tes.nama, level: 1, jenjang: tes.jenjang },
        level: 1,
        sifat_konfigurasi: "global",
        catatan_klinis: CATATAN_KLINIS_DEFAULT,
        items: []
      };
    }

    const domains = await db.kategori_asesmen.findMany({
      where: { id: { in: domainIds } },
      orderBy: [{ urutan: "asc" }, { id: "asc" }]
    });

    const items = domains.map((k) => {
      const belumTerisi = Boolean(k.deskripsi_belum_memenuhi || k.rekomendasi_belum_memenuhi);
      const memenuhiTerisi = Boolean(k.deskripsi || k.rekomendasi);

      return {
        kategori_id: k.id,
        nama_domain: k.nama,
        urutan: k.urutan,
        kondisi: [
          {
            id: `${k.id}-belum_memenuhi`,
            kondisi: "belum_memenuhi",
            label_kondisi: "Belum Memenuhi Ambang Batas",
            badge: "Belum Memenuhi Ambang Batas",
            deskripsi: k.deskripsi_belum_memenuhi ?? null,
            rekomendasi: k.rekomendasi_belum_memenuhi ?? null,
            terindikasi: false,
            terisi: belumTerisi
          },
          {
            id: `${k.id}-memenuhi`,
            kondisi: "memenuhi",
            label_kondisi: "Memenuhi Ambang Skrining Lanjutan",
            badge: "Memenuhi Ambang Skrining Lanjutan",
            deskripsi: k.deskripsi ?? null,
            rekomendasi: k.rekomendasi ?? null,
            terindikasi: true,
            terisi: memenuhiTerisi
          }
        ]
      };
    });

    return {
      tes: { id: tes.id, nama: tes.nama, level: 1, jenjang: tes.jenjang },
      level: 1,
      sifat_konfigurasi: "global",
      catatan_klinis: CATATAN_KLINIS_DEFAULT,
      items
    };
  }

  // ==========================================
  // LEVEL 2: Interpretasi Berbasis Rentang Penilaian
  // ==========================================
  const rentangList = await db.rentang_penilaian.findMany({
    where: { tes_skrining_id: tesId },
    orderBy: [{ urutan: "asc" }, { skor_min: "asc" }]
  });

  const items = rentangList.map((r) => {
    const minVal = Number(r.skor_min);
    const maxVal = r.skor_max !== null && r.skor_max !== undefined ? Number(r.skor_max) : null;
    const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;
    const terisi = Boolean(r.deskripsi || r.rekomendasi);

    return {
      id: r.id,
      rentang_penilaian_id: r.id,
      kategori: r.kategori,
      skor_min: minVal,
      skor_max: maxVal,
      rentang_label,
      urutan: r.urutan,
      deskripsi: r.deskripsi ?? null,
      rekomendasi: r.rekomendasi ?? null,
      terisi
    };
  });

  return {
    tes: { id: tes.id, nama: tes.nama, level: 2, jenjang: tes.jenjang },
    level: 2,
    sifat_konfigurasi: "per_tes",
    catatan_klinis: CATATAN_KLINIS_DEFAULT,
    metode_skor: "Raw Score",
    items
  };
}

/**
 * Mengambil detail konfigurasi interpretasi Level 1 (satu domain dan kondisi).
 *
 * @param {object} db
 * @param {number} tesId
 * @param {number} domainId
 * @param {"belum_memenuhi"|"memenuhi"} [kondisi]
 */
export async function getDetailInterpretasiLevel1(db, tesId, domainId, kondisi) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 1) {
    throw AppError.badRequest("Detail interpretasi domain hanya berlaku untuk tes skrining Level 1.");
  }

  await pastikanDomainDalamCakupan(db, tesId, domainId);

  const domain = await db.kategori_asesmen.findUnique({
    where: { id: domainId }
  });

  if (!domain) {
    throw AppError.notFound("Domain asesmen tidak ditemukan.");
  }

  if (kondisi === "belum_memenuhi") {
    return {
      tes: { id: tes.id, nama: tes.nama, level: 1 },
      kategori_id: domain.id,
      nama_domain: domain.nama,
      urutan: domain.urutan,
      kondisi: "belum_memenuhi",
      label_kondisi: "Belum Memenuhi Ambang Batas",
      badge: "Belum Memenuhi Ambang Batas",
      terindikasi: false,
      deskripsi: domain.deskripsi_belum_memenuhi ?? null,
      rekomendasi: domain.rekomendasi_belum_memenuhi ?? null,
      terisi: Boolean(domain.deskripsi_belum_memenuhi || domain.rekomendasi_belum_memenuhi)
    };
  }

  if (kondisi === "memenuhi") {
    return {
      tes: { id: tes.id, nama: tes.nama, level: 1 },
      kategori_id: domain.id,
      nama_domain: domain.nama,
      urutan: domain.urutan,
      kondisi: "memenuhi",
      label_kondisi: "Memenuhi Ambang Skrining Lanjutan",
      badge: "Memenuhi Ambang Skrining Lanjutan",
      terindikasi: true,
      deskripsi: domain.deskripsi ?? null,
      rekomendasi: domain.rekomendasi ?? null,
      terisi: Boolean(domain.deskripsi || domain.rekomendasi)
    };
  }

  // Jika kondisi tidak ditentukan, kembalikan kedua kondisi
  return {
    tes: { id: tes.id, nama: tes.nama, level: 1 },
    kategori_id: domain.id,
    nama_domain: domain.nama,
    urutan: domain.urutan,
    kondisi: [
      {
        kondisi: "belum_memenuhi",
        label_kondisi: "Belum Memenuhi Ambang Batas",
        deskripsi: domain.deskripsi_belum_memenuhi ?? null,
        rekomendasi: domain.rekomendasi_belum_memenuhi ?? null
      },
      {
        kondisi: "memenuhi",
        label_kondisi: "Memenuhi Ambang Skrining Lanjutan",
        deskripsi: domain.deskripsi ?? null,
        rekomendasi: domain.rekomendasi ?? null
      }
    ]
  };
}

/**
 * Mengambil detail konfigurasi interpretasi Level 2 (satu rentang).
 *
 * @param {object} db
 * @param {number} tesId
 * @param {number} rentangId
 */
export async function getDetailInterpretasiLevel2(db, tesId, rentangId) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Detail interpretasi rentang skor hanya berlaku untuk tes skrining Level 2.");
  }

  const rentang = await db.rentang_penilaian.findUnique({
    where: { id: rentangId }
  });

  if (!rentang || rentang.tes_skrining_id !== tesId) {
    throw AppError.notFound("Rentang penilaian tidak ditemukan pada tes ini.");
  }

  const minVal = Number(rentang.skor_min);
  const maxVal = rentang.skor_max !== null && rentang.skor_max !== undefined ? Number(rentang.skor_max) : null;
  const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;

  return {
    tes: { id: tes.id, nama: tes.nama, level: 2 },
    id: rentang.id,
    rentang_penilaian_id: rentang.id,
    kategori: rentang.kategori,
    skor_min: minVal,
    skor_max: maxVal,
    rentang_label,
    urutan: rentang.urutan,
    deskripsi: rentang.deskripsi ?? null,
    rekomendasi: rentang.rekomendasi ?? null,
    terisi: Boolean(rentang.deskripsi || rentang.rekomendasi)
  };
}

/**
 * Memperbarui konfigurasi interpretasi Level 1 (ambang batas belum/memenuhi).
 *
 * @param {object} db
 * @param {number} tesId
 * @param {number} domainId
 * @param {object} payload
 */
export async function updateInterpretasiLevel1(db, tesId, domainId, payload) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 1) {
    throw AppError.badRequest("Pembaruan interpretasi domain hanya berlaku untuk tes skrining Level 1.");
  }

  await pastikanDomainDalamCakupan(db, tesId, domainId);

  const domain = await db.kategori_asesmen.findUnique({
    where: { id: domainId }
  });

  if (!domain) {
    throw AppError.notFound("Domain asesmen tidak ditemukan.");
  }

  const dataToUpdate = {};

  if (payload.tipe === "batch") {
    if (payload.belum_memenuhi) {
      if (payload.belum_memenuhi.deskripsi !== undefined) {
        dataToUpdate.deskripsi_belum_memenuhi = payload.belum_memenuhi.deskripsi;
      }
      if (payload.belum_memenuhi.rekomendasi !== undefined) {
        dataToUpdate.rekomendasi_belum_memenuhi = payload.belum_memenuhi.rekomendasi;
      }
    }
    if (payload.memenuhi) {
      if (payload.memenuhi.deskripsi !== undefined) {
        dataToUpdate.deskripsi = payload.memenuhi.deskripsi;
      }
      if (payload.memenuhi.rekomendasi !== undefined) {
        dataToUpdate.rekomendasi = payload.memenuhi.rekomendasi;
      }
    }
  } else {
    // Single condition
    if (payload.kondisi === "belum_memenuhi") {
      if (payload.deskripsi !== undefined) dataToUpdate.deskripsi_belum_memenuhi = payload.deskripsi;
      if (payload.rekomendasi !== undefined) dataToUpdate.rekomendasi_belum_memenuhi = payload.rekomendasi;
    } else if (payload.kondisi === "memenuhi") {
      if (payload.deskripsi !== undefined) dataToUpdate.deskripsi = payload.deskripsi;
      if (payload.rekomendasi !== undefined) dataToUpdate.rekomendasi = payload.rekomendasi;
    }
  }

  const updated = await db.kategori_asesmen.update({
    where: { id: domainId },
    data: dataToUpdate
  });

  return {
    kategori_id: updated.id,
    nama_domain: updated.nama,
    urutan: updated.urutan,
    kondisi_diperbarui: payload.kondisi ?? (payload.tipe === "batch" ? "keduanya" : "memenuhi"),
    belum_memenuhi: {
      deskripsi: updated.deskripsi_belum_memenuhi ?? null,
      rekomendasi: updated.rekomendasi_belum_memenuhi ?? null
    },
    memenuhi: {
      deskripsi: updated.deskripsi ?? null,
      rekomendasi: updated.rekomendasi ?? null
    }
  };
}

/**
 * Memperbarui konfigurasi interpretasi Level 2 (rentang skor).
 *
 * @param {object} db
 * @param {number} tesId
 * @param {number} rentangId
 * @param {object} payload
 */
export async function updateInterpretasiLevel2(db, tesId, rentangId, payload) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Pembaruan interpretasi rentang skor hanya berlaku untuk tes skrining Level 2.");
  }

  const rentang = await db.rentang_penilaian.findUnique({
    where: { id: rentangId }
  });

  if (!rentang || rentang.tes_skrining_id !== tesId) {
    throw AppError.notFound("Rentang penilaian tidak ditemukan pada tes ini.");
  }

  const dataToUpdate = {};
  if (payload.deskripsi !== undefined) dataToUpdate.deskripsi = payload.deskripsi;
  if (payload.rekomendasi !== undefined) dataToUpdate.rekomendasi = payload.rekomendasi;

  const updated = await db.rentang_penilaian.update({
    where: { id: rentangId },
    data: dataToUpdate
  });

  const minVal = Number(updated.skor_min);
  const maxVal = updated.skor_max !== null && updated.skor_max !== undefined ? Number(updated.skor_max) : null;
  const rentang_label = maxVal !== null ? `${minVal} - ${maxVal}` : `>= ${minVal}`;

  return {
    id: updated.id,
    rentang_penilaian_id: updated.id,
    kategori: updated.kategori,
    skor_min: minVal,
    skor_max: maxVal,
    rentang_label,
    urutan: updated.urutan,
    deskripsi: updated.deskripsi ?? null,
    rekomendasi: updated.rekomendasi ?? null,
    terisi: Boolean(updated.deskripsi || updated.rekomendasi)
  };
}

/**
 * Mereset/mengosongkan narasi interpretasi Level 1 (DELETE action).
 *
 * @param {object} db
 * @param {number} tesId
 * @param {number} domainId
 * @param {"belum_memenuhi"|"memenuhi"} [kondisi]
 */
export async function resetInterpretasiLevel1(db, tesId, domainId, kondisi) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 1) {
    throw AppError.badRequest("Penghapusan interpretasi domain hanya berlaku untuk tes skrining Level 1.");
  }

  await pastikanDomainDalamCakupan(db, tesId, domainId);

  const dataToReset = {};
  if (!kondisi || kondisi === "belum_memenuhi") {
    dataToReset.deskripsi_belum_memenuhi = null;
    dataToReset.rekomendasi_belum_memenuhi = null;
  }
  if (!kondisi || kondisi === "memenuhi") {
    dataToReset.deskripsi = null;
    dataToReset.rekomendasi = null;
  }

  await db.kategori_asesmen.update({
    where: { id: domainId },
    data: dataToReset
  });

  return {
    kategori_id: domainId,
    message: "Narasi interpretasi Level 1 berhasil dikosongkan."
  };
}

/**
 * Mereset/mengosongkan narasi interpretasi Level 2 (DELETE action).
 *
 * @param {object} db
 * @param {number} tesId
 * @param {number} rentangId
 */
export async function resetInterpretasiLevel2(db, tesId, rentangId) {
  const tes = await pastikanTesAda(db, tesId);
  if (tes.level !== 2) {
    throw AppError.badRequest("Penghapusan interpretasi rentang skor hanya berlaku untuk tes skrining Level 2.");
  }

  const rentang = await db.rentang_penilaian.findUnique({
    where: { id: rentangId }
  });

  if (!rentang || rentang.tes_skrining_id !== tesId) {
    throw AppError.notFound("Rentang penilaian tidak ditemukan pada tes ini.");
  }

  await db.rentang_penilaian.update({
    where: { id: rentangId },
    data: { deskripsi: null, rekomendasi: null }
  });

  return {
    id: rentangId,
    message: "Narasi interpretasi Level 2 berhasil dikosongkan."
  };
}
