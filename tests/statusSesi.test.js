import test from "node:test";
import assert from "node:assert/strict";
import { statusSesi, filterSesiAktif } from "../src/utils/statusSesi.js";

const sesi = {
  waktu_mulai: new Date("2026-12-01T00:00:00Z"),
  waktu_selesai: new Date("2026-12-02T00:00:00Z")
};

test("statusSesi menunggu sebelum waktu_mulai", () => {
  assert.equal(statusSesi(sesi, new Date("2026-11-30T23:59:59.999Z")), "menunggu");
});

test("statusSesi aktif tepat pada waktu_mulai", () => {
  assert.equal(statusSesi(sesi, new Date("2026-12-01T00:00:00Z")), "aktif");
});

test("statusSesi selesai tepat pada waktu_selesai", () => {
  assert.equal(statusSesi(sesi, new Date("2026-12-02T00:00:00Z")), "selesai");
});

test("filterSesiAktif memakai batas yang sama dengan statusSesi", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  assert.deepEqual(filterSesiAktif(now), { waktu_mulai: { lte: now }, waktu_selesai: { gt: now } });
});
