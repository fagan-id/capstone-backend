# Sekolah Role: Questions, Assumptions & Decisions

Living document for the Sekolah-role brainstorming. Updated as answers come in.
Source branch: `origin/dev` (commit `7d3cfbf`).

Status labels: **OPEN** (no answer yet), **LEANING** (partial answer, needs confirmation), **DECIDED** (confirmed by the team), **SUPERSEDED** (replaced by a later decision, kept for history).

**Update 2026-10-27:** the team dropped the student self-report (only the Parent/Guardian fills in tests), and Lv 1 → Lv 2 is now automatic by threshold. See D32–D38. Items they replace are struck through and marked SUPERSEDED.

---

## 1. Decisions (confirmed)

| # | Decision | Date |
|---|----------|------|
| D1 | The product is now an **early-detection screening** tool, not an IQ test. The IQ/Wechsler scoring is legacy. | 2026-10-26 |
| D2 | Target population: **SD (elementary) children only**. | 2026-10-26 |
| D3 | ~~Two kinds of respondent: Parent/Guardian report and student self-report.~~ SUPERSEDED by D32. | 2026-10-26 |
| D4 | Parents have no accounts. They enter through a **session code**. (Students no longer use the system, D32.) | 2026-10-26, amended 2026-10-27 |
| D5 | **NISN** is the student's unique identifier (like a student card). | 2026-10-26 |
| D6 | ~~Sessions are typed "Parent only" or "Student only".~~ SUPERSEDED by D32: every session is filled in by parents. | 2026-10-26 |
| D7 | ~~Student flow: enter code, verify identity, start the test.~~ SUPERSEDED by D32. | 2026-10-26 |
| D8 | ~~Parent report vs self-report disagreement: the school decides at Lv 2.~~ SUPERSEDED by D32: there is only one respondent. | 2026-10-26 |
| D9 | ~~Student types part of their name and picks it from a dropdown.~~ SUPERSEDED by D32. The same search-and-pick pattern is kept for the **parent** picking their child (A4, A5). | 2026-10-26 |
| D10 | ~~Lv 1 and Lv 2 are different tests and different sessions; Lv 2 only when Lv 1 is vague.~~ SUPERSEDED by D33. | 2026-10-26 |
| D11 | **Resume:** if a parent refreshes or closes the browser, they re-enter the session code and identity, then **continue where they left off**, including any open Lv 2 (D33). Answers must be saved on the server as they go. | 2026-10-26, amended 2026-10-27 |
| D12 | **Current scope is backend only** (Express API + MySQL). Frontend is out of scope for now. | 2026-10-26 |
| D13 | Entry flow confirmed (more or less): enter code, validate, show school + session name, search name, pick child, start or resume, save answers as they go, submit. (Respondent type removed by D32.) | 2026-10-26, amended 2026-10-27 |
| D15 | **Fresh start:** a new folder `capstone-backend` **outside** the current repo, not connected to it. The current `dev` branch is a reference only. Both teammates agreed. | 2026-10-26 |
| D16 | `capstone-backend` is the **single backend for every role** (Super Admin, Sekolah, Parent/Guardian, Student): all functions and the full database. | 2026-10-26 |
| D17 | **Same stack** as `dev`: Node.js + Express + MySQL (Docker). | 2026-10-26 |
| D18 | **Build order:** A. database schema, then C + D (Sekolah API + Parent/Student API, with seeded instrument data), then B (Super Admin API). The AI assistant is **out of scope for now**. | 2026-10-26 |
| D19 | The **instrument content** (questions, answer options, result rules) will be designed together with the team later. Schema first, placeholder content until then. | 2026-10-26 |
| D20 | **Naming convention:** Indonesian names only, all snake_case. Primary key is always `id`. Foreign keys are always `<tabel>_id` (e.g. `siswa.sekolah_id`). | 2026-10-26 |
| D21 | **One login account per school** for now. Multiple staff accounts may come later (see Q9 / Q18). | 2026-10-26 |
| D22 | **NISN is unique across the whole system** (national student ID). | 2026-10-26 |
| D23 | When a student **moves school**, the student row moves to the new school, but screening results stay visible **only to the school that ran the screening**. | 2026-10-26 |
| D24 | Students are **hard deleted** (no soft delete for `siswa`), so the same NISN can be added again. | 2026-10-26 |
| D25 | `kelas` gets a `tahun_ajaran` column now, even though Q21 is still open. Easy to ignore later, hard to add once data exists. | 2026-10-26 |
| D26 | Detailed column design goes group by group, starting with **Accounts + Students**. | 2026-10-26 |
| D27 | **Database access uses Prisma ORM** (schema in `schema.prisma`, Prisma Migrate for migrations, Prisma seed for demo data). Replaces raw `mysql2` from `dev`. MySQL stays. Chosen by the user over plain SQL migrations. | 2026-10-26 |
| D28 | **Plain JavaScript** for now (ESM `import`, required by Prisma 7). App runs through `tsx` because Prisma 7 generates TypeScript client files. | 2026-10-26 |
| D29 | **Stable Prisma only:** pin 7.10.1 (not the 8.0 release candidate). All dependencies pinned to exact versions. | 2026-10-26 |
| D30 | Basic folder includes `docker-compose.yml` (MySQL 8.0 + phpMyAdmin), credentials from `.env`. | 2026-10-26 |
| D31 | Assistant runs `git init` only. **The user makes all commits.** | 2026-10-26 |
| D14 | **Submit with unanswered items is not a hard error.** The backend does not finalize the attempt. It responds with a friendly message ("please finish first") plus the list of unanswered questions so the client can guide them back. | 2026-10-26 |
| D32 | **Only the Parent/Guardian fills in tests.** Students never use the system. Supersedes D3, D6, D7, D8, D9. | 2026-10-27 |
| D33 | **Lv 1 and Lv 2 are connected.** On Lv 1 submit, the backend scores each domain against its threshold. Every flagged domain **opens its Lv 2 automatically**, with the same session code in the same visit. No school step in between. Supersedes D10; answers Q12 and Q13. | 2026-10-27 |
| D34 | **One Lv 2 per flagged domain** (DSM-5 pattern). Two flagged domains mean two Lv 2 tests. A domain with no Lv 2 test is only flagged for the school. | 2026-10-27 |
| D35 | **Only Super Admin sets thresholds**, per instrument version. Once a version is published its thresholds are locked, so a later change never alters a Lv 1 already done. Schools cannot change them. | 2026-10-27 |
| D36 | If **no domain is flagged**, the visit ends after Lv 1. If several are, the Lv 2 tests run in a **fixed order** set on the instrument; the parent does not choose, so resume always knows what comes next. (Assistant call, not objected to.) | 2026-10-27 |
| D37 | Lv 2 tests show a **neutral name** to parents (e.g. "Bagian lanjutan 1"), so the screen does not reveal which area the child was flagged in. The school still reviews every result afterwards (`tinjauan`), but it is not a gate before Lv 2. | 2026-10-27 |
| D38 | `siswa` gets **`jenis_kelamin`** (`L`/`P`, required) now, so a later Dapodik import needs no schema change. | 2026-10-27 |
| D39 | Exception to D20: the timestamp columns stay in English, **`created_at` / `updated_at`**. | 2026-11-02 |
| D40 | **School login: email or username, plus password.** `sekolah` has both `email` and `username`, each unique and required. Super Admin logs in with email only. | 2026-11-02 |
| D41 | **Finished is finished.** A completed attempt is never re-scored, even if Super Admin later changes a threshold. Confirms D35 (thresholds locked per published version). | 2026-11-02 |
| D42 | **The session code is shared per school**, handed to every parent of that session. Anyone holding it may search the student list: the flow is code → confirm school → confirm child → fill in parent data. The listing itself is accepted, so no second factor before the search. Narrows A4 and A11: the exposure stands, but the **response stays name + kelas only** (A4), so `nisn` and `tanggal_lahir` are never returned. | 2026-11-03 |
| D43 | **Scoring follows the DSM-5 per-item, per-domain rule**, not a sum of all answers: a domain is flagged when its highest single answer reaches that domain's threshold. Replaces the partner's placeholder total-score bands. Implements D33/D34. | 2026-11-03 |

