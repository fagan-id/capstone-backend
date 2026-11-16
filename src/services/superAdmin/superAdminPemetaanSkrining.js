/**
 * Layanan Fitur Tab Pemetaan Tes Skrining untuk Super Admin.
 * Menangani pemetaan domain Level 1 ke instrumen lanjutan Level 2,
 * pembacaan ambang batas, daftar opsi kandidat Level 2, serta pembaruan batch secara atomik.
 */

import AppError from "../../utils/appError.js";

/**
 * Memastikan tes skrining ada dan bertipe Level 1.
 * @param {object} db
 * @param {number} tesId
 */
async function pastikanTesLevel1Ada(db, tesId) {
  const tes = await db.tes_skrining.findUnique({
    where: { id: tesId }
  });

  if (!tes) {
    throw AppError.notFound("Tes skrining tidak ditemukan.");
  }

  if (tes.level !== 1) {
    throw AppError.badRequest("Tab Pemetaan hanya berlaku untuk tes skrining Level 1.");
  }

  return tes;
}

/**
 * Mengambil daftar pemetaan domain asesmen pada tes Level 1 beserta informasi tes Level 2 tujuan.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 1
 * @param {{
 *   search?: string,
 *   status?: "terpetakan" | "belum_terpetakan"
 * }} query
 */
export async function getDaftarPemetaan(db, tesId, query = {}) {
  const tes = await pastikanTesLevel1Ada(db, tesId);

  // 1. Tentukan cakupan domain yang sah dari pertanyaan tes Level 1 ini
  const questionsInTest = await db.pertanyaan.findMany({
    where: { tes_skrining_id: tesId },
    select: {
      kategori_asesmen_id: true,
      tipe_jawaban: true
    }
  });

  const domainIdsInScope = [...new Set(questionsInTest.map((p) => p.kategori_asesmen_id))];

  if (domainIdsInScope.length === 0) {
    return {
      items: [],
      statistik: {
        total_domain: 0,
        total_terpetakan: 0,
        total_belum_terpetakan: 0,
        total_target_siap: 0,
        total_target_perlu_perhatian: 0
      },
      sifat_konfigurasi: "global",
      tes: {
        id: tes.id,
        nama: tes.nama,
        level: tes.level,
        jenjang: tes.jenjang
      }
    };
  }

  // 2. Ambil data kategori asesmen dalam cakupan beserta tes Level 2 yang dipetakan
  const allDomains = await db.kategori_asesmen.findMany({
    where: { id: { in: domainIdsInScope } },
    include: {
      tes_skrining: {
        select: {
          id: true,
          nama: true,
          jenjang: true,
          aktif: true,
          _count: {
            select: { pertanyaan: true }
          },
          pertanyaan: {
            select: { id: true, aktif: true }
          }
        }
      }
    },
    orderBy: [
      { urutan: "asc" },
      { id: "asc" }
    ]
  });

  // 3. Hitung statistik keseluruhan cakupan tes Level 1 (bersifat global)
  let total_terpetakan = 0;
  let total_belum_terpetakan = 0;
  let total_target_siap = 0;
  let total_target_perlu_perhatian = 0;

  for (const d of allDomains) {
    if (d.tes_skrining_id !== null) {
      total_terpetakan++;
      const target = d.tes_skrining;
      const aktifCount = target?.pertanyaan?.filter((p) => p.aktif).length ?? 0;
      if (target && target.aktif && aktifCount > 0) {
        total_target_siap++;
      } else {
        total_target_perlu_perhatian++;
      }
    } else {
      total_belum_terpetakan++;
    }
  }

  const statistik = {
    total_domain: allDomains.length,
    total_terpetakan,
    total_belum_terpetakan,
    total_target_siap,
    total_target_perlu_perhatian
  };

  // 4. Terapkan filter query jika diberikan
  let filtered = allDomains;

  if (query.status === "terpetakan") {
    filtered = filtered.filter((d) => d.tes_skrining_id !== null);
  } else if (query.status === "belum_terpetakan") {
    filtered = filtered.filter((d) => d.tes_skrining_id === null);
  }

  if (query.search) {
    const qLower = query.search.toLowerCase();
    filtered = filtered.filter((d) => d.nama.toLowerCase().includes(qLower));
  }

  // 5. Format hasil pemetaan untuk respon API
  const items = filtered.map((k) => {
    const target = k.tes_skrining;
    const totalSoal = target?._count?.pertanyaan ?? target?.pertanyaan?.length ?? 0;
    const soalAktif = target?.pertanyaan?.filter((p) => p.aktif).length ?? 0;
    const siapDigunakan = Boolean(target && target.aktif && soalAktif > 0);

    let status_pemetaan = "belum_dikonfigurasi";
    let catatan = null;

    if (target) {
      if (!target.aktif) {
        status_pemetaan = "target_nonaktif";
        catatan = "Instrumen Level 2 sedang nonaktif.";
      } else if (soalAktif === 0) {
        status_pemetaan = "target_tanpa_soal_aktif";
        catatan = "Instrumen Level 2 belum memiliki butir pertanyaan aktif.";
      } else {
        status_pemetaan = "siap_digunakan";
      }
    }

    // Tentukan label kondisi pemicu (apakah tipe ya_tidak atau skala nilai ambang)
    const hasYaTidak = questionsInTest.some(
      (q) => q.kategori_asesmen_id === k.id && q.tipe_jawaban === "ya_tidak"
    );
    const kondisi_pemicu = hasYaTidak
      ? "Ya, Tidak Tahu"
      : k.ambang_batas !== undefined
        ? `>= ${k.ambang_batas}`
        : "-";

    return {
      id: k.id,
      nama: k.nama,
      urutan: k.urutan,
      ambang_batas: k.ambang_batas,
      kondisi_pemicu,
      terpetakan: Boolean(k.tes_skrining_id),
      status_pemetaan,
      target_tes: target
        ? {
            id: target.id,
            nama: target.nama,
            jenjang: target.jenjang,
            aktif: target.aktif,
            jumlah_pertanyaan: totalSoal,
            jumlah_pertanyaan_aktif: soalAktif,
            siap_digunakan: siapDigunakan,
            catatan
          }
        : null
    };
  });

  return {
    items,
    statistik,
    sifat_konfigurasi: "global",
    tes: {
      id: tes.id,
      nama: tes.nama,
      level: tes.level,
      jenjang: tes.jenjang
    }
  };
}

