/**
 * Layanan Fitur Manajemen Tab Pertanyaan Tes Skrining untuk Super Admin.
 * Menangani operasi CRUD butir pertanyaan (Level 1 & Level 2), format jawaban,
 * daftar opsi dan skor, kondisi pemicu percabangan, serta pengurutan pertanyaan.
 */

import AppError from "../../utils/appError.js";

/**
 * Format objek pertanyaan untuk respon seragam.
 * @param {object} p
 */
function formatPertanyaanItem(p) {
  return {
    id: p.id,
    tes_skrining_id: p.tes_skrining_id,
    nomor_urut: p.nomor_urut,
    teks: p.teks,
    kalimat_pengantar: p.kalimat_pengantar ?? null,
    tipe_jawaban: p.tipe_jawaban,
    url_gambar: p.url_gambar ?? null,
    aktif: p.aktif,
    kategori: p.kategori_asesmen
      ? {
          id: p.kategori_asesmen.id,
          nama: p.kategori_asesmen.nama
        }
      : null,
    opsi_jawaban: (p.opsi_jawaban || []).map((o) => ({
      id: o.id,
      label: o.label,
      teks: o.teks,
      penjelasan: o.penjelasan ?? null,
      skor: o.skor,
      urutan: o.urutan,
      url_gambar: o.url_gambar ?? null
    })),
    kondisi_pemicu: p.pemicu_pertanyaan_id
      ? {
          pemicu_pertanyaan_id: p.pemicu_pertanyaan_id,
          pemicu_opsi_id: p.pemicu_opsi_id,
          operator: p.pemicu_operator ?? "eq",
          nilai: p.pemicu_nilai,
          pertanyaan_pemicu: p.pemicu_pertanyaan
            ? {
                id: p.pemicu_pertanyaan.id,
                nomor_urut: p.pemicu_pertanyaan.nomor_urut,
                teks: p.pemicu_pertanyaan.teks
              }
            : null,
          opsi_pemicu: p.pemicu_opsi
            ? {
                id: p.pemicu_opsi.id,
                label: p.pemicu_opsi.label,
                teks: p.pemicu_opsi.teks
              }
            : null
        }
      : null,
    memiliki_riwayat_jawaban: (p._count?.jawaban_siswa ?? 0) > 0,
    jumlah_pertanyaan_terpicu: p._count?.pertanyaan_terpicu ?? 0,
    created_at: p.created_at,
    updated_at: p.updated_at
  };
}

/**
 * Memastikan tes skrining ada di database.
 * @param {object} db
 * @param {number} tesId
 */
async function pastikanTesAda(db, tesId) {
  const tes = await db.tes_skrining.findUnique({
    where: { id: tesId },
    include: {
      kategori_asesmen: true
    }
  });

  if (!tes) {
    throw AppError.notFound("Tes skrining tidak ditemukan.");
  }

  return tes;
}

/**
 * Validasi dependensi percabangan untuk mencegah siklus circular dependency.
 * @param {object} db
 * @param {number} tesId
 * @param {number|null} currentId
 * @param {number|null} candidatePemicuId
 */
async function periksaSiklusPemicu(db, tesId, currentId, candidatePemicuId) {
  if (currentId && currentId === candidatePemicuId) {
    throw AppError.badRequest("Pertanyaan tidak dapat memicu dirinya sendiri.");
  }
  if (!candidatePemicuId) return;

  const semua = await db.pertanyaan.findMany({
    where: { tes_skrining_id: tesId },
    select: { id: true, pemicu_pertanyaan_id: true }
  });

  const pemicuMap = new Map();
  for (const p of semua) {
    pemicuMap.set(p.id, p.pemicu_pertanyaan_id);
  }

  if (currentId) {
    pemicuMap.set(currentId, candidatePemicuId);
  }

  let curr = candidatePemicuId;
  const visited = new Set();
  while (curr) {
    if (visited.has(curr)) {
      throw AppError.badRequest("Kondisi pemicu menghasilkan siklus percabangan melingkar (circular dependency).");
    }
    visited.add(curr);
    if (currentId && curr === currentId) {
      throw AppError.badRequest("Kondisi pemicu menghasilkan siklus percabangan melingkar (circular dependency).");
    }
    curr = pemicuMap.get(curr) || null;
  }
}

