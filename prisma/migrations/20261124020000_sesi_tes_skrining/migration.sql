-- Sekolah memilih tes Level 1 saat membuat sesi. Sesi lama memakai tes yang selama ini dipakai
-- alur orang tua: tes Level 1 aktif dengan id terkecil.
ALTER TABLE `sesi_skrining` ADD COLUMN `tes_skrining_id` INTEGER NULL;

UPDATE `sesi_skrining`
SET `tes_skrining_id` = (SELECT MIN(`id`) FROM `tes_skrining` WHERE `level` = 1 AND `aktif` = 1);

-- Gagal di sini bila belum ada tes Level 1 aktif; isi tesnya dulu, lalu jalankan ulang.
ALTER TABLE `sesi_skrining` MODIFY `tes_skrining_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `sesi_skrining_tes_skrining_id_idx` ON `sesi_skrining`(`tes_skrining_id`);

-- AddForeignKey
ALTER TABLE `sesi_skrining` ADD CONSTRAINT `sesi_skrining_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
