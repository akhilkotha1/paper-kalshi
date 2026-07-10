// Sets up a single, shared Prisma Client instance for the whole app.
// Prisma 7 requires a driver adapter at runtime (no built-in engine
// anymore), so wire it to the `pg` library directly here, using
// the [pooled] connection string (DATABASE_URL), not the direct one
// (DIRECT_URL), which is only for running migrations.

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });