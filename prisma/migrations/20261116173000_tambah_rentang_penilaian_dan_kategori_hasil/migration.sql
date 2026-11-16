-- AlterTable
ALTER TABLE `hasil_tes` ADD COLUMN `kategori_hasil` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `rentang_penilaian` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tes_skrining_id` INTEGER NOT NULL,
    `kategori` VARCHAR(100) NOT NULL,
    `skor_min` DOUBLE NOT NULL,
    `skor_max` DOUBLE NULL,
    `urutan` TINYINT UNSIGNED NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rentang_penilaian_tes_skrining_id_idx`(`tes_skrining_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rentang_penilaian` ADD CONSTRAINT `rentang_penilaian_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
