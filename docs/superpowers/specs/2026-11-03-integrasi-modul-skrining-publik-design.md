# Integrasi Modul Skrining Publik Design

Size: project (full design). Status: agreed in conversation (2026-11-03); awaits the user's review.
Related: `docs/2026-10-26-sekolah-role-questions-assumptions.md` (D20–D26, D32–D43, A4, A11),
`docs/superpowers/specs/2026-10-27-accounts-students-schema-design.md` (the four tables that stay).

## Intent

A partner's merge (`c266afc`, merged at `6f04078`) added a public screening module: 10 unauthenticated
endpoints, 11 Prisma models, a migration, and a new seed. The merge stacked their work on top of ours
instead of joining it: `prisma/schema.prisma` now defines two complete schemas that map to the same
table names, and the file does not compile (missing `}` at line 216, P1012, 4 errors). No Prisma
command works until this is resolved.

This design integrates their screening flow into the scheme we already follow (D39 naming, `kelas`
table, hashed passwords, D40 school login), and replaces their placeholder scoring with the real
DSM-5 rule.

Their eight screening tables are genuine new ground we never designed. Only three tables overlap
(`super_admin`, `sekolah`, `siswa`). The partner has confirmed the instruments and the Level 2 flow are
placeholders and ours to redesign.

## Goals

- `prisma/schema.prisma` compiles, holds one schema, and obeys D39.
- The screening flow (session code → student → consent → Level 1 → Level 2) survives, renamed.
- Level 1 scoring follows the DSM-5 Level 1 Cross-Cutting Symptom Measure rule, not a single total.
- Keep our four tables and both applied migrations untouched.
- A parent cannot reach another child's screening by changing a number in the URL.
- No plain-text passwords anywhere, including seeds.

## Non-goals

- The AI assistant (out of scope for the project at this stage).
- Real instrument content. Questions, answer wording, and per-domain interpretation text stay dummy;
  the user will work through scoring and interpretation content with the assistant later.
- Level 2 interpretation bands.
- The wider switch of all primary keys to UUID. The user plans it later; this design only adds an
  unguessable token to `hasil_skrining`, because that row is the one unauthenticated callers address.
- Authentication for school and admin APIs (separate plan).

## Anti-goals

- Two naming styles in one schema. It would survive every future pull and confuse both developers.
- Scoring that reads a display label as a number. A renamed label must never silently change a result.
- Selecting instruments by matching a test's name. A test called "Asesmen Awal Bicara" must not be
  mistaken for the Level 1 test.
- Any schema where a finished attempt can be re-scored by a later threshold edit (D41).

## Constraints

- D39: Indonesian snake_case, PK `id`, FK `<tabel>_id`, Prisma model names equal table names, no
  `@@map`, `created_at` / `updated_at` stay English.
- D40: a school logs in with email **or** username. The partner's `sekolah` has neither `username` nor
  `npsn`, so adopting their table would break D40.
- D41: a finished attempt is never re-scored.
- D42: the session code is shared per school, and the student list may be searched with it. The search
  and confirm responses carry `nama` and `kelas` only.
- D43: scoring is the DSM-5 per-item, per-domain rule, not a sum.
- Our two migrations are applied and the database holds `super_admin`, `sekolah`, `kelas`, `siswa`.
  The partner's `20261101134443_init_erd_skrining` was **never applied**, so their schema side is free
  to redo.
- Node + Express + MySQL + Prisma 7.10.1, plain JavaScript ESM via `tsx`. Versions pinned exactly.
- Only the user commits (D31).

## Approaches

**A. Extend our schema with their eight tables, renamed to D39.** (chosen)
Keep our four tables exactly as they are. Add their eight renamed. Their SQL stays the source of the
screening design. Cost: rewrite ~975 lines of their JS (service 644, controller 191, validator 98,
routes 42) to the new names, plus real edits where `siswa.kelas` text becomes `kelas_id`.
Trades developer time for keeping D39, D40, both applied migrations, and all 19 passing tests.

