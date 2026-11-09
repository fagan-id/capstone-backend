import { test } from "node:test";
import assert from "node:assert/strict";
import AppError from "../src/utils/appError.js";

test("AppError.notFound membuat error 404 yang operasional", () => {
  const err = AppError.notFound("Sesi tidak ditemukan.");

  assert.ok(err instanceof AppError);
  assert.equal(err.statusCode, 404);
  assert.equal(err.message, "Sesi tidak ditemukan.");
  assert.equal(err.isOperational, true);
});

test("AppError.unauthorized membuat error 401 yang operasional", () => {
  const err = AppError.unauthorized("Tidak terautentikasi.");

  assert.ok(err instanceof AppError);
  assert.equal(err.statusCode, 401);
  assert.equal(err.message, "Tidak terautentikasi.");
  assert.equal(err.isOperational, true);
});

test("AppError.forbidden membuat error 403 yang operasional", () => {
  const err = AppError.forbidden("Akses ditolak.");

  assert.ok(err instanceof AppError);
  assert.equal(err.statusCode, 403);
  assert.equal(err.message, "Akses ditolak.");
  assert.equal(err.isOperational, true);
});
