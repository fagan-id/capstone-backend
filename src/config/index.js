/**
 * Konfigurasi Aplikasi.
 * Memuat file .env lalu memvalidasinya sekali saat aplikasi dijalankan.
 */

import { loadConfig } from "./loadConfig.js";

// Tanpa file .env (misal di server dengan env asli) tetap jalan; error lain dilempar.
try {
  process.loadEnvFile();
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

export const config = loadConfig(process.env);
