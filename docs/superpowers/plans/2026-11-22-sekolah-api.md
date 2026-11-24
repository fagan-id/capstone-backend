# Sekolah API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schools pick a Level 1 test when they create a session, end it with "Akhiri Sesi Skrining", and read each participant's result (Hasil Sesi Skrining).

**Architecture:** Same layering as `kelas`/`siswa`: `src/{routes,controllers,services,validators}/sekolah/sekolah<Modul>.js`, services take `(db, sekolahId, ...)`, `sekolahId` from `req.user.id`. One additive migration links a session to its test; the parent flow reads that link instead of "first Level 1".

**Tech Stack:** Node, Express 5, plain JS ESM, Prisma 7 (MySQL), `tsx --test`.

**Spec:** `docs/superpowers/specs/2026-11-22-sekolah-api-design.md` (revised 2026-11-24).

## Global Constraints

- Every task: failing test first, implement, `npm test` green. Stop after each task for review; only the user commits (D31).
- Another school's row returns 404, never 403. Results are scoped through `sesi_skrining.sekolah_id`.
- Envelope via `ApiResponse`, errors via `AppError.badRequest/notFound/conflict`, handlers call `next(err)`.
- Lists use `meta: { pagination: { page, limit, total, totalPages } }`; bad `page`/`limit` fall back to defaults (as `sekolahSiswa`).
- Results read stored snapshots (D41), never recalculated.
- Known pre-existing failure: `tests/db/seed.dbtest.js` "jalankanSeed dua kali tidak menggandakan instrumen skrining" (extra row in dev DB). Not ours.

## Review Focus

- A session whose test was deactivated after creation: parents already in it still get the questions (start, list, submit). Test in Task 4.
- Two Level 1 tests exist: the parent gets the session's test, not the lowest id. DB test in Task 4.
- `akhiri` while a parent is mid-screening: that parent can still submit Level 1. DB test in Task 5.
- Phone formats `08…`, `+628…`, `628…`, with spaces or dashes: `nomor_wa` is digits only starting `62`. Unit test in Task 6.
- `GET /hasil/:id` for an unfinished attempt: 200 with answers so far and empty `hasil_kategori`, not a crash. Service test in Task 6.

---

Tasks 1–3 (access, kelas, siswa) are done and committed (`da8616c`, `6ec6d20`, `adf1c76`).

### Task 4: Session test link (migration + parent flow)

**Files:**
- Modify: `prisma/schema.prisma` (`sesi_skrining`, `tes_skrining`)
- Create: `prisma/migrations/<ts>_sesi_tes_skrining/migration.sql`
- Modify: `src/services/public/skriningOrangTua.js` (`ambilLevel1`, `ambilPercobaan`, `mulaiSkrining`, `getPertanyaanLevel1`, `submitLevel1`)
- Modify: `prisma/seedData.js` (`jalankanSeed` sesi upsert)
- Modify tests that create `sesi_skrining`: `tests/db/skrining.dbtest.js`, `tests/db/superAdminKelolaSekolah.dbtest.js`
- Test: `tests/db/skriningOrangTua.dbtest.js`

**Interfaces:**
- Produces: `sesi_skrining.tes_skrining_id Int` (required, FK `tes_skrining`, `onDelete: Restrict`, `@@index([tes_skrining_id])`); relation `tes_skrining` on `sesi_skrining`, `sesi_skrining sesi_skrining[]` on `tes_skrining`.

- [ ] **Step 1: Back up the dev DB** with Laragon `mysqldump` to `.superpowers/backup-capstone_skrining-<date>.sql`. Expected: exit 0, non-empty file.
- [ ] **Step 2: Write failing DB tests** in `tests/db/skriningOrangTua.dbtest.js`:
  - `"peserta mendapat tes milik sesi, bukan tes level 1 dengan id terkecil"`: create a second active Level 1 test with one question, point the seed session at it, `mulai` → `getPertanyaanLevel1(tx, token).tes_skrining_id === tesBaru.id`.
  - `"sesi tetap memakai tesnya walau tes dinonaktifkan"`: `mulai`, set the session's test `aktif: false`, `getPertanyaanLevel1` still returns its questions and `submitLevel1` after `isiPenuh` succeeds.
