# Sekolah API Plan

Spec: `docs/superpowers/specs/2026-11-22-sekolah-api-design.md`.

Every task: failing test first, implement, `npm test` green. Stop after each task for review; the user
commits (D31).

1. **Access.** Add `cekSekolahAktif` to `src/middlewares/auth.middleware.js`. Mount `/api/sekolah` in
   `src/routes/index.js`. Tests: no token 401, `SUPER_ADMIN` 403, inactive school 403.
2. **Kelas.** Validator, service, controller, route. Tests for the `tahun_ajaran` rule, duplicate 409,
   delete blocked by students, another school's id 404.
3. **Siswa.** Same four files. Tests for NISN format and 409, foreign `kelas_id` 404, delete blocked by
   `hasil_skrining` (A13).
4. **Session migration.** Back up the dev DB. Migration `sesi_waktu_dan_tinjauan` (time window,
   backfill, drop `status` / `tanggal_pelaksanaan`, create `tinjauan`). Move `validasiSesi`, the
   dashboard `sesi_aktif` count, the seed and the affected tests to the window. `npm test` and
   `npm run test:db` green before going on.
5. **Sesi.** Module with computed status, edit rules, `/tutup`, code generator. Tests at the three time
   boundaries, no reopen, retry on P2002, DB test that a started parent can still submit after
   `/tutup`.
6. **Hasil and tinjauan.** List, detail, upsert. Tests for scoping by session school, unfinished 409,
   default `belum_ditinjau`.
7. **Docs.** README endpoint table (also drop the stale lines 66 and 68), Postman requests.
