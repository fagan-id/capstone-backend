/**
 * Pembuat Aplikasi Express.
 * Dependensi (config, cekDatabase) disuntikkan agar app bisa diuji tanpa database.
 */

import express from "express";
import cors from "cors";
import { createRouter } from "./routes/index.js";
import { notFoundHandler, createErrorHandler } from "./middlewares/errorHandler.js";

export function createApp({ config, cekDatabase }) {
  const app = express();

  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use("/api", createRouter({ config, cekDatabase }));

  app.use(notFoundHandler);
  app.use(createErrorHandler({ isDevelopment: config.isDevelopment }));

  return app;
}
