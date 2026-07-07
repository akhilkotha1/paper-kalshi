// prisma.config.ts
// Prisma 7 moved connection URLs and migration settings out of
// schema.prisma and into this file. This must live at the project
// root (same level as package.json) — i.e. backend/prisma.config.ts.
//
// The CLI (prisma migrate, prisma studio, etc.) uses the `url` here.
// For migrations against Supabase, this should be the DIRECT (5432)
// connection, not the pooled one, since pgbouncer's pooled connection
// doesn't support the schema-changing commands migrations need.

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
  },
});
