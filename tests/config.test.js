import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../src/config/loadConfig.js";

const base = { DB_USER: "capstone_user", DB_PASSWORD: "rahasia", DB_NAME: "capstone_skrining" };

test("loadConfig memakai nilai default", () => {
  const c = loadConfig(base);
  assert.equal(c.env, "development");
  assert.equal(c.isDevelopment, true);
  assert.equal(c.port, 5000);
  assert.deepEqual(c.corsOrigin, ["http://localhost:3000"]);
  assert.deepEqual(c.db, { host: "127.0.0.1", port: 3306, user: "capstone_user", password: "rahasia", name: "capstone_skrining" });
  assert.equal(c.databaseUrl, "mysql://capstone_user:rahasia@127.0.0.1:3306/capstone_skrining");
});

test("loadConfig menolak variabel DB yang kosong atau hilang", () => {
  assert.throws(() => loadConfig({ DB_USER: "", DB_NAME: "x" }), /DB_USER, DB_PASSWORD/);
});

test("loadConfig meng-encode karakter khusus pada user dan password", () => {
  const c = loadConfig({ ...base, DB_PASSWORD: "p@ss#/word" });
  assert.equal(c.databaseUrl, "mysql://capstone_user:p%40ss%23%2Fword@127.0.0.1:3306/capstone_skrining");
});

test("loadConfig menolak PORT dan DB_PORT yang tidak valid", () => {
  assert.throws(() => loadConfig({ ...base, PORT: "abc" }), /PORT/);
  assert.throws(() => loadConfig({ ...base, DB_PORT: "70000" }), /DB_PORT/);
});

test("loadConfig membaca CORS_ORIGIN berupa daftar dipisah koma", () => {
  const c = loadConfig({ ...base, CORS_ORIGIN: "http://a.test, http://b.test", NODE_ENV: "production" });
  assert.deepEqual(c.corsOrigin, ["http://a.test", "http://b.test"]);
  assert.equal(c.isDevelopment, false);
});
