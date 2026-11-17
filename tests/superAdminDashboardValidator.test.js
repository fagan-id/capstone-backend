import { test } from "node:test";
import assert from "node:assert/strict";
import { validasiQueryDashboard } from "../src/validators/superAdmin/superAdminDashboard.js";

test("validasiQueryDashboard: menggunakan nilai default jika query kosong", () => {
  const result = validasiQueryDashboard({});
  assert.deepEqual(result, {
    page: 1,
    limit: 5,
    kategori: undefined
  });
});

test("validasiQueryDashboard: menerima page dan limit valid", () => {
  const result = validasiQueryDashboard({ page: "3", limit: "15" });
  assert.equal(result.page, 3);
  assert.equal(result.limit, 15);
});

test("validasiQueryDashboard: membatasi limit maksimal 50", () => {
  const result = validasiQueryDashboard({ page: 1, limit: 100 });
  assert.equal(result.page, 1);
  assert.equal(result.limit, 50);
});

test("validasiQueryDashboard: mengabaikan kategori 'semua'", () => {
  const result = validasiQueryDashboard({ kategori: "semua" });
  assert.equal(result.kategori, undefined);
});

test("validasiQueryDashboard: menerima kategori valid (sekolah, tes, sesi)", () => {
  assert.equal(validasiQueryDashboard({ kategori: "sekolah" }).kategori, "sekolah");
  assert.equal(validasiQueryDashboard({ kategori: "TES" }).kategori, "tes");
  assert.equal(validasiQueryDashboard({ kategori: " sesi " }).kategori, "sesi");
});

test("validasiQueryDashboard: melempar error jika page bukan bilangan bulat positif", () => {
  assert.throws(() => validasiQueryDashboard({ page: "0" }), /Parameter 'page' harus berupa bilangan bulat positif/);
  assert.throws(() => validasiQueryDashboard({ page: "-2" }), /Parameter 'page' harus berupa bilangan bulat positif/);
  assert.throws(() => validasiQueryDashboard({ page: "abc" }), /Parameter 'page' harus berupa bilangan bulat positif/);
  assert.throws(() => validasiQueryDashboard({ page: "1.5" }), /Parameter 'page' harus berupa bilangan bulat positif/);
});

test("validasiQueryDashboard: melempar error jika limit bukan bilangan bulat positif", () => {
  assert.throws(() => validasiQueryDashboard({ limit: "0" }), /Parameter 'limit' harus berupa bilangan bulat positif/);
  assert.throws(() => validasiQueryDashboard({ limit: "-5" }), /Parameter 'limit' harus berupa bilangan bulat positif/);
  assert.throws(() => validasiQueryDashboard({ limit: "xyz" }), /Parameter 'limit' harus berupa bilangan bulat positif/);
});

test("validasiQueryDashboard: melempar error jika kategori tidak valid", () => {
  assert.throws(
    () => validasiQueryDashboard({ kategori: "siswa" }),
    /Kategori filter 'siswa' tidak valid. Pilihan: semua, sekolah, tes, sesi./
  );
});
