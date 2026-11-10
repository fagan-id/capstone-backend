# Pengujian API

Koleksi: `capstone-backend.postman_collection.json` (format Postman v2.1, 14 endpoint).

## Impor

**Postman:** *Import* -> pilih file koleksi.

**Hoppscotch:** *Collections* -> *Import* -> *Postman*. Script penyimpan variabel tidak terbawa, jadi isi `token`, `siswa_id`, dan `tes_skrining_id` secara manual dari respons sebelumnya.

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

## Menjalankan alur skrining

Jalankan folder *Skrining Publik* berurutan dari atas. Tiap request menyimpan nilai yang dibutuhkan request berikutnya, jadi tidak perlu salin-tempel token.

Pada langkah 5-6, ulangi *Daftar Pertanyaan* lalu *Simpan Jawaban* bergantian sampai `total_dijawab` sama dengan `total_soal`, baru kirim Skrining Awal. Variabel `kode_sesi` default `ABC123` mengikuti data seed; ganti bila memakai sesi lain.
