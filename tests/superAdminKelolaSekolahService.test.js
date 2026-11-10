import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import * as sekolahService from "../src/services/superAdmin/superAdminKelolaSekolah.js";

test("sekolahService.getDaftarSekolah mengambil daftar dan memformat total sesi", async () => {
  const dummySekolah = [
    {
      id: 1,
      npsn: "12345678",
      nama: "SDN Sukamaju 01",
      email: "admin@sukamaju.sch.id",
      username: "sdnsukamaju01",
      alamat: "Jl. Pendidikan No. 1",
      kontak_telepon: "08123456789",
      password_hash: "secret_hash",
      aktif: true,
      created_at: new Date("2026-01-15T10:00:00Z"),
      updated_at: new Date("2026-01-15T10:00:00Z"),
      _count: { sesi_skrining: 12 }
    },
    {
      id: 2,
      npsn: "87654321",
      nama: "SD Al-Hikmah",
      email: "admin@alhikmah.sch.id",
      username: "alhikmah",
      alamat: null,
      kontak_telepon: null,
      password_hash: "secret_hash_2",
      aktif: false,
      created_at: new Date("2026-01-10T10:00:00Z"),
      updated_at: new Date("2026-01-10T10:00:00Z"),
      _count: { sesi_skrining: 5 }
    }
  ];

  let queryCaptured = null;
  const mockDb = {
    sekolah: {
      count: async ({ where }) => {
        queryCaptured = { where };
        return 2;
      },
      findMany: async (args) => {
        queryCaptured = { ...queryCaptured, ...args };
        return dummySekolah;
      }
    }
  };

  const hasil = await sekolahService.getDaftarSekolah(mockDb, {
    page: 1,
    limit: 10,
    search: "Sukamaju",
    status: true,
    sortBy: "nama",
    sortOrder: "asc"
  });

  assert.equal(hasil.pagination.page, 1);
  assert.equal(hasil.pagination.limit, 10);
  assert.equal(hasil.pagination.total, 2);
  assert.equal(hasil.pagination.totalPages, 1);
  assert.equal(hasil.items.length, 2);

  // Verifikasi total_sesi dipetakan dari _count
  assert.equal(hasil.items[0].total_sesi, 12);
  assert.equal(hasil.items[1].total_sesi, 5);

  // Verifikasi password_hash TIDAK bocor ke respon
  assert.equal(hasil.items[0].password_hash, undefined);
  assert.equal(hasil.items[1].password_hash, undefined);

  // Verifikasi query Prisma
  assert.equal(queryCaptured.where.aktif, true);
  assert.ok(queryCaptured.where.OR.length > 0);
  assert.deepEqual(queryCaptured.orderBy, { nama: "asc" });
});

test("sekolahService.getDetailSekolah mengembalikan detail sekolah atau 404", async () => {
  const dummy = {
    id: 1,
    npsn: "12345678",
    nama: "SDN Sukamaju 01",
    email: "admin@sukamaju.sch.id",
    username: "sdnsukamaju01",
    alamat: null,
    kontak_telepon: null,
    password_hash: "secret_hash",
    aktif: true,
    created_at: new Date(),
    updated_at: new Date(),
    _count: { sesi_skrining: 12 }
  };

  const mockDb = {
    sekolah: {
      findUnique: async ({ where }) => {
        if (where.id === 1) return dummy;
        return null;
      }
    }
  };

  const sukses = await sekolahService.getDetailSekolah(mockDb, 1);
  assert.equal(sukses.id, 1);
  assert.equal(sukses.nama, "SDN Sukamaju 01");
  assert.equal(sukses.total_sesi, 12);
  assert.equal(sukses.password_hash, undefined);

  await assert.rejects(
    async () => sekolahService.getDetailSekolah(mockDb, 999),
    (err) => err.statusCode === 404 && /tidak ditemukan/.test(err.message)
  );
});

test("sekolahService.tambahSekolah menolak email duplikat di sekolah atau super_admin", async () => {
  const mockDb = {
    sekolah: {
      findUnique: async ({ where }) => {
        if (where.email === "duplikat@sekolah.sch.id") return { id: 10 };
        return null;
      }
    },
    super_admin: {
      findUnique: async ({ where }) => {
        if (where.email === "admin@superadmin.id") return { id: 1 };
        return null;
      }
    }
  };

  await assert.rejects(
    async () =>
      sekolahService.tambahSekolah(mockDb, {
        nama: "SD Baru",
        email: "duplikat@sekolah.sch.id",
        password: "Password123!"
      }),
    (err) => err.statusCode === 409 && /Email admin sekolah sudah terdaftar/.test(err.message)
  );

  await assert.rejects(
    async () =>
      sekolahService.tambahSekolah(mockDb, {
        nama: "SD Baru",
        email: "admin@superadmin.id",
        password: "Password123!"
      }),
    (err) => err.statusCode === 409 && /Email sudah digunakan oleh akun Super Admin/.test(err.message)
  );
});