---

## 2. Assumptions (made by the assistant, not yet confirmed)

| # | Assumption | Why | Status |
|---|-----------|-----|--------|
| A1 | The screening model follows the **DSM-5 Level 1 / Level 2 Cross-Cutting Symptom Measure** pattern: Lv 1 broad domains, Lv 2 deeper instruments per flagged domain. | The team's flow (domain-based Lv 1, mapped Lv 2, "pedoman") matches it. | LEANING |
| A2 | We build on the existing stack: Express + MySQL (`init.sql`) + Next.js `web-admin`, plus the existing `sekolahAuth` JWT middleware. | Avoid rewriting what works. | LEANING |
| A3 | The legacy `roomRoutes`, `testRoomModel` and `sessionModel` (tables `test_rooms` and `screening_sessions`, role `admin_sekolah`) are **not used**. They reference tables `init.sql` never creates. | They conflict with the real schema. | OPEN |
| A4 | Backend rules for the **parent's** name search (was the student's, D32): only searches students within the session's school/classes, needs at least 3 characters, returns at most ~5–10 matches, returns **name + kelas only** (never NISN or birth date), and is rate-limited per code. | Limits exposure of children's data to anyone holding a code. | OPEN |
| A11 | Resume (D11) means anyone who knows the code and a child's name could open that child's in-progress attempt. Proposal: after picking the name, the parent confirms the child's **birth date** (`siswa.tanggal_lahir`). | Children's data; avoid one parent answering or reading as another child's. | LEANING (not explicitly confirmed) |
| A13 | Hard delete (D24) would also erase that child's screening records through FK cascade. A student can only be deleted if they have **no attempts**. Otherwise the API refuses with a clear message. Deleting is expected to be rare. | Screening results are the school's archive for follow-up. | DECIDED (2026-10-26) |
| A12 | Answers are saved **per question** as the respondent goes (autosave), not only at final submit, so resume works. Final submit stays separate and still requires every item answered. | Needed for D11 and the "no empty answers" rule. | OPEN |
| A5 | Parent flow still uses "pick the child" (parents may not know the NISN), possibly confirmed with the child's birth date. | Matches the team's flow doc. | OPEN |
| A6 | Every SD student in the school data has an NISN. | NISN is issued nationally (Dapodik), but `siswa.nisn` is currently nullable. | OPEN |
| A7 | Classes need their own table (not free text in `siswa.kelas`) so results can be filtered by class reliably. | The "Filter by Kelas" requirement. | OPEN |
| A8 | Lv 1 results are stored **per domain**, not as one `total_skor`. Each Lv 2 attempt points to the Lv 1 attempt and the domain that triggered it (D33, D34). | "Hasil akhir tidak dijadikan satu skor gabungan." | LEANING |
| A9 | Every Sekolah feature depends on Super Admin data (domains, thresholds, Lv 1 → Lv 2 mapping, instrument versions) that does not exist yet. Seed/dummy data will be needed to build the Sekolah side first. | Scope today is Sekolah only. | OPEN |
| A10 | The AI assistant explains procedures and results and **never** produces or suggests a diagnosis. | Stated in the role description. | DECIDED (from brief) |

