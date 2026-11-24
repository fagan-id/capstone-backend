-- MySQL dump 10.13  Distrib 8.0.30, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: capstone_skrining
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `capstone_skrining`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `capstone_skrining` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `capstone_skrining`;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('7f930c68-dff8-403e-b5c4-f2b7a93aaad8','80140c96a85285202306263ab727d901ff2727daa16a0946474f3cdb96e40963','2026-11-17 01:50:54.997','20261116183000_tambah_interpretasi_dan_snapshot',NULL,NULL,'2026-11-17 01:50:54.913',1),('c2810165-f6a6-452f-b382-e8f9cecd4f47','f6158ac1c1b50eeab806ca15aaa86ffdce43ec19bc9b5c63e9b1927b74f135c0','2026-11-09 06:04:32.204','20261102145501_akun_dan_siswa',NULL,NULL,'2026-11-09 06:04:32.027',1),('d3a58bf3-601b-48fe-94a5-bc6bd8352ef5','65db90a6e0c8c77e150d2aaa52e6491d1062d2ce17b9fb0d20ee27e60d0ae662','2026-11-17 01:50:54.912','20261116173000_tambah_rentang_penilaian_dan_kategori_hasil',NULL,NULL,'2026-11-17 01:50:54.777',1),('dc9e0634-f098-425b-8410-b094f4d1e410','2bea0517676d8f4a5c10d79a91c652cc17781d271112b0776dc503eb6f3a39a3','2026-11-09 06:04:32.929','20261103025703_tabel_skrining',NULL,NULL,'2026-11-09 06:04:32.261',1),('ec4374ba-b15a-40ae-b66f-3e109aea2bf2','ce7f0e1812b08a89939b0933ea0508dac53e9414bbcdd26368d29acf316bd1da','2026-11-24 02:27:39.289','20261124020000_sesi_tes_skrining',NULL,NULL,'2026-11-24 02:27:39.010',1),('ed03463c-a5e2-4b48-ba2c-a48825638419','0f3a650a4682087e50eafb38c53a4b344c3380afe0b48541b747b03044cd4b92','2026-11-09 06:04:32.261','20261103012603_kelas_siswa_on_update_restrict',NULL,NULL,'2026-11-09 06:04:32.204',1),('f2bc21c6-225b-4b6d-8813-19e0437f717b','1d607efb45e9130cfd43e001cbc7a0bc8d619c5d21dd7d47b72210b19a1bba30','2026-11-17 01:50:54.775','20261116170000_pemicu_dan_metadata_pertanyaan',NULL,NULL,'2026-11-17 01:50:54.383',1);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hasil_kategori`
--

DROP TABLE IF EXISTS `hasil_kategori`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hasil_kategori` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hasil_skrining_id` int NOT NULL,
  `kategori_asesmen_id` int NOT NULL,
  `skor_tertinggi` tinyint unsigned NOT NULL,
  `ambang_batas` tinyint unsigned NOT NULL,
  `terindikasi` tinyint(1) NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rekomendasi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hasil_kategori_hasil_skrining_id_kategori_asesmen_id_key` (`hasil_skrining_id`,`kategori_asesmen_id`),
  KEY `hasil_kategori_kategori_asesmen_id_idx` (`kategori_asesmen_id`),
  CONSTRAINT `hasil_kategori_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `hasil_kategori_kategori_asesmen_id_fkey` FOREIGN KEY (`kategori_asesmen_id`) REFERENCES `kategori_asesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1891 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hasil_kategori`
--

LOCK TABLES `hasil_kategori` WRITE;
/*!40000 ALTER TABLE `hasil_kategori` DISABLE KEYS */;
/*!40000 ALTER TABLE `hasil_kategori` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hasil_skrining`
--

DROP TABLE IF EXISTS `hasil_skrining`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hasil_skrining` (
  `id` int NOT NULL AUTO_INCREMENT,
  `siswa_id` int NOT NULL,
  `sesi_skrining_id` int NOT NULL,
  `token` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama_responden` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nomor_hp_responden` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `hubungan_responden` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `waktu_persetujuan` datetime(3) NOT NULL,
  `waktu_mulai` datetime(3) NOT NULL,
  `waktu_selesai` datetime(3) DEFAULT NULL,
  `selesai` tinyint(1) NOT NULL DEFAULT '0',
  `kesimpulan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hasil_skrining_token_key` (`token`),
  UNIQUE KEY `hasil_skrining_siswa_id_sesi_skrining_id_key` (`siswa_id`,`sesi_skrining_id`),
  KEY `hasil_skrining_sesi_skrining_id_idx` (`sesi_skrining_id`),
  CONSTRAINT `hasil_skrining_sesi_skrining_id_fkey` FOREIGN KEY (`sesi_skrining_id`) REFERENCES `sesi_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `hasil_skrining_siswa_id_fkey` FOREIGN KEY (`siswa_id`) REFERENCES `siswa` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1098 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hasil_skrining`
--

LOCK TABLES `hasil_skrining` WRITE;
/*!40000 ALTER TABLE `hasil_skrining` DISABLE KEYS */;
/*!40000 ALTER TABLE `hasil_skrining` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hasil_tes`
--