test("sekolahService.tambahSekolah membuat sekolah baru dengan password ter-hash dan auto-generate npsn/username", async () => {
  let createdData = null;

  const mockDb = {
    sekolah: {
      findUnique: async ({ where }) => {
        // Anggap belum ada npsn atau username yang bentrok
        return null;
      },
      create: async ({ data }) => {
        createdData = data;
        return {
          id: 5,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          _count: { sesi_skrining: 0 }
        };
      }
    },
    super_admin: {
      findUnique: async () => null
    }
  };

  const hasil = await sekolahService.tambahSekolah(mockDb, {
    nama: "SD Cempaka 03",
    email: "admin@cempaka03.sch.id",
    password: "PasswordRahasia123!",
    aktif: true
  });

  assert.equal(hasil.id, 5);
  assert.equal(hasil.nama, "SD Cempaka 03");
  assert.equal(hasil.email, "admin@cempaka03.sch.id");
  assert.equal(hasil.total_sesi, 0);
  assert.equal(hasil.password_hash, undefined);

  // Verifikasi NPSN 8 karakter terbuat otomatis
  assert.ok(createdData.npsn);
  assert.equal(createdData.npsn.length, 8);

  // Verifikasi username terbuat otomatis dari email
  assert.equal(createdData.username, "admin");

  // Verifikasi password_hash di-hash menggunakan bcrypt
  const valid = await bcrypt.compare("PasswordRahasia123!", createdData.password_hash);
  assert.equal(valid, true);
});

test("sekolahService.updateSekolah memperbarui field tanpa mengubah password bila password tidak diisi", async () => {
  const existingSekolah = {
    id: 1,
    npsn: "12345678",
    nama: "SD Lama",
    email: "lama@sekolah.sch.id",
    username: "sd_lama",
    alamat: null,
    kontak_telepon: null,
    password_hash: "hash_lama",
    aktif: true
  };

  let updatedPayload = null;

  const mockDb = {
    sekolah: {
      findUnique: async ({ where }) => {
        if (where.id === 1) return existingSekolah;
        return null;
      },
      findFirst: async () => null,
      update: async ({ where, data }) => {
        updatedPayload = data;
        return {
          ...existingSekolah,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          _count: { sesi_skrining: 8 }
        };
      }
    },
    super_admin: {
      findUnique: async () => null
    }
  };

  const hasil = await sekolahService.updateSekolah(mockDb, 1, {
    nama: "SD Baru Diperbarui",
    aktif: false
  });

  assert.equal(hasil.nama, "SD Baru Diperbarui");
  assert.equal(hasil.aktif, false);
  assert.equal(hasil.total_sesi, 8);

  // Password tidak ada dalam payload update
  assert.equal(updatedPayload.password_hash, undefined);
  assert.equal(updatedPayload.nama, "SD Baru Diperbarui");
  assert.equal(updatedPayload.aktif, false);
});

test("sekolahService.updateSekolah meng-hash password baru bila disediakan", async () => {
  const existingSekolah = {
    id: 1,
    npsn: "12345678",
    nama: "SD Lama",
    email: "lama@sekolah.sch.id",
    username: "sd_lama",
    password_hash: "hash_lama",
    aktif: true
  };

  let updatedPayload = null;

  const mockDb = {
    sekolah: {
      findUnique: async ({ where }) => (where.id === 1 ? existingSekolah : null),
      findFirst: async () => null,
      update: async ({ data }) => {
        updatedPayload = data;
        return {
          ...existingSekolah,
          ...data,
          created_at: new Date(),
          updated_at: new Date(),
          _count: { sesi_skrining: 0 }
        };
      }
    },
    super_admin: { findUnique: async () => null }
  };

  await sekolahService.updateSekolah(mockDb, 1, {
    password: "PasswordBaruGanti456!"
  });

  assert.ok(updatedPayload.password_hash);
  assert.notEqual(updatedPayload.password_hash, "hash_lama");
  const isValid = await bcrypt.compare("PasswordBaruGanti456!", updatedPayload.password_hash);
  assert.equal(isValid, true);
});