---

## 3. Open questions

| # | Question | Notes | Status |
|---|----------|-------|--------|
| Q1 | ~~Which grades can do the student self-report?~~ | No self-report (D32). The parent-rated DSM-5 Level 1 covers ages 6–17, so every SD grade fits. | SUPERSEDED |
| Q2 | ~~Session respondent type, and is a "Both" type needed?~~ | No respondent type: always the parent (D32). | SUPERSEDED |
| Q3 | ~~How does a student identify themselves?~~ | Students don't use the system (D32). The parent picks the child (A4, A5, A11). | SUPERSEDED |
| Q4 | ~~Parent/self-report disagreement.~~ | Only one respondent (D32). | SUPERSEDED |
| Q5 | Do some SD students lack an NISN? If so, what is the fallback identifier? | See A6. | OPEN |
| Q6 | ~~Who fills Lv 2 for a "Student only" session?~~ | The parent fills Lv 2 too, right after Lv 1 (D32, D33). | SUPERSEDED |
| Q7 | How does a parent or student resume after a refresh or closed browser (the "GPT note")? | Answered by D11 (re-enter code + identity, continue). Security check in A11. | DECIDED |
| Q12 | Does Lv 2 need a new session code, or does it stay in the same flow? | Answered by D33: same code, same visit, opens automatically. No waiting for the school. | DECIDED |
| Q13 | What triggers Lv 2? | Answered by D33–D35: a domain score crossing its threshold, set only by Super Admin per instrument version. | DECIDED |
| Q14 | New clean project folder: full backend or Sekolah only? | Answered by D16: one backend for every role. | DECIDED |
| Q15 | Does the teammate agree to the clean folder? | Answered by D15: both agreed. | DECIDED |
| Q16 | Build order? | Answered by D18. | DECIDED |
| Q17 | Naming convention for the new schema? | Answered by D20. | DECIDED |
| Q18 | Sekolah login: one account or several staff accounts? | One account for now (D21). Multiple staff accounts may come later. | DECIDED (for now, revisit later) |
| Q19 | Student moving school: who sees old results? | Answered by D23. | DECIDED |
| Q20 | Soft-deleted student blocks re-adding the same NISN. | Answered by D24 (hard delete). Safety rule in A13. | DECIDED |
| Q21 | Are classes tied to a **school year** (e.g. `4A` in 2026/2027 is a different class from `4A` in 2027/2028)? | Students move up every year. Results must keep the class the child was in **at the time of screening** for the class filter to stay correct. | OPEN (pending team) |
| Q23 | Activity/audit log (`log_aktivitas`) of who viewed or changed children's data. | Postponed to later. | OPEN (later) |
| Q24 | TypeScript or plain JavaScript? | Answered by D28: plain JavaScript for now. | DECIDED |
| Q25 | Which Prisma version to pin? | Answered by D29: stable 7.10.1. | DECIDED |
| Q22 | Answer options: shared per instrument version (one scale, e.g. 0–4 for every item) or defined per question? | Part of the instrument content work (D19). DSM-5 Level 1 uses one shared scale for most items. | OPEN (with instrument design) |
| Q8 | Can one child be screened in more than one session (e.g. each semester)? How is history shown? | "Riwayat" is in the Sekolah role list. | OPEN |
| Q9 | Who in the school uses the Sekolah account: one shared login, or several staff (BK teacher, homeroom teacher) with different access? | One shared login for now (D21). Revisit later. Affects "sesuai kewenangan". | DECIDED (for now, revisit later) |
| Q10 | Import/export of students: what file format and columns (Excel/CSV, from Dapodik)? | | OPEN |
| Q11 | What does the AI assistant run on (which provider), and is it acceptable to send screening results to it? | Children's sensitive data. Privacy and consent implications. | OPEN |