/**
 * Mengambil daftar pertanyaan pada satu tes skrining dengan filter, pencarian, dan paginasi.
 *
 * @param {object} db Prisma client / transaction
 * @param {number} tesId ID tes skrining
 * @param {{
 *   page?: number,
 *   limit?: number,
 *   search?: string,
 *   kategori_id?: number,
 *   status?: boolean
 * }} params
 */
export async function getDaftarPertanyaan(db, tesId, {
  page = 1,
  limit = 10,
  search,
  kategori_id,
  status
} = {}) {
  await pastikanTesAda(db, tesId);

  const where = {
    tes_skrining_id: tesId
  };

  if (kategori_id !== undefined) {
    where.kategori_asesmen_id = kategori_id;
  }

  if (status !== undefined) {
    where.aktif = status;
  }

  if (search) {
    where.OR = [
      { teks: { contains: search } },
      { kalimat_pengantar: { contains: search } }
    ];
  }

  const total = await db.pertanyaan.count({ where });

  // Statistik pertanyaan pada tes ini
  let statistik = {
    total_pertanyaan: total,
    total_aktif: 0,
    total_nonaktif: 0,
    total_bercabang: 0
  };

  try {
    const [total_pertanyaan, total_aktif, total_nonaktif, total_bercabang] = await Promise.all([
      db.pertanyaan.count({ where: { tes_skrining_id: tesId } }),
      db.pertanyaan.count({ where: { tes_skrining_id: tesId, aktif: true } }),
      db.pertanyaan.count({ where: { tes_skrining_id: tesId, aktif: false } }),
      db.pertanyaan.count({ where: { tes_skrining_id: tesId, pemicu_pertanyaan_id: { not: null } } })
    ]);
    statistik = {
      total_pertanyaan,
      total_aktif,
      total_nonaktif,
      total_bercabang
    };
  } catch {
    // Abaikan jika database mock terbatas
  }

  const items = await db.pertanyaan.findMany({
    where,
    include: {
      kategori_asesmen: {
        select: { id: true, nama: true }
      },
      opsi_jawaban: {
        orderBy: { urutan: "asc" }
      },
      pemicu_pertanyaan: {
        select: { id: true, nomor_urut: true, teks: true }
      },
      pemicu_opsi: {
        select: { id: true, label: true, teks: true }
      },
      _count: {
        select: {
          jawaban_siswa: true,
          pertanyaan_terpicu: true
        }
      }
    },
    orderBy: [
      { nomor_urut: "asc" },
      { id: "asc" }
    ],
    skip: (page - 1) * limit,
    take: limit
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items: items.map(formatPertanyaanItem),
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    statistik
  };
}

/**
 * Mengambil daftar pertanyaan yang layak dijadikan pemicu (beserta opsi jawabannya)
 * dengan mengecualikan pertanyaan yang akan menyebabkan percabangan melingkar (cycle).
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining
 * @param {number|null} [pertanyaanId=null] ID pertanyaan saat ini (jika mode edit)
 */
export async function getOpsiKandidatPemicu(db, tesId, pertanyaanId = null) {
  await pastikanTesAda(db, tesId);

  const daftar = await db.pertanyaan.findMany({
    where: {
      tes_skrining_id: tesId,
      ...(pertanyaanId ? { id: { not: pertanyaanId } } : {})
    },
    include: {
      opsi_jawaban: {
        orderBy: { urutan: "asc" },
        select: {
          id: true,
          label: true,
          teks: true,
          skor: true,
          urutan: true
        }
      }
    },
    orderBy: { nomor_urut: "asc" }
  });

  if (!pertanyaanId) {
    return daftar.map((p) => ({
      id: p.id,
      nomor_urut: p.nomor_urut,
      teks: p.teks,
      tipe_jawaban: p.tipe_jawaban,
      opsi_jawaban: p.opsi_jawaban
    }));
  }

  // Cari semua keturunan (descendants) dari pertanyaanId untuk dieksklusi agar tidak terjadi circular dependency
  const semua = await db.pertanyaan.findMany({
    where: { tes_skrining_id: tesId },
    select: { id: true, pemicu_pertanyaan_id: true }
  });

  const pemicuMap = new Map();
  for (const item of semua) {
    pemicuMap.set(item.id, item.pemicu_pertanyaan_id);
  }

  // Sebuah kandidat q tidak boleh dipilih jika menelusuri rantai pemicunya mencapai pertanyaanId
  const kandidatValid = daftar.filter((p) => {
    let curr = p.id;
    const visited = new Set();
    while (curr) {
      if (curr === pertanyaanId) return false;
      if (visited.has(curr)) break;
      visited.add(curr);
      curr = pemicuMap.get(curr) || null;
    }
    return true;
  });

  return kandidatValid.map((p) => ({
    id: p.id,
    nomor_urut: p.nomor_urut,
    teks: p.teks,
    tipe_jawaban: p.tipe_jawaban,
    opsi_jawaban: p.opsi_jawaban
  }));
}

/**
 * Mengambil detail satu data pertanyaan skrining.
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining
 * @param {number} pertanyaanId ID pertanyaan
 */
export async function getDetailPertanyaan(db, tesId, pertanyaanId) {
  const p = await db.pertanyaan.findUnique({
    where: { id: pertanyaanId },
    include: {
      tes_skrining: {
        select: { id: true, nama: true, level: true, jenjang: true }
      },
      kategori_asesmen: {
        select: { id: true, nama: true }
      },
      opsi_jawaban: {
        orderBy: { urutan: "asc" }
      },
      pemicu_pertanyaan: {
        select: { id: true, nomor_urut: true, teks: true }
      },
      pemicu_opsi: {
        select: { id: true, label: true, teks: true }
      },
      _count: {
        select: {
          jawaban_siswa: true,
          pertanyaan_terpicu: true
        }
      }
    }
  });

  if (!p || p.tes_skrining_id !== tesId) {
    throw AppError.notFound("Pertanyaan skrining tidak ditemukan pada tes ini.");
  }

  const formatted = formatPertanyaanItem(p);
  return {
    ...formatted,
    tes: p.tes_skrining,
    riwayat: {
      total_jawaban_siswa: p._count?.jawaban_siswa ?? 0,
      dapat_dihapus: (p._count?.jawaban_siswa ?? 0) === 0 && (p._count?.pertanyaan_terpicu ?? 0) === 0,
      dapat_mengubah_opsi: (p._count?.jawaban_siswa ?? 0) === 0
    }
  };
}

/**
 * Menambahkan pertanyaan baru pada tes skrining.
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining
 * @param {object} data Payload data pertanyaan yang telah divalidasi
 */
export async function tambahPertanyaan(db, tesId, data) {
  const tes = await pastikanTesAda(db, tesId);

  // 1. Tentukan kategori_asesmen_id
  let kategori_asesmen_id = data.kategori_asesmen_id;
  if (tes.level === 2) {
    const defaultKategori = tes.kategori_asesmen?.[0];
    if (defaultKategori) {
      if (kategori_asesmen_id && kategori_asesmen_id !== defaultKategori.id) {
        throw AppError.badRequest("Pertanyaan pada tes Level 2 harus menggunakan kategori asesmen yang sama dengan tes.");
      }
      kategori_asesmen_id = defaultKategori.id;
    }
  }

  if (!kategori_asesmen_id) {
    throw AppError.badRequest("Kategori asesmen/domain wajib diisi.");
  }

  const kategori = await db.kategori_asesmen.findUnique({
    where: { id: kategori_asesmen_id }
  });
  if (!kategori) {
    throw AppError.badRequest("Kategori asesmen/domain tidak ditemukan.");
  }

  // 2. Tentukan nomor_urut
  let nomor_urut = data.nomor_urut;
  if (nomor_urut !== undefined) {
    const existing = await db.pertanyaan.findFirst({
      where: { tes_skrining_id: tesId, nomor_urut }
    });
    if (existing) {
      throw AppError.conflict(`Nomor urut ${nomor_urut} sudah digunakan pada tes ini.`);
    }
  } else {
    const maxItem = await db.pertanyaan.findFirst({
      where: { tes_skrining_id: tesId },
      orderBy: { nomor_urut: "desc" },
      select: { nomor_urut: true }
    });
    nomor_urut = (maxItem?.nomor_urut ?? 0) + 1;
  }

  // 3. Validasi kondisi pemicu jika ada
  if (data.kondisi_pemicu) {
    const pemicuId = data.kondisi_pemicu.pemicu_pertanyaan_id;
    const pemicuPertanyaan = await db.pertanyaan.findUnique({
      where: { id: pemicuId },
      include: { opsi_jawaban: true }
    });

    if (!pemicuPertanyaan || pemicuPertanyaan.tes_skrining_id !== tesId) {
      throw AppError.badRequest("Pertanyaan pemicu harus berada pada tes skrining yang sama.");
    }

    if (data.kondisi_pemicu.pemicu_opsi_id) {
      const opsiValid = pemicuPertanyaan.opsi_jawaban.some((o) => o.id === data.kondisi_pemicu.pemicu_opsi_id);
      if (!opsiValid) {
        throw AppError.badRequest("Pilihan jawaban pemicu tidak valid untuk pertanyaan pemicu yang dipilih.");
      }
    }

    await periksaSiklusPemicu(db, tesId, null, pemicuId);
  }

  // 4. Eksekusi penyimpanan dalam transaksi
  const hasil = await db.$transaction(async (tx) => {
    return tx.pertanyaan.create({
      data: {
        tes_skrining_id: tesId,
        kategori_asesmen_id,
        teks: data.teks,
        kalimat_pengantar: data.kalimat_pengantar ?? null,
        tipe_jawaban: data.tipe_jawaban,
        nomor_urut,
        url_gambar: data.url_gambar ?? null,
        aktif: data.aktif ?? true,
        pemicu_pertanyaan_id: data.kondisi_pemicu?.pemicu_pertanyaan_id ?? null,
        pemicu_opsi_id: data.kondisi_pemicu?.pemicu_opsi_id ?? null,
        pemicu_operator: data.kondisi_pemicu?.operator ?? null,
        pemicu_nilai: data.kondisi_pemicu?.nilai ?? null,
        opsi_jawaban: {
          create: data.opsi_jawaban.map((o) => ({
            label: o.label,
            teks: o.teks,
            penjelasan: o.penjelasan ?? null,
            skor: o.skor,
            urutan: o.urutan,
            url_gambar: o.url_gambar ?? null
          }))
        }
      },
      include: {
        kategori_asesmen: {
          select: { id: true, nama: true }
        },
        opsi_jawaban: {
          orderBy: { urutan: "asc" }
        },
        pemicu_pertanyaan: {
          select: { id: true, nomor_urut: true, teks: true }
        },
        pemicu_opsi: {
          select: { id: true, label: true, teks: true }
        },
        _count: {
          select: {
            jawaban_siswa: true,
            pertanyaan_terpicu: true
          }
        }
      }
    });
  });

  return formatPertanyaanItem(hasil);
}

/**
 * Memperbarui satu data pertanyaan skrining.
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining
 * @param {number} pertanyaanId ID pertanyaan
 * @param {object} data Payload update
 */
export async function updatePertanyaan(db, tesId, pertanyaanId, data) {
  const current = await db.pertanyaan.findUnique({
    where: { id: pertanyaanId },
    include: {
      tes_skrining: {
        include: {
          kategori_asesmen: true
        }
      },
      opsi_jawaban: true,
      _count: {
        select: {
          jawaban_siswa: true,
          pertanyaan_terpicu: true
        }
      }
    }
  });

  if (!current || current.tes_skrining_id !== tesId) {
    throw AppError.notFound("Pertanyaan skrining tidak ditemukan pada tes ini.");
  }

  const sudahDijawab = (current._count?.jawaban_siswa ?? 0) > 0;

  // 1. Proteksi riwayat jawaban siswa
  if (sudahDijawab) {
    if (data.tipe_jawaban !== undefined && data.tipe_jawaban !== current.tipe_jawaban) {
      throw AppError.badRequest("Format jawaban tidak dapat diubah karena pertanyaan sudah memiliki riwayat jawaban siswa.");
    }
    if (data.kategori_asesmen_id !== undefined && data.kategori_asesmen_id !== current.kategori_asesmen_id) {
      throw AppError.badRequest("Kategori asesmen tidak dapat diubah karena pertanyaan sudah memiliki riwayat jawaban siswa.");
    }
    if (data.opsi_jawaban !== undefined) {
      throw AppError.badRequest("Pilihan jawaban tidak dapat diubah karena pertanyaan sudah memiliki riwayat jawaban siswa.");
    }
  }

  // 2. Validasi kategori asesmen jika diubah
  let kategori_asesmen_id = current.kategori_asesmen_id;
  if (data.kategori_asesmen_id !== undefined) {
    if (current.tes_skrining.level === 2) {
      const defaultKategori = current.tes_skrining.kategori_asesmen?.[0];
      if (defaultKategori && data.kategori_asesmen_id !== defaultKategori.id) {
        throw AppError.badRequest("Pertanyaan pada tes Level 2 harus menggunakan kategori asesmen yang sama dengan tes.");
      }
    }

    const kategori = await db.kategori_asesmen.findUnique({
      where: { id: data.kategori_asesmen_id }
    });
    if (!kategori) {
      throw AppError.badRequest("Kategori asesmen/domain tidak ditemukan.");
    }
    kategori_asesmen_id = data.kategori_asesmen_id;
  }

  // 3. Validasi nomor urut jika diubah
  let nomor_urut = current.nomor_urut;
  if (data.nomor_urut !== undefined && data.nomor_urut !== current.nomor_urut) {
    const existing = await db.pertanyaan.findFirst({
      where: {
        tes_skrining_id: tesId,
        nomor_urut: data.nomor_urut,
        id: { not: pertanyaanId }
      }
    });
    if (existing) {
      throw AppError.conflict(`Nomor urut ${data.nomor_urut} sudah digunakan pada tes ini.`);
    }
    nomor_urut = data.nomor_urut;
  }

  // 4. Validasi kondisi pemicu jika diubah
  let pemicu_pertanyaan_id = current.pemicu_pertanyaan_id;
  let pemicu_opsi_id = current.pemicu_opsi_id;
  let pemicu_operator = current.pemicu_operator;
  let pemicu_nilai = current.pemicu_nilai;

  if (data.kondisi_pemicu !== undefined) {
    if (data.kondisi_pemicu === null) {
      pemicu_pertanyaan_id = null;
      pemicu_opsi_id = null;
      pemicu_operator = null;
      pemicu_nilai = null;
    } else {
      const pId = data.kondisi_pemicu.pemicu_pertanyaan_id;
      if (pId === pertanyaanId) {
        throw AppError.badRequest("Pertanyaan tidak dapat memicu dirinya sendiri.");
      }

      const pemicuPertanyaan = await db.pertanyaan.findUnique({
        where: { id: pId },
        include: { opsi_jawaban: true }
      });

      if (!pemicuPertanyaan || pemicuPertanyaan.tes_skrining_id !== tesId) {
        throw AppError.badRequest("Pertanyaan pemicu harus berada pada tes skrining yang sama.");
      }

      if (data.kondisi_pemicu.pemicu_opsi_id) {
        const opsiValid = pemicuPertanyaan.opsi_jawaban.some((o) => o.id === data.kondisi_pemicu.pemicu_opsi_id);
        if (!opsiValid) {
          throw AppError.badRequest("Pilihan jawaban pemicu tidak valid untuk pertanyaan pemicu yang dipilih.");
        }
      }

      await periksaSiklusPemicu(db, tesId, pertanyaanId, pId);

      pemicu_pertanyaan_id = pId;
      pemicu_opsi_id = data.kondisi_pemicu.pemicu_opsi_id ?? null;
      pemicu_operator = data.kondisi_pemicu.operator ?? "eq";
      pemicu_nilai = data.kondisi_pemicu.nilai ?? null;
    }
  }

  // 5. Eksekusi update dalam transaksi
  const hasil = await db.$transaction(async (tx) => {
    // Jika ada opsi_jawaban dan belum ada riwayat jawaban, perbarui opsi jawaban
    if (data.opsi_jawaban !== undefined && !sudahDijawab) {
      await tx.opsi_jawaban.deleteMany({
        where: { pertanyaan_id: pertanyaanId }
      });

      await tx.opsi_jawaban.createMany({
        data: data.opsi_jawaban.map((o) => ({
          pertanyaan_id: pertanyaanId,
          label: o.label,
          teks: o.teks,
          penjelasan: o.penjelasan ?? null,
          skor: o.skor,
          urutan: o.urutan,
          url_gambar: o.url_gambar ?? null
        }))
      });
    }

    return tx.pertanyaan.update({
      where: { id: pertanyaanId },
      data: {
        kategori_asesmen_id,
        nomor_urut,
        teks: data.teks !== undefined ? data.teks : current.teks,
        kalimat_pengantar: data.kalimat_pengantar !== undefined ? data.kalimat_pengantar : current.kalimat_pengantar,
        tipe_jawaban: data.tipe_jawaban !== undefined ? data.tipe_jawaban : current.tipe_jawaban,
        url_gambar: data.url_gambar !== undefined ? data.url_gambar : current.url_gambar,
        aktif: data.aktif !== undefined ? data.aktif : current.aktif,
        pemicu_pertanyaan_id,
        pemicu_opsi_id,
        pemicu_operator,
        pemicu_nilai
      },
      include: {
        kategori_asesmen: {
          select: { id: true, nama: true }
        },
        opsi_jawaban: {
          orderBy: { urutan: "asc" }
        },
        pemicu_pertanyaan: {
          select: { id: true, nomor_urut: true, teks: true }
        },
        pemicu_opsi: {
          select: { id: true, label: true, teks: true }
        },
        _count: {
          select: {
            jawaban_siswa: true,
            pertanyaan_terpicu: true
          }
        }
      }
    });
  });

  return formatPertanyaanItem(hasil);
}

/**
 * Memperbarui urutan batch pertanyaan (reordering) secara atomik.
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining
 * @param {Array<{ id: number, nomor_urut: number }>} items
 */
export async function updateBatchUrutan(db, tesId, items) {
  await pastikanTesAda(db, tesId);

  const listPertanyaan = await db.pertanyaan.findMany({
    where: { tes_skrining_id: tesId },
    select: { id: true, nomor_urut: true }
  });

  const idMap = new Map(listPertanyaan.map((p) => [p.id, p]));

  for (const item of items) {
    if (!idMap.has(item.id)) {
      throw AppError.badRequest(`Pertanyaan dengan ID ${item.id} tidak ditemukan pada tes skrining ini.`);
    }
  }

  // Gunakan two-phase update dalam transaksi untuk mencegah tabrakan unique constraint [tes_skrining_id, nomor_urut]
  await db.$transaction(async (tx) => {
    // Fase 1: Set nomor_urut ke nilai offset sementara (misal: 10000 + idx)
    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx];
      await tx.pertanyaan.update({
        where: { id: item.id },
        data: { nomor_urut: 10000 + idx + 1 }
      });
    }

    // Fase 2: Set ke nomor_urut final yang diinginkan
    for (const item of items) {
      await tx.pertanyaan.update({
        where: { id: item.id },
        data: { nomor_urut: item.nomor_urut }
      });
    }
  });

  // Ambil daftar terbaru
  const hasil = await db.pertanyaan.findMany({
    where: { tes_skrining_id: tesId },
    select: { id: true, nomor_urut: true, teks: true },
    orderBy: { nomor_urut: "asc" }
  });

  return hasil;
}

