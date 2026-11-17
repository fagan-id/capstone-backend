# capstone-backend

Backend untuk sistem skrining (Super Admin, Sekolah, Orang Tua/Wali): Express 5, MySQL 8.0, dan Prisma 7. Daftar endpoint ada di bagian [Endpoint](#endpoint).

## Prasyarat

- Node.js 22.12 atau lebih baru
- MySQL 8.0, salah satu dari:
  - **Laragon** (bawaan, port `3306`)
  - **Docker Desktop** dengan Docker Compose (opsional, port `3307`, sudah termasuk phpMyAdmin)

## Cara menjalankan

```powershell
Copy-Item .env.example .env   # lalu isi password dan JWT_SECRET di .env
npm install
npm run db:migrate             # membuat tabel
npm run db:generate            # membuat Prisma Client di generated/
npm run db:seed                # akun demo (butuh SEED_PASSWORD di .env)
npm run dev
```

Server menolak menyala bila `DB_USER`, `DB_PASSWORD`, `DB_NAME`, atau `JWT_SECRET` kosong. Isi `JWT_SECRET` dengan string acak yang panjang, misalnya hasil `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Jangan pernah meng-commit nilainya.

### Memakai Docker (opsional)

Set `DB_PORT=3307` di `.env`, lalu jalankan `npm run docker:up` sebelum `npm run db:migrate`.

- Volume MySQL yang dibuat sebelum ada folder `docker/mysql/init` belum punya hak shadow database untuk `db:migrate`. Jalankan sekali: `docker compose exec mysql sh /docker-entrypoint-initdb.d/01-shadow-grant.sh`.
- `DB_USER` tidak boleh `root`; image MySQL menolaknya dan container akan berhenti. Lihat penyebabnya dengan `docker compose logs mysql`.
- Password di `.env` dipakai saat volume MySQL pertama kali dibuat. Jika password diganti setelah itu, jalankan `docker compose down -v` (**menghapus data database**) lalu `npm run docker:up` lagi.

## Akun demo

Semua akun seed memakai password `SEED_PASSWORD`:

| Peran | Login |
|-------|-------|
| Super Admin | `superadmin@demo.test` |
| Sekolah | `sekolah@demo.test` atau username `sd_demo` |

Seed juga membuat sesi skrining dengan kode `ABC123`.

Seed tidak pernah mengubah akun yang sudah ada. Jika `SEED_PASSWORD` diganti setelah seed pertama, password lama tetap berlaku; hapus baris akun demo lalu jalankan `npm run db:seed` lagi.

## Alamat

| Layanan | URL |
|---------|-----|
| API | http://localhost:5000/api |
| API health | http://localhost:5000/api/health |
| phpMyAdmin (hanya Docker) | http://localhost:8081 |

## Endpoint

Semua endpoint berada di bawah prefix `/api`.

| Grup | Prefix | Akses |
|------|--------|-------|
| Health | `GET /health` | publik |
| Autentikasi | `/auth` (`login`, `logout`, `me`) | publik; `me` butuh token |
| Skrining orang tua/wali | `/public/skrining` | publik, percobaan dialamatkan lewat token UUID |
| Kelola sekolah | `/super-admin/sekolah` | Super Admin |
| Tes skrining | `/super-admin/tes-skrining`, beserta `/:id/pertanyaan`, `/:id/pemetaan`, `/:id/penilaian`, `/:id/interpretasi` | Super Admin |
| Dashboard | `/super-admin/dashboard` | Super Admin |
| Logout Super Admin | `POST /super-admin/logout` | Super Admin |

Setiap rute `/super-admin/...` juga tersedia dengan prefix alias `/admin/...`.

Token login dikirim di body respons dan sebagai cookie HTTP-only `token`. Endpoint yang dilindungi menerima header `Authorization: Bearer <token>` atau cookie tersebut.

## Script

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Menjalankan server dengan auto-reload |
| `npm start` | Menjalankan server tanpa auto-reload |
| `npm test` | Menjalankan seluruh test (`node:test` melalui `tsx`); sebagian butuh MySQL menyala |
| `npm run test:db` | Menjalankan test database; setiap test di-rollback |
| `npm run test:screening` | Menjalankan test alur percabangan skrining saja |
| `npm run db:generate` | Membuat ulang Prisma Client |
| `npm run db:migrate` | Membuat dan menjalankan migrasi Prisma |
| `npm run db:seed` | Mengisi akun demo; aman dijalankan berulang |
| `npm run docker:up` | Menyalakan container MySQL dan phpMyAdmin |
| `npm run docker:down` | Mematikan container (data tetap tersimpan) |

## Dokumentasi & Pengujian API

- Keputusan desain, spesifikasi, dan rencana kerja ada di folder `docs/`.
- Koleksi Postman (bisa diimpor ke Hoppscotch) ada di folder `postman/` (lihat [panduan Postman](postman/README.md)). Koleksi ini mencakup health, autentikasi, alur skrining publik, dan seluruh endpoint Super Admin.
