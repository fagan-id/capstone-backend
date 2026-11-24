# Sekolah API Design

Size: project. Status: revised 2026-11-24 (session ends manually, Hasil Sesi Skrining like Google Forms
"Individu"); awaits the user's review.
Related: `docs/2026-10-26-sekolah-role-questions-assumptions.md` (D2, D20–D25, D37, D41, A7, A13, Q21).

## Intent

Schools can log in, but no endpoint accepts the `SEKOLAH` role. Nothing creates classes, students or
sessions, so parents can only use the seeded session `ABC123`. This design adds the school's half of
the flow: classes → students → session → "Akhiri Sesi Skrining" → Hasil Sesi Skrining.

## Goals

- A school manages its own classes, students and screening sessions.
- A session is active from creation until the school ("Akhiri Sesi Skrining") or the Super Admin ends
  it. An ended session never reopens.
- A school reads each participant's result individually, like Google Forms "Individu" responses, and
  can contact the parent through WhatsApp (`wa.me`).
- A school can never read or change another school's data, even by changing an id in the URL.
- A deactivated school loses access on its next request, not when its JWT expires.

## Non-goals

- Review marking or notes on a result (the old `tinjauan` table is dropped from the design).
- A "Ringkasan" view with totals per question.
- Locking a session to a class or grade. A session belongs to one school and covers all its students.
- Scheduled start/end times; `menunggu` stays in the enum but nothing sets it.
- Riwayat across sessions (Q8), Excel/CSV import (Q10), school dashboard, audit log (Q23), several
  staff accounts (D21), Super Admin session pages beyond the end endpoint.

## Constraints

- **Additive schema change only.** Sessions keep the existing `status` and `tanggal_pelaksanaan`
  columns. One migration adds `sesi_skrining.tes_skrining_id` (see "Test per session"); nothing is
  dropped, so the partner's branch keeps working after `npx prisma migrate dev`.
- D20/D39 naming. Files: `src/{routes,controllers,services,validators}/sekolah/sekolah<Modul>.js`,
  same layering as `superAdmin/`: the validator returns clean values, the service takes `db` first.
- Envelope and errors from `ApiResponse` / `AppError`. Lists use `meta: { pagination }` like
  `superAdminKelolaSekolah` (`page`, `limit`, `total`, `totalPages`).
- D41: results are read from stored snapshots, never recalculated.
- Only the user commits (D31).

## Approaches considered (storing "ended")

1. **Existing `status` column (chosen).** Create sets `aktif`, ending sets `selesai`. `validasiSesi` and
   the dashboard count already read it. No migration.
2. `status` plus an `diakhiri_pada` timestamp: shows when it ended, costs a migration nobody asked for.
3. Replace `status` with nullable `diakhiri_pada`: cleanest model, but the same column drop the
   partner would have to absorb as the reverted time-window migration.

## Test per session

The school picks the Level 1 test when it creates a session. Today `ambilLevel1` in
`src/services/public/skriningOrangTua.js` takes the first active Level 1 test by id for every session.

- Migration `sesi_tes_skrining`: add `tes_skrining_id INT NULL`, backfill existing rows with the
  first active Level 1 test (lowest id), make it `NOT NULL`, add the FK (`onDelete: Restrict`) and an
  index. If no Level 1 test exists, the backfill leaves rows NULL and the `NOT NULL` step fails, which
  is the intended stop.
- `POST /sesi` takes `tes_skrining_id`; it must be an active Level 1 test, else 400
  `"Tes skrining tidak valid. Pilih tes skrining awal yang aktif."` It cannot change afterwards.
- `GET /api/sekolah/tes` lists active Level 1 tests `{ id, nama, jenjang, deskripsi }` for the dropdown.
- The parent flow uses the session's test: start, the Level 1 question list and the Level 1 submit
  read `sesi_skrining.tes_skrining_id` instead of "first Level 1". Level 2 still follows the domain
  mapping (D34), unchanged.
- A session whose test was later deactivated keeps using it, so parents mid-session are not cut off.
- Seed: `ABC123` points at the seeded Level 1 test.

## Access rule

Every route mounts `verifyToken, authorizeRoles("SEKOLAH"), cekSekolahAktif`.

- `cekSekolahAktif` (in `src/middlewares/auth.middleware.js`) loads `sekolah` by `req.user.id`.
  Inactive or missing: 403 `"Akun sekolah dinonaktifkan. Silakan hubungi Super Admin."`
- Every service query filters on `sekolah_id = req.user.id`. Another school's row returns **404**, not
  403, so ids cannot be probed.
- Results are scoped through `sesi_skrining.sekolah_id`, not `siswa.sekolah_id`, so D23 holds when a
  student moves school.

## Session lifecycle

| Action | Effect |
|---|---|
| Create | `status = aktif`, `tanggal_pelaksanaan` = today's date in WIB, new `kode` |
| Akhiri (school or Super Admin) | `status = selesai`. Only while `aktif`, else 409 |
| Edit | Only `nama`, in any status |
| Delete | Only when the session has no `hasil_skrining` |

- `validasiSesi` (validate, search, confirm, **start**) already rejects non-`aktif` sessions with the
  same messages. The token endpoints (`simpanJawaban`, submits, Level 2) do not check the session, so a
  parent who started before the end can still finish. A DB test locks this in.