---

## 4. Draft table list (proposal, not yet confirmed)

| Group | Table | Purpose / notes |
|-------|-------|-----------------|
| Accounts | `super_admin` | Super Admin login. **Columns designed:** see `docs/superpowers/specs/2026-10-27-accounts-students-schema-design.md`. |
| | `sekolah` | School + its single login (D21). Columns designed (same spec). |
| Students | `kelas` | Class per school, with `tahun_ajaran` (Q21). Columns designed (same spec). |
| | `siswa` | NISN unique system-wide (D22), hard delete (D24, A13), `tanggal_lahir` (A11), `jenis_kelamin` (D38). Columns designed (same spec). |
| Instruments | `instrumen` | Instrument identity, level (1/2), neutral name for parents (D37), fixed Lv 2 order (D36). No respondent type (D32). |
| | `versi_instrumen` | Version + publish status + consent/info text shown before starting. |
| | `domain` | Domains measured by an instrument version. |
| | `pertanyaan` | Item, belongs to one domain. No `jawaban_benar`. |
| | `opsi_jawaban` | Option with numeric `nilai` (e.g. 0–4). Shared scale vs per question: Q22. |
| | `aturan_domain` | Per-domain score range: category, interpretation, recommendation, needs-follow-up flag (the threshold, D35). Belongs to a published version, locked after publish. Replaces `konfigurasi_penilaian`. |
| | `pemetaan_lanjutan` | Lv 1 domain → Lv 2 instrument (D34). Optional per domain. |
| Sessions | `sesi_skrining` | Code, status, Lv 1 instrument version. No level or respondent type: Lv 2 runs inside the same session (D32, D33). |
| | `sesi_kelas` | Classes included in a session (many-to-many). |
| Attempts | `pengerjaan` | One attempt by a parent for one child, Lv 1 or Lv 2. Holds parent name/phone/relationship (inline, no account), consent time, class at time of screening, status, timestamps. A Lv 2 row points to its Lv 1 `pengerjaan` and the triggering `domain` (A8). |
| | `jawaban` | One row per attempt + question (UNIQUE, for autosave). |
| | `hasil_domain` | Score + category per domain per attempt. |
| Follow-up | `tinjauan` | School's follow-up note on finished results (status, note, time). Not a gate before Lv 2 (D37). |
| ~~Follow-up~~ | ~~`paket_lanjutan`, `paket_lanjutan_instrumen`~~ | Dropped: Lv 2 opens automatically (D33), so each Lv 2 `pengerjaan` links straight to its Lv 1 attempt. |
| Later | `log_aktivitas` | Audit log of who viewed or changed children's data. Postponed (Q23). |

Dropped from `init.sql`: `kategori_asesmen` (replaced by `domain`), `konfigurasi_penilaian` (replaced by `aturan_domain`), `tes_skrining` (replaced by `instrumen` + `versi_instrumen`), `hasil_skrining` + `detail_jawaban_siswa` (replaced by `pengerjaan` + `jawaban` + `hasil_domain`).

---

## 5. Research notes