**B. Adopt their camelCase schema, drop ours.** Their 975 lines keep working untouched. Cost: lose
`kelas`, `npsn`, and `username`, so D40 breaks and Q21 reopens; delete two applied migrations and reset
the database; rewrite `seedData.js` and retire parts of our tests. Cheapest on their code, most
expensive on decisions already made and written down.

**C. Hybrid: their eight stay camelCase, our three stay snake_case.** Saves renaming eight tables. But
their code reads `prisma.siswa.findFirst({ where: { idStudent, schoolId } })` and our `siswa` has `id`
and `sekolah_id`, so every student and school call still needs rewriting. Saves roughly a third of the
work and leaves two naming styles in the schema permanently.

**Chosen: A.** D39 is a written decision with tests and applied migrations behind it, and B quietly
undoes D40. The renaming in A is mechanical. It is the only option where the eight new tables arrive
speaking the same language as the rest of the project. Evidence the partner was heading this way
anyway: their `validasiSesi` reads `sesi.sekolah.npsn || "20400851"` with the comment "jika belum ada
kolom npsn" (`src/services/publicScreeningService.js:50`) — a column our `sekolah` already has.

## Scoring: the DSM-5 rule

Their code sums all 25 answers into one total and compares it to bands 0–10 and 11–100
(`publicScreeningService.js:398-427`, `prisma/seed.js:374-390`).

The Level 1 questions and the 0–4 scale in their seed are the **DSM-5 Level 1 Cross-Cutting Symptom
Measure (parent/guardian-rated, child 6–17)**. Its published scoring does not sum:

> The scores within each item within a domain should be reviewed. A rating of mild (i.e. 2) or greater
> on any item within a domain serves as a guide for additional inquiry/follow-up, with the exception of
> the inattention and psychosis domains, where a score of slight (i.e. 1) or greater on any item
> serves as a guide.

25 items split into 12 domains of 1–4 items each. The rule is per item, per domain.

Why this matters concretely: a child with one severe symptom (4) and 24 zeros totals 4 and lands in
"dalam batas wajar" under the summing rule. The real rule flags that domain. The summing rule misses
exactly the case this platform exists to catch.

**The rule we implement:** for each domain, take the **highest** answer score among that domain's
answered items and compare it to that domain's threshold. Highest ≥ threshold means the domain is
flagged. The same formula covers the Yes/No items, because their options carry scores too (below).

The item count is not fixed at 25 and the instruments are dummy, so nothing in the schema hard-codes
25, 12, or any threshold value. Domains, items, options, and thresholds are all rows.

## Tables

Unchanged, already applied: `super_admin`, `sekolah`, `kelas`, `siswa` (see the accounts design).

One column added to an existing table:

- **`sekolah`**: `kontak_telepon` VarChar(20) nullable. Their session-validation response shows the
  school's phone number to the parent, and our table has no such column.

New, replacing the partner's eight (all with `id` PK, `created_at`, `updated_at`):

- **`kategori_asesmen`** — a DSM-5 domain. `nama` VarChar(100), `ambang_batas` unsigned TinyInt (2 for
  most domains, 1 for inattention and psychosis), `tes_skrining_id` FK nullable (the Level 2 instrument
  for this domain), `deskripsi` Text nullable, `rekomendasi` Text nullable, `urutan` unsigned TinyInt.
- **`tes_skrining`** — an instrument. `super_admin_id` FK, `nama` VarChar(150), `level` unsigned
  TinyInt (1 or 2), `jenjang` VarChar(50), `deskripsi` Text, `aktif` Boolean default true.
- **`sesi_skrining`** — a school's screening run. `sekolah_id` FK, `nama` VarChar(150), `kode`
  VarChar(20) unique, `tanggal_pelaksanaan` Date, `status` enum `status_sesi`
  (`menunggu` / `aktif` / `selesai`).
