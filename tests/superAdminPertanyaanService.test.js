import { test } from "node:test";
import assert from "node:assert/strict";
import * as pertanyaanService from "../src/services/superAdmin/superAdminPertanyaanSkrining.js";

// ==========================================
// 1. Service: getDaftarPertanyaan
// ==========================================
test("getDaftarPertanyaan melempar 404 jika tes skrining tidak ada", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => null
    }
  };

  await assert.rejects(
    () => pertanyaanService.getDaftarPertanyaan(db, 999),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Tes skrining tidak ditemukan/);
      return true;
    }
  );
});

test("getDaftarPertanyaan mengembalikan daftar dengan paginasi dan statistik", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, nama: "Tes Skrining Level 1", level: 1 })
    },
    pertanyaan: {
      count: async ({ where } = {}) => {
        if (!where) return 10;
        if (where.aktif === true) return 8;
        if (where.aktif === false) return 2;
        if (where.pemicu_pertanyaan_id) return 3;
        return 10;
      },
      findMany: async () => [
        {
          id: 1,
          tes_skrining_id: 1,
          nomor_urut: 1,
          teks: "Pertanyaan 1",
          kalimat_pengantar: null,
          tipe_jawaban: "skala",
          url_gambar: null,
          aktif: true,
          kategori_asesmen: { id: 1, kode: "DOM-1", nama: "Gejala Somatik" },
          opsi_jawaban: [
            { id: 1, label: "0", teks: "Tidak", penjelasan: null, skor: 0, urutan: 1, url_gambar: null },
            { id: 2, label: "1", teks: "Ya", penjelasan: null, skor: 1, urutan: 2, url_gambar: null }
          ],
          pemicu_pertanyaan: null,
          pemicu_opsi: null,
          _count: { jawaban_siswa: 5, pertanyaan_terpicu: 1 },
          created_at: new Date(),
          updated_at: new Date()
        }
      ]
    }
  };

  const hasil = await pertanyaanService.getDaftarPertanyaan(db, 1, { page: 1, limit: 10 });

  assert.equal(hasil.items.length, 1);
  assert.equal(hasil.items[0].id, 1);
  assert.equal(hasil.items[0].memiliki_riwayat_jawaban, true);
  assert.equal(hasil.items[0].jumlah_pertanyaan_terpicu, 1);
  assert.equal(hasil.pagination.currentPage, 1);
  assert.equal(hasil.pagination.totalItems, 10);
  assert.equal(hasil.statistik.total_pertanyaan, 10);
  assert.equal(hasil.statistik.total_aktif, 8);
  assert.equal(hasil.statistik.total_nonaktif, 2);
  assert.equal(hasil.statistik.total_bercabang, 3);
});

// ==========================================
// 2. Service: getOpsiKandidatPemicu
// ==========================================
test("getOpsiKandidatPemicu mengecualikan diri sendiri dan keturunan siklus", async () => {
  // Kondisi relasi: P1 -> null, P2 -> P1, P3 -> P2
  // Jika sedang mengedit P1, maka P1 tidak boleh memilih P2 atau P3 karena akan menciptakan siklus (P1 -> P2 -> P1)!
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1 })
    },
    pertanyaan: {
      findMany: async ({ where } = {}) => {
        // Jika sedang mengambil semua untuk pembentukan graf
        if (!where?.id) {
          return [
            { id: 1, pemicu_pertanyaan_id: null },
            { id: 2, pemicu_pertanyaan_id: 1 },
            { id: 3, pemicu_pertanyaan_id: 2 },
            { id: 4, pemicu_pertanyaan_id: null }
          ];
        }
        // Jika where memiliki id: { not: 1 }
        return [
          { id: 2, nomor_urut: 2, teks: "P2", tipe_jawaban: "skala", opsi_jawaban: [] },
          { id: 3, nomor_urut: 3, teks: "P3", tipe_jawaban: "skala", opsi_jawaban: [] },
          { id: 4, nomor_urut: 4, teks: "P4", tipe_jawaban: "skala", opsi_jawaban: [] }
        ];
      }
    }
  };

  const kandidat = await pertanyaanService.getOpsiKandidatPemicu(db, 1, 1);
  // P2 dan P3 adalah keturunan P1 (bergantung pada P1), jadi P1 tidak boleh memicu P2/P3.
  // Hanya P4 yang independen dan valid menjadi kandidat untuk P1!
  assert.equal(kandidat.length, 1);
  assert.equal(kandidat[0].id, 4);
});

