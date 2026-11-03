-- CreateTable
CREATE TABLE `super_admin` (
    `id_admin` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `super_admin_email_key`(`email`),
    PRIMARY KEY (`id_admin`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sekolah` (
    `id_school` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_id` INTEGER NOT NULL,
    `school_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `alamat` TEXT NULL,
    `kontak_telepon` VARCHAR(255) NOT NULL,
    `status_aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `sekolah_email_key`(`email`),
    PRIMARY KEY (`id_school`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kategori_asesmen` (
    `id_kategori` INTEGER NOT NULL AUTO_INCREMENT,
    `nama_kategori` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_kategori`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tes_skrining` (
    `id_test` INTEGER NOT NULL AUTO_INCREMENT,
    `admin_id` INTEGER NOT NULL,
    `nama_tes` VARCHAR(255) NOT NULL,
    `jenjang` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `status_aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_test`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sesi_skrining` (
    `id_session` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `idKategori` INTEGER NOT NULL,
    `nama_sesi` VARCHAR(255) NOT NULL,
    `kode_skrining` VARCHAR(255) NOT NULL,
    `tanggal_pelaksanaan` DATE NOT NULL,
    `status_sesi` ENUM('menunggu', 'aktif', 'selesai') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `sesi_skrining_kode_skrining_key`(`kode_skrining`),
    PRIMARY KEY (`id_session`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `siswa` (
    `id_student` INTEGER NOT NULL AUTO_INCREMENT,
    `school_id` INTEGER NOT NULL,
    `nama_lengkap` VARCHAR(255) NOT NULL,
    `nisn` VARCHAR(255) NOT NULL,
    `tanggal_lahir` DATE NOT NULL,
    `kelas` VARCHAR(255) NOT NULL,
    `jenis_kelamin` ENUM('laki_laki', 'perempuan') NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_student`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pertanyaan` (
    `id_pertanyaan` INTEGER NOT NULL AUTO_INCREMENT,
    `kategori_id` INTEGER NOT NULL,
    `test_id` INTEGER NOT NULL,
    `teks_pertanyaan` TEXT NOT NULL,
    `url_gambar` VARCHAR(255) NULL,
    `jawaban_benar` VARCHAR(255) NOT NULL,
    `skor` INTEGER NOT NULL,
    `status_aktif` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_pertanyaan`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `opsi_jawaban` (
    `id_jawaban` INTEGER NOT NULL AUTO_INCREMENT,
    `pertanyaan_id` INTEGER NOT NULL,
    `label_opsi` VARCHAR(10) NOT NULL,
    `teks_opsi` VARCHAR(255) NOT NULL,
    `url_gambar` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_jawaban`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hasil_skrining` (
    `id_result` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `tanggal_skrining` DATE NOT NULL,
    `waktu_selesai` DATETIME(3) NOT NULL,
    `total_skor` INTEGER NOT NULL,
    `kesimpulan_indikasi` TEXT NOT NULL,
    `status_selesai` BOOLEAN NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_result`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `detail_jawaban_siswa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `idHasil` INTEGER NOT NULL,
    `idPertanyaan` INTEGER NOT NULL,
    `idOpsi` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `konfigurasi_penilaian` (
    `id_konfigurasiPenilaian` INTEGER NOT NULL AUTO_INCREMENT,
    `test_id` INTEGER NOT NULL,
    `skor_min` INTEGER NOT NULL,
    `skor_max` INTEGER NOT NULL,
    `kategori_hasil` VARCHAR(255) NOT NULL,
    `deskripsi` TEXT NOT NULL,
    `rekomendasi` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id_konfigurasiPenilaian`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sekolah` ADD CONSTRAINT `sekolah_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `super_admin`(`id_admin`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tes_skrining` ADD CONSTRAINT `tes_skrining_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `super_admin`(`id_admin`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_skrining` ADD CONSTRAINT `sesi_skrining_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `sekolah`(`id_school`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sesi_skrining` ADD CONSTRAINT `sesi_skrining_idKategori_fkey` FOREIGN KEY (`idKategori`) REFERENCES `kategori_asesmen`(`id_kategori`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `siswa` ADD CONSTRAINT `siswa_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `sekolah`(`id_school`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_kategori_id_fkey` FOREIGN KEY (`kategori_id`) REFERENCES `kategori_asesmen`(`id_kategori`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pertanyaan` ADD CONSTRAINT `pertanyaan_test_id_fkey` FOREIGN KEY (`test_id`) REFERENCES `tes_skrining`(`id_test`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `opsi_jawaban` ADD CONSTRAINT `opsi_jawaban_pertanyaan_id_fkey` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan`(`id_pertanyaan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_skrining` ADD CONSTRAINT `hasil_skrining_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `siswa`(`id_student`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hasil_skrining` ADD CONSTRAINT `hasil_skrining_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `sesi_skrining`(`id_session`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_jawaban_siswa` ADD CONSTRAINT `detail_jawaban_siswa_idHasil_fkey` FOREIGN KEY (`idHasil`) REFERENCES `hasil_skrining`(`id_result`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_jawaban_siswa` ADD CONSTRAINT `detail_jawaban_siswa_idPertanyaan_fkey` FOREIGN KEY (`idPertanyaan`) REFERENCES `pertanyaan`(`id_pertanyaan`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `detail_jawaban_siswa` ADD CONSTRAINT `detail_jawaban_siswa_idOpsi_fkey` FOREIGN KEY (`idOpsi`) REFERENCES `opsi_jawaban`(`id_jawaban`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `konfigurasi_penilaian` ADD CONSTRAINT `konfigurasi_penilaian_test_id_fkey` FOREIGN KEY (`test_id`) REFERENCES `tes_skrining`(`id_test`) ON DELETE RESTRICT ON UPDATE CASCADE;
