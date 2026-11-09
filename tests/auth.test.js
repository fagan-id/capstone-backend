import { test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../src/lib/prisma.js";
import { config } from "../src/config/index.js";
import { AuthController } from "../src/controllers/auth.controller.js";
import { verifyToken, authorizeRoles } from "../src/middlewares/auth.middleware.js";

// Helper mock response
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    clearedCookies: [],
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    clearCookie(name, options) {
      this.clearedCookies.push({ name, options });
      return this;
    }
  };
  return res;
}

test("AuthController.login validasi input kosong", async () => {
  const req = { body: {} };
  const res = createMockRes();
  let errorCaught = null;

  await AuthController.login(req, res, (err) => {
    errorCaught = err;
  });

  assert.ok(errorCaught);
  assert.equal(errorCaught.statusCode, 400);
  assert.match(errorCaught.message, /Identifier dan password wajib diisi/);
});

test("AuthController.login sukses sebagai Super Admin via email", async () => {
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  prisma.superAdmin.findFirst = async () => ({
    idAdmin: 1,
    username: "superadmin",
    email: "admin@skriningabk.id",
    password: hashedPassword,
    deletedAt: null
  });

  try {
    const req = {
      body: {
        identifier: "admin@skriningabk.id",
        password: plainPassword
      }
    };
    const res = createMockRes();

    await AuthController.login(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.equal(res.jsonData.data.role, "SUPER_ADMIN");
    assert.equal(res.jsonData.data.redirectTo, "/admin/dashboard");
    assert.equal(res.jsonData.data.user.username, "superadmin");
    assert.ok(res.jsonData.data.token);
    assert.ok(res.cookies.token);

    // Verifikasi isi decoded token
    const decoded = jwt.verify(res.jsonData.data.token, config.jwt.secret);
    assert.equal(decoded.id, 1);
    assert.equal(decoded.role, "SUPER_ADMIN");
    assert.equal(decoded.email, "admin@skriningabk.id");
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
  }
});

test("AuthController.login sukses sebagai Super Admin via username", async () => {
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  prisma.superAdmin.findFirst = async () => ({
    idAdmin: 1,
    username: "superadmin",
    email: "admin@skriningabk.id",
    password: hashedPassword,
    deletedAt: null
  });

  try {
    const req = {
      body: {
        identifier: "superadmin",
        password: plainPassword
      }
    };
    const res = createMockRes();

    await AuthController.login(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.data.role, "SUPER_ADMIN");
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
  }
});

test("AuthController.login sukses sebagai Sekolah", async () => {
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  const originalSekolahFindFirst = prisma.sekolah.findFirst;

  prisma.superAdmin.findFirst = async () => null;
  prisma.sekolah.findFirst = async () => ({
    idSchool: 10,
    adminId: 1,
    schoolName: "SDN Sukamaju 01",
    email: "sdnsukamaju01@sch.id",
    password: hashedPassword,
    alamat: "Jl. Pendidikan No. 1",
    kontakTelepon: "081234567890",
    statusAktif: true,
    deletedAt: null
  });

  try {
    const req = {
      body: {
        identifier: "sdnsukamaju01@sch.id",
        password: plainPassword
      }
    };
    const res = createMockRes();

    await AuthController.login(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.equal(res.jsonData.data.role, "SEKOLAH");
    assert.equal(res.jsonData.data.redirectTo, "/sekolah/dashboard");
    assert.equal(res.jsonData.data.user.schoolName, "SDN Sukamaju 01");
    assert.ok(res.jsonData.data.token);

    const decoded = jwt.verify(res.jsonData.data.token, config.jwt.secret);
    assert.equal(decoded.id, 10);
    assert.equal(decoded.role, "SEKOLAH");
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
    prisma.sekolah.findFirst = originalSekolahFindFirst;
  }
});

test("AuthController.login menolak akun yang tidak ditemukan di kedua tabel", async () => {
  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  const originalSekolahFindFirst = prisma.sekolah.findFirst;

  prisma.superAdmin.findFirst = async () => null;
  prisma.sekolah.findFirst = async () => null;

  try {
    const req = {
      body: {
        identifier: "unknown@example.com",
        password: "Password123!"
      }
    };
    const res = createMockRes();
    let errorCaught = null;

    await AuthController.login(req, res, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught);
    assert.equal(errorCaught.statusCode, 401);
    assert.match(errorCaught.message, /Kredensial tidak valid/);
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
    prisma.sekolah.findFirst = originalSekolahFindFirst;
  }
});

test("AuthController.login menolak password yang salah pada Super Admin", async () => {
  const hashedPassword = await bcrypt.hash("PasswordBenar!", 10);

  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  prisma.superAdmin.findFirst = async () => ({
    idAdmin: 1,
    username: "superadmin",
    email: "admin@skriningabk.id",
    password: hashedPassword,
    deletedAt: null
  });

  try {
    const req = {
      body: {
        identifier: "admin@skriningabk.id",
        password: "PasswordSalah!"
      }
    };
    const res = createMockRes();
    let errorCaught = null;

    await AuthController.login(req, res, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught);
    assert.equal(errorCaught.statusCode, 401);
    assert.match(errorCaught.message, /Kredensial tidak valid/);
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
  }
});

test("AuthController.login menolak akun sekolah yang berstatus nonaktif (403)", async () => {
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  const originalSekolahFindFirst = prisma.sekolah.findFirst;

  prisma.superAdmin.findFirst = async () => null;
  prisma.sekolah.findFirst = async () => ({
    idSchool: 11,
    adminId: 1,
    schoolName: "SDN Nonaktif 02",
    email: "sdnnonaktif@sch.id",
    password: hashedPassword,
    statusAktif: false,
    deletedAt: null
  });

  try {
    const req = {
      body: {
        identifier: "sdnnonaktif@sch.id",
        password: plainPassword
      }
    };
    const res = createMockRes();
    let errorCaught = null;

    await AuthController.login(req, res, (err) => {
      errorCaught = err;
    });

    assert.ok(errorCaught);
    assert.equal(errorCaught.statusCode, 403);
    assert.match(errorCaught.message, /Akun sekolah dinonaktifkan/);
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
    prisma.sekolah.findFirst = originalSekolahFindFirst;
  }
});

test("AuthController.logout menghapus cookie dan mengembalikan respon sukses", async () => {
  const req = {};
  const res = createMockRes();

  await AuthController.logout(req, res, (err) => {
    if (err) throw err;
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.jsonData.success, true);
  assert.match(res.jsonData.message, /Logout berhasil/);
  assert.equal(res.clearedCookies.length, 1);
  assert.equal(res.clearedCookies[0].name, "token");
});

test("auth.middleware verifyToken menolak request tanpa token", () => {
  const req = { headers: {} };
  const res = createMockRes();
  let errorCaught = null;

  verifyToken(req, res, (err) => {
    errorCaught = err;
  });

  assert.ok(errorCaught);
  assert.equal(errorCaught.statusCode, 401);
  assert.match(errorCaught.message, /Token autentikasi tidak ditemukan/);
});

test("auth.middleware verifyToken meloloskan token valid dan mengisi req.user", () => {
  const token = jwt.sign(
    { id: 1, role: "SUPER_ADMIN", email: "admin@skriningabk.id" },
    config.jwt.secret,
    { expiresIn: "1h" }
  );

  const req = {
    headers: {
      authorization: `Bearer ${token}`
    }
  };
  const res = createMockRes();
  let nextCalled = false;

  verifyToken(req, res, (err) => {
    assert.ifError(err);
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, 1);
  assert.equal(req.user.role, "SUPER_ADMIN");
  assert.equal(req.user.email, "admin@skriningabk.id");
});

test("auth.middleware authorizeRoles membatasi hak akses", () => {
  const middleware = authorizeRoles("SUPER_ADMIN");

  // Kasus 1: Role cocok
  const reqMatch = { user: { role: "SUPER_ADMIN" } };
  let matchCalled = false;
  middleware(reqMatch, {}, (err) => {
    assert.ifError(err);
    matchCalled = true;
  });
  assert.equal(matchCalled, true);

  // Kasus 2: Role tidak cocok
  const reqMismatch = { user: { role: "SEKOLAH" } };
  let errorCaught = null;
  middleware(reqMismatch, {}, (err) => {
    errorCaught = err;
  });
  assert.ok(errorCaught);
  assert.equal(errorCaught.statusCode, 403);
});

test("AuthController.me mengambil data Super Admin yang sedang login", async () => {
  const originalAdminFindFirst = prisma.superAdmin.findFirst;
  prisma.superAdmin.findFirst = async () => ({
    idAdmin: 1,
    username: "superadmin",
    email: "admin@skriningabk.id",
    createdAt: new Date(),
    updatedAt: new Date()
  });

  try {
    const req = {
      user: { id: 1, role: "SUPER_ADMIN", email: "admin@skriningabk.id" }
    };
    const res = createMockRes();

    await AuthController.me(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.equal(res.jsonData.data.role, "SUPER_ADMIN");
    assert.equal(res.jsonData.data.user.username, "superadmin");
  } finally {
    prisma.superAdmin.findFirst = originalAdminFindFirst;
  }
});

test("AuthController.me mengambil data Sekolah yang sedang login", async () => {
  const originalSekolahFindFirst = prisma.sekolah.findFirst;
  prisma.sekolah.findFirst = async () => ({
    idSchool: 10,
    adminId: 1,
    schoolName: "SDN Sukamaju 01",
    email: "sdnsukamaju01@sch.id",
    alamat: "Jl. Pendidikan No. 1",
    kontakTelepon: "081234567890",
    statusAktif: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  try {
    const req = {
      user: { id: 10, role: "SEKOLAH", email: "sdnsukamaju01@sch.id" }
    };
    const res = createMockRes();

    await AuthController.me(req, res, (err) => {
      if (err) throw err;
    });

    assert.equal(res.statusCode, 200);
    assert.equal(res.jsonData.success, true);
    assert.equal(res.jsonData.data.role, "SEKOLAH");
    assert.equal(res.jsonData.data.user.schoolName, "SDN Sukamaju 01");
  } finally {
    prisma.sekolah.findFirst = originalSekolahFindFirst;
  }
});
