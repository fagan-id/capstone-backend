# Sekolah API Design

Size: project. Status: agreed in conversation (2026-11-22); awaits the user's review.
Related: `docs/2026-10-26-sekolah-role-questions-assumptions.md` (D2, D20–D25, D37, D41, A7, A13, Q21).

## Intent

Schools can log in, but no endpoint accepts the `SEKOLAH` role. Nothing creates classes, students or
sessions, so parents can only use the seeded session `ABC123`. This design adds the school's half of
the flow: classes → students → session with a time window → results → follow-up (tinjauan).

## Goals

- A school manages its own classes, students and screening sessions.
- A session is open only between the start and end time the school sets. Once closed it never reopens.
- A school sees the results of the sessions it ran and records one tinjauan per result.
- A school can never read or change another school's data, even by changing an id in the URL.
- A deactivated school loses access on its next request, not when its JWT expires.

## Non-goals

- Riwayat across sessions (Q8) and Excel/CSV import (Q10): waiting on team answers.
- Choosing classes per session. A session covers the whole school.
- A school dashboard, per-item answer detail, audit log (Q23), several staff accounts (D21).

## Constraints

- D20/D39 naming. Files: `src/{routes,controllers,services,validators}/sekolah/sekolah<Modul>.js`,
  same layering as `superAdmin/`: the validator returns clean values, the service takes `db` first.
- Envelope and errors from `ApiResponse` / `AppError`. Lists use `meta: { pagination }` like
  `superAdminKelolaSekolah` (`page`, `limit`, `total`, `totalPages`).
- D41: results are read from stored snapshots, never recalculated.
- Only the user commits (D31).

## Access rule

Every route mounts `verifyToken, authorizeRoles("SEKOLAH"), cekSekolahAktif`.

- `cekSekolahAktif` (new, in `src/middlewares/auth.middleware.js`) loads `sekolah` by `req.user.id`.
  Inactive or missing: 403 `"Akun sekolah dinonaktifkan. Silakan hubungi Super Admin."`
  One extra query per request, fine at this load.
- Every service query filters on `sekolah_id = req.user.id`. Another school's row returns **404**, not
  403, so ids cannot be probed.
- Results are scoped through `sesi_skrining.sekolah_id`, not `siswa.sekolah_id`, so D23 holds when a
  student moves school.

## Session time window (replaces `status` and `tanggal_pelaksanaan`)

The school sets `waktu_mulai` and `waktu_selesai`. The status is **computed**, never stored, so it can
never disagree with the clock:

| Condition | Status |
|---|---|
| `now < waktu_mulai` | `menunggu` |
| `waktu_mulai <= now < waktu_selesai` | `aktif` |
| `now >= waktu_selesai` | `selesai` |

- **Closing early** = `POST /sesi/:id/tutup` sets `waktu_selesai = now`. No extra column. Only allowed
  while `aktif`.
- **No reopen**: once `selesai`, no time field can change. The school makes a new session (new code).
- **Edits**: while `menunggu`, `nama`, `waktu_mulai`, `waktu_selesai` may change. While `aktif`, only
  `nama` (closing goes through `/tutup`). While `selesai`, only `nama`.
- **Validation**: both are ISO 8601 with an explicit offset (`2026-12-01T07:00:00+07:00`), stored as
  UTC `DateTime(3)`. `waktu_selesai > waktu_mulai` and `waktu_selesai > now`. A `waktu_mulai` in the
  past is allowed and means the session opens immediately. No maximum length.
- **Parents mid-screening finish**: `validasiSesi` (used by validate, search, confirm and **start**)
  rejects outside the window. The token endpoints (`simpanJawaban`, submits, Level 2) do not check the
  session, so a parent who started before the close can finish. This is the current behaviour; a test
  locks it in.

### Migration `sesi_waktu_dan_tinjauan`

1. Add `waktu_mulai DATETIME(3) NULL`, `waktu_selesai DATETIME(3) NULL`.
2. Backfill: `waktu_mulai = tanggal_pelaksanaan 00:00 WIB (17:00 UTC the day before)`,
   `waktu_selesai = waktu_mulai + 1 day`. Rows with `status = 'selesai'` get
   `waktu_selesai = LEAST(that, updated_at)`. Rows with `status = 'menunggu'` keep the future window.