// ==========================================
// 3. Service: getDetailPertanyaan
// ==========================================
test("getDetailPertanyaan melempar 404 jika pertanyaan tidak ditemukan atau beda tes", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({ id: 1, tes_skrining_id: 2 })
    }
  };

  await assert.rejects(
    () => pertanyaanService.getDetailPertanyaan(db, 1, 1),
    (err) => {
      assert.equal(err.statusCode, 404);
      assert.match(err.message, /Pertanyaan skrining tidak ditemukan pada tes ini/);
      return true;
    }
  );
});

test("getDetailPertanyaan mengembalikan detail lengkap dengan proteksi riwayat", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 10,
        tes_skrining_id: 1,
        nomor_urut: 1,
        teks: "Detail Butir 1",
        kalimat_pengantar: "Intro",
        tipe_jawaban: "ya_tidak",
        url_gambar: null,
        aktif: true,
        tes_skrining: { id: 1, nama: "Tes 1", level: 1, jenjang: "SD" },
        kategori_asesmen: { id: 3, kode: "K3", nama: "Kategori 3" },
        opsi_jawaban: [
          { id: 1, label: "Ya", teks: "Ya", penjelasan: null, skor: 1, urutan: 1, url_gambar: null },
          { id: 2, label: "Tidak", teks: "Tidak", penjelasan: null, skor: 0, urutan: 2, url_gambar: null }
        ],
        pemicu_pertanyaan: null,
        pemicu_opsi: null,
        _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 },
        created_at: new Date(),
        updated_at: new Date()
      })
    }
  };

  const hasil = await pertanyaanService.getDetailPertanyaan(db, 1, 10);
  assert.equal(hasil.id, 10);
  assert.equal(hasil.riwayat.total_jawaban_siswa, 0);
  assert.equal(hasil.riwayat.dapat_dihapus, true);
  assert.equal(hasil.riwayat.dapat_mengubah_opsi, true);
});

// ==========================================
// 4. Service: tambahPertanyaan
// ==========================================
test("tambahPertanyaan melempar 400 jika kategori asesmen Level 1 tidak ditemukan di DB", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1, kategori_asesmen: [] })
    },
    kategori_asesmen: {
      findUnique: async () => null
    }
  };

  await assert.rejects(
    () => pertanyaanService.tambahPertanyaan(db, 1, {
      teks: "Uji",
      kategori_asesmen_id: 99,
      tipe_jawaban: "skala",
      opsi_jawaban: []
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Kategori asesmen\/domain tidak ditemukan/);
      return true;
    }
  );
});

test("tambahPertanyaan melempar 400 jika kategori pada Level 2 tidak cocok dengan kategori tes", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({
        id: 2,
        level: 2,
        kategori_asesmen: [{ id: 5, kode: "DOM-5", nama: "Inatensi" }]
      })
    }
  };

  await assert.rejects(
    () => pertanyaanService.tambahPertanyaan(db, 2, {
      teks: "Uji Level 2",
      kategori_asesmen_id: 8, // Beda dengan kategori tes (5)
      tipe_jawaban: "skala",
      opsi_jawaban: []
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /harus menggunakan kategori asesmen yang sama dengan tes/);
      return true;
    }
  );
});

test("tambahPertanyaan melempar 409 jika nomor_urut sudah digunakan pada tes yang sama", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1, kategori_asesmen: [] })
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 2 })
    },
    pertanyaan: {
      findFirst: async () => ({ id: 15, nomor_urut: 3 })
    }
  };

  await assert.rejects(
    () => pertanyaanService.tambahPertanyaan(db, 1, {
      teks: "Uji bentrok nomor",
      kategori_asesmen_id: 2,
      nomor_urut: 3,
      tipe_jawaban: "skala",
      opsi_jawaban: []
    }),
    (err) => {
      assert.equal(err.statusCode, 409);
      assert.match(err.message, /Nomor urut 3 sudah digunakan/);
      return true;
    }
  );
});

test("tambahPertanyaan melempar 400 jika pemicu_pertanyaan_id berada pada tes yang berbeda", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1, kategori_asesmen: [] })
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 2 })
    },
    pertanyaan: {
      findFirst: async () => null,
      findUnique: async ({ where }) => {
        if (where.id === 50) return { id: 50, tes_skrining_id: 99 }; // Beda tes!
        return null;
      }
    }
  };

  await assert.rejects(
    () => pertanyaanService.tambahPertanyaan(db, 1, {
      teks: "Uji pemicu beda tes",
      kategori_asesmen_id: 2,
      tipe_jawaban: "skala",
      opsi_jawaban: [],
      kondisi_pemicu: { pemicu_pertanyaan_id: 50 }
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Pertanyaan pemicu harus berada pada tes skrining yang sama/);
      return true;
    }
  );
});

