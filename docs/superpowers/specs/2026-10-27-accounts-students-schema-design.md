# Accounts + Students Schema Design

Size: small change (short design). Status: columns agreed in conversation (2026-10-27); this doc awaits the user's review.
Related: `docs/2026-10-26-sekolah-role-questions-assumptions.md` (D20–D26, D32–D38, A6, A11, A13, Q5, Q21).

## Intent

The first real tables: `super_admin`, `sekolah`, `kelas`, `siswa`, as Prisma models with the first migration, plus a seed with demo accounts so the Sekolah API (D18) has data to work on. No API endpoints yet.

## Tables

All tables: `id` Int auto-increment PK, `created_at` (default now), `updated_at` (auto). Names per D20. Prisma model names equal table names (no `@@map`).

**`super_admin`**: `nama` VarChar(100), `email` VarChar(191) unique, `password_hash` VarChar(255), `aktif` Boolean default true.

**`sekolah`** (one login per school, D21; logs in with email **or** username + password, D40): `npsn` Char(8) unique, `nama` VarChar(150), `alamat` VarChar(255) optional, `email` VarChar(191) unique, `username` VarChar(50) unique, `password_hash` VarChar(255), `aktif` Boolean default true.

**`kelas`**: `sekolah_id` FK, `nama` VarChar(20) (e.g. `4A`), `tingkat` unsigned TinyInt (1–6), `tahun_ajaran` Char(9) (e.g. `2026/2027`, D25). Unique (`sekolah_id`, `tahun_ajaran`, `nama`).

**`siswa`**: `sekolah_id` FK, `kelas_id` FK, `nisn` Char(10) unique system-wide (D22), `nama` VarChar(150), `tanggal_lahir` Date (A11), `jenis_kelamin` enum `L`/`P` required (D38). Index (`sekolah_id`, `nama`) for the parent's name search (A4).

## Rules

- **A student's class belongs to the student's school**, enforced by the database: `siswa (kelas_id, sekolah_id)` references `kelas (id, sekolah_id)` (needs a unique key on `kelas (id, sekolah_id)`).
- **All foreign keys `ON DELETE RESTRICT`.** A class with students can't be deleted. A school with classes or students can't be deleted. Schools and super admins are switched off with `aktif`, never soft-deleted (a soft-deleted row would keep its email taken).
- **Students are hard deleted** (D24). The "no attempts" guard (A13) arrives with the `pengerjaan` table.
- Emails and school usernames are unique **case-insensitively** (MySQL `utf8mb4_unicode_ci` does this already).
- A username never contains `@` (checked by the API later), so a login identifier with `@` is looked up as an email and one without as a username. One school can never match another school's email by username.
- NISN and NPSN are strings, so leading zeros are kept. Their format (digits only, exact length) is checked by the API later, not here.

## Migration and seed

- `prisma migrate dev` needs a shadow database. The app's MySQL user gets `CREATE, ALTER, DROP, INDEX, REFERENCES` on `` `prisma_migrate_shadow_db%`.* `` only, through a MySQL init script (fresh volumes) that can also be run once on the existing volume.
- Seed: one super admin, one school, one class, two students (placeholder names, fake NISN/NPSN). Passwords are bcrypt-hashed (`bcryptjs`). The password comes from `SEED_PASSWORD` in `.env`, never from the repo. The seed refuses to run when `NODE_ENV=production`, and running it twice changes nothing (upsert).

## Calls made by the assistant (please check)

1. Model names equal table names (`prisma.siswa.findMany()`), one name everywhere.
2. `aktif` instead of soft delete for `sekolah` and `super_admin`.
3. `npsn` and `tingkat` were not asked for by the team. `npsn` stops duplicate schools; `tingkat` allows filtering by grade.
4. `siswa.sekolah_id` is stored even though `kelas` has it, and the composite FK keeps the two consistent.
5. Database tests run each case inside a transaction that is rolled back, so the dev database is untouched. They live apart from `npm test` (`npm run test:db`), because they need MySQL running.
6. bcrypt cost 10 for the seed. The login API plan can raise it.
7. School `email` and `username` are **both required**, so either one always works for login (D40). Super Admin logs in with email only.
8. `created_at` / `updated_at` stay in English (D39).

## Not in this design

- API endpoints, login, JWT (next plans).
- Q21 (classes per school year) and Q5 (students without NISN) stay pending team. This schema fits either answer: `tahun_ajaran` is already there, and `nisn` can become optional later.
