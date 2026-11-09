-- AlterTable
ALTER TABLE `sekolah` ADD COLUMN `kontak_telepon` VARCHAR(20) NULL;

-- CreateTable
CREATE TABLE `kategori_asesmen` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `ambang_batas` TINYINT UNSIGNED NOT NULL,
    `tes_skrining_id` INTEGER NULL,
    `deskripsi` TEXT NULL,
    `rekomendasi` TEXT NULL,
    `urutan` TINYINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `kategori_asesmen_tes_skrining_id_idx`(`tes_skrining_id`),
    UNIQUE INDEX `kategori_asesmen_urutan_key`(`urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tes_skrining` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `super_admin_id` INTEGER NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `level` TINYINT UNSIGNED NOT NULL,
    `jenjang` VARCHAR(50) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `tes_skrining_super_admin_id_idx`(`super_admin_id`),
    INDEX `tes_skrining_level_aktif_idx`(`level`, `aktif`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesi_skrining` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sekolah_id` INTEGER NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `kode` VARCHAR(20) NOT NULL,
    `tanggal_pelaksanaan` DATE NOT NULL,
    `status` ENUM('menunggu', 'aktif', 'selesai') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sesi_skrining_kode_key`(`kode`),
    INDEX `sesi_skrining_sekolah_id_idx`(`sekolah_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pertanyaan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tes_skrining_id` INTEGER NOT NULL,
    `kategori_asesmen_id` INTEGER NOT NULL,
    `teks` TEXT NOT NULL,
    `tipe_jawaban` ENUM('skala', 'ya_tidak') NOT NULL,
    `nomor_urut` SMALLINT UNSIGNED NOT NULL,
    `url_gambar` VARCHAR(255) NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pertanyaan_kategori_asesmen_id_idx`(`kategori_asesmen_id`),
    UNIQUE INDEX `pertanyaan_tes_skrining_id_nomor_urut_key`(`tes_skrining_id`, `nomor_urut`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opsi_jawaban` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pertanyaan_id` INTEGER NOT NULL,
    `label` VARCHAR(10) NOT NULL,
    `teks` VARCHAR(255) NOT NULL,
    `skor` TINYINT UNSIGNED NOT NULL,
    `urutan` TINYINT UNSIGNED NOT NULL,
    `url_gambar` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `opsi_jawaban_pertanyaan_id_urutan_key`(`pertanyaan_id`, `urutan`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hasil_skrining` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `siswa_id` INTEGER NOT NULL,
    `sesi_skrining_id` INTEGER NOT NULL,
    `token` CHAR(36) NOT NULL,
    `nama_responden` VARCHAR(150) NOT NULL,
    `nomor_hp_responden` VARCHAR(20) NOT NULL,
    `hubungan_responden` VARCHAR(50) NOT NULL,
    `waktu_persetujuan` DATETIME(3) NOT NULL,
    `waktu_mulai` DATETIME(3) NOT NULL,
    `waktu_selesai` DATETIME(3) NULL,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `kesimpulan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `hasil_skrining_token_key`(`token`),
    INDEX `hasil_skrining_sesi_skrining_id_idx`(`sesi_skrining_id`),
    UNIQUE INDEX `hasil_skrining_siswa_id_sesi_skrining_id_key`(`siswa_id`, `sesi_skrining_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jawaban_siswa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hasil_skrining_id` INTEGER NOT NULL,
    `pertanyaan_id` INTEGER NOT NULL,
    `opsi_jawaban_id` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `jawaban_siswa_pertanyaan_id_idx`(`pertanyaan_id`),
    INDEX `jawaban_siswa_opsi_jawaban_id_idx`(`opsi_jawaban_id`),
    UNIQUE INDEX `jawaban_siswa_hasil_skrining_id_pertanyaan_id_key`(`hasil_skrining_id`, `pertanyaan_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hasil_kategori` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hasil_skrining_id` INTEGER NOT NULL,
    `kategori_asesmen_id` INTEGER NOT NULL,
    `skor_tertinggi` TINYINT UNSIGNED NOT NULL,
    `ambang_batas` TINYINT UNSIGNED NOT NULL,
    `terindikasi` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hasil_kategori_kategori_asesmen_id_idx`(`kategori_asesmen_id`),
    UNIQUE INDEX `hasil_kategori_hasil_skrining_id_kategori_asesmen_id_key`(`hasil_skrining_id`, `kategori_asesmen_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hasil_tes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hasil_skrining_id` INTEGER NOT NULL,
    `tes_skrining_id` INTEGER NOT NULL,
    `total_skor` SMALLINT UNSIGNED NULL,
    `selesai` BOOLEAN NOT NULL DEFAULT false,
    `waktu_selesai` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `hasil_tes_tes_skrining_id_idx`(`tes_skrining_id`),
    UNIQUE INDEX `hasil_tes_hasil_skrining_id_tes_skrining_id_key`(`hasil_skrining_id`, `tes_skrining_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kategori_asesmen` ADD CONSTRAINT `kategori_asesmen_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tes_skrining` ADD CONSTRAINT `tes_skrining_super_admin_id_fkey` FOREIGN KEY (`super_admin_id`) REFERENCES `super_admin`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_skrining` ADD CONSTRAINT `sesi_skrining_sekolah_id_fkey` FOREIGN KEY (`sekolah_id`) REFERENCES `sekolah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_kategori_asesmen_id_fkey` FOREIGN KEY (`kategori_asesmen_id`) REFERENCES `kategori_asesmen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opsi_jawaban` ADD CONSTRAINT `opsi_jawaban_pertanyaan_id_fkey` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_skrining` ADD CONSTRAINT `hasil_skrining_siswa_id_fkey` FOREIGN KEY (`siswa_id`) REFERENCES `siswa`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_skrining` ADD CONSTRAINT `hasil_skrining_sesi_skrining_id_fkey` FOREIGN KEY (`sesi_skrining_id`) REFERENCES `sesi_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jawaban_siswa` ADD CONSTRAINT `jawaban_siswa_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jawaban_siswa` ADD CONSTRAINT `jawaban_siswa_pertanyaan_id_fkey` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jawaban_siswa` ADD CONSTRAINT `jawaban_siswa_opsi_jawaban_id_fkey` FOREIGN KEY (`opsi_jawaban_id`) REFERENCES `opsi_jawaban`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_kategori` ADD CONSTRAINT `hasil_kategori_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_kategori` ADD CONSTRAINT `hasil_kategori_kategori_asesmen_id_fkey` FOREIGN KEY (`kategori_asesmen_id`) REFERENCES `kategori_asesmen`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_tes` ADD CONSTRAINT `hasil_tes_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_tes` ADD CONSTRAINT `hasil_tes_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
