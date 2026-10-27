# capstone-backend Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An empty-but-runnable backend: Express server with `GET /api/health`, MySQL 8.0 + phpMyAdmin in Docker, Prisma wired to MySQL, no tables yet.

**Architecture:** Plain JavaScript ESM run through `tsx` (Prisma 7 generates TypeScript client files). `createApp({ config, cekDatabase })` builds the Express app with its dependencies injected, so tests run without a database. `server.js` wires the real config and Prisma and opens the port.

**Tech Stack:** Node.js 22, Express 5, Prisma ORM 7 + `@prisma/adapter-mariadb`, MySQL 8.0 (Docker), `node:test`.

**Spec:** `docs/superpowers/specs/2026-10-26-capstone-backend-scaffold-design.md` (decisions log: `docs/2026-10-26-sekolah-role-questions-assumptions.md`)

## Global Constraints

- Project root: `D:\Coding\Project\capstone-backend`. Not connected to `CapstoneProjek` (D15).
- Plain JavaScript, `"type": "module"`, `import` syntax. Run with `tsx`.
- Exact pinned versions: `express` 5.3.0, `cors` 2.8.6, `dotenv` 18.0.9, `@prisma/client` 7.10.1, `@prisma/adapter-mariadb` 7.10.1; dev: `prisma` 7.10.1, `tsx` 4.23.15. `.npmrc` has `save-exact=true`.
- `engines.node`: `>=22.12.0` (local is v22.14.0).
- Credentials only in `.env` (git-ignored). `.env.example` holds placeholders. Database name `capstone_skrining`.
- API response shape: success `{ success: true, message, data }`, error `{ success: false, message, details? }`. API messages in Indonesian.
- 2-space indent, LF line endings. Short Indonesian JSDoc header per source file, as in `dev`.
- No git commits by the assistant. Only `git init` (D31). Tasks have no commit step; the user commits.
- No tables/models, no auth, no frontend (spec non-goals).

## Review Focus

1. **Ports already taken by `dev`'s containers (3306, 8080):** defaults in `.env.example` are `DB_PORT=3307`, `PMA_PORT=8081`, so both stacks can run side by side. Verified in Task 3.
2. **`.env` missing or with empty values:** startup fails at once with an Indonesian message naming every missing variable, not a cryptic driver error. Test in Task 1.
3. **DB password with special characters (`@`, `#`, `/`):** `databaseUrl` percent-encodes user and password. Test in Task 1.
4. **Malformed JSON body:** returns `400` JSON `"Format JSON pada body request tidak valid."`, not a 500 or an HTML page. Test in Task 2.
5. **Database down while the server runs:** `/api/health` returns `503` with `database: "tidak_terhubung"`, the server stays up, and the raw driver error is never sent to the client. Test in Task 2, manual check in Task 3.

---

### Task 1: Project skeleton, config and shared utils

**Files:**
- Create: `package.json`, `.npmrc`, `.gitignore`, `.gitattributes`, `.editorconfig`, `.env.example`
- Create: `src/config/loadConfig.js`, `src/config/index.js`
- Create: `src/utils/apiResponse.js`, `src/utils/appError.js`, `src/utils/logger.js`
- Test: `tests/config.test.js`

