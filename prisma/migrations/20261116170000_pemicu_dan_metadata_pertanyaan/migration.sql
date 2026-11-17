-- AlterTable pertanyaan: Tambahkan kolom kalimat_pengantar, pemicu_pertanyaan_id, pemicu_opsi_id, pemicu_operator, pemicu_nilai
ALTER TABLE `pertanyaan`
    ADD COLUMN `kalimat_pengantar` TEXT NULL,
    ADD COLUMN `pemicu_pertanyaan_id` INTEGER NULL,
    ADD COLUMN `pemicu_opsi_id` INTEGER NULL,
    ADD COLUMN `pemicu_operator` VARCHAR(10) NULL,
    ADD COLUMN `pemicu_nilai` TINYINT UNSIGNED NULL;

-- AlterTable opsi_jawaban: Tambahkan kolom penjelasan
ALTER TABLE `opsi_jawaban`
    ADD COLUMN `penjelasan` VARCHAR(255) NULL;

-- CreateIndex
CREATE INDEX `pertanyaan_pemicu_pertanyaan_id_idx` ON `pertanyaan`(`pemicu_pertanyaan_id`);
CREATE INDEX `pertanyaan_pemicu_opsi_id_idx` ON `pertanyaan`(`pemicu_opsi_id`);

-- AddForeignKey
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_pemicu_pertanyaan_id_fkey` FOREIGN KEY (`pemicu_pertanyaan_id`) REFERENCES `pertanyaan`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_pemicu_opsi_id_fkey` FOREIGN KEY (`pemicu_opsi_id`) REFERENCES `opsi_jawaban`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
