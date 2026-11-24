-- Jendela waktu menggantikan `status` dan `tanggal_pelaksanaan`; status kini dihitung dari jam.
ALTER TABLE `sesi_skrining` ADD COLUMN `waktu_mulai` DATETIME(3) NULL,
    ADD COLUMN `waktu_selesai` DATETIME(3) NULL;

-- tanggal_pelaksanaan 00:00 WIB = 17:00 UTC hari sebelumnya.
UPDATE `sesi_skrining`
SET `waktu_mulai` = TIMESTAMP(`tanggal_pelaksanaan`) - INTERVAL 7 HOUR,
    `waktu_selesai` = TIMESTAMP(`tanggal_pelaksanaan`) - INTERVAL 7 HOUR + INTERVAL 1 DAY;

-- Sesi yang sudah ditutup berakhir paling lambat saat terakhir diubah.
UPDATE `sesi_skrining`
SET `waktu_selesai` = GREATEST(`waktu_mulai` + INTERVAL 1 SECOND, LEAST(`waktu_selesai`, `updated_at`))
WHERE `status` = 'selesai';

-- Sesi yang sedang aktif tetap aktif 30 hari sejak migrasi, bukan tertutup diam-diam.
UPDATE `sesi_skrining`
SET `waktu_mulai` = LEAST(`waktu_mulai`, UTC_TIMESTAMP(3)),
    `waktu_selesai` = GREATEST(`waktu_selesai`, UTC_TIMESTAMP(3) + INTERVAL 30 DAY)
WHERE `status` = 'aktif';

ALTER TABLE `sesi_skrining` MODIFY `waktu_mulai` DATETIME(3) NOT NULL,
    MODIFY `waktu_selesai` DATETIME(3) NOT NULL,
    DROP COLUMN `status`,
    DROP COLUMN `tanggal_pelaksanaan`;

-- CreateIndex
CREATE INDEX `sesi_skrining_sekolah_id_waktu_mulai_idx` ON `sesi_skrining`(`sekolah_id`, `waktu_mulai`);

-- CreateTable
CREATE TABLE `tinjauan` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `hasil_skrining_id` INTEGER NOT NULL,
    `status` ENUM('belum_ditinjau', 'sudah_ditinjau', 'dirujuk') NOT NULL,
    `catatan` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tinjauan_hasil_skrining_id_key`(`hasil_skrining_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tinjauan` ADD CONSTRAINT `tinjauan_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