- **`pertanyaan`** — `tes_skrining_id` FK, `kategori_asesmen_id` FK, `teks` Text, `tipe_jawaban` enum
  `tipe_jawaban` (`skala` / `ya_tidak`), `nomor_urut` unsigned SmallInt, `url_gambar` VarChar(255)
  nullable, `aktif` Boolean default true. Unique (`tes_skrining_id`, `nomor_urut`).
- **`opsi_jawaban`** — `pertanyaan_id` FK, `label` VarChar(10) (display only), `teks` VarChar(255),
  `skor` unsigned TinyInt (**the only thing scoring reads**), `urutan` unsigned TinyInt,
  `url_gambar` VarChar(255) nullable.
- **`hasil_skrining`** — one attempt. `siswa_id` FK, `sesi_skrining_id` FK, `token` Char(36) unique,
  `nama_responden` VarChar(150), `nomor_hp_responden` VarChar(20), `hubungan_responden` VarChar(50),
  `waktu_persetujuan` DateTime, `waktu_mulai` DateTime, `waktu_selesai` DateTime nullable,
  `selesai` Boolean default false, `kesimpulan` Text nullable.
  Unique (`siswa_id`, `sesi_skrining_id`): one attempt per child per session.
- **`jawaban_siswa`** (their `detail_jawaban_siswa`) — `hasil_skrining_id` FK, `pertanyaan_id` FK,
  `opsi_jawaban_id` FK. Unique (`hasil_skrining_id`, `pertanyaan_id`): autosave overwrites, never
  duplicates.
- **`hasil_kategori`** — the resolved per-domain outcome, written once when Level 1 is submitted.
  `hasil_skrining_id` FK, `kategori_asesmen_id` FK, `skor_tertinggi` unsigned TinyInt,
  `ambang_batas` unsigned TinyInt (copied at submit time), `terindikasi` Boolean.
  Unique (`hasil_skrining_id`, `kategori_asesmen_id`).
- **`hasil_tes`** — one row per instrument the child is given, Level 1 or Level 2.
  `hasil_skrining_id` FK, `tes_skrining_id` FK, `total_skor` unsigned SmallInt nullable,
  `selesai` Boolean default false, `waktu_selesai` DateTime nullable.
  Unique (`hasil_skrining_id`, `tes_skrining_id`). Created for the Level 1 instrument when the attempt
  starts, and for each flagged domain's instrument when Level 1 is submitted. This is also the list
  that drives the Level 2 dashboard, so the dashboard reads rows belonging to this attempt instead of
  querying every active instrument.

Dropped from the partner's schema:

- **`konfigurasi_penilaian`** (whole table). With a per-item threshold per domain there are no score
  bands to store. Its `deskripsi` and `rekomendasi` move onto `kategori_asesmen`.
- **`pertanyaan.jawaban_benar`** — confirmed by the user. Seeded `"0"` everywhere, read nowhere. A
  symptom questionnaire has no correct answer.
- **`pertanyaan.skor`** — dead once `opsi_jawaban.skor` exists.
- **`sesi_skrining.kategori_id`** — a Level 1 session spans all domains, so a single category on the
  session says nothing.
- **`deleted_at` on all eight tables.** Our convention is `aktif` plus hard delete (accounts design).
  Removes eight columns and every `deleted_at: null` filter from the queries. Results are never deleted.

## Rules

- **D35 (resolved):** thresholds are not versioned. When an attempt is submitted, each domain's
  outcome and the threshold used are written to `hasil_kategori`. A Super Admin editing a threshold
  later affects only later attempts. With D41 (finished attempts are never re-scored), the stored row
  *is* the record. One table instead of a version system.
- **Level selection by `tes_skrining.level`, never by name.** Level 1 is `level = 1`; a domain's
  follow-up is `kategori_asesmen.tes_skrining_id`. This replaces
  `namaTes: { contains: "Awal" }` (`publicScreeningService.js:411`, `:469`).
- **Level 2 is per flagged domain** (D33, D34). On Level 1 submit, a child receives exactly the
  instruments of the domains whose `terindikasi` is true, in the same visit with the same session code.
  A flagged domain with no instrument yet is flagged for the school only (D34). This replaces the
  placeholder that handed every child every instrument.
