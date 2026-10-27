import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/app.js";

const config = { env: "test", isDevelopment: false, corsOrigin: ["http://localhost:3000"] };
const dbOk = async () => {};
const dbMati = async () => {
  throw new Error("connect ECONNREFUSED 127.0.0.1:3307");
};

/**
 * Menjalankan app pada port acak, memanggil fn(baseUrl), lalu menutup server.
 * @param {() => Promise<void>} cekDatabase
 * @param {(baseUrl: string) => Promise<void>} fn
 */
async function denganServer(cekDatabase, fn) {
  const server = createApp({ config, cekDatabase }).listen(0);
  await once(server, "listening");
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test("health OK saat database terhubung", async () => {
  await denganServer(dbOk, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.data.status, "OK");
    assert.equal(body.data.database, "terhubung");
    assert.equal(body.data.environment, "test");
    assert.equal(typeof body.data.timestamp, "string");
  });
});

test("health 503 saat database tidak terhubung", async () => {
  await denganServer(dbMati, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    const text = await res.text();
    const body = JSON.parse(text);
    assert.equal(res.status, 503);
    assert.equal(body.success, false);
    assert.equal(body.details.status, "DEGRADED");
    assert.equal(body.details.database, "tidak_terhubung");
    assert.ok(!text.includes("ECONNREFUSED"));
  });
});

test("rute tidak dikenal mengembalikan 404 JSON", async () => {
  await denganServer(dbOk, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/tidak-ada`);
    const body = await res.json();
    assert.equal(res.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.message, "Endpoint 'GET /api/tidak-ada' tidak ditemukan.");
  });
});

test("body JSON rusak mengembalikan 400", async () => {
  await denganServer(dbOk, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{rusak"
    });
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.message, "Format JSON pada body request tidak valid.");
  });
});