DROP TABLE IF EXISTS `hasil_tes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hasil_tes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hasil_skrining_id` int NOT NULL,
  `tes_skrining_id` int NOT NULL,
  `total_skor` smallint unsigned DEFAULT NULL,
  `selesai` tinyint(1) NOT NULL DEFAULT '0',
  `waktu_selesai` datetime(3) DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `kategori_hasil` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deskripsi_hasil` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rekomendasi_hasil` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hasil_tes_hasil_skrining_id_tes_skrining_id_key` (`hasil_skrining_id`,`tes_skrining_id`),
  KEY `hasil_tes_tes_skrining_id_idx` (`tes_skrining_id`),
  CONSTRAINT `hasil_tes_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `hasil_tes_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1310 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hasil_tes`
--

LOCK TABLES `hasil_tes` WRITE;
/*!40000 ALTER TABLE `hasil_tes` DISABLE KEYS */;
/*!40000 ALTER TABLE `hasil_tes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `jawaban_siswa`
--

DROP TABLE IF EXISTS `jawaban_siswa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jawaban_siswa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hasil_skrining_id` int NOT NULL,
  `pertanyaan_id` int NOT NULL,
  `opsi_jawaban_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `jawaban_siswa_hasil_skrining_id_pertanyaan_id_key` (`hasil_skrining_id`,`pertanyaan_id`),
  KEY `jawaban_siswa_pertanyaan_id_idx` (`pertanyaan_id`),
  KEY `jawaban_siswa_opsi_jawaban_id_idx` (`opsi_jawaban_id`),
  CONSTRAINT `jawaban_siswa_hasil_skrining_id_fkey` FOREIGN KEY (`hasil_skrining_id`) REFERENCES `hasil_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `jawaban_siswa_opsi_jawaban_id_fkey` FOREIGN KEY (`opsi_jawaban_id`) REFERENCES `opsi_jawaban` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `jawaban_siswa_pertanyaan_id_fkey` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3107 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `jawaban_siswa`
--

LOCK TABLES `jawaban_siswa` WRITE;
/*!40000 ALTER TABLE `jawaban_siswa` DISABLE KEYS */;
/*!40000 ALTER TABLE `jawaban_siswa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kategori_asesmen`
--

DROP TABLE IF EXISTS `kategori_asesmen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kategori_asesmen` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ambang_batas` tinyint unsigned NOT NULL,
  `tes_skrining_id` int DEFAULT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rekomendasi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `urutan` tinyint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deskripsi_belum_memenuhi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rekomendasi_belum_memenuhi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kategori_asesmen_urutan_key` (`urutan`),
  KEY `kategori_asesmen_tes_skrining_id_idx` (`tes_skrining_id`),
  CONSTRAINT `kategori_asesmen_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=428 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kategori_asesmen`
--

LOCK TABLES `kategori_asesmen` WRITE;
/*!40000 ALTER TABLE `kategori_asesmen` DISABLE KEYS */;
INSERT INTO `kategori_asesmen` VALUES (28,'Somatik',2,NULL,'Keluhan fisik tanpa sebab medis yang jelas.','Pantau keluhan dan catat pemicunya bersama guru kelas.',1,'2026-11-09 06:04:50.358','2026-11-09 06:04:50.358',NULL,NULL),(29,'Inatensi',1,25,'Kesulitan memusatkan dan mempertahankan perhatian.','Lanjutkan ke instrumen tindak lanjut inatensi.',2,'2026-11-09 06:04:50.361','2026-11-09 06:04:50.361',NULL,NULL),(30,'Depresi',2,26,'Suasana hati menurun dan kehilangan minat.','Lanjutkan ke instrumen tindak lanjut depresi.',3,'2026-11-09 06:04:50.364','2026-11-09 06:04:50.364',NULL,NULL),(31,'Ide Menyakiti Diri',2,NULL,'Pikiran atau upaya menyakiti diri sendiri.','Hubungi orang tua dan tenaga profesional secepatnya.',4,'2026-11-09 06:04:50.366','2026-11-09 06:04:50.366',NULL,NULL);
/*!40000 ALTER TABLE `kategori_asesmen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `kelas`
--

DROP TABLE IF EXISTS `kelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `kelas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sekolah_id` int NOT NULL,
  `nama` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tingkat` tinyint unsigned NOT NULL,
  `tahun_ajaran` char(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `kelas_sekolah_id_tahun_ajaran_nama_key` (`sekolah_id`,`tahun_ajaran`,`nama`),
  UNIQUE KEY `kelas_id_sekolah_id_key` (`id`,`sekolah_id`),
  CONSTRAINT `kelas_sekolah_id_fkey` FOREIGN KEY (`sekolah_id`) REFERENCES `sekolah` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=857 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `kelas`
--

LOCK TABLES `kelas` WRITE;
/*!40000 ALTER TABLE `kelas` DISABLE KEYS */;
INSERT INTO `kelas` VALUES (27,34,'4A',4,'2026/2027','2026-11-09 06:04:50.328','2026-11-09 06:04:50.328');
/*!40000 ALTER TABLE `kelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opsi_jawaban`
--

DROP TABLE IF EXISTS `opsi_jawaban`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opsi_jawaban` (
  `id` int NOT NULL AUTO_INCREMENT,
  `pertanyaan_id` int NOT NULL,
  `label` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `teks` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `skor` tinyint unsigned NOT NULL,
  `urutan` tinyint unsigned NOT NULL,
  `url_gambar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `penjelasan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `opsi_jawaban_pertanyaan_id_urutan_key` (`pertanyaan_id`,`urutan`),
  CONSTRAINT `opsi_jawaban_pertanyaan_id_fkey` FOREIGN KEY (`pertanyaan_id`) REFERENCES `pertanyaan` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=645 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opsi_jawaban`
--

LOCK TABLES `opsi_jawaban` WRITE;
/*!40000 ALTER TABLE `opsi_jawaban` DISABLE KEYS */;
INSERT INTO `opsi_jawaban` VALUES (185,49,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.374','2026-11-09 06:04:50.374',NULL),(186,49,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.377','2026-11-09 06:04:50.377',NULL),(187,49,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.380','2026-11-09 06:04:50.380',NULL),(188,49,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.383','2026-11-09 06:04:50.383',NULL),(189,49,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.386','2026-11-09 06:04:50.386',NULL),(190,50,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.391','2026-11-09 06:04:50.391',NULL),(191,50,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.393','2026-11-09 06:04:50.393',NULL),(192,50,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.396','2026-11-09 06:04:50.396',NULL),(193,50,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.398','2026-11-09 06:04:50.398',NULL),(194,50,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.400','2026-11-09 06:04:50.400',NULL),(195,51,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.404','2026-11-09 06:04:50.404',NULL),(196,51,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.407','2026-11-09 06:04:50.407',NULL),(197,51,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.408','2026-11-09 06:04:50.408',NULL),(198,51,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.410','2026-11-09 06:04:50.410',NULL),(199,51,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.413','2026-11-09 06:04:50.413',NULL),(200,52,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.418','2026-11-09 06:04:50.418',NULL),(201,52,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.420','2026-11-09 06:04:50.420',NULL),(202,52,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.421','2026-11-09 06:04:50.421',NULL),(203,52,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.423','2026-11-09 06:04:50.423',NULL),(204,52,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.425','2026-11-09 06:04:50.425',NULL),(205,53,'T','Tidak',0,1,NULL,'2026-11-09 06:04:50.431','2026-11-09 06:04:50.431',NULL),(206,53,'Y','Ya',2,2,NULL,'2026-11-09 06:04:50.435','2026-11-09 06:04:50.435',NULL),(207,53,'TT','Tidak tahu',2,3,NULL,'2026-11-09 06:04:50.437','2026-11-09 06:04:50.437',NULL),(208,54,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.441','2026-11-09 06:04:50.441',NULL),(209,54,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.444','2026-11-09 06:04:50.444',NULL),(210,54,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.446','2026-11-09 06:04:50.446',NULL),(211,54,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.449','2026-11-09 06:04:50.449',NULL),(212,54,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.451','2026-11-09 06:04:50.451',NULL),(213,55,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.456','2026-11-09 06:04:50.456',NULL),(214,55,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.459','2026-11-09 06:04:50.459',NULL),(215,55,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.462','2026-11-09 06:04:50.462',NULL),(216,55,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.464','2026-11-09 06:04:50.464',NULL),(217,55,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.467','2026-11-09 06:04:50.467',NULL),(218,56,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.471','2026-11-09 06:04:50.471',NULL),(219,56,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.475','2026-11-09 06:04:50.475',NULL),(220,56,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.477','2026-11-09 06:04:50.477',NULL),(221,56,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.480','2026-11-09 06:04:50.480',NULL),(222,56,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.482','2026-11-09 06:04:50.482',NULL),(223,57,'0','Tidak sama sekali',0,1,NULL,'2026-11-09 06:04:50.488','2026-11-09 06:04:50.488',NULL),(224,57,'1','Sangat ringan',1,2,NULL,'2026-11-09 06:04:50.491','2026-11-09 06:04:50.491',NULL),(225,57,'2','Ringan',2,3,NULL,'2026-11-09 06:04:50.494','2026-11-09 06:04:50.494',NULL),(226,57,'3','Sedang',3,4,NULL,'2026-11-09 06:04:50.496','2026-11-09 06:04:50.496',NULL),(227,57,'4','Berat',4,5,NULL,'2026-11-09 06:04:50.498','2026-11-09 06:04:50.498',NULL),(420,250,'0','Tidak sama sekali',0,1,NULL,'2026-11-17 03:16:49.456','2026-11-17 03:16:49.456',NULL),(421,250,'1','Jarang',1,2,NULL,'2026-11-17 03:16:49.456','2026-11-17 03:16:49.456',NULL),(422,250,'2','Kadang-kadang',2,3,NULL,'2026-11-17 03:16:49.456','2026-11-17 03:16:49.456',NULL),(423,250,'3','Sering',3,4,NULL,'2026-11-17 03:16:49.456','2026-11-17 03:16:49.456',NULL),(424,250,'4','Hampir setiap hari',4,5,NULL,'2026-11-17 03:16:49.456','2026-11-17 03:16:49.456',NULL);
/*!40000 ALTER TABLE `opsi_jawaban` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pertanyaan`
--

DROP TABLE IF EXISTS `pertanyaan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pertanyaan` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tes_skrining_id` int NOT NULL,
  `kategori_asesmen_id` int NOT NULL,
  `teks` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipe_jawaban` enum('skala','ya_tidak') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nomor_urut` smallint unsigned NOT NULL,
  `url_gambar` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `kalimat_pengantar` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `pemicu_pertanyaan_id` int DEFAULT NULL,
  `pemicu_opsi_id` int DEFAULT NULL,
  `pemicu_operator` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pemicu_nilai` tinyint unsigned DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `pertanyaan_tes_skrining_id_nomor_urut_key` (`tes_skrining_id`,`nomor_urut`),
  KEY `pertanyaan_kategori_asesmen_id_idx` (`kategori_asesmen_id`),
  KEY `pertanyaan_pemicu_pertanyaan_id_idx` (`pemicu_pertanyaan_id`),
  KEY `pertanyaan_pemicu_opsi_id_idx` (`pemicu_opsi_id`),
  CONSTRAINT `pertanyaan_kategori_asesmen_id_fkey` FOREIGN KEY (`kategori_asesmen_id`) REFERENCES `kategori_asesmen` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pertanyaan_pemicu_opsi_id_fkey` FOREIGN KEY (`pemicu_opsi_id`) REFERENCES `opsi_jawaban` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pertanyaan_pemicu_pertanyaan_id_fkey` FOREIGN KEY (`pemicu_pertanyaan_id`) REFERENCES `pertanyaan` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `pertanyaan_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=471 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pertanyaan`
--

LOCK TABLES `pertanyaan` WRITE;
/*!40000 ALTER TABLE `pertanyaan` DISABLE KEYS */;
INSERT INTO `pertanyaan` VALUES (49,24,28,'Mengeluhkan sakit perut, sakit kepala, atau nyeri lainnya?','skala',1,NULL,1,'2026-11-09 06:04:50.370','2026-11-09 06:04:50.370',NULL,NULL,NULL,NULL,NULL),(50,24,28,'Mudah lelah atau merasa tidak bertenaga?','skala',2,NULL,1,'2026-11-09 06:04:50.389','2026-11-09 06:04:50.389',NULL,NULL,NULL,NULL,NULL),(51,24,29,'Mengalami kesulitan memusatkan perhatian pada tugas sekolah?','skala',3,NULL,1,'2026-11-09 06:04:50.402','2026-11-09 06:04:50.402',NULL,NULL,NULL,NULL,NULL),(52,24,30,'Merasa sedih, murung, atau putus asa?','skala',4,NULL,1,'2026-11-09 06:04:50.416','2026-11-09 06:04:50.416',NULL,NULL,NULL,NULL,NULL),(53,24,31,'Pernah menyampaikan keinginan menyakiti diri sendiri?','ya_tidak',5,NULL,1,'2026-11-09 06:04:50.429','2026-11-09 06:04:50.429',NULL,NULL,NULL,NULL,NULL),(54,25,29,'Sering tampak tidak mendengarkan ketika diajak berbicara langsung?','skala',1,NULL,1,'2026-11-09 06:04:50.439','2026-11-09 06:04:50.439',NULL,NULL,NULL,NULL,NULL),(55,25,29,'Sering kehilangan barang keperluan sekolah?','skala',2,NULL,1,'2026-11-09 06:04:50.453','2026-11-09 06:04:50.453',NULL,NULL,NULL,NULL,NULL),(56,26,30,'Tidak lagi menikmati hal-hal yang biasanya disukai?','skala',1,NULL,1,'2026-11-09 06:04:50.469','2026-11-09 06:04:50.469',NULL,NULL,NULL,NULL,NULL),(57,26,30,'Mengalami perubahan nafsu makan atau pola tidur?','skala',2,NULL,1,'2026-11-09 06:04:50.485','2026-11-09 06:04:50.485',NULL,NULL,NULL,NULL,NULL),(250,24,28,'Anak sulit memusatkan perhatian saat mengerjakan tugas.','skala',6,NULL,1,'2026-11-17 03:16:49.456','2026-11-17 03:16:49.456',NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `pertanyaan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rentang_penilaian`
--

DROP TABLE IF EXISTS `rentang_penilaian`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rentang_penilaian` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tes_skrining_id` int NOT NULL,
  `kategori` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `skor_min` double NOT NULL,
  `skor_max` double DEFAULT NULL,
  `urutan` tinyint unsigned NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rekomendasi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `rentang_penilaian_tes_skrining_id_idx` (`tes_skrining_id`),
  CONSTRAINT `rentang_penilaian_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rentang_penilaian`
--

LOCK TABLES `rentang_penilaian` WRITE;
/*!40000 ALTER TABLE `rentang_penilaian` DISABLE KEYS */;
/*!40000 ALTER TABLE `rentang_penilaian` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sekolah`
--

DROP TABLE IF EXISTS `sekolah`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sekolah` (
  `id` int NOT NULL AUTO_INCREMENT,
  `npsn` char(8) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `alamat` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `kontak_telepon` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sekolah_npsn_key` (`npsn`),
  UNIQUE KEY `sekolah_email_key` (`email`),
  UNIQUE KEY `sekolah_username_key` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=1327 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sekolah`
--

LOCK TABLES `sekolah` WRITE;
/*!40000 ALTER TABLE `sekolah` DISABLE KEYS */;
INSERT INTO `sekolah` VALUES (34,'00000001','SD Demo','Jl. Contoh No. 1','sekolah@demo.test','sd_demo','$2b$10$Xq95XgrSXqiY3Rl97VbX9.JXDKaSjXXXNf21YpN9Or0h4MsibLvJG',1,'2026-11-09 06:04:50.322','2026-11-17 01:55:46.004','0274-000001'),(661,'20100002','SD Negeri Contoh 2','Jl. Pendidikan No. 2','sdn-contoh2@demo.test','sdn_contoh2','$2b$10$fyTPJaptFyKXz7rYBN2mweIgWPivjuLE/TTiZQLZOGSRmny1MkgUa',1,'2026-11-17 03:07:26.297','2026-11-17 03:07:26.297','0215550002');
/*!40000 ALTER TABLE `sekolah` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sesi_skrining`
--

DROP TABLE IF EXISTS `sesi_skrining`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesi_skrining` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sekolah_id` int NOT NULL,
  `nama` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_pelaksanaan` date NOT NULL,
  `status` enum('menunggu','aktif','selesai') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  `tes_skrining_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sesi_skrining_kode_key` (`kode`),
  KEY `sesi_skrining_sekolah_id_idx` (`sekolah_id`),
  KEY `sesi_skrining_tes_skrining_id_idx` (`tes_skrining_id`),
  CONSTRAINT `sesi_skrining_sekolah_id_fkey` FOREIGN KEY (`sekolah_id`) REFERENCES `sekolah` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `sesi_skrining_tes_skrining_id_fkey` FOREIGN KEY (`tes_skrining_id`) REFERENCES `tes_skrining` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=550 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sesi_skrining`
--

LOCK TABLES `sesi_skrining` WRITE;
/*!40000 ALTER TABLE `sesi_skrining` DISABLE KEYS */;
INSERT INTO `sesi_skrining` VALUES (17,34,'Skrining Kelas 4 TA 2026/2027','ABC123','2026-11-10','aktif','2026-11-09 06:04:50.340','2026-11-09 06:04:50.340',24);
/*!40000 ALTER TABLE `sesi_skrining` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `siswa`
--

DROP TABLE IF EXISTS `siswa`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `siswa` (
  `id` int NOT NULL AUTO_INCREMENT,
  `sekolah_id` int NOT NULL,
  `kelas_id` int NOT NULL,
  `nisn` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `nama` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tanggal_lahir` date NOT NULL,
  `jenis_kelamin` enum('L','P') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `siswa_nisn_key` (`nisn`),
  KEY `siswa_sekolah_id_nama_idx` (`sekolah_id`,`nama`),
  KEY `siswa_kelas_id_sekolah_id_fkey` (`kelas_id`,`sekolah_id`),
  CONSTRAINT `siswa_kelas_id_sekolah_id_fkey` FOREIGN KEY (`kelas_id`, `sekolah_id`) REFERENCES `kelas` (`id`, `sekolah_id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `siswa_sekolah_id_fkey` FOREIGN KEY (`sekolah_id`) REFERENCES `sekolah` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=712 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `siswa`
--

LOCK TABLES `siswa` WRITE;
/*!40000 ALTER TABLE `siswa` DISABLE KEYS */;
INSERT INTO `siswa` VALUES (27,34,27,'0000000001','Siswa Demo Satu','2017-03-14','L','2026-11-09 06:04:50.333','2026-11-09 06:04:50.333'),(28,34,27,'0000000002','Siswa Demo Dua','2017-08-02','P','2026-11-09 06:04:50.336','2026-11-09 06:04:50.336');
/*!40000 ALTER TABLE `siswa` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `super_admin`
--

DROP TABLE IF EXISTS `super_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `super_admin` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nama` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `super_admin_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=527 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `super_admin`
--

LOCK TABLES `super_admin` WRITE;
/*!40000 ALTER TABLE `super_admin` DISABLE KEYS */;
INSERT INTO `super_admin` VALUES (19,'Super Admin Demo','superadmin@demo.test','$2b$10$Xq95XgrSXqiY3Rl97VbX9.JXDKaSjXXXNf21YpN9Or0h4MsibLvJG',1,'2026-11-09 06:04:50.313','2026-11-09 06:04:50.313');
/*!40000 ALTER TABLE `super_admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tes_skrining`
--

DROP TABLE IF EXISTS `tes_skrining`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tes_skrining` (
  `id` int NOT NULL AUTO_INCREMENT,
  `super_admin_id` int NOT NULL,
  `nama` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `level` tinyint unsigned NOT NULL,
  `jenjang` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `deskripsi` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `aktif` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `tes_skrining_super_admin_id_idx` (`super_admin_id`),
  KEY `tes_skrining_level_aktif_idx` (`level`,`aktif`),
  CONSTRAINT `tes_skrining_super_admin_id_fkey` FOREIGN KEY (`super_admin_id`) REFERENCES `super_admin` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=430 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tes_skrining`
--

LOCK TABLES `tes_skrining` WRITE;
/*!40000 ALTER TABLE `tes_skrining` DISABLE KEYS */;
INSERT INTO `tes_skrining` VALUES (24,19,'Skrining Awal',1,'SD','Selama DUA (2) MINGGU terakhir, seberapa sering anak Anda mengalami hal berikut?',1,'2026-11-09 06:04:50.347','2026-11-09 06:04:50.347'),(25,19,'Instrumen Lanjutan Inatensi',2,'SD','Pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir.',1,'2026-11-09 06:04:50.351','2026-11-09 06:04:50.351'),(26,19,'Instrumen Lanjutan Depresi',2,'SD','Pilih jawaban yang paling menggambarkan kondisi anak Anda selama TUJUH (7) HARI terakhir.',1,'2026-11-09 06:04:50.354','2026-11-09 06:04:50.354');
/*!40000 ALTER TABLE `tes_skrining` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'capstone_skrining'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-24  9:37:42
