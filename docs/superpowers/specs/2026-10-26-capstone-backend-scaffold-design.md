# capstone-backend: Basic Folder (Scaffold) Design

Size: small change (short design). Status: approved by the user (2026-10-26).
Related: `docs/2026-10-26-sekolah-role-questions-assumptions.md` (decisions D1–D31, open questions).

## Intent

Create a fresh, empty-but-runnable backend that every role (Super Admin, Sekolah, Parent/Guardian, Student) will be built on. It must not be connected to `CapstoneProjek`; that repo is a reference only (D15, D16).

## Goals

- `npm run dev` starts an Express server with `GET /api/health`.
- `docker compose up -d` starts MySQL 8.0 + phpMyAdmin.
- Prisma is wired to MySQL and `npx prisma generate` works on an empty schema.
- Same response/error conventions as `dev` (`ApiResponse`, `AppError`, global error handler).

## Non-goals

- No tables, models, auth, or features. Those come after the Accounts + Students column design (D26).
- No frontend (D12). No AI assistant (D18).
- No git commit. The user commits (`git init` only).

## Constraints

- **Plain JavaScript** (user choice). Prisma 7 requires ESM, so `package.json` uses `"type": "module"` and `import` syntax. This differs from `dev` (CommonJS `require`).
- Prisma 7's generator outputs TypeScript files. To use it from JS, the app runs through **`tsx`** (handles the generated `.ts` files) with `importFileExtension = "ts"` in the generator, as Prisma's docs advise for `tsx`. App code itself stays `.js`.
- **Stable versions only, pinned exactly** (checked on npm 2026-10-26):
  - `prisma` 7.10.1 (dev), `@prisma/client` 7.10.1, `@prisma/adapter-mariadb` 7.10.1 (mandatory MySQL driver adapter in Prisma 7)
  - `express` 5.3.0, `cors` 2.8.6, `dotenv` 18.0.9
  - `tsx` 4.23.15 (dev)
- Node v22.14.0 (local) satisfies Prisma 7 (^22.12).
- Credentials only in `.env` (git-ignored). `.env.example` has placeholders.
- Naming: Indonesian, snake_case, PK `id`, FK `<tabel>_id` (D20). Applies once tables are added.

## Approaches (decided earlier)

- Schema/migrations: A. one `init.sql`, B. numbered SQL migrations + runner, **C. Prisma ORM (picked by user)**.
- Language: A. TypeScript (recommended), **B. plain JavaScript (picked by user)**, C. Prisma 6 + deprecated `prisma-client-js`.

## Folder layout

```
D:\Coding\Project\capstone-backend\
├── docs/
│   ├── 2026-10-26-sekolah-role-questions-assumptions.md
│   └── superpowers/specs/2026-10-26-capstone-backend-scaffold-design.md
├── prisma/
│   └── schema.prisma          # datasource (mysql) + generator only
├── src/
│   ├── server.js              # starts HTTP server
│   ├── app.js                 # Express app, middleware, routes, error handlers
│   ├── config/index.js        # reads env (PORT, NODE_ENV, DB_*, CORS_ORIGIN), builds databaseUrl
│   ├── lib/prisma.js          # PrismaClient with PrismaMariaDb adapter
│   ├── middlewares/errorHandler.js
│   ├── routes/index.js        # mounts /api/health
│   └── utils/apiResponse.js, appError.js, logger.js
├── generated/                 # Prisma client output (git-ignored)
├── docker-compose.yml         # MySQL 8.0 + phpMyAdmin, values from .env
├── prisma.config.js           # schema path, migrations path, DATABASE_URL
├── .env.example
├── .gitignore                 # node_modules, .env, generated/
├── package.json
└── README.md                  # how to run
```

## Calls made by the assistant (please check)

1. **Express 5.3.0** instead of 4.x from `dev`. Same framework, current stable, and it forwards errors from `async` routes to the error handler automatically.
2. **`app.js` / `server.js` split** so tests can import the app without opening a port.
3. **`prisma.config.js`** (JS) instead of `.ts`. Prisma supports `.js` config files.
4. New database name **`capstone_skrining`**, user/password from `.env`. No defaults from `dev` reused.
5. `bcryptjs` and `jsonwebtoken` are **not** installed yet. They arrive with the Accounts work.
6. Health check also reports whether the database is reachable (`SELECT 1` through Prisma).

## Left to the builder

- Exact logger format, README wording, phpMyAdmin port (default 8081, so it does not clash with `dev`'s 8080).