test("tambahPertanyaan melempar 400 jika pemicu_opsi_id tidak ada pada pertanyaan pemicu", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1, kategori_asesmen: [] })
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 2 })
    },
    pertanyaan: {
      findFirst: async () => null,
      findUnique: async ({ where }) => {
        if (where.id === 50) {
          return {
            id: 50,
            tes_skrining_id: 1,
            opsi_jawaban: [{ id: 101, label: "Ya" }]
          };
        }
        return null;
      }
    }
  };

  await assert.rejects(
    () => pertanyaanService.tambahPertanyaan(db, 1, {
      teks: "Uji opsi pemicu salah",
      kategori_asesmen_id: 2,
      tipe_jawaban: "skala",
      opsi_jawaban: [],
      kondisi_pemicu: { pemicu_pertanyaan_id: 50, pemicu_opsi_id: 999 } // 999 bukan opsi 50
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Pilihan jawaban pemicu tidak valid untuk pertanyaan pemicu yang dipilih/);
      return true;
    }
  );
});

test("tambahPertanyaan sukses menyimpan pertanyaan baru dan opsi jawaban dalam transaksi", async () => {
  const mockCreated = {
    id: 100,
    tes_skrining_id: 1,
    kategori_asesmen_id: 2,
    teks: "Pertanyaan Baru Sukses",
    kalimat_pengantar: null,
    tipe_jawaban: "skala",
    nomor_urut: 1,
    url_gambar: null,
    aktif: true,
    pemicu_pertanyaan_id: null,
    pemicu_opsi_id: null,
    pemicu_operator: null,
    pemicu_nilai: null,
    kategori_asesmen: { id: 2, kode: "DOM-2", nama: "Kecemasan" },
    opsi_jawaban: [
      { id: 1, label: "0", teks: "Tidak", penjelasan: null, skor: 0, urutan: 1, url_gambar: null },
      { id: 2, label: "1", teks: "Ya", penjelasan: null, skor: 1, urutan: 2, url_gambar: null }
    ],
    pemicu_pertanyaan: null,
    pemicu_opsi: null,
    _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 },
    created_at: new Date(),
    updated_at: new Date()
  };

  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1, level: 1, kategori_asesmen: [] })
    },
    kategori_asesmen: {
      findUnique: async () => ({ id: 2 })
    },
    pertanyaan: {
      findFirst: async () => null // Otomatis nomor_urut = 1
    },
    $transaction: async (fn) => {
      const tx = {
        pertanyaan: {
          create: async () => mockCreated
        }
      };
      return fn(tx);
    }
  };

  const hasil = await pertanyaanService.tambahPertanyaan(db, 1, {
    teks: "Pertanyaan Baru Sukses",
    kategori_asesmen_id: 2,
    tipe_jawaban: "skala",
    opsi_jawaban: [
      { label: "0", teks: "Tidak", skor: 0, urutan: 1 },
      { label: "1", teks: "Ya", skor: 1, urutan: 2 }
    ]
  });

  assert.equal(hasil.id, 100);
  assert.equal(hasil.nomor_urut, 1);
  assert.equal(hasil.opsi_jawaban.length, 2);
});

// ==========================================
// 5. Service: updatePertanyaan
// ==========================================
test("updatePertanyaan melempar 400 jika mengubah tipe_jawaban pada pertanyaan berpenjawab siswa", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 1,
        tes_skrining_id: 1,
        tipe_jawaban: "skala",
        kategori_asesmen_id: 2,
        tes_skrining: { level: 1 },
        _count: { jawaban_siswa: 12 }
      })
    }
  };

  await assert.rejects(
    () => pertanyaanService.updatePertanyaan(db, 1, 1, { tipe_jawaban: "ya_tidak" }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Format jawaban tidak dapat diubah karena pertanyaan sudah memiliki riwayat/);
      return true;
    }
  );
});

test("updatePertanyaan melempar 400 jika mengubah opsi_jawaban pada pertanyaan berpenjawab siswa", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 1,
        tes_skrining_id: 1,
        tipe_jawaban: "skala",
        kategori_asesmen_id: 2,
        tes_skrining: { level: 1 },
        _count: { jawaban_siswa: 5 }
      })
    }
  };

  await assert.rejects(
    () => pertanyaanService.updatePertanyaan(db, 1, 1, {
      opsi_jawaban: [
        { label: "0", teks: "A", skor: 0, urutan: 1 },
        { label: "1", teks: "B", skor: 1, urutan: 2 }
      ]
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Pilihan jawaban tidak dapat diubah karena pertanyaan sudah memiliki riwayat/);
      return true;
    }
  );
});

test("updatePertanyaan melempar 400 jika pertanyaan memicu dirinya sendiri", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 10,
        tes_skrining_id: 1,
        tipe_jawaban: "skala",
        kategori_asesmen_id: 2,
        tes_skrining: { level: 1 },
        _count: { jawaban_siswa: 0 }
      })
    }
  };

  await assert.rejects(
    () => pertanyaanService.updatePertanyaan(db, 1, 10, {
      kondisi_pemicu: { pemicu_pertanyaan_id: 10 }
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /Pertanyaan tidak dapat memicu dirinya sendiri/);
      return true;
    }
  );
});

test("updatePertanyaan melempar 400 jika kondisi pemicu menimbulkan circular dependency", async () => {
  // P1 dipicu P2. Sekarang P2 mau diatur dipicu P1 -> SIKLUS!
  const db = {
    pertanyaan: {
      findUnique: async ({ where }) => {
        if (where.id === 2) {
          return {
            id: 2,
            tes_skrining_id: 1,
            tipe_jawaban: "skala",
            kategori_asesmen_id: 2,
            tes_skrining: { level: 1 },
            _count: { jawaban_siswa: 0 }
          };
        }
        if (where.id === 1) {
          return {
            id: 1,
            tes_skrining_id: 1,
            opsi_jawaban: []
          };
        }
        return null;
      },
      findMany: async () => [
        { id: 1, pemicu_pertanyaan_id: 2 },
        { id: 2, pemicu_pertanyaan_id: null }
      ]
    }
  };

  await assert.rejects(
    () => pertanyaanService.updatePertanyaan(db, 1, 2, {
      kondisi_pemicu: { pemicu_pertanyaan_id: 1 }
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /circular dependency/);
      return true;
    }
  );
});

// ==========================================
// 6. Service: updateBatchUrutan
// ==========================================
test("updateBatchUrutan melempar 400 jika ada ID yang bukan milik tes skrining", async () => {
  const db = {
    tes_skrining: {
      findUnique: async () => ({ id: 1 })
    },
    pertanyaan: {
      findMany: async () => [
        { id: 10, nomor_urut: 1 },
        { id: 20, nomor_urut: 2 }
      ]
    }
  };

  await assert.rejects(
    () => pertanyaanService.updateBatchUrutan(db, 1, [
      { id: 10, nomor_urut: 2 },
      { id: 99, nomor_urut: 1 } // 99 tidak ada
    ]),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /tidak ditemukan pada tes skrining ini/);
      return true;
    }
  );
});

// ==========================================
// 7. Service: hapusPertanyaan
// ==========================================
test("hapusPertanyaan melempar 400 jika pertanyaan memiliki riwayat jawaban siswa", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 5,
        tes_skrining_id: 1,
        _count: { jawaban_siswa: 3, pertanyaan_terpicu: 0 }
      })
    }
  };

  await assert.rejects(
    () => pertanyaanService.hapusPertanyaan(db, 1, 5),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /karena sudah memiliki riwayat jawaban siswa/);
      return true;
    }
  );
});

test("hapusPertanyaan melempar 400 jika pertanyaan masih menjadi pemicu untuk pertanyaan lain", async () => {
  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 5,
        tes_skrining_id: 1,
        _count: { jawaban_siswa: 0, pertanyaan_terpicu: 2 }
      })
    }
  };

  await assert.rejects(
    () => pertanyaanService.hapusPertanyaan(db, 1, 5),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /karena masih menjadi pemicu untuk pertanyaan lain/);
      return true;
    }
  );
});

test("hapusPertanyaan sukses menghapus opsi dan pertanyaan dalam transaksi jika aman", async () => {
  let deletedOpsi = false;
  let deletedPertanyaan = false;

  const db = {
    pertanyaan: {
      findUnique: async () => ({
        id: 5,
        tes_skrining_id: 1,
        _count: { jawaban_siswa: 0, pertanyaan_terpicu: 0 }
      })
    },
    $transaction: async (fn) => {
      const tx = {
        opsi_jawaban: {
          deleteMany: async () => { deletedOpsi = true; }
        },
        pertanyaan: {
          delete: async () => { deletedPertanyaan = true; }
        }
      };
      return fn(tx);
    }
  };

  const hasil = await pertanyaanService.hapusPertanyaan(db, 1, 5);
  assert.equal(hasil.id, 5);
  assert.equal(deletedOpsi, true);
  assert.equal(deletedPertanyaan, true);
});
