# capstone-backend

Backend untuk sistem skrining (Super Admin, Sekolah, Orang Tua/Wali, Siswa). Saat ini masih berupa kerangka: server Express dengan `GET /api/health`, MySQL 8.0 + phpMyAdmin di Docker, dan Prisma yang sudah terhubung ke MySQL. Belum ada tabel.

## Prasyarat

- Node.js 22.12 atau lebih baru
- Docker Desktop (dengan Docker Compose)

## Cara menjalankan

```powershell
Copy-Item .env.example .env   # lalu ganti password di .env
npm install
npm run docker:up              # MySQL + phpMyAdmin
npm run db:generate            # membuat Prisma Client di generated/
npm run dev
```

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
| `npm test` | Menjalankan seluruh test (`node:test` melalui `tsx`) |
| `npm run db:generate` | Membuat ulang Prisma Client |
| `npm run db:migrate` | Membuat dan menjalankan migrasi Prisma |
| `npm run docker:up` | Menyalakan container MySQL dan phpMyAdmin |
| `npm run docker:down` | Mematikan container (data tetap tersimpan) |

## Dokumentasi

Keputusan desain, spesifikasi, dan rencana kerja ada di folder `docs/`.