- **The flagged instruments run in a fixed order** (D36), taken from `kategori_asesmen.urutan`. The
  parent does not choose, so resume always knows what comes next. The partner's sequential unlocking
  (`publicScreeningService.js:506-517`) is therefore kept, applied to this attempt's own
  `hasil_tes` rows rather than to every active instrument.
- **Level 2 instruments show a neutral name to the parent** (D37), e.g. "Bagian lanjutan 1", numbered
  by `urutan`. The screen must not reveal which domain the child was flagged in. `tes_skrining.nama`
  stays the real name for the school and Super Admin, so the public response needs a separate label.
- **Public routes address an attempt by `token`, never by `id`.** `crypto.randomUUID()` at creation.
  The ten public endpoints need no login by design, so the identifier is the only thing protecting a
  child's answers. Sequential integers can be guessed by counting.
- **Scoring reads `opsi_jawaban.skor` only.** No `parseInt` of a display label, no fallback. A
  question with no answer contributes nothing to its domain's maximum.
- **Yes/No items score like everything else.** Options are rows with `skor`, so one rule covers both
  answer types. `tipe_jawaban` exists so the UI can render them differently.
- **The student search and confirm responses return `nama` and `kelas` only** (A4, narrowed by D42).
  The session code is shared per school, so anyone holding it can walk the roster; that is accepted,
  but the rows it returns must not carry identifying data. Their `konfirmasiSiswa` currently returns
  `nisn` and `jenisKelamin` (`publicScreeningService.js:124-131`), and both are dropped.
  `kelas` is what separates two children with the same name: the partner's own seed has an "Ahmad
  Fauzan" in both 5A and 5B (`prisma/seed.js`), so name alone is not enough to pick the right child.
- **All foreign keys `ON DELETE RESTRICT`**, matching the accounts design.
- **One seed.** `prisma/seed.js` is rebuilt on `prisma/seedData.js`: bcrypt hashing, password from
  `SEED_PASSWORD`, refuses `NODE_ENV=production`, idempotent via upsert. The partner's seed wrote
  `password: "password123"` in plain text for the super admin and the school.

## Fixes folded in

From the review of the merge:

1. `prisma/schema.prisma` compiles again (one schema, so the missing brace question disappears).
2. `AppError.notFound` restored to `src/utils/appError.js`. Their service calls it 8 times; it was
   deleted an hour before the pull as an unused static, and calling it now throws
   `TypeError: A.notFound is not a function`, turning every "not found" into a 500.
3. Duplicate `"db:seed"` key in `package.json` reduced to one.
4. `generated/prisma` regenerated. It is stale from before the merge and has no `sesi_skrining`,
   `hasil_skrining`, or `super_admin`, so every new route currently fails before reaching its logic.

## Migration plan

1. Delete the partner's unapplied `prisma/migrations/20261101134443_init_erd_skrining/`.
2. One new migration: eight new tables, two new enums, `sekolah.kontak_telepon`.
3. Our two existing migrations are not touched and the four existing tables are not dropped.

## Tests

TDD throughout: the test fails first, then the code makes it pass.

- **Scoring, as unit tests on a pure function** (the highest-per-domain rule, given domains, items,
  options, answers). The cases that matter: one severe answer in one domain flags only that domain;
  the inattention threshold of 1 flags where 2 would not; an unanswered domain flags nothing; a Yes
  answer flags its domain.
- **One DB test per public flow**, using the existing `dalamTransaksiBatal` rollback helper in
  `tests/db/helpers.js`.
- **One DB test for the ownership rule:** a token from one attempt cannot read or write another.
- **One DB test for autosave:** answering the same question twice leaves one row, not two.

## Calls made by the assistant (please check)

1. `kategori_asesmen` keeps its name and becomes the DSM-5 domain, rather than a new `domain_asesmen`
   table. Their `pertanyaan.kategori_id` already links a question to it, and the table is otherwise
   near-unused (display only, `publicScreeningService.js:54-59`), so it is free to repurpose.
