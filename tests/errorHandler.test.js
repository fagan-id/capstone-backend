import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { createErrorHandler } from "../src/middlewares/errorHandler.js";
import AppError from "../src/utils/appError.js";

/**
 * Membuat app uji dengan rute yang melempar error, lalu memanggil fn(baseUrl).
 * @param {boolean} isDevelopment
 * @param {(baseUrl: string) => Promise<void>} fn
 */
async function denganApp(isDevelopment, fn) {
  const app = express();
  app.get("/conflict", () => {
    throw AppError.conflict("NISN sudah terdaftar.");
  });
  app.get("/bad-request", () => {
    throw AppError.badRequest("Data tidak valid.", { nisn: "wajib diisi" });
  });
  app.get("/async-crash", async () => {
    throw new Error("rahasia db");
  });
  app.use(createErrorHandler({ isDevelopment }));

  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
}

test("AppError memakai status dan pesannya sendiri", async () => {
  await denganApp(false, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/conflict`);
    const body = await res.json();
    assert.equal(res.status, 409);
    assert.equal(body.message, "NISN sudah terdaftar.");
  });
});

test("AppError membawa details", async () => {
  await denganApp(false, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/bad-request`);
    const body = await res.json();
    assert.equal(res.status, 400);
    assert.equal(body.details.nisn, "wajib diisi");
  });
});

test("error tak terduga di route async disembunyikan", async () => {
  await denganApp(false, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/async-crash`);
    const text = await res.text();
    const body = JSON.parse(text);
    assert.equal(res.status, 500);
    assert.equal(body.message, "Terjadi kesalahan internal pada server.");
    assert.ok(!text.includes("rahasia db"));
    assert.ok(!("stack" in body));
  });
});

test("mode development menyertakan stack untuk error 500", async () => {
  await denganApp(true, async (baseUrl) => {
    const res = await fetch(`${baseUrl}/async-crash`);
    const body = await res.json();
    assert.equal(res.status, 500);
    assert.equal(typeof body.stack, "string");
  });
});