- [ ] **Step 3: Run** `npm run test:db`. Expected: both new tests FAIL (unknown field `tes_skrining_id`).
- [ ] **Step 4: Schema and migration.** Generate with `npx prisma migrate dev --create-only --name sesi_tes_skrining`, then hand-edit the SQL to: add the column NULL; `UPDATE sesi_skrining SET tes_skrining_id = (SELECT MIN(id) FROM tes_skrining WHERE level = 1 AND aktif = 1)`; `MODIFY ... NOT NULL`; add index and FK. Apply with `npx prisma migrate dev`. Check that ABC123 has a non-null `tes_skrining_id`.
- [ ] **Step 5: Parent flow.** Replace `ambilLevel1(db)` with `ambilTesSesi(db, tes_skrining_id)`: `findUnique` by id, no `aktif` filter, same 404 message `"Instrumen skrining awal belum tersedia."`. `validasiSesi` result gains `tes_skrining_id` (used by `mulaiSkrining`). `ambilPercobaan` includes `sesi_skrining: { select: { tes_skrining_id: true } }`; `getPertanyaanLevel1` and `submitLevel1` use it.
- [ ] **Step 6: Seed and fixtures.** `jalankanSeed` creates the session after the tests, with `tes_skrining_id` = the seeded Level 1 test id. DB fixtures that create sessions pass `tes_skrining_id`.
- [ ] **Step 7: Run** `npm test` and `npm run test:db`. Expected: all pass except the known seed failure.

### Task 5: Sesi module (school + Super Admin akhiri)

**Files:**
- Create: `src/{validators,services,controllers,routes}/sekolah/sekolahSesi.js`
- Create: `src/{services,controllers,routes}/superAdmin/superAdminSesi.js`
- Modify: `src/routes/sekolah/index.js` (mount `/sesi`, `/tes`), `src/routes/index.js` (mount `/super-admin/sesi`)
- Test: `tests/sekolahSesiValidator.test.js`, `tests/sekolahSesiService.test.js`, `tests/sekolahSesiRoutes.test.js`, `tests/superAdminSesiRoutes.test.js`, `tests/db/skriningOrangTua.dbtest.js`

