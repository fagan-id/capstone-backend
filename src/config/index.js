/**
 * Konfigurasi Aplikasi.
 * Memuat file .env lalu memvalidasinya sekali saat aplikasi dijalankan.
 */

import "dotenv/config";
import { loadConfig } from "./loadConfig.js";

export const config = loadConfig(process.env);
