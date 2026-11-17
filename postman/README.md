# Pengujian API

Koleksi: `capstone-backend.postman_collection.json` (format Postman v2.1, 50 request).

## Impor

**Postman:** *Import* -> pilih file koleksi.

**Hoppscotch:** *Collections* -> *Import* -> *Postman*. Script penyimpan variabel tidak terbawa, jadi isi `auth_token`, `token`, `siswa_id`, `tes_skrining_id`, dan id pada folder Super Admin secara manual dari respons sebelumnya.

## Persiapan

1. `npm run dev` (server di `http://localhost:5000`).
2. `npm run db:seed` bila akun demo belum ada.
3. Isi variabel koleksi `password` dengan nilai `SEED_PASSWORD` dari `.env` Anda.

Variabel `password` sengaja dikosongkan di file ini supaya sandi tidak ikut ter-commit.

## Isi koleksi

| Folder | Endpoint |
|---|---|
| Sistem | health check |
| Autentikasi | login, profil saya, logout |
| Skrining Publik | 10 langkah, dari validasi kode sesi sampai pengiriman bagian lanjutan |
| Super Admin | dashboard, kelola sekolah, tes skrining, pertanyaan, pemetaan domain, penilaian, interpretasi (36 request) |

## Folder Super Admin

1. Login dengan akun Super Admin (`identifier` = `superadmin@demo.test`).
2. Jalankan *Daftar Domain* dan *Daftar Tes Skrining* lebih dulu. Keduanya mengisi `kategori_id`, `tes_l1_id`, dan `tes_l2_id` yang dipakai request lain.
3. Request tulis (tambah, ubah, hapus) benar-benar mengubah database. Jalankan di database pengembangan.

Setiap endpoint juga tersedia dengan prefix `/api/admin/...`. Koleksi hanya mencantumkan `/api/super-admin/...`.

## Menjalankan alur skrining

Jalankan folder *Skrining Publik* berurutan dari atas. Tiap request menyimpan nilai yang dibutuhkan request berikutnya, jadi tidak perlu salin-tempel token.

Pada langkah 5-6, ulangi *Daftar Pertanyaan* lalu *Simpan Jawaban* bergantian sampai `total_dijawab` sama dengan `total_soal`, baru kirim Skrining Awal. Variabel `kode_sesi` default `ABC123` mengikuti data seed; ganti bila memakai sesi lain.