**Interfaces:**
- Produces:
  - `loadConfig(env: Record<string, string|undefined>) -> Config` (named export, `src/config/loadConfig.js`, pure, throws `Error` on invalid input)
  - `Config = { env: string, isDevelopment: boolean, port: number, corsOrigin: string[], db: { host: string, port: number, user: string, password: string, name: string }, databaseUrl: string }`
  - `config: Config` (named export, `src/config/index.js`; does `import "dotenv/config"` then `loadConfig(process.env)`)
  - `ApiResponse.success(res, { data?, message = "Sukses", statusCode = 200, meta = {} })`, `ApiResponse.error(res, { message = "Terjadi kesalahan", statusCode = 500, details = null })` (default export class)
  - `AppError(message, statusCode = 500, details = null)` with `isOperational = true`, statics `badRequest(message, details)`, `unauthorized(message)`, `forbidden(message)`, `notFound(message)`, `conflict(message)`, `internal(message, details)` (sets `isOperational = false`). Default export. Same defaults as `dev`'s `sistem/src/utils/appError.js`.
  - `logger` with `info`, `success`, `warn`, `error(message, err?)`, `debug` (default export, ESM port of `dev`'s `sistem/src/utils/logger.js`)

- [ ] **Step 1: Create the folder files and install pinned dependencies**

`package.json`: `"name": "capstone-backend"`, `"version": "0.1.0"`, `"private": true`, `"type": "module"`, `"engines": { "node": ">=22.12.0" }`, scripts:

| script | command |
|--------|---------|
| `dev` | `tsx watch src/server.js` |
| `start` | `tsx src/server.js` |
| `test` | `tsx --test` |
| `db:generate` | `prisma generate` |
| `db:migrate` | `prisma migrate dev` |
| `docker:up` | `docker compose up -d` |
| `docker:down` | `docker compose down` |

`.npmrc`: `save-exact=true`. `.gitignore`: `node_modules/`, `.env`, `generated/`, `*.log`. `.gitattributes`: `* text=auto eol=lf`. `.editorconfig`: 2 spaces, LF, utf-8, final newline.

`.env.example`:
```
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=capstone_skrining
DB_USER=capstone_user
DB_PASSWORD=ganti_password_ini
DB_ROOT_PASSWORD=ganti_root_password_ini

PMA_PORT=8081
```

Run (workdir `D:\Coding\Project\capstone-backend`):
```
git init
npm install express@5.3.0 cors@2.8.6 dotenv@18.0.9 @prisma/client@7.10.1 @prisma/adapter-mariadb@7.10.1
npm install --save-dev prisma@7.10.1 tsx@4.23.15
```
Expected: `package.json` lists exactly those versions with no `^`.

- [ ] **Step 2: Write the failing config test**

```js
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL, cannot find module `src/config/loadConfig.js`.

- [ ] **Step 4: Implement `loadConfig(env) -> Config` in `src/config/loadConfig.js`, then `src/config/index.js` and the three utils**

Rules for `loadConfig`:
- Required (empty string counts as missing), checked in this order: `DB_USER`, `DB_PASSWORD`, `DB_NAME`. If any are missing, throw `Error("Variabel environment wajib belum diisi: <names joined by ', '>. Salin .env.example menjadi .env lalu isi nilainya.")`.
- Defaults: `NODE_ENV` → `"development"`, `PORT` → 5000, `DB_HOST` → `"127.0.0.1"`, `DB_PORT` → 3306, `CORS_ORIGIN` → `"http://localhost:3000"`.
- `PORT` and `DB_PORT` must be integers 1–65535, otherwise throw an `Error` whose message contains the variable name.
- `corsOrigin`: split `CORS_ORIGIN` on `,`, trim, drop empty entries.
- `databaseUrl`: `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${name}`.

The utils are ESM ports of `dev`'s `apiResponse.js`, `appError.js` and `logger.js`. `ApiResponse.error` drops `dev`'s `error` option and keeps `details`.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test`
Expected: PASS, 5 tests.

---

### Task 2: Express app, health route and error handling

**Files:**
- Create: `src/app.js`, `src/routes/index.js`, `src/middlewares/errorHandler.js`
- Test: `tests/app.test.js`, `tests/errorHandler.test.js`

**Interfaces:**
- Consumes: `Config`, `ApiResponse`, `AppError`, `logger` from Task 1.
- Produces:
  - `createApp({ config: Pick<Config, "env"|"isDevelopment"|"corsOrigin">, cekDatabase: () => Promise<void> }) -> express.Application` (named export, `src/app.js`). Order: `cors({ origin: config.corsOrigin, credentials: true })`, `express.json()`, `express.urlencoded({ extended: true })`, `app.use("/api", createRouter(...))`, `notFoundHandler`, `createErrorHandler(...)`. It does **not** import Prisma.
  - `createRouter({ config, cekDatabase }) -> express.Router` (named export, `src/routes/index.js`), mounts `GET /health`.
  - `notFoundHandler(req, res)` and `createErrorHandler({ isDevelopment: boolean }) -> (err, req, res, next) => void` (named exports, `src/middlewares/errorHandler.js`).

- [ ] **Step 1: Write the failing app test**

`tests/app.test.js`. Start the app on port 0 with `createApp({ config: { env: "test", isDevelopment: false, corsOrigin: ["http://localhost:3000"] }, cekDatabase }).listen(0)`, wait for `once(server, "listening")`, call it with `fetch`, and close the server in `after`/`finally`.

| test | cekDatabase | request | assertions |
|------|-------------|---------|------------|
| `health OK saat database terhubung` | `async () => {}` | `GET /api/health` | status 200; `success === true`; `data.status === "OK"`; `data.database === "terhubung"`; `data.environment === "test"`; `typeof data.timestamp === "string"` |
| `health 503 saat database tidak terhubung` | `async () => { throw new Error("connect ECONNREFUSED 127.0.0.1:3307") }` | `GET /api/health` | status 503; `success === false`; `details.status === "DEGRADED"`; `details.database === "tidak_terhubung"`; response text does not contain `"ECONNREFUSED"` |
| `rute tidak dikenal mengembalikan 404 JSON` | ok | `GET /api/tidak-ada` | status 404; `success === false`; `message === "Endpoint 'GET /api/tidak-ada' tidak ditemukan."` |
| `body JSON rusak mengembalikan 400` | ok | `POST /api/health`, header `Content-Type: application/json`, body `{rusak` | status 400; `success === false`; `message === "Format JSON pada body request tidak valid."` |

- [ ] **Step 2: Write the failing error handler test**

`tests/errorHandler.test.js`. Build a small `express()` app with test-only routes, then `app.use(createErrorHandler({ isDevelopment }))`:

| test | route throws | isDevelopment | assertions |
|------|--------------|---------------|------------|
| `AppError memakai status dan pesannya sendiri` | `AppError.conflict("NISN sudah terdaftar.")` (sync) | false | status 409; `message === "NISN sudah terdaftar."` |
| `AppError membawa details` | `AppError.badRequest("Data tidak valid.", { nisn: "wajib diisi" })` | false | status 400; `details.nisn === "wajib diisi"` |
| `error tak terduga di route async disembunyikan` | `async () => { throw new Error("rahasia db") }` | false | status 500; `message === "Terjadi kesalahan internal pada server."`; text has no `"rahasia db"`; no `stack` key |
| `mode development menyertakan stack untuk error 500` | `async () => { throw new Error("rahasia db") }` | true | status 500; `typeof body.stack === "string"` |

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL, cannot find module `src/app.js` / `src/middlewares/errorHandler.js`. Task 1's tests still pass.

- [ ] **Step 4: Implement `createApp`, `createRouter`, `notFoundHandler`, `createErrorHandler`**

Health route:
- `cekDatabase()` resolves → `ApiResponse.success(res, { message: "Server berjalan normal.", data: { status: "OK", database: "terhubung", environment: config.env, timestamp: new Date().toISOString() } })`.
- It rejects → `logger.warn` with the error message, then `ApiResponse.error(res, { statusCode: 503, message: "Server berjalan, tetapi database tidak dapat dijangkau.", details: { status: "DEGRADED", database: "tidak_terhubung", environment, timestamp } })`.

`notFoundHandler`: 404, `message: \`Endpoint '${req.method} ${req.originalUrl}' tidak ditemukan.\``.

Error handler rules:
- status = `err.statusCode ?? err.status ?? 500`. Anything outside 400–599 becomes 500.
- message: `err.type === "entity.parse.failed"` → `"Format JSON pada body request tidak valid."`; else status ≥ 500 and not `err.isOperational` → `"Terjadi kesalahan internal pada server."`; else `err.message`.
- Include `details` only when `err.isOperational && err.details`.
- Include `stack` only when `isDevelopment && status >= 500`.
- Log with `logger.error(message, err)` for ≥ 500, otherwise `logger.warn`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS, 13 tests (5 config + 4 app + 4 error handler).

---

### Task 3: Docker MySQL, Prisma wiring, server entry and README

**Files:**
- Create: `docker-compose.yml`, `prisma/schema.prisma`, `prisma.config.js`, `src/lib/prisma.js`, `src/server.js`, `README.md`

**Interfaces:**
- Consumes: `config` (Task 1), `createApp` (Task 2), `logger` (Task 1).
- Produces:
  - `prisma: PrismaClient` and `cekDatabase() -> Promise<void>` (named exports, `src/lib/prisma.js`). `cekDatabase` runs ``prisma.$queryRaw`SELECT 1` `` and rejects if the DB is unreachable. Later plans import `prisma` from here.

- [ ] **Step 1: Write `docker-compose.yml`**

- Service `mysql`: image `mysql:8.0`, container `capstone_skrining_mysql`, `restart: unless-stopped`, command `--default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci` (same as `dev`). Environment from `.env`: `MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}`, `MYSQL_DATABASE: ${DB_NAME}`, `MYSQL_USER: ${DB_USER}`, `MYSQL_PASSWORD: ${DB_PASSWORD}`. Ports `"${DB_PORT:-3307}:3306"`. Volume `capstone_mysql_data:/var/lib/mysql`. Healthcheck `mysqladmin ping -h localhost` (interval 5s, retries 10, start_period 15s).
- Service `phpmyadmin`: image `phpmyadmin:5.2`, container `capstone_skrining_phpmyadmin`, `PMA_HOST: mysql`, `PMA_PORT: 3306`, ports `"${PMA_PORT:-8081}:80"`, `depends_on: mysql: condition: service_healthy`.
- Named volume `capstone_mysql_data`.

- [ ] **Step 2: Write `prisma/schema.prisma` and `prisma.config.js`**

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../generated/prisma"
  moduleFormat        = "esm"
  importFileExtension = "ts"
}

