# capstone-backend

Backend untuk sistem skrining (Super Admin, Sekolah, Orang Tua/Wali). Saat ini berisi server Express dengan `GET /api/health`, MySQL 8.0 + phpMyAdmin di Docker, dan Prisma dengan tabel `super_admin`, `sekolah`, `kelas`, `siswa`. Belum ada endpoint selain health.

## Prasyarat

- Node.js 22.12 atau lebih baru
- Docker Desktop (dengan Docker Compose)

## Cara menjalankan

```powershell
Copy-Item .env.example .env   # lalu ganti password di .env
npm install
npm run docker:up              # MySQL + phpMyAdmin
npm run db:migrate             # membuat tabel
npm run db:generate            # membuat Prisma Client di generated/
npm run db:seed                # akun demo (butuh SEED_PASSWORD di .env)
npm run dev
```

Volume MySQL yang dibuat sebelum ada folder `docker/mysql/init` belum punya hak shadow database untuk `db:migrate`. Jalankan sekali: `docker compose exec mysql sh /docker-entrypoint-initdb.d/01-shadow-grant.sh`.

Akun demo dari seed, semuanya memakai password `SEED_PASSWORD`:

| Peran | Login |
|-------|-------|
| Super Admin | `superadmin@demo.test` |
| Sekolah | `sekolah@demo.test` atau username `sd_demo` |

Seed tidak pernah mengubah akun yang sudah ada. Jika `SEED_PASSWORD` diganti setelah seed pertama, password lama tetap berlaku; hapus baris akun demo di phpMyAdmin lalu jalankan `npm run db:seed` lagi.

`DB_USER` tidak boleh `root`; image MySQL menolaknya dan container akan berhenti. Jika container MySQL tidak mau menyala, lihat penyebabnya dengan `docker compose logs mysql`.

Password di `.env` dipakai saat volume MySQL pertama kali dibuat. Jika password diganti setelah itu, jalankan `docker compose down -v` (menghapus data database) lalu `npm run docker:up` lagi.

## Alamat

| Layanan | URL |
|---------|-----|
| API health | http://localhost:5000/api/health |
| phpMyAdmin | http://localhost:8081 |

MySQL dapat diakses dari host pada port `3307` (lihat `DB_PORT` di `.env`), sehingga tidak bentrok dengan MySQL lain di port 3306.

## Script

| Script | Fungsi |
|--------|--------|
| `npm run dev` | Menjalankan server dengan auto-reload |
| `npm start` | Menjalankan server tanpa auto-reload |
| `npm test` | Menjalankan unit test (`node:test` melalui `tsx`), tanpa database |
| `npm run test:db` | Menjalankan test database (butuh MySQL menyala); setiap test di-rollback |
| `npm run db:generate` | Membuat ulang Prisma Client |
| `npm run db:migrate` | Membuat dan menjalankan migrasi Prisma |
| `npm run db:seed` | Mengisi akun demo; aman dijalankan berulang |
| `npm run docker:up` | Menyalakan container MySQL dan phpMyAdmin |
| `npm run docker:down` | Mematikan container (data tetap tersimpan) |

## Dokumentasi & Pengujian API

- Keputusan desain, spesifikasi, dan rencana kerja ada di folder `docs/`.
- Koleksi dan environment Postman siap pakai untuk pengujian API ada di folder `postman/` (lihat [panduan Postman](postman/README.md)).
