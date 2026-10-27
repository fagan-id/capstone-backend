/**
 * Titik Masuk Server HTTP.
 * Menghubungkan config dan Prisma ke app, lalu membuka port.
 */

import { config } from "./config/index.js";
import { createApp } from "./app.js";
import { prisma, cekDatabase } from "./lib/prisma.js";
import logger from "./utils/logger.js";

const app = createApp({ config, cekDatabase });
const server = app.listen(config.port);

server.on("listening", () => {
  logger.success(`Server berjalan di http://localhost:${config.port} (${config.env})`);
  logger.success(`Cek kesehatan: http://localhost:${config.port}/api/health`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`Port ${config.port} sudah dipakai aplikasi lain. Ubah PORT di .env atau hentikan aplikasi tersebut.`);
    process.exit(1);
  }
  throw err;
});

/**
 * Menutup server dan koneksi database dengan rapi.
 * @param {string} signal
 */
async function shutdown(signal) {
  logger.info(`Menerima ${signal}, mematikan server...`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
