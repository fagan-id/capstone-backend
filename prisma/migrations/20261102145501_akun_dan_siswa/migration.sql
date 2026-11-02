-- CreateTable
CREATE TABLE `super_admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `super_admin_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sekolah` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `npsn` CHAR(8) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `alamat` VARCHAR(255) NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sekolah_npsn_key`(`npsn`),
    UNIQUE INDEX `sekolah_email_key`(`email`),
    UNIQUE INDEX `sekolah_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kelas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sekolah_id` INTEGER NOT NULL,
    `nama` VARCHAR(20) NOT NULL,
    `tingkat` TINYINT UNSIGNED NOT NULL,
    `tahun_ajaran` CHAR(9) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `kelas_sekolah_id_tahun_ajaran_nama_key`(`sekolah_id`, `tahun_ajaran`, `nama`),
    UNIQUE INDEX `kelas_id_sekolah_id_key`(`id`, `sekolah_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `siswa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sekolah_id` INTEGER NOT NULL,
    `kelas_id` INTEGER NOT NULL,
    `nisn` CHAR(10) NOT NULL,
    `nama` VARCHAR(150) NOT NULL,
    `tanggal_lahir` DATE NOT NULL,
    `jenis_kelamin` ENUM('L', 'P') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `siswa_nisn_key`(`nisn`),
    INDEX `siswa_sekolah_id_nama_idx`(`sekolah_id`, `nama`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `kelas` ADD CONSTRAINT `kelas_sekolah_id_fkey` FOREIGN KEY (`sekolah_id`) REFERENCES `sekolah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `siswa` ADD CONSTRAINT `siswa_sekolah_id_fkey` FOREIGN KEY (`sekolah_id`) REFERENCES `sekolah`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `siswa` ADD CONSTRAINT `siswa_kelas_id_sekolah_id_fkey` FOREIGN KEY (`kelas_id`, `sekolah_id`) REFERENCES `kelas`(`id`, `sekolah_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
