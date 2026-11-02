/**
 * Titik Masuk Seed (`npm run db:seed`).
 * Membuat akun demo; aman dijalankan berulang.
 */

import { prisma } from "../src/lib/prisma.js";
import { buatDataSeed, jalankanSeed } from "./seedData.js";
import logger from "../src/utils/logger.js";

try {
  await jalankanSeed(prisma, await buatDataSeed(process.env));
  logger.success("Seed selesai: akun demo Super Admin, sekolah, kelas, dan siswa siap.");
} catch (err) {
  logger.error(`Seed gagal: ${err.message}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
