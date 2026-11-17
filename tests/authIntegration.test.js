import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import bcrypt from "bcrypt";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const testConfig = {
  env: "test",
  isDevelopment: false,
  corsOrigin: ["http://localhost:3000"],
  jwt: { secret: "test-secret-key-skrining-abk-2026", expiresIn: "1h" }
};

const dbOk = async () => {};

async function denganServer(fn) {
  const server = createApp({ config: testConfig, cekDatabase: dbOk }).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test("Integration: Alur login Super Admin, akses /me, dan logout", async () => {
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const originalAdminFindFirst = prisma.super_admin.findFirst;
  prisma.super_admin.findFirst = async ({ where }) => {
    // Dipanggil saat login atau saat /me
    return {
      id: 1,
      nama: "superadmin",
      email: "admin@skriningabk.id",
      password_hash: hashedPassword,
      aktif: true,
      created_at: new Date(),
      updated_at: new Date()
    };
  };

  try {
    await denganServer(async (baseUrl) => {
      // 1. Login Super Admin
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "admin@skriningabk.id",
          password: plainPassword
        })
      });

      assert.equal(loginRes.status, 200);
      const loginData = await loginRes.json();
      assert.equal(loginData.success, true);
      assert.equal(loginData.data.role, "SUPER_ADMIN");
      assert.equal(loginData.data.redirectTo, "/admin/dashboard");
      assert.ok(loginData.data.token);

      const token = loginData.data.token;

      // 2. Akses /me dengan Bearer token
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.equal(meRes.status, 200);
      const meData = await meRes.json();
      assert.equal(meData.success, true);
      assert.equal(meData.data.role, "SUPER_ADMIN");
      assert.equal(meData.data.user.username, "superadmin");

      // 3. Logout
      const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST"
      });

      assert.equal(logoutRes.status, 200);
      const logoutData = await logoutRes.json();
      assert.equal(logoutData.success, true);
    });
  } finally {
    prisma.super_admin.findFirst = originalAdminFindFirst;
  }
});

test("Integration: Alur login Sekolah aktif dan penolakan akun nonaktif", async () => {
  const plainPassword = "Password123!";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const originalAdminFindFirst = prisma.super_admin.findFirst;
  const originalSekolahFindFirst = prisma.sekolah.findFirst;

  prisma.super_admin.findFirst = async () => null;

  try {
    await denganServer(async (baseUrl) => {
      // 1. Login Sekolah Aktif
      prisma.sekolah.findFirst = async () => ({
        id: 5,
        nama: "SDN Sukamaju 01",
        email: "sdnsukamaju01@sch.id",
        password_hash: hashedPassword,
        alamat: "Jl. Pendidikan No. 1",
        kontak_telepon: "081234567890",
        aktif: true
      });

      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "sdnsukamaju01@sch.id",
          password: plainPassword
        })
      });

      assert.equal(loginRes.status, 200);
      const loginData = await loginRes.json();
      assert.equal(loginData.data.role, "SEKOLAH");
      assert.equal(loginData.data.redirectTo, "/sekolah/dashboard");

      // 2. Login Sekolah Nonaktif (harus 403)
      prisma.sekolah.findFirst = async () => ({
        id: 6,
        nama: "SDN Nonaktif 02",
        email: "sdnnonaktif@sch.id",
        password_hash: hashedPassword,
        aktif: false
      });

      const inactiveRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "sdnnonaktif@sch.id",
          password: plainPassword
        })
      });

      assert.equal(inactiveRes.status, 403);
      const inactiveData = await inactiveRes.json();
      assert.equal(inactiveData.success, false);
      assert.match(inactiveData.message, /Akun sekolah dinonaktifkan/);
    });
  } finally {
    prisma.super_admin.findFirst = originalAdminFindFirst;
    prisma.sekolah.findFirst = originalSekolahFindFirst;
  }
});
