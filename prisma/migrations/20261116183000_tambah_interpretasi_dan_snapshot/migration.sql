-- AlterTable
ALTER TABLE `kategori_asesmen` ADD COLUMN `deskripsi_belum_memenuhi` TEXT NULL,
    ADD COLUMN `rekomendasi_belum_memenuhi` TEXT NULL;

-- AlterTable
ALTER TABLE `rentang_penilaian` ADD COLUMN `deskripsi` TEXT NULL,
    ADD COLUMN `rekomendasi` TEXT NULL;

-- AlterTable
ALTER TABLE `hasil_kategori` ADD COLUMN `deskripsi` TEXT NULL,
    ADD COLUMN `rekomendasi` TEXT NULL;

-- AlterTable
ALTER TABLE `hasil_tes` ADD COLUMN `deskripsi_hasil` TEXT NULL,
    ADD COLUMN `rekomendasi_hasil` TEXT NULL;
