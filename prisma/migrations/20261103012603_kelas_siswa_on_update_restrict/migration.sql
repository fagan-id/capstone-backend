-- DropForeignKey
ALTER TABLE `siswa` DROP FOREIGN KEY `siswa_kelas_id_sekolah_id_fkey`;

-- DropIndex
DROP INDEX `siswa_kelas_id_sekolah_id_fkey` ON `siswa`;

-- AddForeignKey
ALTER TABLE `siswa` ADD CONSTRAINT `siswa_kelas_id_sekolah_id_fkey` FOREIGN KEY (`kelas_id`, `sekolah_id`) REFERENCES `kelas`(`id`, `sekolah_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