**Interfaces:**
- Consumes: `sesi_skrining.tes_skrining_id` (Task 4).
- Produces (service, `src/services/sekolah/sekolahSesi.js`):
  - `buatKodeSesi(): string`: 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` via `crypto.randomInt`.
  - `getDaftarTes(db): Promise<{id,nama,jenjang,deskripsi}[]>`: active Level 1 only.
  - `getDaftarSesi(db, sekolahId, { page, limit, status })`, `getDetailSesi(db, sekolahId, id)`.
  - `tambahSesi(db, sekolahId, { nama, tes_skrining_id }, sekarang = new Date())`.
  - `updateSesi(db, sekolahId, id, { nama })`, `akhiriSesi(db, sekolahId, id)`, `hapusSesi(db, sekolahId, id)`.
  - `akhiriSesi` with `sekolahId = null` means "any school" (used by Super Admin).
- Produces (validator): `validasiIdSesi`, `validasiQueryDaftarSesi`, `validasiTambahSesi`, `validasiUpdateSesi`.

- [ ] **Step 1: Validator tests.** `nama` 3–150 trimmed; `tes_skrining_id` positive integer, required on create, rejected on update (400); `status` query only `aktif`/`selesai`, else 400.
- [ ] **Step 2: Service tests** (mock `db`, pattern of `tests/sekolahSiswaService.test.js`):
  - `tambahSesi` with an inactive or Level 2 test → 400 `"Tes skrining tidak valid. Pilih tes skrining awal yang aktif."`
  - `tambahSesi` stores `status: "aktif"` and `tanggal_pelaksanaan` = WIB date of `sekarang` (`2026-11-24T18:00:00Z` → `2026-11-25`).
  - P2002 on `kode` retries; 5 failures → error propagates; `create` called 5 times.
  - `akhiriSesi` on `selesai` → 409 `"Sesi skrining sudah diakhiri."`; another school's id → 404 `"Sesi skrining tidak ditemukan."`
  - `hapusSesi` with `hasil_skrining` → 409 `"Sesi sudah memiliki peserta dan tidak dapat dihapus."`
  - `getDetailSesi` returns `jumlah_peserta`, `jumlah_selesai`, `jumlah_belum_selesai`.
- [ ] **Step 3: Route tests.** `SUPER_ADMIN` on `/api/sekolah/sesi` → 403; `POST /api/sekolah/sesi/:id/akhiri` 200; `GET /api/sekolah/tes` 200; `POST /api/super-admin/sesi/:id/akhiri` with `SUPER_ADMIN` 200 and with `SEKOLAH` 403.
- [ ] **Step 4: DB test** `"orang tua yang sudah mulai tetap bisa mengirim setelah sesi diakhiri"`: `mulai`, `akhiriSesi(tx, sekolahId, sesiId)`, `isiPenuh`, `submitLevel1` resolves; a new `mulai` for `siswaLain` rejects 400.
- [ ] **Step 5: Run** the new files. Expected: FAIL (modules missing).
- [ ] **Step 6: Implement.** `akhiriSesi` uses `updateMany({ where: { id, status: "aktif", ...(sekolahId && { sekolah_id }) } })`; when count is 0, look up the row to choose 404 vs 409.
- [ ] **Step 7: Run** `npm test` and `npm run test:db`. Expected: green except the known seed failure.

### Task 6: Hasil Sesi Skrining

**Files:**
- Create: `src/{validators,services,controllers,routes}/sekolah/sekolahHasil.js`
- Modify: `src/routes/sekolah/index.js` (`GET /sesi/:id/hasil` lives in `sekolahSesi` routes and calls the hasil controller; mount `/hasil`)
- Test: `tests/sekolahHasilValidator.test.js`, `tests/sekolahHasilService.test.js`, `tests/sekolahHasilRoutes.test.js`, `tests/db/sekolahHasil.dbtest.js`

**Interfaces:**
- Consumes: `getDetailSesi` scoping rule (Task 5).
- Produces:
  - `nomorWa(nomor: string): string`: digits only; leading `0` → `62`; leading `62` kept.
  - `getDaftarHasil(db, sekolahId, sesiId, { page, limit, search, status })`: `{ sesi: { id, nama, kode, status, jumlah_peserta }, items: [{ id, siswa: { nama, kelas }, status }], pagination }`; row `status` is `selesai`/`belum_selesai`.
  - `getDetailHasil(db, sekolahId, hasilId)`: shape in the spec's "Hasil Sesi Skrining".

- [ ] **Step 1: Unit test `nomorWa`:** `"081234567890"` → `"6281234567890"`; `"+62 812-3456-7890"` → `"6281234567890"`; `"6281234567890"` unchanged.
- [ ] **Step 2: Validator tests:** `status` only `selesai`/`belum_selesai`; bad `page` falls back.
- [ ] **Step 3: Service tests:** another school's session or result → 404 (`"Sesi skrining tidak ditemukan."`, `"Hasil skrining tidak ditemukan."`); unfinished result → `status: "belum_selesai"`, `hasil_kategori: []`, answers present; `responden.hubungan` passes `hubungan_responden` through; `jawaban` ordered by test level then `nomor_urut`.
- [ ] **Step 4: Route tests:** `GET /api/sekolah/sesi/:id/hasil` 200 with `pagination`; `GET /api/sekolah/hasil/:id` 200; `SUPER_ADMIN` 403.
- [ ] **Step 5: DB test:** seed, `mulai`, `isiPenuh` with one domain over threshold, `submitLevel1`; `getDetailHasil` returns that domain's stored `deskripsi`/`rekomendasi` and one `jawaban` per question.
- [ ] **Step 6: Run** the new files. Expected: FAIL.
- [ ] **Step 7: Implement.** `kelas` comes from `siswa.kelas` with a one-line comment: current class, not class at screening time (Q21).
- [ ] **Step 8: Run** `npm test` and `npm run test:db`. Expected: green except the known seed failure.

### Task 7: Docs

**Files:** `README.md`, `postman/capstone-backend.postman_collection.json`

- [ ] **Step 1:** README endpoint table for Kelas, Siswa, Tes, Sesi, Hasil, Super Admin akhiri; delete the stale `POST /super-admin/logout` and `/admin/...` alias lines; note `npx prisma migrate dev` for `sesi_tes_skrining`.
- [ ] **Step 2:** Postman folder "Sekolah" with one request per endpoint (`{{base_url}}`, Bearer `{{token_sekolah}}`), plus "Akhiri Sesi" under Super Admin.
- [ ] **Step 3:** `node -e "JSON.parse(require('fs').readFileSync('postman/capstone-backend.postman_collection.json','utf8'))"` exits 0.
