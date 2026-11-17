/**
 * Script Pengujian End-to-End (E2E) Live API Server & Database MySQL.
 * Menjalankan server HTTP dan melakukan request HTTP nyata ke seluruh modul utama backend:
 * - Health Check
 * - Auth (Login Super Admin & Sekolah, Me, Logout)
 * - Dashboard Super Admin (KPI cards & aktivitas)
 * - Kelola Sekolah (CRUD)
 * - Tes Skrining (Overview, Tab Pertanyaan, Tab Pemetaan, Tab Penilaian, Tab Interpretasi)
 * - Public Skrining (Validasi Sesi Orang Tua)
 */

import { once } from "node:events";
import { createApp } from "../src/app.js";
import { config } from "../src/config/index.js";
import { prisma, cekDatabase } from "../src/lib/prisma.js";

const results = [];

async function runStep(nama, fn) {
  const start = performance.now();
  try {
    const detail = await fn();
    const duration = Math.round(performance.now() - start);
    results.push({ nama, status: "PASS", duration, detail });
    console.log(`  [PASS] ${nama} (${duration}ms) - ${detail || "OK"}`);
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    results.push({ nama, status: "FAIL", duration, detail: err.message });
    console.error(`  [FAIL] ${nama} (${duration}ms) - Error: ${err.message}`);
  }
}

