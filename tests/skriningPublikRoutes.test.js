/**
 * Uji lapisan HTTP rute skrining publik.
 * Seluruh kasus di sini berhenti di validator, jadi tidak menyentuh database.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/app.js";

const config = { env: "test", isDevelopment: false, corsOrigin: ["http://localhost:3000"] };
const dbOk = async () => {};

const TOKEN = "11111111-2222-4333-8444-555555555555";
const DASAR = "/api/public/skrining";

/**
 * @param {(baseUrl: string) => Promise<void>} fn
 */
async function denganServer(fn) {
  const server = createApp({ config, cekDatabase: dbOk }).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

/**
 * @param {string} baseUrl
 * @param {string} jalur
 * @param {object} [opsi]
 */
async function minta(baseUrl, jalur, opsi = {}) {
  const res = await fetch(`${baseUrl}${DASAR}${jalur}`, {
    ...opsi,
    headers: opsi.body ? { "Content-Type": "application/json" } : undefined
  });
  return { status: res.status, body: await res.json() };
}

test("validasi sesi menolak body tanpa kode", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/sesi/validasi", { method: "POST", body: "{}" });

    assert.equal(status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, "Kode sesi wajib diisi.");
  });
});

test("pencarian siswa menolak kata kunci terlalu pendek", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/sesi/ABC123/siswa?search=ab");

    assert.equal(status, 400);
    assert.match(body.message, /minimal 3 karakter/);
  });
});

test("konfirmasi siswa menolak id bukan angka", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/sesi/ABC123/siswa/bukan-angka");

    assert.equal(status, 400);
    assert.match(body.message, /siswa_id/);
  });
});

test("mulai skrining menolak tanpa persetujuan", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/mulai", {
      method: "POST",
      body: JSON.stringify({
        kode: "ABC123",
        siswa_id: 1,
        nama_responden: "Ibu Uji",
        nomor_hp_responden: "08123456789",
        hubungan_responden: "orang_tua",
        persetujuan: false
      })
    });

    assert.equal(status, 400);
    assert.match(body.message, /menyetujui/);
  });
});

test("mulai skrining menolak hubungan responden di luar pilihan", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/mulai", {
      method: "POST",
      body: JSON.stringify({
        kode: "ABC123",
        siswa_id: 1,
        nama_responden: "Ibu Uji",
        nomor_hp_responden: "08123456789",
        hubungan_responden: "tetangga",
        persetujuan: true
      })
    });

    assert.equal(status, 400);
    assert.match(body.message, /orang_tua/);
  });
});

test("percobaan dialamatkan lewat token, bukan id berurut", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/12/pertanyaan");

    assert.equal(status, 400);
    assert.equal(body.message, "Tautan pengerjaan tidak valid.");
  });
});

test("autosave menolak id pertanyaan yang tidak valid", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, `/${TOKEN}/jawaban`, {
      method: "PUT",
      body: JSON.stringify({ pertanyaan_id: 0, opsi_jawaban_id: 3 })
    });

    assert.equal(status, 400);
    assert.match(body.message, /pertanyaan_id/);
  });
});

test("submit level 1 memeriksa token sebelum menyentuh database", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/abc/submit-level-1", { method: "POST" });

    assert.equal(status, 400);
    assert.equal(body.message, "Tautan pengerjaan tidak valid.");
  });
});

test("dashboard tindak lanjut memeriksa token", async () => {
  await denganServer(async (baseUrl) => {
    const { status } = await minta(baseUrl, "/abc/tindak-lanjut");

    assert.equal(status, 400);
  });
});

test("pertanyaan lanjutan menolak id instrumen bukan angka", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, `/${TOKEN}/tindak-lanjut/xx/pertanyaan`);

    assert.equal(status, 400);
    assert.match(body.message, /tes_skrining_id/);
  });
});

test("submit instrumen lanjutan menolak id instrumen bukan angka", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, `/${TOKEN}/tindak-lanjut/xx/submit`, { method: "POST" });

    assert.equal(status, 400);
    assert.match(body.message, /tes_skrining_id/);
  });
});

test("rute skrining publik yang tidak ada tetap 404 JSON", async () => {
  await denganServer(async (baseUrl) => {
    const { status, body } = await minta(baseUrl, "/tidak-ada-rute");

    assert.equal(status, 404);
    assert.equal(body.success, false);
  });
});