datasource db {
  provider = "mysql"
}
```

`prisma.config.js`: `defineConfig` from `"prisma/config"` with `schema: "prisma/schema.prisma"`, `migrations: { path: "prisma/migrations" }`, `datasource: { url: config.databaseUrl }`, where `config` is imported from `./src/config/index.js` (single source of truth for the URL).

- [ ] **Step 3: Implement `src/lib/prisma.js`**

`PrismaClient` imported from `../../generated/prisma/client.ts`. Adapter: `new PrismaMariaDb({ host, port, user, password, database: name, connectionLimit: 5, connectTimeout: 5_000 })` from `config.db`.

- [ ] **Step 4: Implement `src/server.js`**

- `createApp({ config, cekDatabase })`, then `app.listen(config.port)`. On `listening`, log the URL and the health URL with `logger.success`.
- On server `error` with `code === "EADDRINUSE"`, log `Port ${config.port} sudah dipakai aplikasi lain. Ubah PORT di .env atau hentikan aplikasi tersebut.` and `process.exit(1)`. Rethrow other errors.
- On `SIGINT`/`SIGTERM`: `server.close()`, then `await prisma.$disconnect()`, then `process.exit(0)`.

- [ ] **Step 5: Write `README.md`**

Short Indonesian README with these sections:
- Prerequisites: Node ≥ 22.12, Docker.
- Setup: copy `.env.example` → `.env`, `npm install`, `npm run docker:up`, `npm run db:generate`, `npm run dev`.
- URLs: API `http://localhost:5000/api/health`, phpMyAdmin `http://localhost:8081`.
- Scripts table.
- Pointer to `docs/`.