async function main() {
  console.log("\n==================================================================");
  console.log("  MEMULAI PENGUJIAN END-TO-END (E2E) LIVE REST API CAPSTONE-BACKEND");
  console.log("==================================================================\n");

  // 1. Jalankan server express pada port acak yang aman
  const app = createApp({ config, cekDatabase });
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Server uji berjalan di ${baseUrl}\n`);

  let superAdminToken = "";
  let sekolahToken = "";
  let idSekolahUji = null;
  let idTesLevel1 = 1;

  try {
    // A. HEALTH CHECK
    await runStep("1. Health Check (GET /api/health)", async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || body.data.status !== "OK") throw new Error("Health check invalid");
      return `Database: ${body.data.database}, Status: ${body.data.status}`;
    });

    // B. AUTH SUPER ADMIN
    await runStep("2. Login Super Admin (POST /api/auth/login)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "superadmin@demo.test",
          password: process.env.SEED_PASSWORD || "parhan123"
        })
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || !body.data.token || body.data.role !== "SUPER_ADMIN") {
        throw new Error("Login Super Admin gagal");
      }
      superAdminToken = body.data.token;
      return `Token berhasil dibuat untuk Super Admin (${body.data.user.email})`;
    });

    await runStep("3. Verifikasi Profil Super Admin (GET /api/auth/me)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || body.data.role !== "SUPER_ADMIN") throw new Error("Profil tidak valid");
      return `Nama: ${body.data.user.nama}, Role: ${body.data.role}`;
    });

    // C. DASHBOARD SUPER ADMIN
    await runStep("4. Dashboard Super Admin (GET /api/super-admin/dashboard)", async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/dashboard`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || !body.data.kpi_cards || body.data.kpi_cards.length !== 4) {
        throw new Error("Payload dashboard tidak lengkap");
      }
      const totalSekolah = body.data.statistik.total_sekolah;
      const sesiAktif = body.data.statistik.sesi_aktif;
      return `Total Sekolah: ${totalSekolah}, Sesi Aktif: ${sesiAktif}, 4 KPI Cards OK`;
    });

    await runStep("5. Penolakan Rute /api/admin/dashboard (Harus 404 karena rute eksklusif /super-admin)", async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 404) throw new Error(`Status ${res.status}, harus 404 Not Found`);
      return "Endpoint /admin/dashboard terproteksi 404 (rute eksklusif /super-admin/*)";
    });

    // D. KELOLA SEKOLAH
    await runStep("6. Daftar Sekolah (GET /api/super-admin/sekolah)", async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/sekolah`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data)) throw new Error("Format daftar sekolah salah");
      return `Jumlah sekolah ditemukan: ${body.data.length}, total: ${body.pagination?.total || 0}`;
    });

    await runStep("7. Tambah Sekolah Baru (POST /api/super-admin/sekolah)", async () => {
      const randomNpsn = String(Math.floor(10000000 + Math.random() * 90000000));
      const res = await fetch(`${baseUrl}/api/super-admin/sekolah`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${superAdminToken}`
        },
        body: JSON.stringify({
          nama: "SD Inklusi Mandiri E2E",
          email: `admin_e2e_${randomNpsn}@sekolah.sch.id`,
          password: "PasswordRahasia123!",
          npsn: randomNpsn,
          aktif: true
        })
      });
      if (res.status !== 201) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || !body.data.id) throw new Error("Gagal menambah sekolah");
      idSekolahUji = body.data.id;
      return `Sekolah dibuat dengan ID: ${idSekolahUji}, Nama: ${body.data.nama}`;
    });

    if (idSekolahUji) {
      await runStep(`8. Detail Sekolah (GET /api/super-admin/sekolah/${idSekolahUji})`, async () => {
        const res = await fetch(`${baseUrl}/api/super-admin/sekolah/${idSekolahUji}`, {
          headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const body = await res.json();
        return `Data sekolah dimuat: ${body.data.nama}, NPSN: ${body.data.npsn}`;
      });

      await runStep(`9. Update Sekolah (PUT /api/super-admin/sekolah/${idSekolahUji})`, async () => {
        const res = await fetch(`${baseUrl}/api/super-admin/sekolah/${idSekolahUji}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${superAdminToken}`
          },
          body: JSON.stringify({
            nama: "SD Inklusi Mandiri E2E (Diperbarui)",
            aktif: false
          })
        });
        if (res.status !== 200) throw new Error(`Status ${res.status}`);
        const body = await res.json();
        return `Status diubah menjadi aktif=${body.data.aktif}`;
      });

      await runStep(`10. Penolakan DELETE Sekolah (DELETE /api/super-admin/sekolah/${idSekolahUji})`, async () => {
        const res = await fetch(`${baseUrl}/api/super-admin/sekolah/${idSekolahUji}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${superAdminToken}` }
        });
        if (res.status !== 405) throw new Error(`Status ${res.status}, harus 405 Method Not Allowed`);
        const body = await res.json();
        return `Ditolak dengan 405: "${body.message}"`;
      });
    }

    // E. MANAJEMEN TES SKRINING (TAHAP 1 - 5)
    await runStep("11. Daftar Tes Skrining (GET /api/super-admin/tes-skrining)", async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || !Array.isArray(body.data)) throw new Error("Gagal memuat tes");
      const tesLevel1 = body.data.find((t) => t.level === 1) || body.data[0];
      idTesLevel1 = tesLevel1.id;
      return `Total tes: ${body.data.length}, ID Level 1 acuan: ${idTesLevel1} (${tesLevel1.nama})`;
    });

    await runStep("12. Daftar Domain DSM-5 (GET /api/super-admin/tes-skrining/kategori)", async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/kategori`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Jumlah domain asesmen: ${body.data.length}`;
    });

    await runStep(`13. Overview Detail Tes Level 1 (GET /api/super-admin/tes-skrining/${idTesLevel1})`, async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/${idTesLevel1}`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Nama Tes: ${body.data.nama}, Level: ${body.data.level}, Pertanyaan: ${body.data.total_pertanyaan}`;
    });

    await runStep(`14. Tab Pertanyaan Tes (GET /api/super-admin/tes-skrining/${idTesLevel1}/pertanyaan)`, async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/${idTesLevel1}/pertanyaan`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Jumlah butir pertanyaan dimuat: ${body.data.length}`;
    });

    await runStep(`15. Tab Pemetaan Tes Level 1 (GET /api/super-admin/tes-skrining/${idTesLevel1}/pemetaan)`, async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/${idTesLevel1}/pemetaan`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Pemetaan domain dimuat: ${body.data.length} domain`;
    });

    await runStep(`16. Tab Penilaian Tes (GET /api/super-admin/tes-skrining/${idTesLevel1}/penilaian)`, async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/${idTesLevel1}/penilaian`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Tipe Penilaian: ${body.data.tipe_penilaian}, Konfigurasi dimuat`;
    });

    await runStep(`17. Tab Interpretasi Tes (GET /api/super-admin/tes-skrining/${idTesLevel1}/interpretasi)`, async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/tes-skrining/${idTesLevel1}/interpretasi`, {
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Konfigurasi interpretasi: ${body.data.length} item`;
    });

    // F. AUTH SEKOLAH & SKRINING PUBLIK
    await runStep("18. Login Sekolah (POST /api/auth/login)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "sekolah@demo.test",
          password: process.env.SEED_PASSWORD || "parhan123"
        })
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      if (!body.success || body.data.role !== "SEKOLAH") throw new Error("Login sekolah gagal");
      sekolahToken = body.data.token;
      return `Login Sekolah sukses, ID: ${body.data.user.id}, Nama: ${body.data.user.nama}`;
    });

    await runStep("19. Validasi Sesi Publik Orang Tua (POST /api/public/skrining/sesi/validasi)", async () => {
      const res = await fetch(`${baseUrl}/api/public/skrining/sesi/validasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode: "ABC123" })
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return `Sesi valid: "${body.data.nama}", Sekolah: "${body.data.sekolah.nama}"`;
    });

    // G. LOGOUT ENDPOINTS
    await runStep("20. Logout Super Admin (POST /api/super-admin/logout)", async () => {
      const res = await fetch(`${baseUrl}/api/super-admin/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${superAdminToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return body.message;
    });

    await runStep("21. Logout Umum Auth (POST /api/auth/logout)", async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${sekolahToken}` }
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}`);
      const body = await res.json();
      return body.message;
    });

  } finally {
    // Bersihkan sekolah uji dari database jika dibuat
    if (idSekolahUji) {
      await prisma.sekolah.delete({ where: { id: idSekolahUji } }).catch(() => {});
    }
    server.close();
    await prisma.$disconnect();
  }

  // Tampilkan rangkuman akhir
  console.log("\n==================================================================");
  console.log("                     RANGKUMAN HASIL PENGUJIAN");
  console.log("==================================================================");
  const total = results.length;
  const pass = results.filter((r) => r.status === "PASS").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  console.log(`Total Pengujian : ${total}`);
  console.log(`Berhasil (PASS) : ${pass}`);
  console.log(`Gagal (FAIL)    : ${fail}`);
  console.log("==================================================================\n");

  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Terjadi fatal error pada script pengujian:", err);
  process.exit(1);
});
