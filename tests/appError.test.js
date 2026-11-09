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
