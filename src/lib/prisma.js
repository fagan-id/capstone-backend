/**
 * Instance Prisma Client Bersama.
 * Terhubung ke MySQL melalui driver adapter MariaDB (wajib di Prisma 7).
 */

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.ts";
import { config } from "../config/index.js";

const adapter = new PrismaMariaDb({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.name,
  connectionLimit: 5,
  connectTimeout: 5_000,
  // Default pool mariadb 10 detik; disamakan agar health check gagal dalam ~5 detik saat DB mati.
  acquireTimeout: 5_000
});

export const prisma = new PrismaClient({ adapter });

// Alias camelCase untuk kompatibilitas antar modul dan mock test
if (!prisma.superAdmin) {
  Object.defineProperty(prisma, "superAdmin", {
    get() {
      return prisma.super_admin;
    },
    set(val) {
      prisma.super_admin = val;
    },
    configurable: true,
    enumerable: true
  });
}

/**
 * Memastikan database dapat dijangkau. Reject jika koneksi gagal.
 * @returns {Promise<void>}
 */
export async function cekDatabase() {
  await prisma.$queryRaw`SELECT 1`;
}