/**
 * Menghapus satu pertanyaan skrining dengan validasi relasi keamanan ketat.
 *
 * @param {object} db Prisma client
 * @param {number} tesId ID tes skrining
 * @param {number} pertanyaanId ID pertanyaan
 */
export async function hapusPertanyaan(db, tesId, pertanyaanId) {
  const p = await db.pertanyaan.findUnique({
    where: { id: pertanyaanId },
    include: {
      _count: {
        select: {
          jawaban_siswa: true,
          pertanyaan_terpicu: true
        }
      }
    }
  });

  if (!p || p.tes_skrining_id !== tesId) {
    throw AppError.notFound("Pertanyaan skrining tidak ditemukan pada tes ini.");
  }

  if ((p._count?.jawaban_siswa ?? 0) > 0) {
    throw AppError.badRequest("Pertanyaan tidak dapat dihapus karena sudah memiliki riwayat jawaban siswa.");
  }

  if ((p._count?.pertanyaan_terpicu ?? 0) > 0) {
    throw AppError.badRequest("Pertanyaan tidak dapat dihapus karena masih menjadi pemicu untuk pertanyaan lain.");
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.opsi_jawaban.deleteMany({
        where: { pertanyaan_id: pertanyaanId }
      });
      await tx.pertanyaan.delete({
        where: { id: pertanyaanId }
      });
    });
  } catch (err) {
    if (err.code === "P2003") {
      throw AppError.badRequest("Pertanyaan tidak dapat dihapus karena masih terikat dengan data lain di sistem.");
    }
    throw err;
  }

  return {
    id: pertanyaanId,
    message: "Pertanyaan berhasil dihapus."
  };
}
