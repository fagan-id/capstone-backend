/**
 * Pembaca dan Validator Konfigurasi Environment.
 * Fungsi murni: menerima objek env, mengembalikan objek konfigurasi siap pakai.
 */

const WAJIB = ["DB_USER", "DB_PASSWORD", "DB_NAME"];

/**
 * Mengambil nilai env; string kosong (atau hanya spasi) dianggap tidak diisi.
 * Nilai dikembalikan apa adanya agar password berspasi tidak berubah.
 * @param {Record<string, string|undefined>} env
 * @param {string} name
 * @returns {string|undefined}
 */
function ambil(env, name) {
  const value = env[name];
  if (value === undefined || value === null) return undefined;
  return String(value).trim() === "" ? undefined : String(value);
}

/**
 * Mengubah nilai env menjadi nomor port yang valid (1-65535).
 * @param {string|undefined} value
 * @param {number} fallback
 * @param {string} name
 * @returns {number}
 */
function parsePort(value, fallback, name) {
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Variabel environment ${name} harus berupa angka port 1-65535, diterima: "${value}".`);
  }
  return port;
}

/**
 * Membangun objek konfigurasi aplikasi dari environment.
 * @param {Record<string, string|undefined>} env
 * @returns {{
 *   env: string,
 *   isDevelopment: boolean,
 *   port: number,
 *   corsOrigin: string[],
 *   db: { host: string, port: number, user: string, password: string, name: string },
 *   databaseUrl: string
 * }}
 */
export function loadConfig(env) {
  const hilang = WAJIB.filter((name) => ambil(env, name) === undefined);
  if (hilang.length > 0) {
    throw new Error(
      `Variabel environment wajib belum diisi: ${hilang.join(", ")}. Salin .env.example menjadi .env lalu isi nilainya.`
    );
  }

  const nodeEnv = ambil(env, "NODE_ENV") ?? "development";
  const port = parsePort(ambil(env, "PORT"), 5000, "PORT");

  const db = {
    host: ambil(env, "DB_HOST") ?? "127.0.0.1",
    port: parsePort(ambil(env, "DB_PORT"), 3306, "DB_PORT"),
    user: ambil(env, "DB_USER"),
    password: ambil(env, "DB_PASSWORD"),
    name: ambil(env, "DB_NAME")
  };

  const corsOrigin = (ambil(env, "CORS_ORIGIN") ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin !== "");

  const databaseUrl =
    `mysql://${encodeURIComponent(db.user)}:${encodeURIComponent(db.password)}` +
    `@${db.host}:${db.port}/${db.name}`;

  return {
    env: nodeEnv,
    isDevelopment: nodeEnv === "development",
    port,
    corsOrigin,
    db,
    databaseUrl
  };
}