/**
 * Mengambil daftar opsi instrumen Level 2 yang dapat dipilih untuk pemetaan domain.
 * Memvalidasi apakah target sedang digunakan domain lain atau memiliki pertanyaan dari kategori domain lain.
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining Level 1
 * @param {{
 *   search?: string,
 *   status?: boolean,
 *   kategori_id?: number,
 *   page?: number,
 *   limit?: number
 * }} query
 */
export async function getOpsiTesLevel2(db, tesId, query = {}) {
  const tesSumber = await pastikanTesLevel1Ada(db, tesId);

  let domainContext = null;
  if (query.kategori_id) {
    domainContext = await db.kategori_asesmen.findUnique({
      where: { id: query.kategori_id }
    });
    if (!domainContext) {
      throw AppError.notFound("Domain asesmen tidak ditemukan.");
    }
  }

  const where = {
    level: 2
  };

  if (query.search) {
    where.nama = { contains: query.search };
  }

  if (query.status !== undefined) {
    where.aktif = query.status;
  }

  const page = query.page || 1;
  const limit = query.limit || 20;

  const total = await db.tes_skrining.count({ where });

  const rawTests = await db.tes_skrining.findMany({
    where,
    include: {
      kategori_asesmen: {
        select: { id: true, nama: true, urutan: true }
      },
      _count: {
        select: { pertanyaan: true }
      },
      pertanyaan: {
        select: { id: true, aktif: true, kategori_asesmen_id: true }
      }
    },
    orderBy: { nama: "asc" },
    skip: (page - 1) * limit,
    take: limit
  });

  const totalPages = Math.ceil(total / limit) || 1;

  const items = rawTests.map((t) => {
    const domainPengguna = t.kategori_asesmen?.[0] || null;
    const totalSoal = t._count?.pertanyaan ?? t.pertanyaan.length;
    const soalAktif = t.pertanyaan.filter((p) => p.aktif).length;
    const siapDigunakan = Boolean(t.aktif && soalAktif > 0);

    let dapat_dipilih = true;
    let alasan_tidak_dapat_dipilih = null;

    // 1. Cek kepemilikan oleh domain lain
    if (domainPengguna) {
      if (query.kategori_id && domainPengguna.id !== query.kategori_id) {
        dapat_dipilih = false;
        alasan_tidak_dapat_dipilih = `Sudah dipetakan ke domain '${domainPengguna.nama}'.`;
      }
    }

    // 2. Cek konsistensi kategori pertanyaan pada tes Level 2
    if (dapat_dipilih && query.kategori_id) {
      const foreignQuestions = t.pertanyaan.filter((p) => p.kategori_asesmen_id !== query.kategori_id);
      if (foreignQuestions.length > 0) {
        dapat_dipilih = false;
        alasan_tidak_dapat_dipilih = "Tes ini memiliki butir pertanyaan yang terikat pada domain lain.";
      }
    }

    // 3. Cek kesesuaian jenjang
    if (
      dapat_dipilih &&
      tesSumber.jenjang &&
      t.jenjang &&
      tesSumber.jenjang !== t.jenjang &&
      t.jenjang !== "SEMUA"
    ) {
      dapat_dipilih = false;
      alasan_tidak_dapat_dipilih = `Jenjang instrumen tidak sesuai (${t.jenjang} vs ${tesSumber.jenjang}).`;
    }

    return {
      id: t.id,
      nama: t.nama,
      jenjang: t.jenjang,
      aktif: t.aktif,
      jumlah_pertanyaan: totalSoal,
      jumlah_pertanyaan_aktif: soalAktif,
      siap_digunakan: siapDigunakan,
      domain_pengguna: domainPengguna
        ? {
            id: domainPengguna.id,
            nama: domainPengguna.nama,
            urutan: domainPengguna.urutan
          }
        : null,
      sedang_digunakan_domain_ini: Boolean(
        query.kategori_id && domainPengguna?.id === query.kategori_id
      ),
      dapat_dipilih,
      alasan_tidak_dapat_dipilih
    };
  });

  return {
    items,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
}

/**
 * Memperbarui pemetaan satu atau beberapa domain ke instrumen Level 2 secara atomik.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining Level 1
 * @param {Array<{
 *   kategori_id: number,
 *   tes_skrining_id: number | null,
 *   ambang_batas?: number
 * }>} items
 */
export async function updatePemetaan(db, tesId, items) {
  await pastikanTesLevel1Ada(db, tesId);

  // 1. Pastikan domain berada dalam cakupan pertanyaan tes Level 1 ini
  const questionsInTest = await db.pertanyaan.findMany({
    where: { tes_skrining_id: tesId },
    select: { kategori_asesmen_id: true }
  });

  const domainIdsInScope = new Set(questionsInTest.map((p) => p.kategori_asesmen_id));

  for (const item of items) {
    if (!domainIdsInScope.has(item.kategori_id)) {
      throw AppError.badRequest(
        `Domain dengan ID ${item.kategori_id} berada di luar cakupan tes skrining Level 1 ini.`
      );
    }
  }

  // 2. Ambil seluruh data domain yang akan diperbarui
  const domainsToUpdate = await db.kategori_asesmen.findMany({
    where: { id: { in: items.map((i) => i.kategori_id) } }
  });
  const domainMap = new Map(domainsToUpdate.map((d) => [d.id, d]));

  for (const item of items) {
    if (!domainMap.has(item.kategori_id)) {
      throw AppError.notFound(`Domain dengan ID ${item.kategori_id} tidak ditemukan.`);
    }
  }

  // 3. Validasi instrumen Level 2 tujuan (jika bukan pelepasan null)
  const targetIds = items
    .filter((i) => i.tes_skrining_id !== null && i.tes_skrining_id !== undefined)
    .map((i) => i.tes_skrining_id);

  if (targetIds.length > 0) {
    const targetTests = await db.tes_skrining.findMany({
      where: { id: { in: targetIds } },
      include: {
        kategori_asesmen: true,
        pertanyaan: {
          select: { kategori_asesmen_id: true }
        }
      }
    });

    const targetMap = new Map(targetTests.map((t) => [t.id, t]));

    for (const item of items) {
      if (item.tes_skrining_id === null || item.tes_skrining_id === undefined) continue;

      const target = targetMap.get(item.tes_skrining_id);
      if (!target) {
        throw AppError.badRequest(`Tes Level 2 dengan ID ${item.tes_skrining_id} tidak ditemukan.`);
      }

      if (target.level !== 2) {
        throw AppError.badRequest(`Tes target '${target.nama}' bukan instrumen Level 2.`);
      }

      // Validasi konflik: jangan ambil alih target milik domain di luar batch ini secara diam-diam
      const currentOwner = target.kategori_asesmen?.[0];
      if (currentOwner && !items.some((i) => i.kategori_id === currentOwner.id)) {
        throw AppError.conflict(
          `Tes Level 2 '${target.nama}' sudah digunakan oleh domain '${currentOwner.nama}'.`
        );
      }

      // Validasi konsistensi pertanyaan Level 2: pertanyaan tidak boleh milik kategori domain lain
      const foreignQuestions = target.pertanyaan.filter(
        (p) => p.kategori_asesmen_id !== item.kategori_id
      );
      if (foreignQuestions.length > 0) {
        const domain = domainMap.get(item.kategori_id);
        throw AppError.badRequest(
          `Tes Level 2 '${target.nama}' tidak dapat dipetakan ke domain '${domain.nama}' karena pertanyaan di dalamnya terikat pada kategori domain lain.`
        );
      }
    }
  }

  // 4. Eksekusi pembaruan dalam satu transaksi atomik
  // Menggunakan two-phase update untuk mendukung pertukaran target antar-domain secara mulus
  await db.$transaction(async (tx) => {
    // Fase 1: Lepaskan relasi sementara pada domain-domain dalam batch untuk mencegah tabrakan kardinalitas
    for (const item of items) {
      if (item.tes_skrining_id !== undefined) {
        await tx.kategori_asesmen.update({
          where: { id: item.kategori_id },
          data: { tes_skrining_id: null }
        });
      }
    }

    // Fase 2: Terapkan nilai pemetaan final dan pembaruan ambang batas
    for (const item of items) {
      const updateData = {};
      if (item.tes_skrining_id !== undefined) {
        updateData.tes_skrining_id = item.tes_skrining_id;
      }
      if (item.ambang_batas !== undefined) {
        updateData.ambang_batas = item.ambang_batas;
      }

      await tx.kategori_asesmen.update({
        where: { id: item.kategori_id },
        data: updateData
      });
    }
  });

  // 5. Ambil data hasil pembaruan
  const updatedDomains = await db.kategori_asesmen.findMany({
    where: { id: { in: items.map((i) => i.kategori_id) } },
    include: {
      tes_skrining: {
        select: {
          id: true,
          nama: true,
          jenjang: true,
          aktif: true,
          _count: { select: { pertanyaan: true } }
        }
      }
    },
    orderBy: { urutan: "asc" }
  });

  return updatedDomains.map((k) => ({
    id: k.id,
    nama: k.nama,
    urutan: k.urutan,
    ambang_batas: k.ambang_batas,
    terpetakan: Boolean(k.tes_skrining_id),
    target_tes: k.tes_skrining
      ? {
          id: k.tes_skrining.id,
          nama: k.tes_skrining.nama,
          jenjang: k.tes_skrining.jenjang,
          aktif: k.tes_skrining.aktif,
          jumlah_pertanyaan: k.tes_skrining._count?.pertanyaan ?? 0
        }
      : null
  }));
}