- [ ] **Step 6: Verify the full stack end to end**

Run each and check:

| command | expected |
|---------|----------|
| `docker --version` and `docker compose version` | both print versions. If Docker is missing, stop and tell the user. |
| `Copy-Item .env.example .env` | `.env` exists |
| `npm run docker:up`, then `docker compose ps` | `capstone_skrining_mysql` is `healthy` and phpmyadmin is running. No port conflict with `skrining_kognitif_mysql`. |
| `npm run db:generate` | `Generated Prisma Client (7.10.1)`, and `generated/prisma/client.ts` exists |
| `npm run dev` (background), then `Invoke-RestMethod http://localhost:5000/api/health` | `data.database` is `terhubung` |
| `docker compose stop mysql`, then the same request | HTTP 503 with `details.database` `tidak_terhubung` within ~5s; the dev server is still running |
| `docker compose start mysql`, wait for healthy, request again | `terhubung` again |
| a second `npm start` while dev is running | logs `Port 5000 sudah dipakai ...` and exits with code 1 |
| `Invoke-WebRequest http://localhost:8081` | status 200 (phpMyAdmin login page) |
| `npm test` | 13 tests pass |
| `git status --short` | `.env`, `node_modules/` and `generated/` are **not** listed |

Stop the dev server afterwards. Leave the Docker containers running for the user unless they ask otherwise.

---

## Left for later plans

- Shadow database privileges for `prisma migrate dev`: the `MYSQL_USER` only has rights on `capstone_skrining`, and Migrate needs `CREATE, ALTER, DROP, INDEX, REFERENCES` on `prisma_migrate_shadow_db%`. Add an init grant script with the first migration (Accounts + Students plan).
- `bcryptjs`, `jsonwebtoken`, seed script: Accounts plan.