- **Prisma ORM 7** (checked via Context7 docs and `npm view`, 2026-10-26):
  - Stable: `prisma` / `@prisma/client` **7.10.1**, `@prisma/adapter-mariadb` **7.10.1**. npm `latest` for `prisma` is `8.0.0-rc.27` (release candidate).
  - Requires Node.js ^20.19, ^22.12 or ^24. Local machine has Node **v22.14.0**, which is fine.
  - Ships as ESM: `package.json` needs `"type": "module"`.
  - A **driver adapter is mandatory**. For MySQL that is `@prisma/adapter-mariadb` (uses the `mariadb` driver).
  - Config lives in `prisma.config.ts` (schema path, migrations path, seed command, `DATABASE_URL`).
  - Default generator `prisma-client` needs an `output` path (e.g. `../generated/prisma`) and **outputs TypeScript**. Old `prisma-client-js` is deprecated.
  - Does not load `.env` automatically. ~~Use `dotenv`.~~ Since 2026-11-02 the app uses Node's built-in `process.loadEnvFile()` (audit finding 5); `dotenv` was removed.
  - Naming (D20): Prisma models can be named in Indonesian snake_case directly, or mapped with `@@map` / `@map`. Decide when writing `schema.prisma`.

- **DSM-5 Level 1 Cross-Cutting Symptom Measure** (APA):
  - Parent/Guardian-rated, child age **6–17**.
  - Self-rated, child age **11–17**.
  - Items ask about the **past 2 weeks**. Level 2 measures exist per domain, triggered by Level 1 thresholds.
  - Source: psychiatry.org (APA DSM-5-TR assessment measures).
- These are symptom-rating scales (e.g. 0–4 frequency), not right/wrong questions. The current `pertanyaan.jawaban_benar` and `skor` model does not fit them.

---

## 6. Current codebase findings (`origin/dev`)

- Sekolah side today: login (`/api/admin/login`, `/api/sekolah/me`) and a placeholder page `/sekolah/portal`.
- `init.sql` tables relevant to Sekolah: `sekolah`, `siswa` (free-text `kelas`, nullable `nisn`), `sesi_skrining` (one `kategori`, 6-char `kode_skrining`, status `menunggu/aktif/selesai`), `hasil_skrining` (single `total_skor`), `detail_jawaban_siswa`.
- Missing for the new flow: classes, parent/guardian data per attempt, respondent type, per-domain results, Lv 1 → Lv 2 mapping, Lv 2 packages, follow-up status, instrument versions.
- Legacy/conflicting code: `roomRoutes`, `testRoomModel`, `sessionModel`, `scoringService` (IQ), `IQ_CLASSIFICATIONS`, `DSM5_STATUS` (intellectual disability framing, not symptom screening).
- Local repo is now on `dev` (checked out by the user).

### `init.sql` review (reference for the new schema)

Keep (as patterns):
- `utf8mb4` + InnoDB, `created_at` / `updated_at` / `deleted_at` (soft delete) on every table.
- Core entities: `super_admin`, `sekolah`, `siswa`, sessions with a unique 6-char code and status `menunggu/aktif/selesai`, results + per-question answers.
- FK rules (CASCADE from school to its data, RESTRICT on reference data).

Change / missing:
- `siswa.nisn` is nullable and not unique. Needs `UNIQUE` (D5), at least per school.
- `siswa.kelas` is free text. Needs a `kelas` table (A7).
- `sesi_skrining` links to `kategori_asesmen`, not to a test/instrument. Needs: instrument version, level (Lv 1/Lv 2), respondent type (D6), and the classes in the session (many-to-many).
- `pertanyaan.jawaban_benar` + `skor` are IQ-style. Screening needs a numeric **value per answer option** (e.g. 0–4) and a domain per question.
- `opsi_jawaban.label_opsi CHAR(1)` (A–D) limits options. No score value.
- `konfigurasi_penilaian` is per test on a 0–100 total. Needs **per-domain** thresholds and a Lv 1 domain → Lv 2 instrument mapping.
- `hasil_skrining` has one `total_skor`. Needs per-domain results (A8), follow-up status for the review queue, link from Lv 2 to its Lv 1 result, and parent/guardian data (name, phone, relationship).
- `detail_jawaban_siswa` has no `UNIQUE (hasil, pertanyaan)`. Needed for autosave upsert (A12).
- No instrument versioning or publish status.
- **Seed data stores school passwords in plain text** (`'sekolah123'`). Seeds must use bcrypt hashes like the `super_admin` rows. Login code that compares hashes would also fail on these rows.