2. `detail_jawaban_siswa` renamed to `jawaban_siswa`. Shorter, and it is not a detail of anything.
3. "Tidak Tahu" on a Yes/No item scores the same as "Ya". The published rule treats "Yes" or "I don't
   know" alike. Worth a second look when the real instrument text lands.
4. Level 2 stores a per-instrument total in `hasil_tes` and marks it finished, with no interpretation
   band. `shortcut:` comment in the code. Their `submitInstrumenLanjutan` currently computes nothing
   at all and writes nothing.
10. `hasil_tes` added so an attempt owns its list of instruments. Their Level 2 dashboard derived the
    list by querying every active instrument on every request, which is what made it identical for
    every child; reading this table instead is both the per-domain rule and one less query.
11. `hasil_skrining.selesai` means the whole attempt is done (Level 1 plus every instrument the child
    was given). Per-instrument progress lives in `hasil_tes.selesai`.
12. `kategori_asesmen.urutan` doubles as the fixed Level 2 order (D36) and the neutral numbering shown
    to the parent (D37), so one column serves both instead of a separate `urutan_lanjutan`.
5. Unfinished attempts stay resumable with no expiry. `shortcut:` comment in the code.
6. Soft delete dropped from all eight tables (see Tables).
7. `siswa.jenis_kelamin` keeps our `L` / `P` enum (D38); their `laki_laki` / `perempuan` is mapped at
   display time, which their code already does (`publicScreeningService.js:129`).
8. One attempt per child per session, enforced by a unique key. Their code ordered by `id` desc and
   took the newest, which allows duplicates to accumulate silently.
9. `nomor_urut` on `pertanyaan` is explicit, rather than relying on insertion order by `id`.

## Pending team

- **A11: confirming the child before an attempt is handed over.** D42 accepts that the roster can be
  listed, and A4 keeps the listed rows to name and class. But `mulaiSkrining` re-finds an existing
  attempt for that child and session and returns it, so completing the public flow for someone else's
  child hands over that child's in-progress or finished screening, token and all. The token protects
  an attempt once addressed; it does not protect this step, which is where the token is issued. A11
  proposes the parent confirm the child's `tanggal_lahir` here. That is one extra field on one
  endpoint, it leaks nothing (it is checked, never returned), and it is the only thing separating one
  parent from another child's answers. Recommended, not yet confirmed.
- **The question-to-domain mapping.** The 25 seeded items are custom Indonesian text, not the official
  DSM-5 wording, so the assistant will not guess which item belongs to which domain. Reading the text,
  the groups appear to be anxiety (1–2), mood (3–4), somatic (5–8), restlessness (9–10), attention
  (11–15), impulsivity (16–17), conduct (18–19), social (20–21), learning (22–23), routines and
  repetitive movement (24–25). Needs confirmation. Dummy data stands in until then.
- **Scoring and interpretation content**, to be worked through with the assistant later: final
  thresholds per domain, and the description and recommendation text each domain shows.
- **The last six items of the real instrument** cover substance use and suicidal ideation and are
  Yes/No. `tipe_jawaban` supports them. Whether a Yes there escalates immediately (contact the school)
  rather than routing to a questionnaire is a product decision, not a schema one.
- **Which domains get a Level 2 instrument.** Three dummy instruments exist (A attention, B conduct,
  C emotion) against 12 domains. `kategori_asesmen.tes_skrining_id` is nullable, so adding one later is
  a row, not a migration.
- Q21 (classes per school year), Q5 (students without NISN), Q22 (answer scale, now answered for
  Level 1 by the DSM-5 0–4 scale).

## What is left to the builder

- The exact Prisma attribute spelling and index names.
- How the ~975 lines of the partner's service, controller, validator, and routes are split after the
  rename. The scoring rule should come out as a pure function so it can be unit tested without a
  database.
- Response shapes stay as the partner built them where they already match the screens, so the frontend
  does not have to change twice. Field names inside responses follow the new column names.
