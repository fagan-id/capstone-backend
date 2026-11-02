/**
 * Konfigurasi Prisma CLI.
 * URL database diambil dari src/config agar hanya ada satu sumber kebenaran.
 */

import { defineConfig } from "prisma/config";
import { config } from "./src/config/index.js";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.js"
  },
  datasource: {
    url: config.databaseUrl
  }
});