## Endpoints (all under `/api/sekolah` unless stated)

### Kelas
| Method | Path | Body / query |
|---|---|---|
| GET | `/kelas` | `tahun_ajaran`, `tingkat`. Sorted `tingkat`, `nama`. Includes `jumlah_siswa`. |
| POST | `/kelas` | `nama` (1–20), `tingkat` (1–6, D2), `tahun_ajaran` (`^\d{4}/\d{4}$`, consecutive years, e.g. `2026/2027`) |
| PATCH | `/kelas/:id` | Same rules, partial |
| DELETE | `/kelas/:id` | 409 `"Kelas masih memiliki siswa."` if it has students |

Duplicate `[sekolah_id, tahun_ajaran, nama]`: 409 `"Kelas dengan nama tersebut sudah ada pada tahun
ajaran ini."` (P2002 caught as well).

### Siswa
| Method | Path | Body / query |
|---|---|---|
| GET | `/siswa` | `page`, `limit`, `search` (nama or nisn), `kelas_id`. Includes `kelas { id, nama, tahun_ajaran }`. |
| GET | `/siswa/:id` | |
| POST | `/siswa` | `nisn` (exactly 10 digits), `nama` (3–150), `tanggal_lahir` (`YYYY-MM-DD`, not future), `jenis_kelamin` (`L`/`P`), `kelas_id` |
| PATCH | `/siswa/:id` | Same rules, partial |
| DELETE | `/siswa/:id` | Hard delete (D24). 409 `"Siswa sudah memiliki riwayat skrining dan tidak dapat dihapus."` (A13) |

- `kelas_id` from another school: 404 `"Kelas tidak ditemukan."` (the composite FK also enforces it).
- Duplicate NISN: 409 `"NISN sudah terdaftar."` NISN is system-wide, so the message never names the
  other school.

### Sesi skrining
| Method | Path | Body / query |
|---|---|---|
| GET | `/sesi` | `page`, `limit`, `status` (`aktif`/`selesai`). Rows include `kode`, `status`, `tes { id, nama }`, `jumlah_peserta`, `jumlah_selesai`. Newest first. |
| GET | `/sesi/:id` | Also `jumlah_belum_selesai`, so the frontend can warn before ending. |
| GET | `/tes` | Active Level 1 tests for the create-session dropdown. |
| POST | `/sesi` | `nama` (3–150), `tes_skrining_id` (active Level 1) |
| PATCH | `/sesi/:id` | `nama` (3–150) |
| POST | `/sesi/:id/akhiri` | "Akhiri Sesi Skrining". Not `aktif`: 409 `"Sesi skrining sudah diakhiri."` |
| DELETE | `/sesi/:id` | 409 `"Sesi sudah memiliki peserta dan tidak dapat dihapus."` if any `hasil_skrining` |

Super Admin: `POST /api/super-admin/sesi/:id/akhiri`, same rule and message, any school's session,
404 `"Sesi skrining tidak ditemukan."` for an unknown id.

`kode`: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L), `crypto.randomInt`,
retried up to 5 times on P2002. 31^6 ≈ 887 million codes.

### Hasil Sesi Skrining
| Method | Path | Body / query |
|---|---|---|
| GET | `/sesi/:id/hasil` | `page`, `limit`, `search` (nama siswa), `status` (`selesai`/`belum_selesai`). Returns `sesi { id, nama, kode, status, jumlah_peserta }` and rows `{ id, siswa { nama, kelas }, status }`. Newest first. |
| GET | `/hasil/:id` | One participant (below). |

`GET /hasil/:id` returns:
- `siswa { nama, nisn, kelas }` and `sesi { id, nama }`.
- `responden { nama, hubungan, nomor_hp, nomor_wa }`. `hubungan` is `hubungan_responden`
  (Orang Tua / Wali). `nomor_wa` is `nomor_hp` with a leading `0` replaced by `62` (and `+` removed),
  ready for `https://wa.me/<nomor_wa>`.
- `status` (`selesai`/`belum_selesai`), `waktu_mulai`, `waktu_selesai`, `kesimpulan`.
- `hasil_kategori[]`: domain, stored threshold, met or not, `deskripsi`, `rekomendasi` (snapshot).
- `hasil_tes[]`: Level 2 test, `kategori_hasil`, `deskripsi_hasil`, `rekomendasi_hasil` (snapshot).
- `jawaban[]`: every answered question with its test, `nomor_urut`, `teks`, and the chosen option
  (`label`, `teks`, `skor`), ordered by test level then `nomor_urut`.

An unfinished result returns what exists so far (answers, no `hasil_kategori`).

- `kelas` is the student's **current** class, taken from the participant's student row; the schema
  does not store the class at screening time (Q21, open). Commented in the code.

## Testing

- Route tests with a mock `db` (pattern of `tests/sekolahSiswaRoutes.test.js`): wrong role 403,
  another school's id 404, one success per endpoint, Super Admin akhiri.
- Service tests: create sets `aktif` and today's WIB date, akhiri twice 409, code retry on P2002,
  delete blocked, `nomor_wa` conversion.
- DB tests (`tests/db/`, rolled back): a parent who started before akhiri can still submit; hasil
  detail reads snapshots and answers; with two Level 1 tests, a parent gets the session's test, not
  the lowest id.
