/**
 * Helper Test Database.
 * Setiap test berjalan di dalam transaksi yang selalu dibatalkan, sehingga database dev tidak berubah.
 */

import { prisma } from "../../src/lib/prisma.js";

class Batal extends Error {}

/**
 * Menjalankan fn di dalam transaksi Prisma lalu selalu membatalkannya (rollback).
 * Error lain dari fn diteruskan apa adanya.
 * @param {(tx: object) => Promise<void>} fn
 * @returns {Promise<void>}
 */
export async function dalamTransaksiBatal(fn) {
  try {
    await prisma.$transaction(
      async (tx) => {
        await fn(tx);
        throw new Batal();
      },
      { timeout: 20_000 }
    );
  } catch (err) {
    if (!(err instanceof Batal)) throw err;
  }
}