3. Make both `NOT NULL`, add `@@index([sekolah_id, waktu_mulai])`.
4. Drop `status`, `tanggal_pelaksanaan` and the `status_sesi` enum.
5. Create `tinjauan` (below).

Back up the dev DB before applying (`mysqldump capstone_skrining > backup.sql`).

Code that must move off `status` / `tanggal_pelaksanaan`:
- `src/services/public/skriningOrangTua.js` `validasiSesi` (time check, same two messages).
- `src/services/superAdmin/superAdminDashboard.js:40` (`sesi_aktif` count by window).
- `prisma/seedData.js` (seed session open now → +30 days, so dev keeps working).
- Tests: `tests/db/skrining.dbtest.js`, `tests/db/skriningOrangTua.dbtest.js`,
  `tests/db/superAdminKelolaSekolah.dbtest.js`, `tests/superAdminDashboard*.test.js`.
- Postman collection and README.

## Endpoints (all under `/api/sekolah`)

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
| GET | `/sesi` | `page`, `limit`, `status` (computed filter). Includes `status`, `jumlah_peserta`, `jumlah_selesai`. |
| GET | `/sesi/:id` | Also `jumlah_belum_selesai`, so the frontend can warn before closing. |
| POST | `/sesi` | `nama` (3–150), `waktu_mulai`, `waktu_selesai` |
| PATCH | `/sesi/:id` | Rules in "Edits" above. Wrong phase: 409 `"Waktu sesi tidak dapat diubah setelah sesi dimulai."` |
| POST | `/sesi/:id/tutup` | Not `aktif`: 409 `"Hanya sesi yang sedang berjalan yang dapat ditutup."` |
| DELETE | `/sesi/:id` | 409 `"Sesi sudah memiliki peserta dan tidak dapat dihapus."` if any `hasil_skrining` |

`kode`: 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O, 1/I/L), `crypto.randomInt`,
retried up to 5 times on P2002. 31^6 ≈ 887 million codes.

### Hasil and tinjauan
| Method | Path | Body / query |
|---|---|---|
| GET | `/sesi/:id/hasil` | `page`, `limit`, `kelas_id`, `status` (`selesai`/`sedang_berjalan`), `terindikasi` (bool), `tinjauan`. Row: siswa `{ nama, nisn, kelas }`, `selesai`, `waktu_selesai`, `jumlah_domain_terindikasi`, tinjauan status. |
| GET | `/hasil/:id` | Responden, `hasil_kategori[]` (stored threshold and text), `hasil_tes[]` (`kategori_hasil`, text), `kesimpulan`, tinjauan. |
| PUT | `/hasil/:id/tinjauan` | `status` (`belum_ditinjau`/`sudah_ditinjau`/`dirujuk`), `catatan` (≤ 2000, optional). Upsert. |

- No tinjauan row reads as `belum_ditinjau`.
- Tinjauan on an unfinished result: 409 `"Hasil skrining belum selesai."`
- `kelas` is the student's **current** class; the schema does not store the class at screening time
  (Q21, open). Commented in the code.

### Tinjauan schema
```prisma
enum status_tinjauan {
  belum_ditinjau
  sudah_ditinjau
  dirujuk
}

model tinjauan {
  id                Int             @id @default(autoincrement())
  hasil_skrining_id Int             @unique
  status            status_tinjauan
  catatan           String?         @db.Text
  created_at        DateTime        @default(now())
  updated_at        DateTime        @updatedAt

  hasil_skrining hasil_skrining @relation(fields: [hasil_skrining_id], references: [id], onDelete: Restrict)
}
```
Plus `tinjauan tinjauan?` on `hasil_skrining`.

## Testing

- Route tests with a mock `db` (pattern of `tests/superAdmin*Routes.test.js`): wrong role 403, inactive
  school 403, another school's id 404, one success per endpoint.
- Service tests: computed status at the three boundaries, edit/close rules, code retry on P2002,
  delete-blocked cases.
- DB tests (`tests/db/`, rolled back): composite kelas FK, tinjauan upsert, a parent who started before
  `/tutup` can still submit.
